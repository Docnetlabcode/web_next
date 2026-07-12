import axios from "axios";
import { apiBase, resolveBackend, failover } from "./backend";

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

// --- Admin console token transport (separate from the product user session) ---
// The admin logs in with env credentials and gets its own JWT pair. Kept in
// sessionStorage so the operator's session survives a tab reload but not a new
// tab / browser restart. Attached as Authorization on /admin/* calls only.
let adminAccess: string | null = null;
export const ADMIN_TOKENS = {
  get access() {
    if (adminAccess) return adminAccess;
    if (typeof window !== "undefined") return sessionStorage.getItem("dl_admin_at");
    return null;
  },
  get refresh() {
    return typeof window !== "undefined" ? sessionStorage.getItem("dl_admin_rt") : null;
  },
  set(at, rt) {
    adminAccess = at || null;
    if (typeof window !== "undefined") {
      if (at) sessionStorage.setItem("dl_admin_at", at);
      if (rt) sessionStorage.setItem("dl_admin_rt", rt);
    }
  },
  clear() {
    adminAccess = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dl_admin_at");
      sessionStorage.removeItem("dl_admin_rt");
    }
  },
};

export const api = axios.create({
  baseURL: `${apiBase()}/api`,
  withCredentials: true, // send/receive the httpOnly refresh + csrf cookies
  headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
});

// Attach the right bearer token. /admin/* calls use the admin JWT; everything
// else uses the product user access token (+ CSRF on cookie-auth calls).
api.interceptors.request.use(async (cfg) => {
  // Dual deployment (Render + AWS): the first request awaits the /health probe
  // that picks the live backend; afterwards this is an already-settled promise.
  await resolveBackend();
  cfg.baseURL = `${apiBase()}/api`;
  const url = cfg.url || "";
  if (url.startsWith("/admin")) {
    const at = ADMIN_TOKENS.access;
    if (at) cfg.headers.Authorization = `Bearer ${at}`;
    return cfg;
  }
  const t = TOKENS.access;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
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

    // The active deployment (Render or AWS) may have gone down. A direct
    // deployment dies as a network error (no response); a proxied one dies as
    // a 502/503/504 from our own Next server. Re-probe both deployments, and
    // if the live one changed, retry this request once against it.
    const gatewayDown = response && [502, 503, 504].includes(response.status);
    if ((!response || gatewayDown) && config && !config._failover && !axios.isCancel(error)) {
      config._failover = true;
      if (await failover()) {
        config.baseURL = `${apiBase()}/api`;
        return api(config);
      }
    }

    // Admin calls are self-contained: never fall through to the product user
    // refresh path. Refresh the admin JWT once on 401 (except on auth endpoints,
    // so a bad login doesn't loop), otherwise reject as-is.
    if (url.startsWith("/admin")) {
      const isAdminAuthCall = url.startsWith("/admin/auth/");
      if (!isAdminAuthCall && response?.status === 401 && config && !config._retry) {
        config._retry = true;
        try {
          const rt = ADMIN_TOKENS.refresh;
          if (!rt) throw new Error("no admin refresh token");
          const { data } = await axios.post(
            `${apiBase()}/api/admin/auth/refresh`,
            { refreshToken: rt },
            { headers: { "Content-Type": "application/json" } }
          );
          const p = data?.data ?? data;
          ADMIN_TOKENS.set(p.accessToken, p.refreshToken);
          config.headers.Authorization = `Bearer ${p.accessToken}`;
          return api(config);
        } catch (e) {
          ADMIN_TOKENS.clear();
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("dl:admin-expired"));
        }
      }
      return Promise.reject(error);
    }

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

/** Thin endpoint map mirroring the Orovion backend. */
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
    // --- Doctor verification (combined Path A + Path B, multipart, docs/profile.md §8) ---
    verificationGet: () => unwrap(api.get("/profile/me/doctor/verification")),       // { status, rejectionReason?, submission? }
    verificationSubmit: (formData) => postForm("/profile/me/doctor/verification", formData), // one POST: credential + aadhaarFront/aadhaarBack + liveness (no pathType)
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
    byUser: (userId, q = "") => unwrap(api.get(`/reels/user/${userId}${q}`)), // a user's reels (profile content grid)
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
    suggestions: () => unwrap(api.get("/follows/suggestions?limit=15")),
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
    // Falls back to the posts-by-hashtag route on 404 (older backend builds lack /search/hashtag/:tag).
    hashtag: async (tag, qs = "") => {
      const t = encodeURIComponent(tag);
      try {
        return await unwrap(api.get(`/search/hashtag/${t}${qs}`));
      } catch (e) {
        if (e?.response?.status === 404) return unwrap(api.get(`/posts/hashtag/${t}`));
        throw e;
      }
    },
    // Search history (logged-in). Recorded explicitly on a committed search / result tap, not typeahead.
    history: () => unwrap(api.get("/search/history")),                                  // { items:[{id,query,queryRaw,searchType,createdAt}] }
    recordSearch: (b) => unwrap(api.post("/search/history", b)),                        // { q, type?, entityId?, entityType? }
    deleteHistory: (id) => unwrap(api.delete(`/search/history/${id}`)),
    clearHistory: () => unwrap(api.delete("/search/history")),
    popular: () => unwrap(api.get("/search/popular")),                                  // { terms:[{query,count}] } — distinct from #trending
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
  // Consultation V2 — mirrors docnet/lib/features/calls/calls_repository.dart.
  // Base: /api/v2/consultations (api-service) + /api/chat/consultations (chat-service).
  // Reuses every existing endpoint; introduces NO new backend logic.
  consults: {
    // ── Discovery ──────────────────────────────────────────────────────────
    discoverDoctors: (q = "") => unwrap(api.get(`/v2/consultations/doctors${q}`)),     // { doctors, nextCursor }
    getDoctor: (doctorId) => unwrap(api.get(`/v2/consultations/doctors/${doctorId}`)),  // { doctor }

    // ── Requester request flow ─────────────────────────────────────────────
    createRequest: (b) => unwrap(api.post("/v2/consultations/requests", b)),            // { doctorId, reason?, attachments[] } → { request }
    createPaymentOrder: (requestId) => unwrap(api.post(`/v2/consultations/requests/${requestId}/payment-order`, {})),
    confirmPayment: (requestId, b) => unwrap(api.post(`/v2/consultations/requests/${requestId}/payment-callback`, b)), // razorpay_* → { request }
    cancelRequest: (requestId) => unwrap(api.post(`/v2/consultations/requests/${requestId}/cancel`, {})),
    getRequest: (requestId) => unwrap(api.get(`/v2/consultations/requests/${requestId}`)),  // { request }
    listMyRequests: (q = "") => unwrap(api.get(`/v2/consultations/requests/mine${q}`)),      // { requests }
    myHistory: (q = "") => unwrap(api.get(`/v2/consultations/history/mine${q}`)),            // { history }

    // ── Doctor request flow ────────────────────────────────────────────────
    listDoctorRequests: (q = "") => unwrap(api.get(`/v2/consultations/doctor/requests${q}`)),  // { requests }
    getDoctorRequest: (requestId) => unwrap(api.get(`/v2/consultations/doctor/requests/${requestId}`)),
    approveRequest: (requestId, scheduledAtIso) => unwrap(api.post(`/v2/consultations/doctor/requests/${requestId}/approve`, { scheduled_at: scheduledAtIso })),
    declineRequest: (requestId, reason) => unwrap(api.post(`/v2/consultations/doctor/requests/${requestId}/decline`, reason ? { reason } : {})),
    doctorHistory: (q = "") => unwrap(api.get(`/v2/consultations/doctor/history${q}`)),         // { history }
    lifetimeEarnings: () => unwrap(api.get("/v2/consultations/doctor/earnings/lifetime")),       // { earnings }

    // ── Doctor settings ────────────────────────────────────────────────────
    getSettings: () => unwrap(api.get("/v2/consultations/doctor/settings")),                     // { settings }
    updateSettings: (patch) => unwrap(api.put("/v2/consultations/doctor/settings", patch)),      // { settings }

    // ── Doctor bank accounts (RazorpayX) ───────────────────────────────────
    listBankAccounts: () => unwrap(api.get("/v2/consultations/doctor/bank-accounts")),           // { accounts }
    addBankAccount: (b) => unwrap(api.post("/v2/consultations/doctor/bank-accounts", b)),        // → { account } (400 if RazorpayX verify fails)
    updateBankAccount: (accountId, b) => unwrap(api.put(`/v2/consultations/doctor/bank-accounts/${accountId}`, b)),
    setPrimaryAccount: (accountId) => unwrap(api.put(`/v2/consultations/doctor/bank-accounts/${accountId}/set-primary`, {})),
    deleteBankAccount: (accountId) => unwrap(api.delete(`/v2/consultations/doctor/bank-accounts/${accountId}`)),

    // ── Call lifecycle ─────────────────────────────────────────────────────
    joinCall: (requestId) => unwrap(api.post(`/v2/consultations/calls/${requestId}/join`, {})),
    endCall: (requestId, endReason = "completed") => unwrap(api.post(`/v2/consultations/calls/${requestId}/end`, { end_reason: endReason })),
    saveNotes: (requestId, notes) => unwrap(api.post(`/v2/consultations/calls/${requestId}/notes`, { notes })),
    // Finish Consultation: persists clinical summary + COMPLETED + auto-connect + notify.
    completeConsultation: (requestId, summary) => unwrap(api.post(`/v2/consultations/calls/${requestId}/complete`, summary)),

    // ── Ratings ────────────────────────────────────────────────────────────
    submitRating: (b) => unwrap(api.post("/v2/consultations/ratings", b)), // { consultationRequestId, stars, comment? }

    // ── Secure payment flow (Razorpay) ─────────────────────────────────────
    createPaymentIntent: (b) => unwrap(api.post("/v2/consultations/payment/create-order", b)),   // { doctorId, reason? } → { paymentIntentId, order, fees, doctor }
    verifyPayment: (b) => unwrap(api.post("/v2/consultations/payment/verify", b)),                // razorpay* + attachments[] → { request }
    uploadAttachment: (file) => { const f = new FormData(); f.append("file", file); return postForm("/v2/consultations/attachments", f); }, // → { attachment: { url, publicId, name } }
    getInvoice: (requestId) => unwrap(api.get(`/v2/consultations/payment/invoice/${requestId}`)), // { invoice }

    // ── E2EE consult chat (chat-service proxy) ─────────────────────────────
    getThread: (peerId, q = "") => unwrap(api.get(`/chat/consultations/threads/${peerId}${q}`)),  // { messages }
    sendThreadMessage: (peerId, b) => unwrap(api.post(`/chat/consultations/threads/${peerId}`, b)),
    markThreadRead: (peerId) => unwrap(api.post(`/chat/consultations/threads/${peerId}/read`, {})),
  },
  admin: {
    // ── Auth (env username/password → admin JWT stored in ADMIN_TOKENS) ──
    login: async (username, password) => {
      const { data } = await api.post("/admin/auth/login", { username, password });
      const p = data?.data ?? data;
      ADMIN_TOKENS.set(p.accessToken, p.refreshToken);
      return p; // { admin, accessToken, refreshToken }
    },
    me: () => unwrap(api.get("/admin/auth/me")),
    logout: async () => {
      try { await api.post("/admin/auth/logout", {}); } catch { /* ignore */ }
      ADMIN_TOKENS.clear();
    },

    // ── Dashboard ──
    overview: (refresh = false) => unwrap(api.get(`/admin/overview${refresh ? "?refresh=true" : ""}`)),

    // ── User administration ──
    users: (params = {}) => unwrap(api.get("/admin/users", { params })),
    user: (id) => unwrap(api.get(`/admin/users/${id}`)),
    suspendUser: (id, b) => unwrap(api.post(`/admin/users/${id}/suspend`, b || {})),
    unsuspendUser: (id) => unwrap(api.post(`/admin/users/${id}/unsuspend`, {})),
    deactivateUser: (id, b) => unwrap(api.post(`/admin/users/${id}/deactivate`, b || {})),
    deleteUser: (id, b) => unwrap(api.delete(`/admin/users/${id}`, { data: b || {} })),

    // ── Content moderation (post|research|thesis|case_study|reel|clinical_case) ──
    content: (params = {}) => unwrap(api.get("/admin/content", { params })),
    deleteContent: (type, id, b) => unwrap(api.delete(`/admin/content/${type}/${id}`, { data: b || {} })),

    // ── Doctor verifications ──
    vStats: () => unwrap(api.get("/admin/verifications/stats")),
    vList: (status = "SUBMITTED") => unwrap(api.get("/admin/verifications", { params: { status, limit: 50 } })),
    vDetail: (userId) => unwrap(api.get(`/admin/verifications/${userId}`)),
    vInReview: (userId) => unwrap(api.post(`/admin/verifications/${userId}/in-review`, {})),
    vApprove: (userId) => unwrap(api.post(`/admin/verifications/${userId}/approve`, {})),
    vReject: (userId, reason) => unwrap(api.post(`/admin/verifications/${userId}/reject`, { reason })),
    vReset: (userId) => unwrap(api.post(`/admin/verifications/${userId}/reset`, {})),

    // ── Student verifications ──
    svList: () => unwrap(api.get("/admin/student-verifications", { params: { limit: 50 } })),
    svApprove: (userId) => unwrap(api.post(`/admin/student-verifications/${userId}/approve`, {})),
    svReject: (userId, reason) => unwrap(api.post(`/admin/student-verifications/${userId}/reject`, { reason })),

    // ── Reported content ──
    reports: (status = "pending") => unwrap(api.get("/admin/reports", { params: { status, limit: 50 } })),
    dismissReport: (id) => unwrap(api.post(`/admin/reports/${id}/dismiss`, {})),
    deletePost: (id) => unwrap(api.delete(`/admin/posts/${id}`)),

    // ── Feedback / deletion queue / audit ──
    feedback: (params = {}) => unwrap(api.get("/admin/feedback", { params })),
    deletions: (params = {}) => unwrap(api.get("/admin/deletions", { params })),
    audit: (params = {}) => unwrap(api.get("/admin/audit", { params })),
  },
};
