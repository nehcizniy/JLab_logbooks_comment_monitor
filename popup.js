const DEFAULT_BOOKS = [
  { name: "HCLOG", slug: "hclog", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() },
  { name: "HBLOG", slug: "hblog", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() },
  { name: "SOLID", slug: "solid", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() }
];
const enabledInput = document.querySelector("#enabled");
const helpButton = document.querySelector("#help-button");
const helpPanel = document.querySelector("#help-panel");
const intervalInput = document.querySelector("#interval");
const repeatDtmAlertsInput = document.querySelector("#repeat-dtm-alerts");
const openDtmButton = document.querySelector("#open-dtm");
const bookUrlInput = document.querySelector("#book-url");
const addBookButton = document.querySelector("#add-book");
const bookAddStatus = document.querySelector("#book-add-status");
const bookControlList = document.querySelector("#book-control-list");
const shiftSummaryList = document.querySelector("#shift-summary-list");
const statusText = document.querySelector("#status");
const detailText = document.querySelector("#detail");
const statusDot = document.querySelector("#status-dot");
const checkButton = document.querySelector("#check");
const clearButton = document.querySelector("#clear");
const testNotificationButton = document.querySelector("#test-notification");
const testCommentButton = document.querySelector("#test-comment");
const commentTestStatus = document.querySelector("#comment-test-status");
const extensionVersion = document.querySelector("#extension-version");
const authorsInput = document.querySelector("#authors");
const saveAuthorsButton = document.querySelector("#save-authors");
const testAuthorButton = document.querySelector("#test-author");
const authorStatus = document.querySelector("#author-status");
const bookDiagnostics = document.querySelector("#book-diagnostics");
const exportSettingsButton = document.querySelector("#export-settings");
const importSettingsButton = document.querySelector("#import-settings");
const importSettingsFile = document.querySelector("#import-settings-file");
const settingsBackupStatus = document.querySelector("#settings-backup-status");
const extensionId = document.querySelector("#extension-id");
const recentAlarmsList = document.querySelector("#recent-alarms-list");
const expandAlarmsButton = document.querySelector("#expand-alarms");
const saveShiftCrewButton = document.querySelector("#save-shift-crew");
const shiftCrewDetails = document.querySelector("#shift-crew-details");
const shiftCrewStatus = document.querySelector("#shift-crew-status");
const SHIFT_CREW_HALLS = ["hallA", "hallB", "hallC", "hallD"];
const SHIFT_CREW_INPUTS = {
  hallA: document.querySelector("#shift-crew-url-hall-a"),
  hallB: document.querySelector("#shift-crew-url-hall-b"),
  hallC: document.querySelector("#shift-crew-url-hall-c"),
  hallD: document.querySelector("#shift-crew-url-hall-d")
};
const SHIFT_CREW_CURRENT = {
  hallA: document.querySelector("#shift-crew-current-hall-a"),
  hallB: document.querySelector("#shift-crew-current-hall-b"),
  hallC: document.querySelector("#shift-crew-current-hall-c"),
  hallD: document.querySelector("#shift-crew-current-hall-d")
};
const SHIFT_CREW_LINKS = {
  hallA: document.querySelector("#shift-crew-link-hall-a"),
  hallB: document.querySelector("#shift-crew-link-hall-b"),
  hallC: document.querySelector("#shift-crew-link-hall-c"),
  hallD: document.querySelector("#shift-crew-link-hall-d")
};
const SHIFT_CREW_HOVER = {
  hallA: document.querySelector("#shift-crew-hover-hall-a"),
  hallB: document.querySelector("#shift-crew-hover-hall-b"),
  hallC: document.querySelector("#shift-crew-hover-hall-c"),
  hallD: document.querySelector("#shift-crew-hover-hall-d")
};
const SHIFT_CREW_HOVER_LINKS = {
  hallA: document.querySelector("#shift-crew-hover-link-hall-a"),
  hallB: document.querySelector("#shift-crew-hover-link-hall-b"),
  hallC: document.querySelector("#shift-crew-hover-link-hall-c"),
  hallD: document.querySelector("#shift-crew-hover-link-hall-d")
};
const emailEnabledInput = document.querySelector("#email-enabled");
const emailProviderInput = document.querySelector("#email-provider");
const emailRecipientsInput = document.querySelector("#email-recipients");
const gmailEmailSettings = document.querySelector("#gmail-email-settings");
const microsoftEmailSettings = document.querySelector("#microsoft-email-settings");
const microsoftClientIdInput = document.querySelector("#microsoft-client-id");
const microsoftTenantInput = document.querySelector("#microsoft-tenant");
const gmailExtensionId = document.querySelector("#gmail-extension-id");
const microsoftRedirectUri = document.querySelector("#microsoft-redirect-uri");
const emailStatus = document.querySelector("#email-status");
const saveEmailButton = document.querySelector("#save-email");
const connectEmailButton = document.querySelector("#connect-email");
const disconnectEmailButton = document.querySelector("#disconnect-email");
const testEmailButton = document.querySelector("#test-email");
let authorsLoaded = false;
let recentAlarmLimit = 5;
let emailConfigLoaded = false;
let shiftCrewConfigLoaded = false;

const SETTINGS_BACKUP_FORMAT = "jlab-logbook-comment-monitor-backup";
const SETTINGS_BACKUP_VERSION = 1;
const TRANSIENT_STORAGE_KEYS = new Set([
  "checking", "lastError", "shiftSummaryEditError", "pendingAlerts", "emailAuth",
  "lastEmailError", "lastEmailAttempt", "lastEmailSentAt", "shiftCrewState",
  "shiftCrewChecking", "shiftCrewError", "lastShiftCrewCheck"
]);

extensionVersion.textContent = chrome.runtime.getManifest().version;
extensionId.textContent = chrome.runtime.id;
gmailExtensionId.textContent = chrome.runtime.id;
microsoftRedirectUri.textContent = chrome.identity.getRedirectURL("microsoft");

helpButton.addEventListener("click", () => {
  const willOpen = helpPanel.hidden;
  helpPanel.hidden = !willOpen;
  helpButton.setAttribute("aria-expanded", String(willOpen));
  helpButton.setAttribute("aria-label", willOpen ? "Hide help" : "Show help");
});

enabledInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabledInput.checked });
  if (enabledInput.checked) await chrome.runtime.sendMessage({ type: "check-now" });
  await render();
});

intervalInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ intervalMinutes: Number(intervalInput.value) });
  await render();
});

repeatDtmAlertsInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ repeatDtmAlerts: repeatDtmAlertsInput.checked });
});

openDtmButton.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://ace.jlab.org/dtm/open-events" });
});

exportSettingsButton.addEventListener("click", exportSettings);
importSettingsButton.addEventListener("click", () => importSettingsFile.click());
importSettingsFile.addEventListener("change", importSettings);
expandAlarmsButton.addEventListener("click", async () => {
  recentAlarmLimit = recentAlarmLimit === 5 ? 20 : 5;
  const { alertHistory = [] } = await chrome.storage.local.get("alertHistory");
  renderRecentAlarms(alertHistory);
});
saveShiftCrewButton.addEventListener("click", saveShiftCrewSchedules);
for (const input of Object.values(SHIFT_CREW_INPUTS)) {
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!saveShiftCrewButton.disabled) saveShiftCrewSchedules();
  });
}
for (const link of Object.values(SHIFT_CREW_HOVER_LINKS)) {
  link.addEventListener("click", (event) => event.stopPropagation());
}
emailProviderInput.addEventListener("change", async () => {
  renderEmailProviderSettings();
  if (emailEnabledInput.checked) {
    emailEnabledInput.checked = false;
    await saveEmailConfig({ quiet: true });
    emailStatus.textContent = "Email alerts were turned off. Connect the selected sender before turning them back on.";
    emailStatus.className = "email-status";
  }
  await setEmailButtonsBusy(false);
});
emailEnabledInput.addEventListener("change", async () => {
  try {
    await saveEmailConfig({ quiet: true });
    emailStatus.textContent = emailEnabledInput.checked
      ? "Email notifications turned on."
      : "Email notifications turned off.";
    emailStatus.className = emailEnabledInput.checked
      ? "email-status connected"
      : "email-status";
  } catch (error) {
    emailEnabledInput.checked = false;
    emailStatus.textContent = error.message;
    emailStatus.className = "email-status error";
  }
});
saveEmailButton.addEventListener("click", () => saveEmailConfig());
connectEmailButton.addEventListener("click", connectEmailSender);
disconnectEmailButton.addEventListener("click", disconnectEmailSender);
testEmailButton.addEventListener("click", sendTestEmail);

addBookButton.addEventListener("click", addBook);
bookUrlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addBook();
});

checkButton.addEventListener("click", async () => {
  checkButton.disabled = true;
  checkButton.textContent = "Checking…";
  await chrome.runtime.sendMessage({ type: "check-now" });
  await render();
  checkButton.disabled = false;
  checkButton.textContent = "Check now";
});

clearButton.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "clear-notifications" });
  clearButton.textContent = "Cleared";
  setTimeout(() => { clearButton.textContent = "Clear alerts"; }, 900);
});

testNotificationButton.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({ type: "test-notification" });
  testNotificationButton.textContent = result?.ok ? "Test sent" : "Test failed";
  if (!result?.ok && result?.error) {
    statusText.textContent = "Notification test failed";
    detailText.textContent = result.error;
    statusDot.className = "dot error";
  }
  setTimeout(() => { testNotificationButton.textContent = "Test system notification"; }, 1200);
});

testCommentButton.addEventListener("click", async () => {
  testCommentButton.disabled = true;
  testCommentButton.textContent = "Searching comments…";
  const result = await chrome.runtime.sendMessage({ type: "test-comment-match" });
  if (result?.ok) {
    testCommentButton.textContent = `Matched ${result.match.comments} comments on #${result.match.lognumber}`;
    commentTestStatus.textContent = `Found comment #${result.match.commentId}: ${result.match.book} entry #${result.match.lognumber} — ${result.match.title}. System notification sent.`;
  } else {
    testCommentButton.textContent = result?.error || "No commented entry found";
    commentTestStatus.textContent = `Comment test failed: ${result?.error || "No commented entry found"}`;
  }
  setTimeout(() => {
    testCommentButton.disabled = false;
    testCommentButton.textContent = "Test comment match";
  }, 2600);
});

saveAuthorsButton.addEventListener("click", async () => {
  const watchedAuthors = [...new Set(
    authorsInput.value
      .split(/[\n,]+/)
      .map((name) => name.trim())
      .filter(Boolean)
  )];
  await chrome.storage.local.set({ watchedAuthors });
  authorsInput.value = watchedAuthors.join("\n");
  authorStatus.textContent = watchedAuthors.length
    ? `Watching ${watchedAuthors.length} ${watchedAuthors.length === 1 ? "name" : "names"}`
    : "Name alerts are off";
  saveAuthorsButton.textContent = "Saved";
  setTimeout(() => { saveAuthorsButton.textContent = "Save names"; }, 900);
});

testAuthorButton.addEventListener("click", async () => {
  testAuthorButton.disabled = true;
  testAuthorButton.textContent = "Searching…";
  const result = await chrome.runtime.sendMessage({ type: "test-author-match" });
  if (result?.ok) {
    authorStatus.textContent = `Matched ${result.match.matchSummary} on ${result.match.book} #${result.match.lognumber}`;
    testAuthorButton.textContent = "Alert opened";
  } else {
    authorStatus.textContent = result?.error || "No matching entry found";
    testAuthorButton.textContent = "No match";
  }
  setTimeout(() => {
    testAuthorButton.disabled = false;
    testAuthorButton.textContent = "Test name match";
  }, 1600);
});

chrome.storage.onChanged.addListener(() => render());
render();
chrome.runtime.sendMessage({ type: "refresh-shift-crew-if-due" }).catch(() => {});

async function addBook() {
  const value = bookUrlInput.value.trim();
  if (!value) {
    bookAddStatus.textContent = "Paste a logbook URL first.";
    return;
  }
  addBookButton.disabled = true;
  addBookButton.textContent = "Adding…";
  const result = await chrome.runtime.sendMessage({ type: "add-logbook", value });
  if (result?.ok) {
    bookUrlInput.value = "";
    bookAddStatus.textContent = `${result.book.name} added and turned on.`;
    if (enabledInput.checked) await chrome.runtime.sendMessage({ type: "check-now" });
  } else {
    bookAddStatus.textContent = result?.error || "That logbook could not be added.";
  }
  addBookButton.disabled = false;
  addBookButton.textContent = "Add";
  await render();
}

async function exportSettings() {
  exportSettingsButton.disabled = true;
  settingsBackupStatus.textContent = "Preparing backup…";
  try {
    const stored = await chrome.storage.local.get(null);
    const storage = Object.fromEntries(
      Object.entries(stored).filter(([key]) => !TRANSIENT_STORAGE_KEYS.has(key))
    );
    const backup = {
      format: SETTINGS_BACKUP_FORMAT,
      formatVersion: SETTINGS_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest().version,
      sourceExtensionId: chrome.runtime.id,
      storage
    };
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jlab-logbook-monitor-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    settingsBackupStatus.textContent = "Settings exported. Keep the JSON file private.";
  } catch (error) {
    settingsBackupStatus.textContent = `Export failed: ${error.message}`;
  } finally {
    exportSettingsButton.disabled = false;
  }
}

async function importSettings() {
  const [file] = importSettingsFile.files || [];
  importSettingsFile.value = "";
  if (!file) return;
  importSettingsButton.disabled = true;
  settingsBackupStatus.textContent = "Restoring settings…";
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("Backup file is too large");
    const backup = JSON.parse(await file.text());
    validateSettingsBackup(backup);
    const restoredStorage = Object.fromEntries(
      Object.entries(backup.storage).filter(([key]) => !TRANSIENT_STORAGE_KEYS.has(key))
    );
    if (restoredStorage.emailConfig && typeof restoredStorage.emailConfig === "object") {
      restoredStorage.emailConfig = { ...restoredStorage.emailConfig, enabled: false };
    }
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ ...restoredStorage, checking: false, lastError: "", pendingAlerts: {} });
    await chrome.runtime.sendMessage({ type: "settings-restored" });
    authorsLoaded = false;
    emailConfigLoaded = false;
    shiftCrewConfigLoaded = false;
    settingsBackupStatus.textContent = "Settings restored. Reconnect the email sender before turning email alerts on.";
    await render();
  } catch (error) {
    settingsBackupStatus.textContent = `Import failed: ${error.message}`;
  } finally {
    importSettingsButton.disabled = false;
  }
}

function validateSettingsBackup(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Not a valid settings backup");
  }
  if (backup.format !== SETTINGS_BACKUP_FORMAT || backup.formatVersion !== SETTINGS_BACKUP_VERSION) {
    throw new Error("Unsupported settings backup format");
  }
  if (!backup.storage || typeof backup.storage !== "object" || Array.isArray(backup.storage)) {
    throw new Error("Backup does not contain extension settings");
  }
  for (const key of Object.keys(backup.storage)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error("Backup contains an invalid setting name");
    }
  }
}

async function render() {
  const state = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "intervalMinutes", "checking", "initialized", "lastCheck", "lastError", "trackedEntries", "watchedAuthors",
    "lastDetectedEvents", "bookDiagnostics", "commentCursor", "shiftSummariesByBook", "repeatDtmAlerts",
    "shiftSummaryEditEnabledBooks", "shiftSummaryEditError", "alertHistory", "emailConfig", "emailAuth",
    "lastEmailError", "lastEmailSentAt", "shiftCrewSchedules", "shiftCrewState", "shiftCrewChecking",
    "shiftCrewError", "lastShiftCrewCheck"
  ]);
  const enabled = state.enabled !== false;
  const monitoredBooks = normalizeMonitoredBooks(state.monitoredBooks);
  const enabledBookSlugs = normalizeEnabledSlugs(state.enabledBooks, monitoredBooks);
  const activeBooks = monitoredBooks.filter((book) => enabledBookSlugs.includes(book.slug));
  const activeBookLabel = activeBooks.length <= 3
    ? activeBooks.map((book) => book.name).join(", ")
    : `${activeBooks.length} logbooks`;
  const intervalMinutes = [5, 10, 15, 30, 60].includes(Number(state.intervalMinutes))
    ? Number(state.intervalMinutes)
    : 5;
  enabledInput.checked = enabled;
  intervalInput.value = String(intervalMinutes);
  repeatDtmAlertsInput.checked = state.repeatDtmAlerts !== false;
  const shiftEditEnabledBookSlugs = normalizeEnabledSlugs(state.shiftSummaryEditEnabledBooks, monitoredBooks);
  renderBookControls(monitoredBooks, enabledBookSlugs);
  renderShiftSummaries(
    state.shiftSummariesByBook,
    activeBooks,
    state.initialized,
    shiftEditEnabledBookSlugs,
    monitoredBooks,
    state.shiftSummaryEditError
  );
  renderRecentAlarms(state.alertHistory);
  renderShiftCrewControls(state);
  renderEmailControls(state);
  if (!authorsLoaded) {
    const authors = Array.isArray(state.watchedAuthors) ? state.watchedAuthors : [];
    authorsInput.value = authors.join("\n");
    authorStatus.textContent = authors.length
      ? `Watching ${authors.length} ${authors.length === 1 ? "name" : "names"}`
      : "Exact match, ignoring capitalization";
    authorsLoaded = true;
  }

  statusDot.className = "dot";
  if (!enabled) {
    statusText.textContent = "Monitor is off";
    detailText.textContent = "No checks will run until you turn it on.";
    statusDot.classList.add("off");
  } else if (!activeBooks.length) {
    statusText.textContent = "No logbooks selected";
    detailText.textContent = "Add or turn on a logbook to start automatic checks.";
    statusDot.classList.add("off");
  } else if (state.checking) {
    statusText.textContent = `Checking ${activeBookLabel}…`;
    detailText.textContent = "Checking new comment permalinks, entries, and beam events.";
    statusDot.classList.add("working");
  } else if (state.lastError) {
    statusText.textContent = "Check needs attention";
    detailText.textContent = state.lastError;
    statusDot.classList.add("error");
  } else if (!state.initialized) {
    statusText.textContent = "Ready to establish baseline";
    detailText.textContent = "The first successful check will not alert for existing comments.";
    statusDot.classList.add("working");
  } else {
    statusText.textContent = `Monitoring ${activeBookLabel}`;
    const checked = state.lastCheck ? new Date(state.lastCheck).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "not yet";
    detailText.textContent = `Every ${intervalMinutes} min · Last checked ${checked} · ${state.trackedEntries || 0} entries · comment cursor #${state.commentCursor || "—"} · ${state.lastDetectedEvents || 0} changes detected`;
    statusDot.classList.add("on");
  }

  renderDiagnostics(state.bookDiagnostics, monitoredBooks, enabledBookSlugs);
}

function renderEmailControls(state) {
  const config = normalizeEmailConfigForPopup(state.emailConfig);
  if (!emailConfigLoaded) {
    emailEnabledInput.checked = config.enabled;
    emailProviderInput.value = config.provider;
    emailRecipientsInput.value = config.recipients.join("\n");
    microsoftClientIdInput.value = config.microsoftClientId;
    microsoftTenantInput.value = config.microsoftTenant;
    emailConfigLoaded = true;
  }
  renderEmailProviderSettings();

  const auth = state.emailAuth && typeof state.emailAuth === "object" ? state.emailAuth : {};
  const providerLabel = auth.provider === "microsoft" ? "Microsoft 365 / Exchange Online" : "Gmail";
  const matchesSelectedProvider = auth.provider === emailProviderInput.value;
  if (state.lastEmailError) {
    emailStatus.textContent = `Email needs attention: ${state.lastEmailError}`;
    emailStatus.className = "email-status error";
  } else if (auth.provider && matchesSelectedProvider) {
    const sentText = state.lastEmailSentAt
      ? ` · Last sent ${new Date(state.lastEmailSentAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
      : "";
    emailStatus.textContent = `Connected to ${auth.accountEmail || providerLabel}${sentText}`;
    emailStatus.className = "email-status connected";
  } else if (auth.provider) {
    emailStatus.textContent = `${providerLabel} is connected, but a different sender is selected.`;
    emailStatus.className = "email-status";
  } else {
    emailStatus.textContent = "Email sender is not connected.";
    emailStatus.className = "email-status";
  }
  disconnectEmailButton.disabled = !auth.provider;
  testEmailButton.disabled = !matchesSelectedProvider;
}

function renderEmailProviderSettings() {
  const isMicrosoft = emailProviderInput.value === "microsoft";
  gmailEmailSettings.hidden = isMicrosoft;
  microsoftEmailSettings.hidden = !isMicrosoft;
}

async function saveEmailConfig(options = {}) {
  const config = readEmailConfigForm(options.requireRecipients === true);
  if (config.enabled) {
    const { emailAuth = {} } = await chrome.storage.local.get("emailAuth");
    if (emailAuth.provider !== config.provider) {
      throw new Error("Connect the selected sending account before turning on email alerts");
    }
  }
  await chrome.storage.local.set({ emailConfig: config, lastEmailError: "" });
  if (!options.quiet) {
    saveEmailButton.textContent = "Saved";
    emailStatus.textContent = `Saved ${config.recipients.length} receiving ${config.recipients.length === 1 ? "address" : "addresses"}.`;
    setTimeout(() => { saveEmailButton.textContent = "Save"; }, 900);
  }
  return config;
}

async function connectEmailSender() {
  await setEmailButtonsBusy(true);
  connectEmailButton.textContent = "Connecting…";
  try {
    await saveEmailConfig({ quiet: true });
    const result = await chrome.runtime.sendMessage({ type: "connect-email" });
    if (!result?.ok) throw new Error(result?.error || "Could not connect the sending account");
    emailStatus.textContent = `Connected to ${result.auth.accountEmail || "sending account"}.`;
    await render();
  } catch (error) {
    emailStatus.textContent = error.message;
    emailStatus.className = "email-status error";
  } finally {
    connectEmailButton.textContent = "Connect sender";
    await setEmailButtonsBusy(false);
  }
}

async function disconnectEmailSender() {
  await setEmailButtonsBusy(true);
  try {
    const result = await chrome.runtime.sendMessage({ type: "disconnect-email" });
    if (!result?.ok) throw new Error(result?.error || "Could not disconnect the sending account");
    emailEnabledInput.checked = false;
    const config = readEmailConfigForm(false);
    await chrome.storage.local.set({ emailConfig: { ...config, enabled: false } });
    emailStatus.textContent = "Email sender disconnected.";
    await render();
  } catch (error) {
    emailStatus.textContent = error.message;
    emailStatus.className = "email-status error";
  } finally {
    await setEmailButtonsBusy(false);
  }
}

async function sendTestEmail() {
  await setEmailButtonsBusy(true);
  testEmailButton.textContent = "Sending…";
  try {
    await saveEmailConfig({ quiet: true, requireRecipients: true });
    const result = await chrome.runtime.sendMessage({ type: "test-email" });
    if (!result?.ok) throw new Error(result?.error || "Test email failed");
    emailStatus.textContent = `Test email sent to ${result.result.recipients} ${result.result.recipients === 1 ? "address" : "addresses"}.`;
    emailStatus.className = "email-status connected";
  } catch (error) {
    emailStatus.textContent = error.message;
    emailStatus.className = "email-status error";
  } finally {
    testEmailButton.textContent = "Send test email";
    await setEmailButtonsBusy(false);
  }
}

async function setEmailButtonsBusy(busy) {
  if (busy) {
    saveEmailButton.disabled = true;
    connectEmailButton.disabled = true;
    disconnectEmailButton.disabled = true;
    testEmailButton.disabled = true;
    return;
  }
  const { emailAuth = {} } = await chrome.storage.local.get("emailAuth");
  saveEmailButton.disabled = false;
  connectEmailButton.disabled = false;
  disconnectEmailButton.disabled = !emailAuth.provider;
  testEmailButton.disabled = emailAuth.provider !== emailProviderInput.value;
}

function readEmailConfigForm(requireRecipients) {
  const rawAddresses = emailRecipientsInput.value
    .split(/[\s,;]+/)
    .map((address) => address.trim())
    .filter(Boolean);
  const invalidAddresses = rawAddresses.filter((address) => !isValidEmailAddressForPopup(address));
  if (invalidAddresses.length) throw new Error(`Invalid receiving address: ${invalidAddresses[0]}`);
  const seenAddresses = new Set();
  const recipients = rawAddresses.filter((address) => {
    const normalized = address.toLocaleLowerCase();
    if (seenAddresses.has(normalized)) return false;
    seenAddresses.add(normalized);
    return true;
  });
  if ((requireRecipients || emailEnabledInput.checked) && !recipients.length) {
    throw new Error("Add at least one receiving address");
  }
  return {
    enabled: emailEnabledInput.checked,
    provider: emailProviderInput.value === "microsoft" ? "microsoft" : "gmail",
    recipients,
    microsoftClientId: microsoftClientIdInput.value.trim(),
    microsoftTenant: microsoftTenantInput.value.trim() || "common"
  };
}

function normalizeEmailConfigForPopup(value) {
  const config = value && typeof value === "object" ? value : {};
  return {
    enabled: config.enabled === true,
    provider: config.provider === "microsoft" ? "microsoft" : "gmail",
    recipients: Array.isArray(config.recipients) ? config.recipients.map(String) : [],
    microsoftClientId: String(config.microsoftClientId || ""),
    microsoftTenant: String(config.microsoftTenant || "common") || "common"
  };
}

function isValidEmailAddressForPopup(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || ""));
}

async function saveShiftCrewSchedules() {
  const schedules = Object.fromEntries(
    SHIFT_CREW_HALLS.map((hall) => [hall, SHIFT_CREW_INPUTS[hall].value.trim()])
  );
  saveShiftCrewButton.disabled = true;
  saveShiftCrewButton.textContent = "Checking…";
  shiftCrewStatus.textContent = "Saving URLs and checking the configured schedules…";
  shiftCrewStatus.className = "shift-crew-status";
  shiftCrewDetails.open = false;
  try {
    const result = await chrome.runtime.sendMessage({ type: "save-shift-crew-schedules", schedules });
    if (!result?.ok) throw new Error(result?.error || "The shift schedules could not be checked");
    shiftCrewConfigLoaded = false;
    await render();
    shiftCrewDetails.open = false;
    if (!result.result?.error) {
      shiftCrewStatus.textContent = Object.values(schedules).some(Boolean)
        ? "Schedule URLs saved and checked."
        : "All shift-schedule URLs cleared.";
    }
  } catch (error) {
    shiftCrewDetails.open = true;
    shiftCrewStatus.textContent = error.message;
    shiftCrewStatus.className = "shift-crew-status error";
  } finally {
    saveShiftCrewButton.disabled = false;
    saveShiftCrewButton.textContent = "Enter";
  }
}

function renderShiftCrewControls(state) {
  const schedules = normalizeShiftCrewSchedulesForPopup(state.shiftCrewSchedules);
  if (!shiftCrewConfigLoaded) {
    for (const hall of SHIFT_CREW_HALLS) SHIFT_CREW_INPUTS[hall].value = schedules[hall];
    shiftCrewConfigLoaded = true;
  }

  for (const hall of SHIFT_CREW_HALLS) {
    const display = formatCurrentShiftCrew(schedules[hall], state.shiftCrewState?.[hall]);
    configureShiftCrewLink(SHIFT_CREW_LINKS[hall], schedules[hall]);
    configureShiftCrewLink(SHIFT_CREW_HOVER_LINKS[hall], schedules[hall]);
    SHIFT_CREW_CURRENT[hall].textContent = display.text;
    SHIFT_CREW_CURRENT[hall].title = display.title;
    SHIFT_CREW_HOVER[hall].textContent = display.text;
    SHIFT_CREW_HOVER[hall].title = display.title;
  }

  const configuredCount = Object.values(schedules).filter(Boolean).length;
  shiftCrewStatus.className = state.shiftCrewError ? "shift-crew-status error" : "shift-crew-status";
  if (state.shiftCrewChecking) {
    shiftCrewStatus.textContent = "Checking shift schedules…";
  } else if (state.shiftCrewError) {
    shiftCrewStatus.textContent = state.shiftCrewError;
  } else if (configuredCount && state.lastShiftCrewCheck) {
    shiftCrewStatus.textContent = `Checked daily · Last checked ${new Date(state.lastShiftCrewCheck).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })}`;
  } else if (configuredCount) {
    shiftCrewStatus.textContent = "URLs saved. Waiting for the first daily check.";
  } else {
    shiftCrewStatus.textContent = "No shift schedules configured.";
  }
}

function configureShiftCrewLink(link, url) {
  if (url) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = `Open ${link.textContent} shift schedule`;
    link.removeAttribute("aria-disabled");
    return;
  }
  link.removeAttribute("href");
  link.removeAttribute("target");
  link.removeAttribute("rel");
  link.removeAttribute("title");
  link.setAttribute("aria-disabled", "true");
}

function normalizeShiftCrewSchedulesForPopup(value) {
  const stored = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    SHIFT_CREW_HALLS.map((hall) => [hall, typeof stored[hall] === "string" ? stored[hall] : ""])
  );
}

function formatCurrentShiftCrew(url, schedule) {
  if (!url) return { text: "", title: "" };
  if (!schedule || schedule.status === "error") {
    return {
      text: "Unavailable",
      title: schedule?.error || "The schedule has not been checked yet"
    };
  }
  const timeParts = getJlabTimePartsForPopup();
  const todayCode = timeParts.dateCode;
  if (schedule.status === "no-shift" || schedule.dateCode !== todayCode) {
    return { text: "No shift scheduled today", title: schedule.title || "" };
  }
  const currentHour = timeParts.hour;
  if (Array.isArray(schedule.hourlyCrew) && schedule.hourlyCrew.length) {
    const hourCrew = schedule.hourlyCrew.find((item) => Number(item?.hour) === currentHour);
    if (!hourCrew) return { text: "Current shift unavailable", title: schedule.title || "" };
    const crew = formatShiftCrewWorkers(hourCrew.workers);
    return {
      text: `${hourCrew.shiftName || "Current"} · ${crew.length ? crew.join(" · ") : (hourCrew.status || "No crew listed")}`,
      title: `${schedule.dateLabel || "Today"} · ${schedule.title || "JLab shift schedule"}`
    };
  }
  const shiftIndex = currentHour < 8 ? 0 : currentHour < 16 ? 1 : 2;
  const shift = Array.isArray(schedule.shifts) ? schedule.shifts[shiftIndex] : null;
  if (!shift) return { text: "Current shift unavailable", title: schedule.title || "" };
  const crew = formatShiftCrewWorkers(shift.workers);
  const detail = crew.length ? crew.join(" · ") : (shift.status || "No crew listed");
  return {
    text: `${shift.name || ["Owl", "Day", "Swing"][shiftIndex]} · ${detail}`,
    title: `${schedule.dateLabel || "Today"} · ${schedule.title || "JLab shift schedule"}`
  };
}

function formatShiftCrewWorkers(value) {
  return Array.isArray(value)
    ? value
        .filter((worker) => worker?.name)
        .map((worker) => `${worker.role ? `${worker.role}: ` : ""}${worker.name}`)
    : [];
}

function getJlabTimePartsForPopup(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(now)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return {
    dateCode: `${parts.year}${parts.month}${parts.day}`,
    hour: Number(parts.hour)
  };
}

function renderRecentAlarms(value) {
  const alarms = normalizeAlertHistory(value);
  recentAlarmsList.replaceChildren();

  if (!alarms.length) {
    const empty = document.createElement("span");
    empty.className = "recent-alarms-empty";
    empty.textContent = "No alarms recorded yet.";
    recentAlarmsList.append(empty);
    expandAlarmsButton.hidden = true;
    return;
  }

  for (const alarm of alarms.slice(0, recentAlarmLimit)) {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    button.className = "recent-alarm-item";
    title.textContent = alarm.systemTitle;
    meta.textContent = `${formatAlarmTime(alarm.createdAt)} · ${alarm.message}`;
    button.title = alarm.url ? "Open this alarm" : alarm.systemTitle;
    button.disabled = !alarm.url;
    button.append(title, meta);
    if (alarm.url) button.addEventListener("click", () => chrome.tabs.create({ url: alarm.url }));
    recentAlarmsList.append(button);
  }

  expandAlarmsButton.hidden = alarms.length <= 5;
  expandAlarmsButton.textContent = recentAlarmLimit === 5
    ? `Show up to 20 (${Math.min(alarms.length, 20)} available)`
    : "Show latest 5";
}

function normalizeAlertHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((alarm) => alarm && typeof alarm.systemTitle === "string" && Number.isFinite(Number(alarm.createdAt)))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 20)
    .map((alarm) => ({
      systemTitle: alarm.systemTitle,
      message: typeof alarm.message === "string" ? alarm.message : "",
      url: typeof alarm.url === "string" ? alarm.url : "",
      createdAt: Number(alarm.createdAt)
    }));
}

function formatAlarmTime(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderShiftSummaries(
  summariesByBook,
  activeBooks,
  initialized,
  shiftEditEnabledBookSlugs,
  monitoredBooks,
  shiftSummaryEditError
) {
  shiftSummaryList.replaceChildren();
  if (!activeBooks.length) {
    const empty = document.createElement("span");
    empty.className = "shift-summary-empty";
    empty.textContent = "No enabled logbooks.";
    shiftSummaryList.append(empty);
    return;
  }

  for (const book of activeBooks) {
    const group = document.createElement("section");
    const header = document.createElement("div");
    const heading = document.createElement("h3");
    const editControl = document.createElement("div");
    const editLabel = document.createElement("span");
    const switchLabel = document.createElement("label");
    const editCheckbox = document.createElement("input");
    const slider = document.createElement("span");
    const summaries = Array.isArray(summariesByBook?.[book.slug]) ? summariesByBook[book.slug] : [];
    header.className = "shift-summary-group-header";
    editControl.className = "shift-summary-edit-toggle";
    editLabel.textContent = "Edit alerts";
    switchLabel.className = "small-switch";
    switchLabel.setAttribute("aria-label", `Notify when the latest ${book.name} shift summary is edited`);
    editCheckbox.type = "checkbox";
    editCheckbox.checked = shiftEditEnabledBookSlugs.includes(book.slug);
    slider.className = "small-slider";
    switchLabel.append(editCheckbox, slider);
    editControl.append(editLabel, switchLabel);
    if (shiftSummaryEditError?.includes(`${book.name}:`)) editControl.title = shiftSummaryEditError;
    heading.textContent = `${book.name} (${summaries.length})`;
    header.append(heading, editControl);
    group.append(header);

    editCheckbox.addEventListener("change", async () => {
      editCheckbox.disabled = true;
      const selected = new Set(shiftEditEnabledBookSlugs);
      if (editCheckbox.checked) selected.add(book.slug);
      else selected.delete(book.slug);
      const { shiftSummaryFingerprints = {} } = await chrome.storage.local.get("shiftSummaryFingerprints");
      const nextFingerprints = { ...shiftSummaryFingerprints };
      delete nextFingerprints[book.slug];
      await chrome.storage.local.set({
        shiftSummaryEditEnabledBooks: monitoredBooks
          .filter((item) => selected.has(item.slug))
          .map((item) => item.slug),
        shiftSummaryFingerprints: nextFingerprints
      });
      if (editCheckbox.checked && enabledInput.checked) {
        await chrome.runtime.sendMessage({ type: "check-now" });
      }
      await render();
    });

    if (!summaries.length) {
      const empty = document.createElement("span");
      empty.className = "shift-summary-empty";
      empty.textContent = initialized ? "No shift summaries found" : "Waiting for first check";
      group.append(empty);
    } else {
      for (const summary of summaries) {
        const button = document.createElement("button");
        button.className = "shift-summary-link";
        button.textContent = `#${summary.lognumber} · ${summary.title}`;
        button.title = `Open ${summary.title}`;
        button.addEventListener("click", () => {
          chrome.tabs.create({ url: summary.url || `https://logbooks.jlab.org/entry/${summary.lognumber}` });
        });
        group.append(button);
      }
    }
    shiftSummaryList.append(group);
  }
}

function renderBookControls(monitoredBooks, enabledBookSlugs) {
  bookControlList.replaceChildren();
  if (!monitoredBooks.length) {
    const empty = document.createElement("span");
    empty.className = "book-empty";
    empty.textContent = "No logbooks added yet.";
    bookControlList.append(empty);
    return;
  }

  for (const book of monitoredBooks) {
    const row = document.createElement("div");
    row.className = "book-control-row";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const name = document.createElement("span");
    checkbox.type = "checkbox";
    checkbox.checked = enabledBookSlugs.includes(book.slug);
    name.textContent = book.name;
    label.append(checkbox, name);

    const actions = document.createElement("div");
    const openButton = document.createElement("button");
    const removeButton = document.createElement("button");
    openButton.textContent = "Open";
    removeButton.textContent = "Remove";
    actions.append(openButton, removeButton);
    const main = document.createElement("div");
    main.className = "book-control-main";
    main.append(label, actions);

    const rangeControl = document.createElement("div");
    const rangeText = document.createElement("span");
    const rangeFields = document.createElement("div");
    const rangeInput = document.createElement("input");
    const rangeTypeSelect = document.createElement("select");
    rangeControl.className = "book-range-control";
    rangeFields.className = "book-range-fields";
    rangeText.textContent = "Check latest";
    rangeInput.type = "number";
    rangeInput.min = "1";
    rangeInput.step = "1";
    rangeInput.setAttribute("aria-label", `Check range amount for ${book.name}`);
    rangeTypeSelect.setAttribute("aria-label", `Check range type for ${book.name}`);
    for (const rangeType of ["entries", "hours", "days"]) {
      const option = document.createElement("option");
      option.value = rangeType;
      option.textContent = rangeType;
      rangeTypeSelect.append(option);
    }
    rangeTypeSelect.value = book.rangeType;
    applyRangeInput(rangeInput, book.rangeType, book.rangeValue);
    rangeFields.append(rangeInput, rangeTypeSelect);
    rangeControl.append(rangeText, rangeFields);

    row.append(main, rangeControl);
    bookControlList.append(row);

    checkbox.addEventListener("change", async () => {
      const selected = new Set(enabledBookSlugs);
      if (checkbox.checked) selected.add(book.slug);
      else selected.delete(book.slug);
      await chrome.storage.local.set({ enabledBooks: monitoredBooks.filter((item) => selected.has(item.slug)).map((item) => item.slug) });
      if (enabledInput.checked) await chrome.runtime.sendMessage({ type: "check-now" });
    });
    openButton.addEventListener("click", () => chrome.tabs.create({ url: `https://logbooks.jlab.org/book/${book.slug}` }));
    rangeInput.addEventListener("input", () => {
      const rangeType = normalizeRangeType(rangeTypeSelect.value);
      book.rangeValues[rangeType] = normalizeRangeValue(rangeType, rangeInput.value);
    });
    rangeInput.addEventListener("change", async () => {
      await saveBookRange({ book, monitoredBooks, enabledBookSlugs, rangeInput, rangeTypeSelect });
    });
    rangeTypeSelect.addEventListener("change", async () => {
      const rangeType = normalizeRangeType(rangeTypeSelect.value);
      applyRangeInput(rangeInput, rangeType, book.rangeValues[rangeType]);
      await saveBookRange({ book, monitoredBooks, enabledBookSlugs, rangeInput, rangeTypeSelect });
    });
    removeButton.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "remove-logbook", slug: book.slug });
      if (enabledInput.checked) await chrome.runtime.sendMessage({ type: "check-now" });
    });
  }
}

function renderDiagnostics(diagnostics, monitoredBooks, enabledBookSlugs) {
  bookDiagnostics.replaceChildren();
  for (const book of monitoredBooks) {
    const data = diagnostics?.[book.slug];
    const row = document.createElement("div");
    const name = document.createElement("strong");
    const value = document.createElement("span");
    name.textContent = book.name;
    if (!enabledBookSlugs.includes(book.slug)) {
      value.textContent = "Automatic checks off";
      row.append(name, value);
      bookDiagnostics.append(row);
      continue;
    }
    if (!data) {
      value.textContent = "Waiting for first check";
      row.append(name, value);
      bookDiagnostics.append(row);
      continue;
    }
    const event = data.pageEvent;
    const eventText = event?.status === "open"
      ? `OPEN EVENT: ${event.title}`
      : "No open event banner detected";
    value.textContent = data.newestLognumber
      ? `Newest #${data.newestLognumber} · ${data.newestAuthor} · Comment monitoring active · ${eventText}`
      : eventText;
    row.append(name, value);
    bookDiagnostics.append(row);
  }
}

function normalizeMonitoredBooks(value) {
  if (!Array.isArray(value)) return DEFAULT_BOOKS.map((book) => ({ ...book }));
  return value
    .filter((book) => book && typeof book.name === "string" && typeof book.slug === "string")
    .map((book) => {
      const rangeType = normalizeRangeType(book.rangeType);
      const rangeValue = normalizeRangeValue(
        rangeType,
        book.rangeValue ?? (rangeType === "entries" ? book.limit : defaultRangeValue(rangeType))
      );
      const rangeValues = normalizeRangeValues(book.rangeValues, rangeType, rangeValue);
      return {
        name: book.name,
        slug: book.slug.toLocaleLowerCase(),
        rangeType,
        rangeValue,
        rangeValues
      };
    });
}

async function saveBookRange({ book, monitoredBooks, enabledBookSlugs, rangeInput, rangeTypeSelect }) {
  const rangeType = normalizeRangeType(rangeTypeSelect.value);
  const rangeValue = normalizeRangeValue(rangeType, rangeInput.value);
  const rangeValues = normalizeRangeValues(book.rangeValues, rangeType, rangeValue);
  const updatedBook = { ...book, rangeType, rangeValue, rangeValues };
  applyRangeInput(rangeInput, rangeType, rangeValue);
  await chrome.storage.local.set({
    monitoredBooks: monitoredBooks.map((item) => item.slug === book.slug ? updatedBook : item)
  });
  Object.assign(book, updatedBook);
  if (enabledInput.checked && enabledBookSlugs.includes(book.slug)) {
    await chrome.runtime.sendMessage({ type: "check-now" });
  }
}

function applyRangeInput(input, rangeType, rangeValue) {
  input.max = rangeType === "entries" ? "1000" : rangeType === "hours" ? "720" : "30";
  input.value = String(normalizeRangeValue(rangeType, rangeValue));
}

function normalizeRangeType(value) {
  return ["entries", "hours", "days"].includes(value) ? value : "entries";
}

function defaultRangeValue(rangeType) {
  if (rangeType === "hours") return 24;
  if (rangeType === "days") return 1;
  return 100;
}

function defaultRangeValues() {
  return {
    entries: defaultRangeValue("entries"),
    hours: defaultRangeValue("hours"),
    days: defaultRangeValue("days")
  };
}

function normalizeRangeValues(value, activeType, activeValue) {
  const stored = value && typeof value === "object" ? value : {};
  const values = {
    entries: normalizeRangeValue("entries", stored.entries),
    hours: normalizeRangeValue("hours", stored.hours),
    days: normalizeRangeValue("days", stored.days)
  };
  values[activeType] = normalizeRangeValue(activeType, activeValue);
  return values;
}

function normalizeRangeValue(rangeType, value) {
  const parsed = Math.trunc(Number(value));
  const normalized = Number.isFinite(parsed) ? Math.max(1, parsed) : defaultRangeValue(rangeType);
  if (rangeType === "hours") return Math.min(720, normalized);
  if (rangeType === "days") return Math.min(30, normalized);
  return Math.min(1000, normalized);
}

function normalizeEnabledSlugs(value, monitoredBooks) {
  if (!Array.isArray(value)) return monitoredBooks.map((book) => book.slug);
  const selected = new Set(value.map((item) => String(item).toLocaleLowerCase()));
  return monitoredBooks
    .filter((book) => selected.has(book.slug) || selected.has(book.name.toLocaleLowerCase()))
    .map((book) => book.slug);
}
