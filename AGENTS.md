# AGENTS.md

## Project overview
This repository contains a static loyalty-card demo for a kebab restaurant. The UI is implemented in plain HTML, CSS, and JavaScript, and the app runs entirely in the browser without a build step or package manager.

The broader product goal and planned cloud/PWA architecture are documented in [docs/PROJECT-CONTEXT.md](docs/PROJECT-CONTEXT.md). Read it before making changes that affect authentication, persistence, QR handling, responsive behavior, or installation.

The main app lives in `club-kebab/`:
- `club-kebab/index.html` contains the app markup and DOM structure.
- `club-kebab/js/app.js` contains the business logic, Supabase authentication and data access, QR code handling, and menu management.
- `club-kebab/css/estilos.css` contains the styling.
- `club-kebab/js/supabase-config.js` contains the public Supabase URL and publishable key.
- `club-kebab/vendor/` contains the QR libraries loaded by the browser.
- `club-kebab/manifest.json` and `club-kebab/service-worker.js` provide the PWA installation and shell cache.
- `menu-fidelidad.html` is a small redirect page that sends users into the app directory.

## Working conventions
- Prefer minimal, direct changes in vanilla JavaScript and CSS. Do not introduce frameworks or build tooling unless the repository already contains them.
- Keep the user-facing language in Spanish, matching the existing interface and labels.
- Preserve the current DOM IDs and event wiring. The app relies on specific element ids such as `#formularioAcceso`, `#vistaApp`, `#listaMenu`, and `#codigoQr`, so avoid renaming them without updating the logic.
- Respect the existing role-based flow: the app distinguishes between `cliente` and `admin` sessions. Authentication, menu editing, and QR scanning are intentionally gated by session state.
- Treat Supabase as the source of truth for users, menu items, points, and point transactions. Do not reintroduce localStorage persistence for those records.
- Keep SQL changes in `supabase/migrations/` and document architecture decisions in `docs/`.
- Keep the app static and dependency-light. Supabase is loaded from its browser CDN, and QR functionality is driven by `qrcode.min.js` and `jsQR.min.js`.

## Validation workflow
- There is no Node build/test pipeline in this repo. Validation should be done by loading the app in a browser or serving the folder locally.
- To preview locally:
  - `python -m http.server 8000`
  - open `http://localhost:8000/` or `http://localhost:8000/club-kebab/`
- When changing UI behavior, verify the flow in the browser for both customer and admin sessions, especially Supabase login, menu filtering, QR read/manual input, and server-side points redemption.

## Good change patterns
- Favor small, targeted edits in the existing files.
- Keep logic readable and close to the relevant UI state or feature.
- If a new feature touches the menu or customer loyalty logic, ensure it still works with the localStorage data model.
- When adding new screens or controls, follow the existing patterns for `panel`, `acciones`, `modal`, and `texto-suave` classes to stay consistent with the design system.

## Avoid
- Do not add package.json, a bundler, or tests unless the project already requires them.
- Do not remove or rename existing IDs used by scripts without also updating the corresponding logic.
- Do not add a second backend or bypass Supabase security policies; persistence must remain in the configured cloud database.
