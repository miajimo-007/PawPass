# PAWPASS

**A personal digital health record for every cat.**
Local-first, offline-capable, installable web app. No accounts, no cloud — every record stays on the device.

- Multiple cat profiles, each with its own medical history
- Medical records timeline (consultations, labs, imaging, surgery, …) with search and filters
- Medications with dose times, a daily given/skipped checklist and in-app reminders
- Vaccinations with vet-confirmed due dates and overdue alerts
- Appointments with preparation notes, reminders and visit records
- Weight, water and activity charts; owner observations (appetite, vomiting, stool, urination, behaviour)
- Document vault (PDFs, lab results, prescriptions, photos) stored as Blobs in IndexedDB
- JSON backup & restore with preview, duplicate detection and per-section export
- Storage monitor, persistent-storage request, safe handling of quota errors
- Fictional demo cats (Luna, Milo, Oliver) that can be reset or removed without touching your data
- Themes: light / dark / auto, 9 colour themes and a custom colour (contrast-checked)
- Printable / PDF: vet visit summary, pet sitter card, lost-cat poster
- Emergency screen: warning signs, common poisons, one-tap call to your vet and emergency contact

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui-style components (Radix) · Lucide · React Hook Form · Zod · Recharts · Dexie.js (IndexedDB) · vite-plugin-pwa (Workbox)

## Project structure

```
src/
  db/            types.ts (data model) · migrations.ts (versioned schema) · database.ts (Dexie)
  services/      business logic, UI-free: cats, records, medications, vaccinations,
                 appointments, health, documents, backup, storage, reminders, demo
  validation/    Zod schemas shared by forms and services
  lib/           dates, units, labels, utilities
  hooks/         reactive data hooks (dexie-react-hooks)
  components/
    ui/          design-system primitives (button, input, card, dialog, badge, …)
    layout/      app shell, bottom nav (mobile), sidebar (desktop), header
    forms/       all create/edit forms + ActionsProvider (opens any form from anywhere)
    shared/      cat avatar, timeline, dose list, document viewer, reminders, …
  pages/         Home, My Cats, Cat detail, Health, Records (5 tabs), Profile, Data, Privacy, Install
  test/          Vitest suites (run against fake-indexeddb)
docs/            DATA_MODEL.md · DESIGN_TOKENS.md · IOS_READINESS.md
public/icons/    PWA and Apple touch icons
.github/workflows/deploy.yml   lint → test → build → deploy to GitHub Pages
```

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit/integration tests
npm run lint
npm run build      # production build in dist/
npm run preview    # serve the production build (service worker active)
```

## Upload to GitHub

1. Create a new repository on GitHub (e.g. `pawpass`). Public repositories get GitHub Pages on every plan; private repositories need a paid plan for Pages.
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "PAWPASS initial release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/pawpass.git
   git push -u origin main
   ```
   On Windows without git, you can also use GitHub Desktop, or drag the files into **Add file → Upload files** on github.com (make sure the hidden `.github` folder is included).

## Deploy to GitHub Pages

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the workflow from the **Actions** tab). The workflow installs dependencies, lints, runs the tests, builds with the correct base path (`/<repo-name>/`) and deploys.
3. Your app is live at `https://<your-username>.github.io/<repo-name>/`.

Routing uses hash URLs (`…/#/records`), so refreshes and deep links work on GitHub Pages without server rewrites.

**Lockfile:** the first workflow run generates `package-lock.json` and uploads it as a build artifact named `package-lock`. Download it from the run summary, commit it to the repository root, and later runs will use `npm ci` for reproducible installs. (Running `npm install` locally and committing the lockfile does the same.)

## Install as an app (PWA)

- **iPhone/iPad:** open the site in Safari → Share → **Add to Home Screen**.
- **Android:** Chrome menu → **Install app**.
- **Desktop:** install icon in the Chrome/Edge address bar.

After the first visit the app shell is cached and PAWPASS works fully offline. Note: on iPhone the Home Screen app and Safari have **separate storage** — pick one, or move data with a backup.

## Backup & restore

- **Profile → Data management → Export complete backup** downloads `pawpass-backup-YYYY-MM-DD.json` containing every table, with documents and photos embedded as base64. Single sections (cats, records, medications, …) can also be exported.
- **Restore from backup** validates the file, shows a per-section preview (new / already present / invalid), lets you skip or replace duplicates, asks for confirmation, then imports everything in one transaction. Original IDs and timestamps are preserved; nothing already on the device is deleted. A report shows added, replaced, skipped and failed entries.
- Backups are **not encrypted**. Store them like any medical document.

## Privacy

> Your cat's health records are stored locally on this device. PAWPASS does not upload your personal records to a cloud database.

Data does not sync between devices; clearing browser data deletes it; browser storage is not guaranteed permanent; anyone with access to the device and browser profile may be able to view it. IndexedDB is not encrypted by PAWPASS. The service worker caches only the app shell (code, styles, fonts, icons) — never records.

## Data safety rules built in

- Schema changes go through versioned, additive migrations (`src/db/migrations.ts`); upgrades never delete or overwrite values (covered by tests).
- Related writes (e.g. deleting a cat and its history, completing an appointment and creating its visit record, importing a backup) run in IndexedDB transactions — all or nothing.
- If storage runs out, the write is rolled back and a clear message is shown; existing records are untouched.
- Every delete asks for confirmation; deleting a cat or all data requires typing `DELETE`.
- PAWPASS never calculates doses, never invents vaccine schedules, and never labels a cat healthy because records are missing. Owner-entered and veterinarian-provided information are labelled separately.

## Testing

`npm test` runs Vitest suites against an in-memory IndexedDB (fake-indexeddb):

| Suite | Covers |
|---|---|
| cats | multiple cats, edit, delete with cascade, selected cat |
| records | create/update, timeline order, search/filter, unlinking |
| medications | schedules, given/skipped/not-recorded, course dates, cascade delete |
| vaccinations | overdue / due-soon / upcoming, superseded doses |
| appointments-health | upcoming/past-due, complete/cancel/delete, measurements, trends, unit conversion, age |
| documents | Blob persistence across DB close/reopen (refresh), validation, unlinking |
| backup | full round-trip incl. blobs, ids and dates; duplicate skip/replace; invalid & orphan rows; bad files |
| quota | quota error detection, no data loss, full import rollback |
| migrations | v1 → latest upgrade preserves data, back-fills defaults, new indexes |
| demo-reminders | demo seed/reset/remove isolation; dose and appointment reminders, no duplicates |

The CI workflow also verifies the production build output and base path (`dist/index.html`, `manifest.webmanifest`, `sw.js`).

## Remaining limitations

- Reminders appear only while PAWPASS is open (no push server by design). System notifications, if allowed, show while the app is in the background but still running.
- Browser storage limits apply (Safari can be stricter); very large document libraries may hit quota — the app warns at 80% usage.
- HEIC photos are stored and downloadable but cannot be previewed in browsers that don't support HEIC.
- No dark mode yet; light theme only.
- Data does not sync across devices — use backup/restore.
- Not a medical device; does not provide veterinary advice.

## Future iPhone app

See `docs/IOS_READINESS.md`. Business logic (`src/services`), data model (`src/db/types.ts`), validation (`src/validation`) and design tokens (`docs/DESIGN_TOKENS.md`) are UI-independent and documented for a native SwiftUI port. The backup JSON format is the planned migration path from the web app to the native app.
