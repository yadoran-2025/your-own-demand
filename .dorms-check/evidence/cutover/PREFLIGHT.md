# Cutover Preflight

- Firebase display name: inflation
- Firebase Project ID: inflation-2e38b
- Database ID: (default)
- Source location: nam5
- Target location: asia-northeast3
- Vercel scope/project: yadorans-projects/inflation-classroom
- Existing Firestore records are not migrated.
- Supabase remains untouched until Production verification and a separate approval.
- Firestore Seoul storage does not remove Firebase Authentication or Vercel overseas processing.
- Resolved root collection IDs: `classes`, `spaces`
- Destructive approval: human approved permanently deleting all data and records inside Firestore database `(default)` in Firebase project `inflation-2e38b`, currently located `nam5`, including root collections `classes` and `spaces`; approved deleting only that `(default)` database, not the Firebase project; approved recreating an empty Firestore database `(default)` in `asia-northeast3`.
- Approval timestamp (UTC): 2026-07-28T13:40:20Z
