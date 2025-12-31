# Code Duplication & Analysis Report

## Executive Summary
An analysis of the codebase reveals several areas of code duplication, usage of "zombie" (unused) components, and redundant logic. Addressing these will improve maintainability, reduce bundle size, and prevent inconsistencies.

## 1. Unused "Zombie" Components
The following components exist in the codebase but appear to be completely unused. They are candidates for deletion or integration.
- **`src/components/layout/Sidebar.jsx`**: This component implements a sidebar but is not imported in `App.jsx`, `Feed.jsx`, or `Navbar.jsx`. The actual sidebar logic seems to reside within `Navbar.jsx`.
- **`src/components/feed/CreatePostBox.jsx`**: This component (likely a feed-header post creator) is not used. The active post creation flow uses `pages/create-post.jsx`.

## 2. Navigation Logic Duplication
Navigation items and structure are defined in three separate places, making it difficult to update links globally.
- **`Navbar.jsx`**: Defines `navItems` array and logic for the desktop sidebar/navbar.
- **`MobileNavbar.jsx`**: Manually hardcodes the same navigation items (Home, Create, Explore, Direct, Profile) with different markup.
- **`Sidebar.jsx` (Unused)**: Also hardcodes these items.
**Recommendation**: Create a centralized configuration file (e.g., `src/config/navigation.js`) exporting the list of routes, icons, labels, and paths to be consumed by all navigation components.

## 3. Redundant Authentication Logic
Authentication token retrieval and checking logic is repeated across services.
- **`services/api.js`**: correctly sets up an Axios interceptor to inject the `Authorization` header automatically.
- **`services/posts.service.js`**: `verifyAuth()` manually checks for the token and user in `localStorage` before every method call.
**Recommendation**: Rely on the `api.js` interceptor. If `api.js` handles the token injection, the manual checks in individual service methods are redundant checks that add noise.

## 4. Modal Component & Styling Duplication
Multiple modal implementations share identical logic and structural patterns but implement them independently.
- **Overlay Styling**: `SettingsModal.jsx` uses `styled-jsx` for the overlay, `ImageModal.jsx` uses inline `style={{...}}`, and `ConfirmModal.jsx` uses a CSS class.
- **Close Logic**: Close button UI and "click outside to close" logic are repeated.
**Recommendation**: Create a generic `<ModalWrapper>` or `<Overlay>` component that handles the backdrop, sizing, and close actions, accepting the specific modal content as `children`.

## 5. Local Component Redundancy
- **`src/components/common/ImageModal.jsx`**: Imports `ChevronLeft` and `ChevronRight` from `../common/Icons` but ignores them, instead defining local `IconLeft` and `IconRight` components within the file. This defeats the purpose of the shared Icon library.
- **User Data Fetching**: `Navbar.jsx` (line 74) manually parses `localStorage.getItem('user')` and provides a fallback. This logic is also seen in service files. A `useUser` hook or Context would centralize this.

## 6. CSS & API Key Checks
- **API Keys**: `services/giphy.service.js` repeats the check `if (!GIPHY_API_KEY)` in every method.
- **CSS**: There is a mix of vanilla CSS files (`.css`), `styled-jsx` tags, and inline styles. Standardizing this strategy will reduce style duplication (e.g., overlay backgrounds).

## Action Plan
1.  **Delete** `Sidebar.jsx` and `CreatePostBox.jsx` if confirmed unused.
2.  **Refactor** `posts.service.js` to trust `api.js` for auth headers.
3.  **Centralize** navigation config in a constant file.
4.  **Cleanup** `ImageModal.jsx` to use shared icons.
