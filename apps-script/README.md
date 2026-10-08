# Google Apps Script Backend Setup Guide

This document provides instructions for deploying the Google Apps Script API layer for the Personal Budget Web App.

---

## Architecture Overview

```
Next.js Application (Server Layer)
        │
        │ HTTPS POST with X-Signature / secretToken
        ▼
Google Apps Script (Web App Endpoint)
        │
        │ LockService + SpreadsheetApp API
        ▼
Google Sheets Persistence
```

---

## 1. Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.new) in your Google account.
2. Name the sheet (e.g. `Budget App Production Store`).
3. You do not need to create sheets or column headers manually; the script initializes all sheets (`Users`, `Accounts`, `Categories`, `Transactions`, `Budgets`, `RecurringRules`, `AuditLogs`) on first access.

---

## 2. Install the Script

1. In your Google Sheet, click **Extensions** > **Apps Script**.
2. Replace all existing code in `Code.gs` with the contents of [`Code.gs`](./Code.gs).
3. If visible, ensure `appsscript.json` includes the Web App configuration matching [`appsscript.json`](./appsscript.json).

---

## 3. Set the Shared Secret

To secure server-to-server communication between Next.js and Apps Script:

1. In the Apps Script editor, click the **Project Settings** (gear icon) on the left sidebar.
2. Scroll down to **Script Properties**.
3. Click **Add script property**:
   - **Property**: `APPS_SCRIPT_SHARED_SECRET`
   - **Value**: Generate a strong random 32+ character secret (e.g., using `openssl rand -hex 32`).
4. Click **Save script properties**.

---

## 4. Deploy as a Web App

1. In the upper-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Enter the configuration:
   - **Description**: `Budget App Backend API v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Note: The endpoint is protected by the `APPS_SCRIPT_SHARED_SECRET` and timestamp validation)*
4. Click **Deploy**.
5. Authorize the script when prompted by Google Workspace.
6. Copy the **Web app URL** (format: `https://script.google.com/macros/s/.../exec`).

---

## 5. Configure Next.js Environment Variables

In your Next.js project root, add the following to your `.env.local`:

```bash
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_SHARED_SECRET=your_configured_secret_value
```

---

## 6. Security & Data Isolation Guarantees

- **User Isolation**: All queries filter rows strictly where `userId === <authenticated_google_sub>`.
- **Zero Client Trust**: Next.js route handlers extract the Google `sub` from the verified session cookie and pass it securely to Apps Script.
- **Formula Injection Defense**: All user-supplied text starting with `=`, `+`, `-`, or `@` is prepended with `'` so Google Sheets treats it as plain text and never executes formulas.
- **Concurrency Control**: `LockService.getScriptLock()` prevents write race conditions across concurrent browser sessions.
- **Data Purge**: Dedicated action `user.purgeAllData` cascades and deletes all records across all sheets for a specific user upon request.
