# Preparing for a native iPhone app

The web release is structured so a SwiftUI app can reuse its design and logic:

1. **Data model** — `src/db/types.ts` maps 1:1 to SwiftData/Core Data entities (see DATA_MODEL.md). UUID string ids and ISO dates are portable.
2. **Business rules** — `src/services/*` are UI-free functions. Pure rules worth porting first:
   `buildDoseSlots`, `vaccinationDueStatus`, `dueVaccinations`, `buildTimeline`, `filterTimeline`, `computeDueReminders`, `trendOf`.
3. **Validation** — `src/validation/schemas.ts` lists every field rule (lengths, date order, upload types/sizes).
4. **Design tokens** — DESIGN_TOKENS.md.
5. **Migration path** — the native app should import the PAWPASS backup JSON (format v1), so users move their history from the web app with one file.
6. **Reminders** — on iOS, replace in-app reminders with `UNUserNotificationCenter` local notifications using the same schedule data.
