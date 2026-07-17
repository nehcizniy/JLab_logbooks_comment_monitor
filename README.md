# JLab Logbook Comment Monitor

This Chrome extension checks any user-selected JLab logbooks on a selectable 5, 10, 15, 30, or 60 minute interval. Each logbook has its own adjustable check range: the latest 1–1000 entries, the latest 1–720 hours, or the latest 1–30 days. The default is 100 entries. HCLOG, HBLOG, and SOLID are included initially, and every added logbook can be turned on or off independently. It monitors new comment permalinks and beam-down event state. It can also notify you when selected people appear as an entry's **Author** or **Entry Maker**.

When an entry gains a comment, a native Chrome system notification shows:

- the logbook and entry title;
- the entry's original creation time;
- **Clear** and **Go to entry** buttons.

Every alert receives its own notification instance. A later comment, watched-name entry, or beam-event change will not replace an older uncleared notification, even when multiple comments belong to the same logbook entry.

The popup includes a collapsible **Recent alarms** menu. It shows the five newest real alerts by default and can expand to the newest twenty. Each saved alarm includes its notification time, title, message, and a link back to the related logbook entry or DTM event. Clearing active system notifications does not erase this recent-alarm history. **Test system notification**, **Test comment match**, and **Test name match** do not add test results to the history.

Each successful check also finds every entry whose title contains **shift summary** within the configured check range for each enabled logbook. The popup groups the matches by logbook and makes every listed entry a direct link. Every logbook group has its own **Edit alerts** switch, which is on by default. For each selected logbook, the extension monitors its newest matching entry and sends a system notification with **Clear** and **Go to entry** buttons if that same entry's title, body, attachments, tags, logbooks, Entry Makers, or attention state changes. Comment activity is excluded from the edit comparison. A newly posted shift summary establishes a new baseline and is not mistaken for an edit. Turning a logbook's switch back on first records a fresh baseline for that logbook, preventing alerts for edits made while its monitoring was off.

The **Recent alarms**, **Shift Crew**, **Shift summaries**, **Email notifications**, **Monitored logbooks**, and **Notify for new entries by** sections are collapsible to keep the popup compact. Notification test controls are grouped at the bottom of the popup.

Select the small **?** button beside **Comment monitor** for a quick guide inside the popup.

## Install

1. Extract the ZIP file.
2. Open Chrome and visit `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Click **Load unpacked**.
5. Select the extracted `jlab-logbook-comment-monitor` folder.
6. Pin the extension from Chrome's Extensions menu if you want its switch to stay visible.

All unpacked installations use the permanent extension ID `gbfomjfeblcepcnmbohebdpndbfkcabj`. The public key that produces this ID is stored in `manifest.json`, so the ID remains the same when the folder is moved, the extension is installed on another computer, or a new version is loaded. Do not remove or replace the manifest's `key` value.

## Update

1. Download and extract the newer ZIP file.
2. Replace the files inside your existing `jlab-logbook-comment-monitor` folder with the newer files. Keep the folder in the same location.
3. Open `chrome://extensions`.
4. Find **JLab Logbook Comment Monitor** and click **Reload**.

After version 2.16.0, the fixed extension ID—not the folder location—identifies the extension. Using **Reload** normally preserves locally stored settings. Do not click **Remove** as part of an ordinary update, because removing and reinstalling the extension may reset those settings.

## Back up or restore settings

Open **Settings backup** in the extension popup and choose **Export settings** to save the configured logbooks, check ranges, watch names, switches, shift-schedule URLs, email recipients, and monitoring baselines to a JSON file. Choose **Import settings** to restore that file after reinstalling the extension, moving to another computer, or completing an extension-ID migration. Exported backups deliberately exclude active system notifications, temporary error/checking state, and OAuth access or refresh tokens.

Keep the backup file private. It contains the extension's saved configuration, receiving email addresses, and monitoring history. After restoring a backup, reconnect the sending account and then turn email notifications back on.

### One-time upgrade to the permanent ID

Versions before 2.16.0 used an ID based on the unpacked folder and require one migration:

1. In the old extension, export a settings backup before replacing or reloading its files.
2. Update the extension files and use **Reload** in `chrome://extensions`. If Chrome reports an error or the extension is no longer listed, choose **Load unpacked** and select the same extension folder.
3. Open the extension and confirm that **Settings backup** shows ID `gbfomjfeblcepcnmbohebdpndbfkcabj`.
4. Import the JSON backup. Active system notifications are not restored, but configuration and monitoring baselines are restored.
5. Click **Check now** and test a system notification. Remove an old-ID copy only after the fixed-ID copy is working.

This migration happens once. Later unpacked updates retain the fixed ID and do not require another ID migration.

## Shift Crew

The collapsible **Shift Crew** section sits between **Recent alarms** and **Shift summaries**. It provides one schedule-URL field for each of Hall A, Hall B, Hall C, and Hall D. Paste a supported public JLab shift-schedule URL into the appropriate hall and select **Enter**. A successful Enter saves the URLs, checks the schedules, and folds the section. Blank halls remain blank. The extension then refreshes every configured URL once per day, independently of the main logbook-monitor switch. **Check now** also refreshes the configured schedules.

When **Shift Crew** is folded, hover over or keyboard-focus its heading to display a floating card aligned to the right side of the popup. The card shows the crew scheduled for the current time using JLab local time. Select a configured Hall A, B, C, or D name in either the expanded section or floating card to open that hall's schedule. The daily check stores the day's schedule, so the displayed crew changes at the schedule's shift boundaries without downloading the page again.

Supported Hall A MIS example:

- `https://misportal.jlab.org/mis/physics/shiftSchedule/?experimentRunId=GEn-RP_KLL`

Supported Hall C examples include:

- `https://misportal.jlab.org/mis/physics/shiftSchedule/index.cfm?experimentRunId=HALLC-RSIDIS`
- `https://misportal.jlab.org/mis/physics/shiftSchedule/index.cfm?experimentRunId=HALLC-PIONCT`

The Hall B PRad schedule is also supported:

- `https://www.jlab.org/Hall-B/pradshifts/`

For Hall B, the extension reads the dated schedule table—not the page's separate **Current shift status** section. It applies the table's actual Expert boundaries (00:00–08:00, 08:00–16:00, and 16:00–24:00) and Worker boundaries (23:00–07:00, 07:00–15:00, and 15:00–23:00). Before 07:00, the Worker Owl assignment comes from the previous date's row; from 23:00 onward, it comes from the current date's row.

The Hall D GlueX schedule is also supported:

- `https://www.jlab.org/Hall-D/shifts/`

For Hall D, the extension also reads only the dated schedule table. It applies the listed Leader boundaries (00:00–08:00, 08:00–16:00, and 16:00–24:00) and Worker boundaries (20:00–04:00, 04:00–12:00, and 12:00–20:00). Before 04:00, the Worker Night Club assignment comes from the previous date's row. The separate current-shift display and Run Coordinator column are not used.

Only the supported public HTTPS JLab MIS, Hall B PRad, and Hall D GlueX schedule formats are accepted. Shift Crew does not request or use a JLab password.

## Email notifications

The extension can send every real comment, watched-name entry, shift-summary edit, and DTM alarm to multiple receiving addresses. The extension does not impose an arbitrary recipient-count limit, although Gmail and Microsoft may enforce their own sending or recipient limits. System notifications continue to work when email delivery is off or encounters an error.

Open **Email notifications**, select the sending provider, enter one or more receiving addresses separated by commas, spaces, semicolons, or new lines, and select **Save**. Connect the sender, use **Send test email**, and then turn on **Send alert emails**. Test notification, comment-match, and name-match controls do not send email; the dedicated test-email button does.

Email authorization uses OAuth. **The extension does not ask for, read, or store your Gmail, Outlook, or Exchange password.** Gmail access tokens are managed by Chrome. Microsoft access and refresh tokens are stored in Chrome's local extension storage so scheduled checks can send while the popup is closed; these tokens are excluded from exported settings backups. Select **Disconnect** to remove the locally stored authorization. Removing the extension also removes its local tokens and configuration.

### Gmail sender setup

Gmail uses the [official Gmail API](https://developers.google.com/workspace/gmail/api/guides/sending) and requires a free Google Cloud OAuth client:

1. Create or select a Google Cloud project, enable the Gmail API, and configure its OAuth consent screen.
2. Create an OAuth client with application type **Chrome Extension**, following Chrome's [extension OAuth setup](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth).
3. Enter the permanent extension ID `gbfomjfeblcepcnmbohebdpndbfkcabj` as the Item ID.
4. Replace `REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in `manifest.json` with the generated client ID, keeping the surrounding quotes.
5. Reload the extension from `chrome://extensions`, open **Email notifications**, select **Gmail**, and choose **Connect sender**.

The manifest requests only `gmail.send` and the email-address identity scope. An unverified external Google OAuth application can be limited to explicitly added test users; broader external distribution may require Google's OAuth verification. This is separate from Chrome Web Store registration and does not require paying the Chrome Web Store fee.

### Outlook or Exchange Online sender setup

Microsoft personal Outlook accounts and Microsoft 365/Exchange Online work through [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0):

1. Create a free Microsoft Entra app registration and allow the account types that should use the extension. The extension uses Microsoft's [authorization-code flow with PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).
2. Add a **Single-page application (SPA)** redirect URI: `https://gbfomjfeblcepcnmbohebdpndbfkcabj.chromiumapp.org/microsoft`.
3. Add delegated Microsoft Graph permissions `Mail.Send` and `User.Read`. The sign-in flow also requests `offline_access` so automatic checks can renew access.
4. Copy the Application (client) ID into the extension. Leave **Tenant** as `common` for personal and organizational Microsoft accounts, or enter a specific tenant ID/domain when required.
5. Select **Connect sender**, complete Microsoft sign-in and consent, and send a test email.

Some organizations require an administrator to approve `Mail.Send`. This option covers Exchange Online. On-premises Exchange requires a separately operated SMTP/EWS backend and is not supported directly by the browser extension.

Microsoft classifies this browser flow as a SPA flow. Its refresh-token lifetime is approximately 24 hours, so Microsoft may periodically require selecting **Connect sender** again. The extension reports that condition without interrupting system notifications.

## Uninstall

1. Open `chrome://extensions`.
2. Find **JLab Logbook Comment Monitor** and click **Remove**.
3. Confirm the removal.
4. Delete the extracted extension folder and ZIP file if you no longer need them.

Uninstalling stops all monitoring and removes the extension's locally stored settings.

## First use

1. Open either monitored logbook and sign in normally if JLab asks you to authenticate.
2. Open the extension and click **Check now**.
3. Chrome may ask for notification permission; allow it.

Use **Test system notification** to verify alert delivery before testing with a real logbook event. A red badge on the extension icon shows the number of uncleared alerts. On macOS, Chrome must be allowed under **System Settings → Notifications → Google Chrome**.

The popup's tracking details show the newest entry, comment-monitoring state, and beam-event state for each logbook. JLab's logbook listing does not publish comment totals, so the popup does not display misleading zero counts. After creating a test comment, click **Check now** and confirm that a notification appears.

Comments are tracked by their monotonically increasing permalink IDs, starting from the known baseline `/comment/58417`. At the selected interval the extension checks subsequent IDs, recognizes the public login form in JLab's sidebar without mistaking it for a blocked page, follows each comment to its parent entry, and alerts only when that entry belongs to an enabled monitored logbook. It stops after 20 consecutive unused IDs and checks at most 200 IDs per cycle. Use **Test comment match** to load comment 58417 and preview the same alert used for a future comment. This preview does not move the saved cursor.

## Choose logbooks

Paste a URL such as `https://logbooks.jlab.org/book/moller` into **Monitored logbooks** and click **Add**. The extension verifies the page, reads the logbook's displayed name, adds it, and turns it on. Each row has its own automatic-check box, **Check latest** number and unit controls, plus **Open** and **Remove** buttons. Choose **entries**, **hours**, or **days** independently for every logbook. Selecting a time unit initially uses a one-day window: 24 hours or 1 day. After the user changes a value, that value is remembered separately for that logbook and unit and becomes the value shown the next time that unit is selected. Time-based checks request up to 5,000 matching entries within the selected window. The main switch remains the master control. A disabled logbook is excluded from comment and watched-name alerts; re-enabling it establishes a fresh entry baseline before future entries generate notifications.

The first successful check establishes a baseline and deliberately does not alert for comments that already exist. The monitor is on by default. Use the switch in the extension popup to pause or resume it.

## Watch Authors and Entry Makers

1. Open the extension popup.
2. Enter one or more JLab usernames or displayed names, separated by commas or one per line.
3. Click **Save names**.

Each saved name is compared with both the entry's **Author** and its comma-separated **Entry Makers** field. Matching is exact but ignores capitalization. Existing entries do not generate alerts when a name is added; only entries first seen during a later check do. The notification identifies whether the match was the Author, an Entry Maker, or both, and includes **Clear** and **Go to entry** buttons. Names already saved by an earlier extension version automatically use this expanded matching.

## Beam-down events

The extension checks the DTM open-events page directly without opening background tabs whenever at least one logbook monitor is enabled. It uses the DTM event ID as the identity and includes the issue title, start time, and elapsed duration in alerts. By default, every successful check that finds an open DTM event sends a new native system notification, providing a recurring reminder at the selected check interval. Turn off **DTM recurring reminders** to silence those repeat alerts; while silenced, the extension notifies only when an event appears, changes to a different event or title, or closes. Select **Open DTM** beside the reminder switch to open JLab's live DTM Open Events page. Duplicate logbook alerts for the same DTM event within one check are suppressed. Event alerts include **Clear** and **Go to entry**.

To verify a name without asking the person to create another entry, click **Test name match**. The extension searches the current API results for the newest existing entry where the person is the Author or an Entry Maker, then previews the same alert used for a future new entry. This preview does not alter the monitoring baseline.

## Scope and privacy

- The monitor checks each enabled logbook using that logbook's individual entry-count or time-based range.
- It uses your browser's existing JLab authentication. **It does not ask for, read, or store your password.**
- State is stored only in Chrome's local extension storage.
- Chrome must be running for scheduled checks and desktop notifications.

If the popup says **JLab login required**, open one of the enabled logbooks, sign in, then click **Check now** again.
