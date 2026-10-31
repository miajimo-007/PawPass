# PAWPASS data model

Source of truth: `src/db/types.ts` (TypeScript) and `src/db/migrations.ts` (IndexedDB schema).

All entities: `id` (UUID v4), `createdAt`, `updatedAt` (ISO 8601), optional `isDemo` (fictional sample data).
Calendar dates are `YYYY-MM-DD`; moments are full ISO timestamps. Measurements use canonical units: **kg, ml, minutes**.

```
Cat 1───* MedicalRecord ───* DocumentFile (via documentIds[])
 │  1───* Diagnosis (conditions)
 │  1───* Allergy
 │  1───* Medication 1───1 MedicationSchedule (times[], remindersEnabled)
 │                   1───* MedicationLog (scheduledFor, given|skipped)
 │  1───* Vaccination ───* DocumentFile
 │  1───* Appointment 0..1───0..1 MedicalRecord (linkedRecordId / appointmentId)
 │  1───* Measurement (weight | water | activity)
 │  1───* SymptomLog (appetite, water, activity, vomiting, stool, urination, behavior, symptom)
 │  1───* DocumentFile (Blob + metadata)
Clinic (name, address, phone) — autocomplete only
AppNotification — reminders already shown (dedupe key)
Preferences — single row "prefs" (units, selected cat, last backup)
AuditEvent — append-only activity log
```

| Table | Indexes |
|---|---|
| cats | id, name, createdAt |
| medicalRecords | id, catId, category, date, source, [catId+date] |
| diagnoses | id, catId, status |
| allergies | id, catId |
| medications | id, catId, status, startDate |
| medicationSchedules | id, medicationId, catId |
| medicationLogs | id, medicationId, catId, scheduledFor, [medicationId+scheduledFor] |
| vaccinations | id, catId, dateGiven, nextDueDate |
| appointments | id, catId, dateTime, status |
| clinics | id, name |
| measurements | id, catId, type, measuredAt, [catId+type] |
| symptomLogs | id, catId, category, observedAt |
| documents | id, catId, category, date |
| notifications | id, &key, kind, dueAt |
| preferences | id |
| auditEvents | id, at, entity |

## Backup file format (v1)

```json
{
  "format": "pawpass-backup",
  "formatVersion": 1,
  "schemaVersion": 2,
  "exportedAt": "2026-10-31T12:00:00.000Z",
  "scope": "full",
  "app": { "name": "PAWPASS", "version": "1.0.0" },
  "tables": { "cats": [ … ], "documents": [ { "blob": { "__blob": true, "type": "application/pdf", "data": "<base64>" } } ] }
}
```
