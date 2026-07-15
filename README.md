# JLab Logbook Comment Monitor

This Chrome extension checks any user-selected JLab logbooks on a selectable 5, 10, 15, 30, or 60 minute interval. Each logbook has its own adjustable check range: the latest 1–1000 entries, the latest 1–720 hours, or the latest 1–30 days. The default is 100 entries. HCLOG, HBLOG, and SOLID are included initially, and every added logbook can be turned on or off independently. It monitors new comment permalinks and beam-down event state. It can also notify you when selected authors create new entries.

When an entry gains a comment, a native Chrome system notification shows:

- the logbook and entry title;
- the entry's original creation time;
- **Clear** and **Go to entry** buttons.

Every alert receives its own notification instance. A later comment, watched-author entry, or beam-event change will not replace an older uncleared notification, even when multiple comments belong to the same logbook entry.

Each successful check also finds every entry whose title contains **shift summary** within the configured check range for each enabled logbook. The popup groups the matches by logbook and makes every listed entry a direct link.

The **Shift summaries**, **Monitored logbooks**, and **Notify for new entries by** sections are collapsible to keep the popup compact. Notification test controls are grouped at the bottom of the popup.

Select the small **?** button beside **Comment monitor** for a quick guide inside the popup.

## Install

1. Extract the ZIP file.
2. Open Chrome and visit `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Click **Load unpacked**.
5. Select the extracted `jlab-logbook-comment-monitor` folder.
6. Pin the extension from Chrome's Extensions menu if you want its switch to stay visible.

## Update

1. Download and extract the newer ZIP file.
2. Replace the files inside your existing `jlab-logbook-comment-monitor` folder with the newer files. Keep the folder in the same location.
3. Open `chrome://extensions`.
4. Find **JLab Logbook Comment Monitor** and click **Reload**.

Keeping the same extension folder and using **Reload** preserves the extension's locally stored settings. Do not click **Remove** as part of an update, because removing and reinstalling the extension may reset those settings.

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

Paste a URL such as `https://logbooks.jlab.org/book/moller` into **Monitored logbooks** and click **Add**. The extension verifies the page, reads the logbook's displayed name, adds it, and turns it on. Each row has its own automatic-check box, **Check latest** number and unit controls, plus **Open** and **Remove** buttons. Choose **entries**, **hours**, or **days** independently for every logbook. Selecting a time unit initially uses a one-day window: 24 hours or 1 day. After the user changes a value, that value is remembered separately for that logbook and unit and becomes the value shown the next time that unit is selected. Time-based checks request up to 5,000 matching entries within the selected window. The main switch remains the master control. A disabled logbook is excluded from comment and watched-author alerts; re-enabling it establishes a fresh author baseline before future entries generate notifications.

The first successful check establishes a baseline and deliberately does not alert for comments that already exist. The monitor is on by default. Use the switch in the extension popup to pause or resume it.

## Watch authors

1. Open the extension popup.
2. Enter one or more JLab usernames or displayed author names, separated by commas or one per line.
3. Click **Save authors**.

Author matching is exact but ignores capitalization. Existing entries do not generate alerts when an author is added; only entries first seen during a later check do. Author-entry notifications include **Clear** and **Go to entry** buttons.

## Beam-down events

The extension checks the DTM open-events page directly without opening background tabs whenever at least one logbook monitor is enabled. It uses the DTM event ID as the identity and includes the issue title, start time, and elapsed duration in alerts. By default, every successful check that finds an open DTM event sends a new native system notification, providing a recurring reminder at the selected check interval. Turn off **DTM recurring reminders** to silence those repeat alerts; while silenced, the extension notifies only when an event appears, changes to a different event or title, or closes. Duplicate logbook alerts for the same DTM event within one check are suppressed. Event alerts include **Clear** and **Go to entry**.

To verify an author without asking them to create another entry, click **Test author match**. The extension searches the current API results for that author's newest existing entry and previews the same alert used for a future new entry. This preview does not alter the monitoring baseline.

## Scope and privacy

- The monitor checks each enabled logbook using that logbook's individual entry-count or time-based range.
- It uses your browser's existing JLab authentication. **It does not ask for, read, or store your password.**
- State is stored only in Chrome's local extension storage.
- Chrome must be running for scheduled checks and desktop notifications.

If the popup says **JLab login required**, open one of the enabled logbooks, sign in, then click **Check now** again.
