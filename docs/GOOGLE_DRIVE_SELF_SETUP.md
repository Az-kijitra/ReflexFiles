# Google Drive Self-Setup Guide (User-Owned Google Cloud)
Updated: 2026-02-21

## Purpose
ReflexFiles is public on GitHub, so shared Google API credentials are not distributed.
Each user configures and owns their own Google Cloud project and OAuth client.

## Important Current Scope
1. ReflexFiles Google Drive integration is being delivered in phases.
2. If backend mode is `Real Google Drive API`, `gdrive://root/my-drive` lists real Drive data.
3. If backend mode is `Stub (virtual test data)`, `gdrive://` paths still show virtual test data.
4. In `Real Google Drive API` mode, file content viewing is available for viewer-supported types (text/markdown/image).
5. Editing/write-back to Google Drive is manual (context menu: `Write Back to Google Drive`).
6. Google Drive read files are cached in local temp for viewing and are cleared on Google Drive sign-out.
7. Opening a Google Drive file in an external app uses a local workcopy; automatic upload-back is not performed.
8. Upload-back is manual: use context menu `Write Back to Google Drive` on the same Google Drive file.
9. Write-back requires OAuth scope `https://www.googleapis.com/auth/drive`.

## Security Rules (Mandatory)
- Do not publish API keys, OAuth client secrets, or tokens in GitHub.
- Do not commit `.env` files containing credential values.
- Keep credentials only in your own local environment / Google Cloud project.

## Cost (Important)
1. Official Google Drive API docs state Drive API usage is available at no additional cost.
2. The same docs state that exceeding request quotas does not result in extra billing.
3. However, if you enable other paid Google Cloud services in the same project, those services can still generate charges.
4. So the correct model is: Drive API itself is no-additional-cost, but project-level billing risk exists if paid services are enabled.

## No-Charge Operating Rules (Recommended)
1. Use a dedicated Google Cloud project only for ReflexFiles.
2. Enable only `Google Drive API` in that project.
3. Do not request quota increases.
4. If a billing account is linked, always configure budget alerts.
5. Regularly check Billing reports and keep monthly cost at 0.
6. If you require strict no-charge operation, unlink billing from that project (some cloud features may become unavailable).

## Monthly No-Charge Checklist
1. Select the target project in Google Cloud Console.
2. Open `Billing`.
3. Verify monthly cost is `¥0` / `$0`.
4. If non-zero, review enabled APIs and disable non-Drive services.

## Prerequisites
- A Google account
- Access to Google Cloud Console
- ReflexFiles build that includes Google Drive auth settings UI

## Step A: Google Cloud Setup
### 1. Create or select a project
1. Open Google Cloud Console.
2. Click the project selector in the top bar.
3. Create a project (example: `ReflexFiles Personal`).
4. Make sure that project is selected.

### 2. Configure Google Auth Platform
1. Open `Google Auth Platform`.
2. In Overview, fill required app information.
3. Example values:
   - App name: `ReflexFiles Personal`
   - User support email: your email
   - Developer contact: your email
4. `External` user type is usually fine for personal testing.

### 3. Enable Google Drive API
1. Open `APIs & Services` -> `Library`.
2. Enable `Google Drive API`.

### 4. Configure OAuth consent screen
1. Open `APIs & Services` -> `OAuth consent screen`.
2. Fill required fields and save.
3. If your Gmail is shown as "ineligible" in Test users:
   - project Owner/Editor may already be allowed without explicit test-user entry.
   - try auth first, then revisit IAM/consent settings only if auth fails.

### 5. Create OAuth client (Desktop)
1. Open `APIs & Services` -> `Credentials`.
2. Create `OAuth client ID`.
3. Select application type `Desktop app`.
4. Save:
   - Client ID (required)
   - Client secret (optional; use only if needed)

## Step B: ReflexFiles Setup
### 1. Open settings
1. Launch ReflexFiles.
2. Open Settings and go to the Google Drive auth block under Advanced.

### 2. Fill fields
1. OAuth Client ID: your client ID.
2. OAuth Client Secret (optional): leave blank normally.
   - If entered and sign-in succeeds, it is stored in OS secure credential storage (not in `config.toml`).
3. OAuth Redirect URI: default `http://127.0.0.1:45123/oauth2/callback` (must match exactly).

### 3. Start sign-in
1. Click Start Sign-In.
2. Complete Google account login/consent in browser.

### 4. Callback URL capture (automatic)
1. After consent, ReflexFiles auto-fills Callback URL.
2. Only if auto-capture fails, copy full URL from browser address bar (must include both `state` and `code`) and paste manually.

### 5. Complete sign-in
1. Confirm Callback URL is auto-filled (or paste manually if empty).
2. Enter Account ID (email).
3. Click Complete Sign-In.
4. Success message means auth session is updated.
5. Confirm auth phase is Authorized.
6. If backend mode is `Stub (virtual test data)`, `gdrive://` paths are still test data, not real Drive files.
7. After one successful sign-in, ReflexFiles reuses saved credentials on next launch and reconnects automatically when `gdrive://` is accessed.
8. On sign-out, saved refresh token is cleared and downloaded Google Drive read-cache files are removed from local temp.

## Publish-Safe Checklist
1. Client secret is not committed.
2. Tokens are not present in logs/docs/screenshots/PR text.
3. Public docs use placeholders only.

## Troubleshooting
1. `Google token exchange failed: client_secret is missing.`
   - Fill optional client secret and retry Complete Sign-In.
2. Browser `ERR_CONNECTION_REFUSED`
   - expected; copy full address-bar URL and continue.
3. callback parse error (`state`/`code` missing)
   - paste full callback URL, not partial text.
4. `redirect_uri_mismatch`
   - ensure exact URI match between app and Google config.
5. Auth succeeds but only mock files appear
   - check `Backend mode`; if it is `Stub`, your build is stub mode and real Drive data is unavailable.
6. Write-back says no local workcopy
   - open the file once in an external app first (this creates local workcopy).
7. Write-back conflict
   - Cause: the Google Drive file was updated after your local workcopy was created.
   - Current behavior: ReflexFiles blocks upload on conflict and keeps your previous base revision (it does not auto-advance to latest remote revision).
   - On conflict, ReflexFiles also opens Settings automatically at the conflict guidance area.
   - Safe recovery steps:
     1. Do not repeat `Write Back to Google Drive` immediately.
     2. In ReflexFiles, open the same Google Drive file again in external app (this creates/refreshes local workcopy against latest remote).
     3. Manually merge your pending local edits into that latest workcopy (use your editor/diff tool).
     4. Save merged content locally.
     5. Run `Write Back to Google Drive` again.
     6. Confirm success status (`Uploaded local workcopy to Google Drive: ...`).
   - If conflict repeats, another user/process is still updating remote; repeat merge from latest remote state.
8. `Request had insufficient authentication scopes` on write-back
   - Your token was authorized with read-only scope. Run `Sign Out`, then `Start Sign-In` and `Complete Sign-In` again so ReflexFiles obtains `https://www.googleapis.com/auth/drive`.

## References (Official)
- Google Drive API Usage limits / Pricing:
  - https://developers.google.com/drive/api/guides/limits
- Cloud Billing: modify project billing:
  - https://cloud.google.com/billing/docs/how-to/modify-project
- Cloud Billing: budgets and alerts:
  - https://cloud.google.com/billing/docs/how-to/budgets
