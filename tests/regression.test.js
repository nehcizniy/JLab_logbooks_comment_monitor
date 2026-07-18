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
  assert.equal(context.normalizeInterfaceMode("advanced"), "advanced");
  assert.equal(context.normalizeInterfaceMode("expert"), "simple");
  const preferences = context.defaultAlertPreferences();
  assert.equal(context.detectAlertPreset(preferences), "standard");
  assert.equal(context.alertPreferencesForPreset("essential").comments.system, false);
  assert.equal(context.alertPreferencesForPreset("everything").shiftCrewChanges.email, true);
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
  assert.match(context.actionableErrorMessage(new Error("failed to fetch")), /network or VPN/i);
  assert.match(context.actionableErrorMessage(new Error("Hall C: enter a supported JLab shift-schedule URL"), "shiftCrew"), /Hall C:/);
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
  assert.equal(manifest.version, "2.23.0");
  assert.equal(packageJson.version, manifest.version);
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "popup.css"), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const id of [
    "health-list", "alert-policy-list", "alert-preset", "shift-crew-details", "copy-diagnostics",
    "test-setup", "interface-mode-description", "advanced-settings-banner", "switch-to-advanced",
    "setup-wizard", "setup-wizard-logbooks", "reset-recommended", "open-setup-guide",
    "extension-update-details", "track-extension-updates", "check-extension-update", "open-update-guide",
    "open-previous-versions", "dtm-status", "dtm-status-detail", "dtm-status-dot",
    "open-dtm", "repeat-dtm-alerts"
  ]) {
    assert.equal(ids.includes(id), true, `missing #${id}`);
  }
  assert.match(html, /data-interface-mode="simple"/);
  assert.match(html, /data-interface-mode-button="advanced"/);
  assert.match(html, /data-popup-tab="dtm"/);
  assert.match(html, /data-popup-view="dtm"/);
  assert.match(css, /body\[data-interface-mode="simple"\]/);
  assert.match(css, /data-active-popup-view="dtm"/);
  assert.equal(fs.existsSync(path.join(root, "update.html")), true);
  assert.equal(fs.existsSync(path.join(root, "extension-updates.js")), true);
});
