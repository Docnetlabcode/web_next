# Graph Report - src  (2026-06-16)

## Corpus Check
- Corpus is ~46,317 words - fits in a single context window. You may not need a graph.

## Summary
- 382 nodes · 1003 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Posts, Reels & Sharing|Posts, Reels & Sharing]]
- [[_COMMUNITY_UI Primitives & Profile|UI Primitives & Profile]]
- [[_COMMUNITY_App Shell & Routing|App Shell & Routing]]
- [[_COMMUNITY_Home Feed & Settings|Home Feed & Settings]]
- [[_COMMUNITY_Profile Edit Forms|Profile Edit Forms]]
- [[_COMMUNITY_API Layer & Admin|API Layer & Admin]]
- [[_COMMUNITY_Auth & Login|Auth & Login]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Auth Context & Sockets|Auth Context & Sockets]]
- [[_COMMUNITY_Notifications|Notifications]]
- [[_COMMUNITY_Media Editor|Media Editor]]
- [[_COMMUNITY_Comments|Comments]]
- [[_COMMUNITY_Network & Connections|Network & Connections]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 75 edges
2. `useAuth()` - 52 edges
3. `useNavigate()` - 46 edges
4. `dok` - 33 edges
5. `compact()` - 28 edges
6. `useToast()` - 27 edges
7. `Avatar()` - 26 edges
8. `Verified()` - 19 edges
9. `roleLabel()` - 14 edges
10. `timeAgo()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `PhotoUploader()` --calls--> `cn()`  [EXTRACTED]
  components/profile/PhotoUploader.tsx → lib/utils.ts
- `Toggle()` --calls--> `cn()`  [EXTRACTED]
  components/profile/ProfileForms.tsx → lib/utils.ts
- `DocTile()` --calls--> `cn()`  [EXTRACTED]
  components/profile/ProfileForms.tsx → lib/utils.ts
- `CountrySelect()` --calls--> `cn()`  [EXTRACTED]
  components/ui/CountrySelect.tsx → lib/utils.ts
- `ProfileMenu()` --calls--> `useToast()`  [EXTRACTED]
  screens/UserProfile.tsx → components/ui/Toast.tsx

## Communities (13 total, 1 thin omitted)

### Community 0 - "Posts, Reels & Sharing"
Cohesion: 0.07
Nodes (36): canEditPost(), EditPostModal(), LikesSheet(), PostCard(), renderContent(), Rail(), ReelViewer(), rid() (+28 more)

### Community 1 - "UI Primitives & Profile"
Cohesion: 0.07
Nodes (27): CommentsSheet(), UserCard(), Page(), useParams(), useSearchParams(), avatarColor(), compact(), initials() (+19 more)

### Community 2 - "App Shell & Routing"
Cohesion: 0.05
Nodes (22): metadata, AppLayout(), NAV, SECTIONS, Bullets(), Note(), SECTIONS, SECTIONS (+14 more)

### Community 3 - "Home Feed & Settings"
Cohesion: 0.08
Nodes (22): useAuth(), RightRail(), useNavigate(), Explore(), DoctorStatsStrip(), FALLBACK_SPECIALTIES, Feed(), PeopleYouMayKnow() (+14 more)

### Community 4 - "Profile Edit Forms"
Cohesion: 0.08
Nodes (21): BasicContactForm(), blankEdu, blankJob, blankPub, dateInput(), DOC_TILES, DocTile(), EducationForm() (+13 more)

### Community 5 - "API Layer & Admin"
Cohesion: 0.08
Nodes (17): metadata, api, dok, isRefreshCall, k, postForm(), setAdminKey(), unwrap() (+9 more)

### Community 6 - "Auth & Login"
Cohesion: 0.11
Nodes (15): COUNTRIES, firebaseConfig, firebaseEnabled, confirmPhoneCode(), deviceInfo(), getDeviceId(), getRecaptcha(), resetRecaptcha() (+7 more)

### Community 7 - "Landing Page"
Cohesion: 0.13
Nodes (9): Page(), useCountUp(), useScrollReveal(), FEATURES, Landing(), ROLES, SAMPLE, Showcase() (+1 more)

### Community 8 - "Auth Context & Sockets"
Cohesion: 0.17
Nodes (10): metadata, viewport, AuthCtx, AuthProvider(), profileComplete(), TOKENS, connectSocket(), disconnectSocket() (+2 more)

### Community 9 - "Notifications"
Cohesion: 0.19
Nodes (7): routeFor(), uid(), timeAgo(), ICON, Notifications(), Row(), TABS

### Community 10 - "Media Editor"
Cohesion: 0.2
Nodes (6): FILTERS, fmt(), RATIOS, TEXT_COLORS, TRACKS, TrimBar()

### Community 11 - "Comments"
Cohesion: 0.33
Nodes (7): cid(), CommentNode(), CommentThread(), Composer, normalize(), renderRich(), uid()

## Knowledge Gaps
- **64 isolated node(s):** `metadata`, `viewport`, `metadata`, `metadata`, `metadata` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Posts, Reels & Sharing` to `UI Primitives & Profile`, `App Shell & Routing`, `Home Feed & Settings`, `Profile Edit Forms`, `API Layer & Admin`, `Auth & Login`, `Notifications`, `Media Editor`, `Comments`, `Network & Connections`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Home Feed & Settings` to `Posts, Reels & Sharing`, `UI Primitives & Profile`, `App Shell & Routing`, `Profile Edit Forms`, `API Layer & Admin`, `Auth & Login`, `Auth Context & Sockets`, `Notifications`, `Comments`, `Network & Connections`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `useNavigate()` connect `Home Feed & Settings` to `Posts, Reels & Sharing`, `UI Primitives & Profile`, `App Shell & Routing`, `Profile Edit Forms`, `API Layer & Admin`, `Auth & Login`, `Notifications`, `Comments`, `Network & Connections`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `metadata` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Posts, Reels & Sharing` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `UI Primitives & Profile` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `App Shell & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._