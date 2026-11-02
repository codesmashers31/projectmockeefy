# Phase 3: Advanced State Management Audit & Recommendations

**Audit Target:** Client State Architecture (`client/src/context`, `client/src/hooks`, Component Local State)  
**Date:** November 1, 2026  
**Auditor:** Senior React Architect  

---

## 1. Existing State Architecture Assessment

The Mockeefy frontend currently employs a multi-tiered state management model:

| Layer | Technology | Usage in Mockeefy | Health Status |
|---|---|---|---|
| **Global Client State** | React Context API | `AuthContext` (User session, JWT, membership, role) & `ResumeContext` (builder state) | **Healthy & Stable** |
| **Server State Caching** | `@tanstack/react-query` v5.83 | Mounted at root (`App.tsx`), selectively used for server queries | **Underutilized** |
| **Local Component State** | `useState`, `useReducer`, `useRef` | Modals, date picker, form steps, filters | **Healthy** |
| **Persistent Storage** | `localStorage` | Auth tokens (`token`), user profile cache (`user`), theme preferences | **Optimized** |
| **Realtime Push State** | `socket.io-client` | Live notifications, meeting signaling, session status sync | **Healthy** |

---

## 2. Evaluation: Do We Need Redux / Redux Toolkit?

### Decision: **DO NOT INTRODUCE REDUX / REDUX TOOLKIT.**

#### Justification:
1. **Low Cross-Domain State Mutation:** Mockeefy's user flows (booking a mentor, paying for subscription, editing profile, attending a live meeting) operate largely in isolated, sequential workflows. There is no heavy cross-domain client mutation that necessitates Redux's centralized global store.
2. **Boilerplate & Bundle Overhead:** Introducing Redux Toolkit (`@reduxjs/toolkit` and `react-redux`) would add ~40 KB minified to the bundle, require slices, reducers, and thunks for every entity, and increase developer onboarding friction with zero measurable performance benefit.
3. **Server State Belongs in React Query:** 90% of the state in Mockeefy is **asynchronous server state** (mentor profiles, bookings, categories, notifications, transactions). Storing server state in Redux requires manual handling of loading states, error states, refetching, and cache invalidation—all of which `@tanstack/react-query` already handles out-of-the-box.
4. **Context API is Performing Well:** `AuthContext` changes infrequently (login, logout, subscription upgrade). Because `AuthContext` is low-frequency, it does NOT cause widespread re-render cascades across the DOM tree.

---

## 3. Server State & Cache Invalidation Strategy (TanStack Query)

While `@tanstack/react-query` is already installed in `client/package.json` and mounted in `App.tsx`, several components bypass it and use raw Axios calls in `useEffect`.

### Identified Inefficiencies
1. **Uncached Mentor Directory (`/find-mentor`):**
   - Currently, navigating away from `/find-mentor` and returning re-executes `GET /api/expert` from scratch, displaying a skeleton loader every time.
   - **Recommendation:** Convert to `useQuery`:
     ```typescript
     const { data: experts, isLoading } = useQuery({
       queryKey: ['experts', filters],
       queryFn: () => fetchExperts(filters),
       staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
       gcTime: 15 * 60 * 1000,    // Retain in cache for 15 minutes
     });
     ```
2. **Immediate Cache Invalidation on Payment & Booking:**
   - When a candidate purchases a subscription or books a session, the following cache keys must be invalidated deterministically:
     - `queryClient.invalidateQueries({ queryKey: ['user-sessions'] });`
     - `queryClient.invalidateQueries({ queryKey: ['user-profile'] });`
     - `queryClient.invalidateQueries({ queryKey: ['notifications'] });`
   - This ensures the UI instantly reflects new membership status or confirmed slots without requiring a hard browser refresh.

---

## 4. Local Storage & Auth Hydration Rules

- **Rule 1:** Never store sensitive payment credentials or raw credit card data in `localStorage`.
- **Rule 2:** `AuthContext` must hydrate synchronously from `localStorage` on initial mount to eliminate layout shifts and route bounces:
  ```typescript
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  ```
- **Rule 3:** Synchronize multi-tab logouts by attaching a `storage` event listener on `window` to clear state if the auth token is removed in another tab.

---

## 5. Summary Recommendation Matrix

| State Type | Mechanism | Invalidation / Lifecycle Policy |
|---|---|---|
| User Authentication & Role | `AuthContext` + `localStorage` | Replaced on Login/Logout/Subscription Upgrade; sync across tabs |
| Mentor List & Categories | `TanStack Query` | 5-minute stale time; background refetch on window focus |
| User Sessions & Bookings | `TanStack Query` | Invalidated immediately upon payment confirmation or session cancel |
| Resume Builder Draft | `ResumeContext` + Local State | Kept in memory during session; debounced autosave to backend |
| Modal & UI Toggles | Component `useState` | Disposed when component unmounts |
| Global Realtime Alerts | Socket.IO -> Sonner Toast | Ephemeral; dispatched straight to toast and cached in `Notification` DB |
