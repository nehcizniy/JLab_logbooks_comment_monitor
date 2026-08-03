const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { URL, Intl, Date, console, setTimeout, clearTimeout, Promise };
vm.createContext(context);
for (const file of ["monitor-policy.js", "health.js", "jlab-parsers.js", "extension-updates.js", "shift-crew.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const easternHour = (hour) => Date.UTC(2026, 6, 17, hour + 4, 0, 0);
const easternAugustHour = (hour) => Date.UTC(2026, 7, 3, hour + 4, 0, 0);
const workers = (entry) => Object.fromEntries(entry.workers.map((worker) => [worker.role, worker.name]));

test("accepts documented and legacy JLab API response wrappers", () => {
  const entry = { lognumber: 4524731 };
  assert.deepEqual(context.normalizeEntries({ stat: "ok", data: { entries: [entry] } }), [entry]);
  assert.deepEqual(context.normalizeEntries({ results: [entry] }), [entry]);
  assert.deepEqual(context.normalizeEntries({ wrapper: { items: [entry] } }), [entry]);
  assert.throws(() => context.normalizeEntries({ unexpected: true }), /unfamiliar response format/);
});

test("parses comments and DTM events from saved page fixtures", () => {
  const comment = context.parseCommentPageHtml(fixture("comment.html"), 58417);
  assert.equal(comment.lognumber, "4524731");
  assert.equal(comment.bookSlug, "hclog");
  assert.equal(comment.title, "Test & comment entry");
  const event = context.parseDtmEventHtml(fixture("dtm-open.html"));
  assert.equal(event.identity, "dtm:22737");
  assert.equal(event.title, "MBF0L06 issue");
});

test("daily comment recovery overlaps 100 IDs and scans three times deeper", () => {
  const regular = context.createCommentScanPlan(59000, false);
  const recovery = context.createCommentScanPlan(59000, true);
  assert.equal(regular.scanStart, 59000);
  assert.equal(regular.maximumChecks, 200);
  assert.equal(recovery.scanStart, 58900);
  assert.equal(recovery.maximumChecks, 600);
  assert.equal(recovery.missLimit, 100);
});

test("notification policy supports per-channel delivery, quiet hours, and snooze", () => {
  assert.equal(context.normalizeInterfaceMode(undefined), "simple");
  assert.equal(context.normalizeInterfaceMode("large"), "large");
  assert.equal(context.normalizeInterfaceMode("advanced"), "advanced");
  assert.equal(context.normalizeInterfaceMode("large-advanced"), "large-advanced");
  assert.equal(context.normalizeInterfaceMode("expert"), "simple");
  assert.equal(context.normalizeThemeMode(undefined), "light");
  assert.equal(context.normalizeThemeMode("dark"), "dark");
  assert.equal(context.normalizeThemeMode("system"), "light");
  assert.deepEqual([...context.normalizeSimpleShiftCrewHalls(undefined)], ["hallA", "hallB", "hallC", "hallD"]);
  assert.deepEqual([...context.normalizeSimpleShiftCrewHalls(["hallD", "hallB", "unknown"])], ["hallB", "hallD"]);
  const preferences = context.defaultAlertPreferences();
  assert.equal(context.detectAlertPreset(preferences), "standard");
  assert.equal(context.alertPreferencesForPreset("essential").comments.system, false);
  assert.equal(context.alertPreferencesForPreset("essential").logbookDowntime.system, false);
  assert.equal(context.alertPreferencesForPreset("standard").logbookDowntime.email, false);
  assert.equal(context.alertPreferencesForPreset("everything").logbookDowntime.system, true);
  assert.equal(context.alertPreferencesForPreset("everything").shiftCrewChanges.email, true);
  const legacyStandard = context.legacyAlertPreferencesForPreset("standard");
  const migratedStandard = context.migrateAlertPreferences(legacyStandard, 7);
  assert.equal(context.detectAlertPreset(migratedStandard), "standard");
  assert.equal(migratedStandard.logbookDowntime.system, false);
  const legacyCustom = context.legacyAlertPreferencesForPreset("standard");
  legacyCustom.comments.email = false;
  assert.equal(context.migrateAlertPreferences(legacyCustom, 7).logbookDowntime.system, true);
  preferences.comments.email = false;
  assert.equal(context.detectAlertPreset(preferences), "custom");
  const normalTime = easternHour(12);
  assert.equal(context.shouldDeliverAlert("comments", "system", { alertPreferences: preferences }, normalTime), true);
  assert.equal(context.shouldDeliverAlert("comments", "email", { alertPreferences: preferences }, normalTime), false);
  assert.equal(context.shouldDeliverAlert("comments", "system", {
    alertPreferences: preferences,
    quietHours: { enabled: true, start: "22:00", end: "07:00" }
  }, easternHour(2)), false);
  assert.equal(context.shouldDeliverAlert("comments", "system", {
    alertPreferences: preferences,
    notificationsSnoozedUntil: normalTime + 1000
  }, normalTime), false);
  assert.equal(context.alertPriorityLabel("urgent"), "Urgent");
  assert.equal(context.chromeNotificationPriority("informational"), 0);
  assert.match(context.actionableErrorMessage(new Error("AUTH_REQUIRED")), /sign-in is needed/i);
  assert.match(context.actionableErrorMessage(new Error("JLab returned HTTP 429")), /rate limiting/i);
  assert.match(context.actionableErrorMessage(new Error("failed to fetch")), /network or VPN/i);
  assert.match(context.actionableErrorMessage(new Error("Hall C: enter a supported JLab shift-schedule URL"), "shiftCrew"), /Hall C:/);
});

test("classifies logbook failures without counting local connection problems", () => {
  assert.equal(
    context.classifyLogbookAvailabilityFailure({ code: "AUTH_REQUIRED" }).outcome,
    "auth"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure({ code: "RATE_LIMITED" }).outcome,
    "rate_limited"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure({ code: "SERVER_ERROR", httpStatus: 503 }).outcome,
    "service_failure"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure({ code: "API_FORMAT_ERROR" }).outcome,
    "api_error"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure(new Error("Failed to fetch"), {
      online: false,
      internetReachable: false,
      jlabReachable: false,
      logbooksReachable: false
    }).outcome,
    "network_issue"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure(new Error("Failed to fetch"), {
      online: true,
      internetReachable: true,
      jlabReachable: false,
      logbooksReachable: false
    }).outcome,
    "jlab_path_issue"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure(new Error("Failed to fetch"), {
      online: true,
      internetReachable: false,
      jlabReachable: true,
      logbooksReachable: false
    }).outcome,
    "service_failure"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure(new Error("Failed to fetch"), {
      online: true,
      internetReachable: true,
      jlabReachable: true,
      logbooksReachable: false
    }).outcome,
    "service_failure"
  );
  assert.equal(
    context.classifyLogbookAvailabilityFailure(new Error("Request timed out"), {
      otherBookSucceeded: true
    }).outcome,
    "service_failure"
  );
});

test("groups multiple new comments into one alert per logbook entry", () => {
  const grouped = context.combineCommentAlerts([
    { bookSlug: "hclog", lognumber: "4524731", commentId: "58418", added: 1, commentUrl: "/comment/58418" },
    { bookSlug: "hclog", lognumber: "4524731", commentId: "58420", added: 1, commentUrl: "/comment/58420" },
    { bookSlug: "hblog", lognumber: "4524659", commentId: "58419", added: 1 }
  ]);
  assert.equal(grouped.length, 2);
  const hclog = grouped.find((alert) => alert.bookSlug === "hclog");
  assert.equal(hclog.added, 2);
  assert.equal(hclog.commentId, "58420");
  assert.equal(hclog.commentUrl, "/comment/58420");
});

test("parses MIS, Hall B, and Hall D schedule boundaries", () => {
  const mis = context.parseShiftScheduleHtml(fixture("mis-shifts.html"), easternHour(1));
  assert.equal(mis.status, "ok");
  assert.deepEqual(workers(mis.shifts[0]), { Leader: "Alice Owl", Worker: "Alex Owl" });
  const hallB = context.parseShiftScheduleHtml(fixture("hallb-shifts.html"), easternHour(1));
  assert.deepEqual(workers(hallB.hourlyCrew[1]), { Expert: "Expert Owl", Worker: "Previous Night Worker" });
  assert.deepEqual(workers(hallB.hourlyCrew[23]), { Expert: "Expert Swing", Worker: "Tonight Worker" });
  const hallD = context.parseShiftScheduleHtml(fixture("halld-shifts.html"), easternHour(1));
  assert.deepEqual(workers(hallD.hourlyCrew[1]), { Leader: "Leader Owl", Worker: "Previous Night Worker" });
  assert.deepEqual(workers(hallD.hourlyCrew[20]), { Leader: "Leader Evening", Worker: "Tonight Worker" });
});

test("parses unpadded single-digit dates from Hall B and Hall D schedules", () => {
  const hallBHtml = fixture("hallb-shifts.html")
    .replace("16-Jul-2026", "2-Aug-2026")
    .replace("17-Jul-2026", "3-Aug-2026");
  const hallB = context.parseShiftScheduleHtml(hallBHtml, easternAugustHour(1));
  assert.equal(hallB.status, "ok");
  assert.deepEqual(workers(hallB.hourlyCrew[1]), { Expert: "Expert Owl", Worker: "Previous Night Worker" });

  const hallDHtml = fixture("halld-shifts.html")
    .replace("16-Jul-2026", "2-Aug-2026")
    .replace("17-Jul-2026", "3-Aug-2026");
  const hallD = context.parseShiftScheduleHtml(hallDHtml, easternAugustHour(1));
  assert.equal(hallD.status, "ok");
  assert.deepEqual(workers(hallD.hourlyCrew[20]), { Leader: "Leader Evening", Worker: "Tonight Worker" });
});

test("confirms, closes, and totals daily logbook downtime", () => {
  const book = { name: "HCLOG", slug: "hclog" };
  const firstFailureAt = context.jlabLocalDateTimeToTimestamp(2026, 7, 17, 10, 0);
  const confirmedAt = context.jlabLocalDateTimeToTimestamp(2026, 7, 17, 10, 5);
  const recoveredAt = context.jlabLocalDateTimeToTimestamp(2026, 7, 17, 10, 30);
  let result = context.updateLogbookDowntime({}, book, "service_failure", firstFailureAt, "JLab returned HTTP 503");
  assert.equal(result.state.books.hclog.status, "suspected");
  assert.equal(result.transition, null);
  result = context.updateLogbookDowntime(result.state, book, "service_failure", confirmedAt, "JLab returned HTTP 503");
  assert.equal(result.state.books.hclog.status, "down");
  assert.equal(result.transition.type, "down");
  assert.equal(result.transition.start, firstFailureAt);
  const confirmedState = result.state;
  const interruptedAt = confirmedAt + 5 * 60 * 1000;
  const interrupted = context.updateLogbookDowntime(confirmedState, book, "network_issue", interruptedAt, "Internet unavailable");
  assert.equal(interrupted.state.books.hclog.status, "network_issue");
  assert.equal(interrupted.state.books.hclog.periods[0].end, interruptedAt);
  const paused = context.pauseLogbookDowntime(confirmedState, ["hclog"], interruptedAt);
  assert.equal(paused.books.hclog.status, "unknown");
  assert.equal(paused.books.hclog.periods[0].end, interruptedAt);
  result = context.updateLogbookDowntime(confirmedState, book, "success", recoveredAt);
  assert.equal(result.state.books.hclog.status, "up");
  assert.equal(result.transition.type, "recovered");
  assert.equal(result.transition.durationMs, 30 * 60 * 1000);
  const summary = context.summarizeDailyLogbookDowntime(result.state, [book], recoveredAt + 60 * 60 * 1000);
  assert.equal(summary.totalMs, 30 * 60 * 1000);
  assert.equal(summary.periods.length, 1);
  assert.equal(summary.books[0].periods.length, 1);
  assert.equal(context.formatDowntimeDuration(summary.totalMs), "30 min");

  const previousDay = context.jlabLocalDateTimeToTimestamp(2026, 7, 16, 23, 50);
  const afterMidnight = context.jlabLocalDateTimeToTimestamp(2026, 7, 17, 0, 20);
  const crossMidnight = context.summarizeDailyLogbookDowntime({
    books: { hclog: { name: "HCLOG", slug: "hclog", status: "up", periods: [{ start: previousDay, end: afterMidnight }] } }
  }, [book], recoveredAt);
  assert.equal(crossMidnight.totalMs, 20 * 60 * 1000);
});

test("does not count a JLab login response as downtime", () => {
  const book = { name: "HBLOG", slug: "hblog" };
  const firstFailureAt = context.jlabLocalDateTimeToTimestamp(2026, 7, 17, 11, 0);
  let result = context.updateLogbookDowntime({}, book, "service_failure", firstFailureAt, "JLab returned HTTP 503");
  result = context.updateLogbookDowntime(result.state, book, "auth", firstFailureAt + 5 * 60 * 1000, "AUTH_REQUIRED");
  assert.equal(result.state.books.hblog.status, "login_required");
  assert.equal(result.transition, null);
  const summary = context.summarizeDailyLogbookDowntime(result.state, [book], firstFailureAt + 10 * 60 * 1000);
  assert.equal(summary.totalMs, 0);
  assert.equal(summary.books[0].periods.length, 0);
});

test("diagnostic snapshots exclude recipients and OAuth tokens", () => {
  const snapshot = context.createDiagnosticSnapshot({
    emailConfig: { recipients: ["private@example.com"], enabled: true, provider: "gmail" },
    emailAuth: { provider: "gmail", accessToken: "secret-token" }
  }, { name: "Test", version: "2.20.0" });
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("private@example.com"), false);
  assert.equal(serialized.includes("secret-token"), false);
  assert.equal(snapshot.email.configured, true);
});

test("compares extension releases and selects the packaged ZIP", () => {
  assert.equal(context.compareExtensionVersions("v2.23.0", "2.22.0"), 1);
  assert.equal(context.compareExtensionVersions("2.23", "2.23.0"), 0);
  assert.equal(context.compareExtensionVersions("2.22.9", "2.23.0"), -1);
  const release = context.normalizeExtensionRelease({
    tag_name: "v2.23.0",
    name: "JLab Logbook Comment Monitor v2.23.0",
    html_url: "https://github.com/example/releases/tag/v2.23.0",
    published_at: "2026-07-17T12:00:00Z",
    assets: [
      { name: "notes.txt", browser_download_url: "https://example.test/notes" },
      { name: "jlab-logbook-comment-monitor-v2.23.0.zip", browser_download_url: "https://example.test/monitor.zip" }
    ]
  });
  assert.equal(release.latestVersion, "2.23.0");
  assert.equal(release.assetUrl, "https://example.test/monitor.zip");
  assert.equal(context.createExtensionUpdateState(release, "2.22.0", 123).status, "available");
  assert.equal(context.createExtensionUpdateState(release, "2.23.0", 123).status, "current");
  assert.equal(context.createExtensionUpdateState(release, "2.24.0", 123).status, "development");
  assert.equal(context.normalizeExtensionUpdateState({ status: "available", latestVersion: "2.23.0" }, "2.23.0").status, "current");
  assert.match(context.friendlyExtensionUpdateError(new Error("GitHub releases returned HTTP 404")), /No published extension release/i);
  assert.match(context.friendlyExtensionUpdateError(new Error("GitHub releases returned HTTP 403")), /temporarily limited/i);
});

test("manifest and popup retain required extension structure", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(manifest.version, "3.2.3");
  assert.equal(packageJson.version, manifest.version);
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "popup.css"), "utf8");
  const popupJs = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  const backgroundJs = fs.readFileSync(path.join(root, "background.js"), "utf8");
  const updateMigrationSource = backgroundJs.slice(
    backgroundJs.indexOf("chrome.runtime.onInstalled.addListener"),
    backgroundJs.indexOf("chrome.runtime.onStartup.addListener")
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const detailTags = [...html.matchAll(/<details\b([^>]*)>/g)].map((match) => match[1]);
  const collapseKeys = detailTags.map((attributes) => attributes.match(/data-collapse-key="([^"]+)"/)?.[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(detailTags.length > 0, true);
  assert.equal(collapseKeys.every(Boolean), true);
  assert.equal(collapseKeys.length, new Set(collapseKeys).size);
  assert.doesNotMatch(html, /class="shift-summary-card"[^>]*\sopen(?:\s|>)/);
  for (const id of [
    "health-list", "downtime-title", "downtime-total", "downtime-list", "alert-policy-list", "alert-preset", "shift-crew-details", "copy-diagnostics",
    "test-setup", "interface-mode-control",
    "setup-wizard", "setup-wizard-logbooks", "reset-recommended", "open-setup-guide",
    "extension-update-details", "track-extension-updates", "check-extension-update", "open-update-guide",
    "open-previous-versions", "dtm-status", "dtm-status-detail", "dtm-status-dot",
    "open-dtm", "dtm-interval", "repeat-dtm-alerts", "new-entry", "open-logbooks", "dark-mode",
    "shift-crew-hover-link", "shift-crew-hover-current", "shift-crew-simple-list",
    "interface-mode-select", "simple-logbook-buttons"
  ]) {
    assert.equal(ids.includes(id), true, `missing #${id}`);
  }
  assert.doesNotMatch(html, /advanced-settings-banner|switch-to-advanced/);
  assert.match(html, /data-interface-mode="simple"/);
  assert.doesNotMatch(html, /data-interface-mode-button/);
  assert.match(html, /id="interface-mode-select"[\s\S]*value="simple"[\s\S]*value="large"[\s\S]*value="advanced"[\s\S]*value="large-advanced"/);
  assert.match(html, /<section id="interface-mode-control" class="interface-mode-control"/);
  assert.doesNotMatch(html, /interface-mode-details|interface-mode-summary|interface-mode-body/);
  assert.match(html, /<button id="dark-mode"[^>]+aria-pressed="false"[^>]*>Dark mode<\/button>/);
  assert.match(popupJs, /darkModeInput\.addEventListener\("click"/);
  assert.match(popupJs, /event\.stopPropagation\(\)/);
  assert.match(popupJs, /darkModeInput\.textContent = darkModeEnabled \? "Light mode" : "Dark mode"/);
  assert.match(html, /<script src="theme\.js"><\/script>/);
  assert.match(html, /data-popup-tab="dtm"/);
  assert.match(html, /data-popup-view="dtm"/);
  assert.doesNotMatch(html, /data-popup-tab="updates"/);
  assert.match(html, /data-popup-tab="alerts"[\s\S]*data-popup-tab="settings"/);
  assert.match(html, /id="extension-update-details"[^>]+data-popup-view="settings"[^>]+data-simple-settings/);
  assert.match(html, /class="interval-control"[^>]+data-simple-settings/);
  assert.match(html, /class="alert-policy-card"[^>]+data-simple-settings/);
  assert.match(html, /class="book-controls"[^>]+data-simple-settings/);
  assert.match(html, /class="author-watch"[^>]+data-simple-settings/);
  assert.match(html, /class="setup-test-card"[^>]+data-simple-settings/);
  assert.match(popupJs, /SIMPLE_POPUP_VIEWS = \["overview", "dtm", "settings"\]/);
  assert.equal([...html.matchAll(/data-shift-crew-tab="hall[A-D]"/g)].length, 4);
  assert.equal([...html.matchAll(/class="shift-crew-input-row"/g)].length, 4);
  assert.match(html, /shift-crew-summary[\s\S]*shift-crew-tabs[\s\S]*<\/summary>/);
  assert.match(popupJs, /button\.addEventListener\("mouseenter", \(\) => previewShiftCrew/);
  assert.match(popupJs, /simpleShiftCrewHalls/);
  assert.match(popupJs, /function renderSimpleShiftCrewList\(/);
  assert.match(html, /class="simple-logbook-shortcut"[^>]+data-simple-only/);
  assert.match(popupJs, /function renderSimpleLogbookShortcut\(/);
  assert.match(popupJs, /simpleLogbookButtons\.append\(button\)/);
  assert.match(popupJs, /encodeURIComponent\(book\.slug\)/);
  assert.match(popupJs, /async function initializePopupPreferences\(\)/);
  assert.match(popupJs, /function initializeCollapsibleSections\(/);
  assert.match(popupJs, /chrome\.storage\.local\.set\(\{ popupView: activePopupView \}\)/);
  assert.match(popupJs, /chrome\.storage\.local\.set\(\{ collapsibleSectionStates:/);
  assert.doesNotMatch(popupJs, /localStorage\.setItem/);
  assert.match(popupJs, /chrome\.storage\.local\.get\(null\)/);
  assert.doesNotMatch(updateMigrationSource, /chrome\.storage\.local\.(?:clear|remove)\(/);
  assert.match(popupJs, /https:\/\/logbooks\.jlab\.org\/node\/add\/logentry/);
  assert.match(popupJs, /LOGBOOKS_HOME_URL = "https:\/\/logbooks\.jlab\.org\/"/);
  assert.match(backgroundJs, /const DTM_CHECK_ALARM = "jlab-dtm-check"/);
  assert.match(backgroundJs, /const DTM_CHECK_INTERVAL_OPTIONS = \[1, 5, 10, 15, 30, 60\]/);
  assert.match(backgroundJs, /if \(alarm\.name === DTM_CHECK_ALARM\) checkDtmEvents\(\)/);
  assert.match(backgroundJs, /Promise\.allSettled\(activeBooks\.map\(\(book\) => fetchBook\(book\)\)\)/);
  assert.match(backgroundJs, /alertType: "logbookDowntime"/);
  assert.match(popupJs, /function renderDowntimeDashboard\(/);
  assert.match(css, /\.downtime-dashboard/);
  assert.match(css, /body:is\(\[data-interface-mode="simple"\], \[data-interface-mode="large"\]\)/);
  assert.match(css, /data-interface-mode="large"\]\) \.shift-crew-tabs \{ display: none !important; \}/);
  assert.match(css, /body:is\(\[data-interface-mode="large"\], \[data-interface-mode="large-advanced"\]\) \{ width: 480px; \}/);
  assert.match(css, /body:is\(\[data-interface-mode="large"\], \[data-interface-mode="large-advanced"\]\) button/);
  assert.match(css, /data-active-popup-view="dtm"/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(backgroundJs, /themeMode: normalizeThemeMode\(state\.themeMode\)/);
  assert.equal(fs.existsSync(path.join(root, "theme.js")), true);
  assert.equal(fs.existsSync(path.join(root, "update.html")), true);
  assert.equal(fs.existsSync(path.join(root, "extension-updates.js")), true);
});
