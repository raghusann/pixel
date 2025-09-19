# AI Coding Agent Instructions for ai-photoe

## Project Overview
- This is a Next.js monorepo for an AI-powered photo editing platform.
- Main app is in `app/` (JS) and `my-app/` (TS), with shared components in `components/`.
- Convex is used for backend logic (`convex/`), including authentication and project management.
- Custom middleware and API routes are in `middleware.js` and `app/api/`.

## Architecture & Data Flow
- **Frontend:**
  - Uses Next.js App Router (`app/`), with nested routes for auth, dashboard, and editor.
  - UI components are modularized under `components/` and `app/(main)/editor/[projectId]/_components/`.
  - Editor tools are split into files in `app/(main)/editor/[projectId]/_components/_tools/`.
- **Backend:**
  - Convex functions in `convex/` handle data, auth, and project logic.
  - API endpoints (e.g., image upload) are in `app/api/`.
- **Styling:**
  - Uses global CSS (`app/globals.css`) and PostCSS config.

## Developer Workflows
- **Start Dev Server:**
  - `npm run dev` (from project root)
- **Build:**
  - `npm run build`
- **Lint:**
  - `npm run lint`
- **Convex Dev:**
  - `npx convex dev` (run in `convex/` for backend functions)
- **TypeScript:**
  - `my-app/` uses TS, main app uses JS. Maintain type safety in TS files.

## Conventions & Patterns
- **Component Structure:**
  - Prefer functional components, colocate styles and logic.
  - Use `_components/` and `_tools/` folders for feature grouping.
- **Routing:**
  - Dynamic routes use `[param]` and nested folders.
  - Auth routes are under `app/(auth)/`.
- **State & Data:**
  - Use hooks from `hooks/` for data fetching and state.
  - Context is managed in `context/context.jsx`.
- **API Integration:**
  - Image uploads via `app/api/imagekit/upload/route.js`.
  - Convex API for data and auth.

## External Dependencies
- Next.js, Convex, ImageKit, PostCSS, ESLint.
- See `package.json` for full list.

## Key Files & Directories
- `app/` - Main Next.js app (JS)
- `my-app/` - Secondary Next.js app (TS)
- `components/` - Shared UI components
- `convex/` - Backend logic and schema
- `hooks/` - Custom React hooks
- `context/` - React context providers
- `app/api/` - API routes

## Example Patterns
- Editor tool: `app/(main)/editor/[projectId]/_components/_tools/ai-edit.jsx`
- Convex function: `convex/projects.js`
- Auth page: `app/(auth)/sign-in/[[...sigh-in]]/page.jsx`

---
For unclear conventions or missing documentation, ask for clarification or request examples from maintainers.