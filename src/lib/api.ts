import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_BASE || ""; // "" => use Vite proxy /api

// --- Web client token transport (see backend docs: "Clients: mobile vs web") ---
// access token: kept in memory only (re-minted on load via the refresh cookie)
// refresh token: httpOnly cookie set by the backend (JS can't read it)
// csrfToken: readable value echoed in the X-CSRF-Token header on refresh/logout
let accessToken = null;

export const TOKENS = {
  get access() {
    return accessToken;
  },
  get csrf() {
    return localStorage.getItem("dl_csrf");
  },
  // Accepts the auth payload: { accessToken, csrfToken } (+ user, ignored here).
  set({ accessToken: a, csrfToken: c } = {}) {
    if (a !== undefined) accessToken = a || null;
    if (c) localStorage.setItem("dl_csrf", c);
  },
  clear() {
    accessToken = null;
    localStorage.removeItem("dl_csrf");
  },
};

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true, // send/receive the httpOnly refresh + csrf cookies
  headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
});

// Attach the in-memory access token, plus the CSRF header on cookie-authenticated auth calls.
api.interceptors.request.use((cfg) => {
  const t = TOKENS.access;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  const url = cfg.url || "";
  if (url.includes("/auth/refresh-token") || url.includes("/auth/logout")) {
    const csrf = TOKENS.csrf;
    if (csrf) cfg.headers["X-CSRF-Token"] = csrf;
  }
  return cfg;
});

// Cookie-based silent refresh (no body — the refresh token rides in the httpOnly cookie).
async function doRefresh() {
  const { data } = await api.post("/auth/refresh-token");
  const payload = data?.data ?? data;
  TOKENS.set(payload); // { accessToken, csrfToken }
  return payload.accessToken;
}

// Auto-refresh on 401 (single retry). On hard failure, clear tokens and signal the app.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const url = config?.url || "";
    const isRefreshCall = url.includes("/auth/refresh-token");
    if (response?.status === 401 && config && !config._retry && !isRefreshCall) {
      config._retry = true;
      try {
        refreshing = refreshing || doRefresh();
        const fresh = await refreshing;
        refreshing = null;
        config.headers.Authorization = `Bearer ${fresh}`;
        return api(config);
      } catch (e) {
        refreshing = null;
        TOKENS.clear();
        if (typeof window !== "undefined")
          window.dispatchEvent(new CustomEvent("dl:auth-expired"));
      }
    }
    return Promise.reject(error);
  }
);

// Unwrap the standard { statusCode, success, message, data } envelope
const unwrap = (p) => p.then((r) => r.data?.data ?? r.data);

// POST multipart/form-data (file uploads). Content-Type is left undefined so the
// browser/axios set the correct multipart boundary instead of our JSON default.
const postForm = (url, formData) =>
  unwrap(api.post(url, formData, { headers: { "Content-Type": undefined } }));

// PATCH multipart/form-data (let the browser set the multipart boundary).
const patchForm = (url, formData) =>
  unwrap(api.patch(url, formData, { headers: { "Content-Type": undefined } }));

// Generic per-row list CRUD (JSON) for the role-based profile lists.
const profileList = (base) => ({
  list: () => unwrap(api.get(base)),                          // { items: [...] }
  add: (b) => unwrap(api.post(base, b)),                      // { item }
  update: (id, b) => unwrap(api.patch(`${base}/${id}`, b)),   // { item }
  remove: (id) => unwrap(api.delete(`${base}/${id}`)),        // "Entry deleted."
});

/** Thin endpoint map mirroring the DokLynk backend. */
export const dok = {
  auth: {
    google: (b) => unwrap(api.post("/auth/google", b)),
    sendOtp: (b) => unwrap(api.post("/auth/send-otp", b)),
    verifyOtp: (b) => unwrap(api.post("/auth/verify-otp", b)),
    // Web: no body — refresh token comes from the httpOnly cookie; CSRF header added by interceptor.
    refresh: () => unwrap(api.post("/auth/refresh-token")).then((payload) => {
      TOKENS.set(payload);
      return payload;
    }),
    logout: () => unwrap(api.post("/auth/logout")),
    logoutAll: () => unwrap(api.post("/auth/logout-all")),
    sessions: () => unwrap(api.get("/auth/sessions")),
    revokeSession: (id) => unwrap(api.delete(`/auth/sessions/${id}`)),
    meta: () => unwrap(api.get("/auth/meta/specializations")),
    metaCourses: () => unwrap(api.get("/auth/meta/courses")),
  },
  users: {
    onboard: (b) => unwrap(api.post("/users/onboard", b)),
    me: () => unwrap(api.get("/users/profile/me")),
  },
  profile: {
    me: () => unwrap(api.get("/profile/me")),
    full: () => unwrap(api.get("/profile/me/full")), // hydrate: { user, locks, memberSince, accountAge, doctor|student|general, completion, verification }
    completion: () => unwrap(api.get("/profile/me/completion")), // { completion: { sections, percent }, verification: { status } }
    status: () => unwrap(api.get("/profile/me/status")),
    counts: () => unwrap(api.get("/profile/me/counts")),
    usernameCheck: (username) => unwrap(api.get(`/profile/username/check?username=${encodeURIComponent(username)}`)), // { available, username, reason }
    updateUsername: (username) => unwrap(api.put("/profile/me/username", { username })), // { uniqueUsername } · 400 format · 409 taken
    byUsername: (handle) => unwrap(api.get(`/profile/u/${encodeURIComponent(String(handle).replace(/^@/, ""))}`)),
    byId: (id) => unwrap(api.get(`/profile/${id}`)),
    publicBySlug: (slug) => unwrap(api.get(`/profile/public/${slug}`)),
    shareLink: () => unwrap(api.get("/profile/me/share/link")),
    updateBasic: (b) => unwrap(api.put("/profile/me/basic", b)),
    verifyEmail: (b) => unwrap(api.post("/profile/me/email/verify", b)),
    uploadAvatar: (file) => { const f = new FormData(); f.append("photo", file); return postForm("/profile/me/photo", f); }, // docs/profile.md §2: POST /me/photo (field "photo") → { profilePhoto }
    uploadCover: (file) => { const f = new FormData(); f.append("cover", file); return postForm("/profile/me/cover", f); }, // POST /me/cover (field "cover") → { coverPhoto }
    // --- Role-based profile lists (docs/profile.md §3–5) ---
    education: profileList("/profile/me/doctor/education"),       // { organizationName*, departmentName?, startDate?, endDate? }
    workplace: profileList("/profile/me/doctor/workplace"),       // { role?, organizationName*, department?, startDate?, endDate? }
    academics: profileList("/profile/me/student/academics"),      // { collegeName*, program?, city?, currentYear?, expectedGraduationDate? }
    experiences: profileList("/profile/me/student/experiences"),  // { institution*, program?, city?, startDate?, endDate?, interests?[] }
    certificates: {
      list: () => unwrap(api.get("/profile/me/doctor/certificates")),
      add: ({ name, validationDate, file }) => {
        const f = new FormData();
        f.append("name", name);
        if (validationDate) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // only a freshly-picked file, never an existing URL
        return postForm("/profile/me/doctor/certificates", f);
      },
      update: (id, { name, validationDate, file }) => {
        const f = new FormData();
        if (name != null) f.append("name", name);
        if (validationDate != null) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // skip when file is an unchanged URL string
        return patchForm(`/profile/me/doctor/certificates/${id}`, f);
      },
      remove: (id) => unwrap(api.delete(`/profile/me/doctor/certificates/${id}`)),
    },
    interests: {
      list: () => unwrap(api.get("/profile/me/general/interests")),
      add: (topic) => unwrap(api.post("/profile/me/general/interests", { topic })), // 409 on duplicate
      remove: (id) => unwrap(api.delete(`/profile/me/general/interests/${id}`)),
    },
    doctorSpecialties: (specialties) => unwrap(api.put("/profile/me/doctor/specialties", { specialties })), // { specialties }
    // --- Doctor verification (dual-path, multipart, docs/profile.md §8) ---
    verificationGet: () => unwrap(api.get("/profile/me/doctor/verification")),       // { status, rejectionReason?, submission? }
    verificationSubmit: (formData) => postForm("/profile/me/doctor/verification", formData), // pathType=credential|document
    // Blocking
    blockList: (q = "") => unwrap(api.get(`/profile/block/list${q}`)),
    block: (userId) => unwrap(api.post(`/profile/block/${userId}`)),
    unblock: (userId) => unwrap(api.delete(`/profile/block/${userId}`)),
  },
  account: {
    personalDetails: () => unwrap(api.get("/account/personal-details")),
    privacy: () => unwrap(api.get("/account/privacy")),
    updatePrivacy: (b) => unwrap(api.put("/account/privacy", b)),
    legal: () => unwrap(api.get("/account/legal")),
    feedback: (b) => unwrap(api.post("/account/feedback", b)),
    deactivate: () => unwrap(api.post("/account/deactivate")),
    remove: () => unwrap(api.post("/account/delete")),
    restore: () => unwrap(api.post("/account/restore")),
  },
  feed: {
    home: (q = "") => unwrap(api.get(`/feed/home${q}`)),
    explore: (q = "") => unwrap(api.get(`/feed/explore${q}`)),
    guest: (tab = "all") => unwrap(api.get(`/feed/guest?tab=${tab}`)),
    saved: (q = "") => unwrap(api.get(`/feed/saved${q}`)), // ?tab=all|post|research|thesis|case_study|reel
    notInterested: (postId) => unwrap(api.post(`/feed/not-interested/${postId}`)),
    mute: (userId) => unwrap(api.post(`/feed/mute/${userId}`)), // "don't recommend" author
    unmute: (userId) => unwrap(api.delete(`/feed/mute/${userId}`)),
  },
  posts: {
    get: (id) => unwrap(api.get(`/posts/${id}`)),
    update: (id, b) => unwrap(api.put(`/posts/${id}`, b)), // own post, ≤24h (403 after)
    remove: (id) => unwrap(api.delete(`/posts/${id}`)),
    report: (id, b) => unwrap(api.post(`/posts/${id}/report`, b)), // { category, reason? }
    like: (id) => unwrap(api.post(`/posts/${id}/like`)), // toggle → { isLiked, likesCount }
    likes: (id, q = "") => unwrap(api.get(`/posts/${id}/likes${q}`)), // { users, hasMore, nextCursor }
    save: (id) => unwrap(api.post(`/posts/${id}/save`)),
    comments: (id, q = "") => unwrap(api.get(`/posts/${id}/comments${q}`)),
    comment: (id, b) => unwrap(api.post(`/posts/${id}/comments`, b)), // { content, parentId? }
    replies: (id, commentId, q = "") => unwrap(api.get(`/posts/${id}/comments/${commentId}/replies${q}`)),
    likeComment: (id, commentId) => unwrap(api.post(`/posts/${id}/comments/${commentId}/like`)),
    deleteComment: (id, commentId) => unwrap(api.delete(`/posts/${id}/comments/${commentId}`)),
    shareInApp: (id, recipientIds) => unwrap(api.post(`/posts/${id}/share/inapp`, { recipientIds })),
    shareLink: (id) => unwrap(api.get(`/posts/${id}/share/link`)), // { deepLink, webFallback }
    byUser: (userId, q = "") => unwrap(api.get(`/posts/user/${userId}${q}`)),
    trendingTags: () => unwrap(api.get("/posts/trending/hashtags?limit=8")),
    create: (form) => postForm("/posts", form), // multipart: media (×10) + JSON fields
  },
  reels: {
    feed: (q = "") => unwrap(api.get(`/reels/feed${q}`)),
    create: (form) => postForm("/reels", form), // multipart: video + caption/visibility/specialties/hashtags/mentions
    get: (id) => unwrap(api.get(`/reels/${id}`)),
    update: (id, b) => unwrap(api.put(`/reels/${id}`, b)), // caption/tags ≤24h (403 after)
    remove: (id) => unwrap(api.delete(`/reels/${id}`)),
    like: (id) => unwrap(api.post(`/reels/${id}/like`)), // toggle → { isLiked, likesCount }
    likes: (id, q = "") => unwrap(api.get(`/reels/${id}/likes${q}`)), // { users, hasMore, nextCursor }
    save: (id) => unwrap(api.post(`/reels/${id}/save`)),
    view: (id) => unwrap(api.post(`/reels/${id}/view`)), // debounced view ping
    watched: (id) => unwrap(api.post(`/reels/${id}/watched`)), // >50% / >10s → 48h lockout
    notInterested: (id) => unwrap(api.post(`/reels/${id}/not-interested`)),
    // Comments mirror posts (same component contract)
    comments: (id, q = "") => unwrap(api.get(`/reels/${id}/comments${q}`)),
    comment: (id, b) => unwrap(api.post(`/reels/${id}/comments`, b)), // { content, parentId? }
    replies: (id, commentId, q = "") => unwrap(api.get(`/reels/${id}/comments/${commentId}/replies${q}`)),
    likeComment: (id, commentId) => unwrap(api.post(`/reels/${id}/comments/${commentId}/like`)),
    deleteComment: (id, commentId) => unwrap(api.delete(`/reels/${id}/comments/${commentId}`)),
  },
  follows: {
    follow: (id) => unwrap(api.post(`/follows/${id}`)), // public → { status:"following" } · private → { status:"requested" }
    unfollow: (id) => unwrap(api.delete(`/follows/${id}`)),
    check: (id) => unwrap(api.get(`/follows/check/${id}`)), // { status, isFollowing, isFollowedBy, isRequested }
    followers: (userId, q = "") => unwrap(api.get(`/follows/${userId}/followers${q}`)), // { followers: [...] }
    following: (userId, q = "") => unwrap(api.get(`/follows/${userId}/following${q}`)), // { following: [...] }
    withdraw: (id) => unwrap(api.delete(`/follows/requests/${id}`)), // silent request withdrawal
    requests: (q = "") => unwrap(api.get(`/follows/requests${q}`)), // incoming (private accounts)
    acceptRequest: (requesterId) => unwrap(api.post(`/follows/requests/${requesterId}/accept`)),
    rejectRequest: (requesterId) => unwrap(api.post(`/follows/requests/${requesterId}/reject`)),
    suggestions: () => unwrap(api.get("/follows/suggestions?limit=6")),
  },
  search: {
    all: (q) => unwrap(api.get(`/search?q=${encodeURIComponent(q)}&limit=6`)),
    // Predictive typeahead → { users:[...], hashtags:[...] } (PRD §1). Backend: 200ms-friendly, ≥3 chars.
    suggest: (q) => unwrap(api.get(`/search/suggest?q=${encodeURIComponent(q)}`)),
    // Unified search. `extra` carries the filter query string, e.g. "&role=doctor&city=Mumbai" (PRD §3).
    users: (q, extra = "") => unwrap(api.get(`/search/users?q=${encodeURIComponent(q)}${extra}`)),
    posts: (q, extra = "") => unwrap(api.get(`/search/posts?q=${encodeURIComponent(q)}${extra}`)),
    // Unified content (posts + cases + reels) with an opaque keyset cursor (docs/modules/search.md).
    content: (q, extra = "") => unwrap(api.get(`/search/content?q=${encodeURIComponent(q)}${extra}`)),
    hashtags: (q) => unwrap(api.get(`/search/hashtags?q=${encodeURIComponent(q)}`)),
    // Trending hashtags ranked by 48h engagement velocity (PRD §4).
    trending: () => unwrap(api.get("/search/trending")),
    // Hashtag workspace feed; `qs` e.g. "?type=case_study&cursor=…" (PRD §4).
    hashtag: (tag, qs = "") => unwrap(api.get(`/search/hashtag/${encodeURIComponent(tag)}${qs}`)),
    // Search history (logged-in). Recorded explicitly on a committed search / result tap, not typeahead.
    history: () => unwrap(api.get("/search/history")),                                  // { items:[{id,query,queryRaw,searchType,createdAt}] }
    recordSearch: (b) => unwrap(api.post("/search/history", b)),                        // { q, type?, entityId?, entityType? }
    deleteHistory: (id) => unwrap(api.delete(`/search/history/${id}`)),
    clearHistory: () => unwrap(api.delete("/search/history")),
    popular: () => unwrap(api.get("/search/popular")),                                  // { terms:[{query,count}] } — distinct from #trending
  },
  cases: {
    feed: (q = "") => unwrap(api.get(`/cases/feed${q}`)),
    get: (id) => unwrap(api.get(`/cases/${id}`)),
    create: (b) => unwrap(api.post("/cases", b)),
  },
  network: {
    connections: (q = "") => unwrap(api.get(`/network/connections${q}`)),
    requests: (q = "") => unwrap(api.get(`/network/requests${q}`)),
    discover: (q = "") => unwrap(api.get(`/network/discover${q}`)),
    request: (id) => unwrap(api.post(`/network/request/${id}`)),
    accept: (id) => unwrap(api.put(`/network/request/${id}/accept`)),
    reject: (id) => unwrap(api.put(`/network/request/${id}/reject`)),
  },
  chat: {
    conversations: () => unwrap(api.get("/chat/conversations")),
    messages: (cid) => unwrap(api.get(`/chat/${cid}/messages`)),
    start: (b) => unwrap(api.post("/chat/start", b)),
    send: (cid, b) => unwrap(api.post(`/chat/${cid}/messages`, b)),
  },
  notifications: {
    list: (q = "") => unwrap(api.get(`/notifications${q}`)),
    unread: () => unwrap(api.get("/notifications/unread-count")),
    readAll: () => unwrap(api.put("/notifications/read-all")),
    read: (id) => unwrap(api.put(`/notifications/${id}/read`)),
    remove: (id) => unwrap(api.delete(`/notifications/${id}`)),
    preferences: () => unwrap(api.get("/notifications/preferences")),
    updatePreferences: (b) => unwrap(api.put("/notifications/preferences", b)),
  },
  admin: {
    // These require the x-admin-key header — set it once via setAdminKey().
    stats: () => unwrap(api.get("/admin/verifications/stats")),
    list: (status = "pending") => unwrap(api.get(`/admin/verifications?status=${status}&limit=50`)),
    detail: (userId) => unwrap(api.get(`/admin/verifications/${userId}`)),
    review: (userId, b) => unwrap(api.put(`/admin/verifications/${userId}/review`, b)),
    approve: (userId, b) => unwrap(api.put(`/admin/verifications/${userId}/approve`, b)),
    reject: (userId, b) => unwrap(api.put(`/admin/verifications/${userId}/reject`, b)),
    reset: (userId, b) => unwrap(api.put(`/admin/verifications/${userId}/reset`, b)),
  },
};

/** Store the admin secret key locally; attached as x-admin-key on /admin/* calls. */
export function setAdminKey(key) {
  if (key) localStorage.setItem("dl_admin_key", key);
  else localStorage.removeItem("dl_admin_key");
}
api.interceptors.request.use((cfg) => {
  if (cfg.url?.startsWith("/admin")) {
    const k = localStorage.getItem("dl_admin_key");
    if (k) cfg.headers["x-admin-key"] = k;
  }
  return cfg;
});
