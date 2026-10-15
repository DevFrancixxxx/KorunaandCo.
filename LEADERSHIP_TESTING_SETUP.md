# Leadership testing — setup and handover

This revision prepares the existing demo for shared-access testing. It has not been deployed or tested against a live database.

## Changes
- Authenticated members can read their own membership record, allowing the snapshot read policy to work.
- Saves are serialised; newer edits wait for the previous save to finish.
- A failed save stops automatic retries, preserving changes for JSON export.
- Reload warns before discarding unsaved changes; closing the page warns while edits remain unsaved.
- Import confirmation now explains that cloud imports replace shared project data.

## Account setup
1. Use an organisation-owned Supabase project and hosting account.
2. Run supabase_schema.sql using the database SQL editor.
3. Invite the approved testers in Authentication and add each user UUID to project_members with viewer, editor, or admin role.
4. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the approved project. Never use a service-role key in the frontend.
5. Configure the authentication site URL and allowed callback URL for the deployed host.
6. Build and deploy, then sign in as an admin/editor and import only the approved demo data.

## Required acceptance checks
- Signed-out visitor cannot read project rows or call the save function.
- Signed-in user without membership cannot read or save.
- Viewer can read; database rejects writes. Viewer controls still appear editable in this prototype, so use editors for editing tests and explain this limitation to viewers.
- Editor can change a task and see it after signing in on another browser and selecting Reload shared data.
- Two editors loading the same version: first save succeeds; stale second save is rejected. Second editor exports changes before reload and reapplies them manually.
- Edits made while a save is running are saved afterwards.
- A failed save displays a failure message; export retains unsaved work.
- Reload warns before discarding unsaved edits.

## Limits
Shared updates require reload; live push updates are not implemented. A whole-project snapshot is saved with a version check; concurrent changes are rejected rather than merged. JSON export is manual backup, not a verified automatic backup service. Build validation and the live acceptance checks must pass before leadership testing. Do not upload real KC data until the actual deployment and access controls have been reviewed.
