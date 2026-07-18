const DEFAULT_BOOKS = [
  { name: "HCLOG", slug: "hclog", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() },
  { name: "HBLOG", slug: "hblog", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() },
  { name: "SOLID", slug: "solid", rangeType: "entries", rangeValue: 100, rangeValues: defaultRangeValues() }
];
const enabledInput = document.querySelector("#enabled");
const helpButton = document.querySelector("#help-button");
const helpPanel = document.querySelector("#help-panel");
const openSetupGuideButton = document.querySelector("#open-setup-guide");
const intervalInput = document.querySelector("#interval");
const repeatDtmAlertsInput = document.querySelector("#repeat-dtm-alerts");
const openDtmButton = document.querySelector("#open-dtm");
const dtmStatusDot = document.querySelector("#dtm-status-dot");
const dtmStatus = document.querySelector("#dtm-status");
const dtmStatusDetail = document.querySelector("#dtm-status-detail");
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
const extensionUpdateCurrentVersion = document.querySelector("#extension-update-current-version");
const extensionUpdateStatus = document.querySelector("#extension-update-status");
const trackExtensionUpdatesInput = document.querySelector("#track-extension-updates");
const checkExtensionUpdateButton = document.querySelector("#check-extension-update");
const openUpdateGuideButton = document.querySelector("#open-update-guide");
const downloadExtensionUpdateButton = document.querySelector("#download-extension-update");
const openPreviousVersionsButton = document.querySelector("#open-previous-versions");
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
const popupTabButtons = [...document.querySelectorAll("[data-popup-tab]")];
const popupViewElements = [...document.querySelectorAll("[data-popup-view]")];
const interfaceModeButtons = [...document.querySelectorAll("[data-interface-mode-button]")];
const interfaceModeDescription = document.querySelector("#interface-mode-description");
const advancedSettingsBanner = document.querySelector("#advanced-settings-banner");
const advancedSettingsSummary = document.querySelector("#advanced-settings-summary");
const switchToAdvancedButton = document.querySelector("#switch-to-advanced");
const healthList = document.querySelector("#health-list");
const copyDiagnosticsButton = document.querySelector("#copy-diagnostics");
const copyDiagnosticsStatus = document.querySelector("#copy-diagnostics-status");
const alertPolicyList = document.querySelector("#alert-policy-list");
const alertPresetInput = document.querySelector("#alert-preset");
const alertPresetDescription = document.querySelector("#alert-preset-description");
const quietHoursEnabledInput = document.querySelector("#quiet-hours-enabled");
const quietHoursStartInput = document.querySelector("#quiet-hours-start");
const quietHoursEndInput = document.querySelector("#quiet-hours-end");
const snoozeDurationInput = document.querySelector("#snooze-duration");
const snoozeNotificationsButton = document.querySelector("#snooze-notifications");
const resumeNotificationsButton = document.querySelector("#resume-notifications");
const alertPolicyStatus = document.querySelector("#alert-policy-status");
const resetRecommendedButton = document.querySelector("#reset-recommended");
const resetRecommendedStatus = document.querySelector("#reset-recommended-status");
const testSetupButton = document.querySelector("#test-setup");
const setupTestResults = document.querySelector("#setup-test-results");
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
const SHIFT_CREW_ALERT_INPUTS = {
  hallA: document.querySelector("#shift-crew-alert-hall-a"),
  hallB: document.querySelector("#shift-crew-alert-hall-b"),
  hallC: document.querySelector("#shift-crew-alert-hall-c"),
  hallD: document.querySelector("#shift-crew-alert-hall-d")
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
const setupWizard = document.querySelector("#setup-wizard");
const setupWizardTitle = document.querySelector("#setup-wizard-title");
const setupWizardProgress = document.querySelector("#setup-wizard-progress");
const setupWizardSteps = [...document.querySelectorAll("[data-setup-step]")];
const setupWizardLogbooks = document.querySelector("#setup-wizard-logbooks");
const setupWizardInterval = document.querySelector("#setup-wizard-interval");
const setupWizardError = document.querySelector("#setup-wizard-error");
const setupWizardTestNotification = document.querySelector("#setup-wizard-test-notification");
const setupWizardSkipButton = document.querySelector("#setup-wizard-skip");
const setupWizardBackButton = document.querySelector("#setup-wizard-back");
const setupWizardNextButton = document.querySelector("#setup-wizard-next");
let authorsLoaded = false;
let recentAlarmLimit = 5;
let emailConfigLoaded = false;
let shiftCrewConfigLoaded = false;
let currentInterfaceMode = "simple";
let currentSetupWizardStep = 0;
let currentExtensionUpdateDownloadUrl = "";
const POPUP_VIEWS = ["overview", "dtm", "shifts", "alerts", "settings"];
const SIMPLE_POPUP_VIEWS = ["overview", "dtm"];
let activePopupView = POPUP_VIEWS.includes(localStorage.getItem("jlab-popup-view"))
  ? localStorage.getItem("jlab-popup-view")
  : "overview";

const SETTINGS_BACKUP_FORMAT = "jlab-logbook-comment-monitor-backup";
const SETTINGS_BACKUP_VERSION = 1;
const TRANSIENT_STORAGE_KEYS = new Set([
  "checking", "lastError", "shiftSummaryEditError", "pendingAlerts", "emailAuth",
  "lastEmailError", "lastEmailAttempt", "lastEmailSentAt", "shiftCrewState",
  "shiftCrewChecking", "shiftCrewError", "lastShiftCrewCheck", "healthState",
  "lastSuccessfulCheck", "lastCommentRecoveryScan", "notificationsSnoozedUntil",
  "extensionUpdateState", "extensionUpdateLastNotifiedVersion", "extensionUpdateDismissedVersion"
]);

extensionVersion.textContent = chrome.runtime.getManifest().version;
extensionUpdateCurrentVersion.textContent = chrome.runtime.getManifest().version;
extensionId.textContent = chrome.runtime.id;
gmailExtensionId.textContent = chrome.runtime.id;
microsoftRedirectUri.textContent = chrome.identity.getRedirectURL("microsoft");
initializeAlertPolicyRows();
setActivePopupView(activePopupView);

for (const button of popupTabButtons) {
  button.addEventListener("click", () => setActivePopupView(button.dataset.popupTab));
}
for (const button of interfaceModeButtons) {
  button.addEventListener("click", () => setInterfaceMode(button.dataset.interfaceModeButton));
}
switchToAdvancedButton.addEventListener("click", () => setInterfaceMode("advanced"));

checkExtensionUpdateButton.addEventListener("click", checkExtensionUpdateFromPopup);
trackExtensionUpdatesInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ trackExtensionUpdates: trackExtensionUpdatesInput.checked });
  await render();
});
openUpdateGuideButton.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
});
downloadExtensionUpdateButton.addEventListener("click", () => {
  if (currentExtensionUpdateDownloadUrl) chrome.tabs.create({ url: currentExtensionUpdateDownloadUrl });
});
openPreviousVersionsButton.addEventListener("click", () => {
  chrome.tabs.create({ url: EXTENSION_RELEASES_URL });
});

copyDiagnosticsButton.addEventListener("click", copyDiagnostics);
alertPresetInput.addEventListener("change", async () => {
  if (!MONITOR_ALERT_PRESETS.includes(alertPresetInput.value)) return;
  const alertPreferences = alertPreferencesForPreset(alertPresetInput.value);
  await chrome.storage.local.set({
    alertPreferences,
    repeatDtmAlerts: alertPresetInput.value === "everything"
  });
  alertPolicyStatus.textContent = `${alertPresetInput.options[alertPresetInput.selectedIndex].text} alert level selected.`;
  await render();
});
quietHoursEnabledInput.addEventListener("change", saveAlertPolicyControls);
quietHoursStartInput.addEventListener("change", saveAlertPolicyControls);
quietHoursEndInput.addEventListener("change", saveAlertPolicyControls);
snoozeNotificationsButton.addEventListener("click", async () => {
  const hours = Math.max(1, Number(snoozeDurationInput.value) || 1);
  await chrome.storage.local.set({ notificationsSnoozedUntil: Date.now() + hours * 60 * 60 * 1000 });
  alertPolicyStatus.textContent = `Notifications snoozed for ${hours} hour${hours === 1 ? "" : "s"}. Alerts will remain in Recent alarms.`;
  await render();
});
resumeNotificationsButton.addEventListener("click", async () => {
  await chrome.storage.local.set({ notificationsSnoozedUntil: 0 });
  alertPolicyStatus.textContent = "Notification delivery resumed.";
  await render();
});
testSetupButton.addEventListener("click", testFullSetup);
resetRecommendedButton.addEventListener("click", resetRecommendedSettings);
openSetupGuideButton.addEventListener("click", () => {
  helpPanel.hidden = true;
  helpButton.setAttribute("aria-expanded", "false");
  openSetupWizard();
});
setupWizardSkipButton.addEventListener("click", async () => {
  if (currentSetupWizardStep === 2) {
    await finishSetupWizard(false);
    return;
  }
  setupWizard.hidden = true;
  await chrome.storage.local.set({ onboardingCompleted: true });
});
setupWizardBackButton.addEventListener("click", () => {
  currentSetupWizardStep = Math.max(0, currentSetupWizardStep - 1);
  renderSetupWizardStep();
});
setupWizardNextButton.addEventListener("click", advanceSetupWizard);

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
  await render();
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
for (const input of Object.values(SHIFT_CREW_ALERT_INPUTS)) {
  input.addEventListener("change", async () => {
    const shiftCrewAlertEnabledHalls = SHIFT_CREW_HALLS.filter((hall) => SHIFT_CREW_ALERT_INPUTS[hall].checked);
    await chrome.storage.local.set({ shiftCrewAlertEnabledHalls });
  });
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

function setActivePopupView(view) {
  activePopupView = POPUP_VIEWS.includes(view) ? view : "overview";
  document.body.dataset.activePopupView = activePopupView;
  localStorage.setItem("jlab-popup-view", activePopupView);
  for (const button of popupTabButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.popupTab === activePopupView));
  }
  for (const element of popupViewElements) {
    element.classList.toggle("popup-view-hidden", element.dataset.popupView !== activePopupView);
  }
}

async function openSetupWizard() {
  const state = await chrome.storage.local.get(["monitoredBooks", "enabledBooks", "intervalMinutes"]);
  const monitoredBooks = normalizeMonitoredBooks(state.monitoredBooks);
  const enabledBookSlugs = new Set(normalizeEnabledSlugs(state.enabledBooks, monitoredBooks));
  setupWizardLogbooks.replaceChildren();
  for (const book of monitoredBooks) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const name = document.createElement("span");
    input.type = "checkbox";
    input.dataset.bookSlug = book.slug;
    input.checked = enabledBookSlugs.has(book.slug);
    name.textContent = book.name;
    label.append(input, name);
    setupWizardLogbooks.append(label);
  }
  setupWizardInterval.value = [5, 10, 15, 30, 60].includes(Number(state.intervalMinutes))
    ? String(state.intervalMinutes)
    : "5";
  setupWizardTestNotification.checked = true;
  setupWizardError.textContent = "";
  currentSetupWizardStep = 0;
  renderSetupWizardStep();
  setupWizard.hidden = false;
}

function renderSetupWizardStep() {
  const titles = ["Welcome", "Choose logbooks", "Finish setup"];
  setupWizardTitle.textContent = titles[currentSetupWizardStep];
  setupWizardProgress.textContent = `${currentSetupWizardStep + 1} of 3`;
  for (const step of setupWizardSteps) {
    step.hidden = Number(step.dataset.setupStep) !== currentSetupWizardStep;
  }
  setupWizardBackButton.hidden = currentSetupWizardStep === 0;
  setupWizardNextButton.textContent = currentSetupWizardStep === 2 ? "Finish setup" : "Next";
  setupWizardSkipButton.textContent = currentSetupWizardStep === 2 ? "Finish without test" : "Not now";
}

async function advanceSetupWizard() {
  if (currentSetupWizardStep === 1 && !selectedWizardBookSlugs().length) {
    setupWizardError.textContent = "Select at least one logbook to monitor.";
    return;
  }
  setupWizardError.textContent = "";
  if (currentSetupWizardStep < 2) {
    currentSetupWizardStep += 1;
    renderSetupWizardStep();
    return;
  }
  await finishSetupWizard(setupWizardTestNotification.checked);
}

function selectedWizardBookSlugs() {
  return [...setupWizardLogbooks.querySelectorAll("input[data-book-slug]:checked")]
    .map((input) => input.dataset.bookSlug);
}

async function finishSetupWizard(showTestNotification) {
  const enabledBooks = selectedWizardBookSlugs();
  if (!enabledBooks.length) {
    currentSetupWizardStep = 1;
    setupWizardError.textContent = "Select at least one logbook to monitor.";
    renderSetupWizardStep();
    return;
  }
  setupWizardNextButton.disabled = true;
  setupWizardNextButton.textContent = "Finishing…";
  await chrome.storage.local.set({
    enabled: true,
    enabledBooks,
    intervalMinutes: Number(setupWizardInterval.value) || 5,
    alertPreferences: alertPreferencesForPreset("standard"),
    repeatDtmAlerts: false,
    quietHours: normalizeQuietHours({ enabled: false }),
    notificationsSnoozedUntil: 0,
    onboardingCompleted: true
  });
  setupWizard.hidden = true;
  setupWizardNextButton.disabled = false;
  if (showTestNotification) await chrome.runtime.sendMessage({ type: "test-notification" });
  await chrome.runtime.sendMessage({ type: "check-now" });
  await render();
}

async function resetRecommendedSettings() {
  resetRecommendedButton.disabled = true;
  resetRecommendedButton.textContent = "Resetting…";
  await chrome.storage.local.set({
    intervalMinutes: 5,
    alertPreferences: alertPreferencesForPreset("standard"),
    repeatDtmAlerts: false,
    quietHours: normalizeQuietHours({ enabled: false }),
    notificationsSnoozedUntil: 0
  });
  await render();
  resetRecommendedStatus.textContent = "Recommended defaults restored. Logbooks, names, schedules, email setup, and alarm history were kept.";
  resetRecommendedButton.disabled = false;
  resetRecommendedButton.textContent = "Use recommended defaults";
}

async function setInterfaceMode(value) {
  const interfaceMode = normalizeInterfaceMode(value);
  if (interfaceMode === currentInterfaceMode) return;
  currentInterfaceMode = interfaceMode;
  document.body.dataset.interfaceMode = interfaceMode;
  if (interfaceMode === "simple" && !SIMPLE_POPUP_VIEWS.includes(activePopupView)) setActivePopupView("overview");
  await chrome.storage.local.set({ interfaceMode });
  await render();
}

function renderInterfaceMode(state, monitoredBooks) {
  const interfaceMode = normalizeInterfaceMode(state.interfaceMode);
  currentInterfaceMode = interfaceMode;
  document.body.dataset.interfaceMode = interfaceMode;
  if (interfaceMode === "simple" && !SIMPLE_POPUP_VIEWS.includes(activePopupView)) setActivePopupView("overview");
  for (const button of interfaceModeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.interfaceModeButton === interfaceMode));
  }
  interfaceModeDescription.textContent = interfaceMode === "simple"
    ? "Simple keeps the most-used controls on one page."
    : "Advanced shows every monitoring and delivery control.";

  const features = getActiveAdvancedFeatures(state, monitoredBooks);
  advancedSettingsBanner.hidden = interfaceMode !== "simple" || !features.length;
  advancedSettingsSummary.textContent = features.length
    ? `Still active: ${features.slice(0, 3).join(", ")}${features.length > 3 ? ` and ${features.length - 3} more` : ""}.`
    : "";
}

function getActiveAdvancedFeatures(state, monitoredBooks) {
  const features = [];
  const preferences = normalizeAlertPreferences(state.alertPreferences);
  const alertPreset = detectAlertPreset(preferences);
  if (alertPreset === "custom") features.push("custom alert channels");
  if (normalizeQuietHours(state.quietHours).enabled) features.push("quiet hours");
  if (state.emailConfig?.enabled === true) features.push("email alerts");
  if ((state.shiftCrewAlertEnabledHalls || []).length) features.push("Shift Crew change alerts");
  if (monitoredBooks.some((book) => book.rangeType !== "entries" || Number(book.rangeValue) !== 100)) {
    features.push("custom logbook ranges");
  }
  const hasStoredShiftEditChoices = Array.isArray(state.shiftSummaryEditEnabledBooks);
  const shiftEditBooks = new Set(hasStoredShiftEditChoices ? state.shiftSummaryEditEnabledBooks : []);
  if (hasStoredShiftEditChoices && monitoredBooks.some((book) => !shiftEditBooks.has(book.slug))) {
    features.push("custom shift-summary edit alerts");
  }
  return features;
}

function initializeAlertPolicyRows() {
  alertPolicyList.replaceChildren();
  for (const type of MONITOR_ALERT_TYPES) {
    const row = document.createElement("div");
    row.className = "alert-policy-row";
    const name = document.createElement("span");
    name.textContent = type.label;
    const systemLabel = document.createElement("label");
    const systemInput = document.createElement("input");
    systemInput.type = "checkbox";
    systemInput.dataset.alertType = type.key;
    systemInput.dataset.alertChannel = "system";
    systemInput.setAttribute("aria-label", `${type.label} system notifications`);
    const emailLabel = document.createElement("label");
    const emailInput = document.createElement("input");
    emailInput.type = "checkbox";
    emailInput.dataset.alertType = type.key;
    emailInput.dataset.alertChannel = "email";
    emailInput.setAttribute("aria-label", `${type.label} email notifications`);
    systemLabel.append(systemInput);
    emailLabel.append(emailInput);
    row.append(name, systemLabel, emailLabel);
    alertPolicyList.append(row);
  }
  for (const input of alertPolicyList.querySelectorAll("input")) {
    input.addEventListener("change", saveAlertPolicyControls);
  }
}

async function saveAlertPolicyControls() {
  const alertPreferences = defaultAlertPreferences();
  for (const input of alertPolicyList.querySelectorAll("input")) {
    alertPreferences[input.dataset.alertType][input.dataset.alertChannel] = input.checked;
  }
  const quietHours = normalizeQuietHours({
    enabled: quietHoursEnabledInput.checked,
    start: quietHoursStartInput.value,
    end: quietHoursEndInput.value
  });
  await chrome.storage.local.set({ alertPreferences, quietHours });
  alertPresetInput.value = "custom";
  alertPresetDescription.textContent = "Using the individual choices under Advanced.";
  alertPolicyStatus.textContent = "Notification preferences saved.";
}

function renderAlertPolicyControls(state) {
  const preferences = normalizeAlertPreferences(state.alertPreferences);
  const quietHours = normalizeQuietHours(state.quietHours);
  let preset = detectAlertPreset(preferences);
  if (
    (preset === "everything" && state.repeatDtmAlerts !== true)
    || (["essential", "standard"].includes(preset) && state.repeatDtmAlerts === true)
  ) preset = "custom";
  alertPresetInput.value = preset;
  const descriptions = {
    essential: "DTM changes and entries by watched people.",
    standard: "Adds comments and shift-summary edits. Recommended.",
    everything: "All alert types, including recurring DTM reminders.",
    custom: "Using the individual choices under Advanced."
  };
  alertPresetDescription.textContent = descriptions[preset];
  for (const input of alertPolicyList.querySelectorAll("input")) {
    input.checked = preferences[input.dataset.alertType][input.dataset.alertChannel];
  }
  quietHoursEnabledInput.checked = quietHours.enabled;
  quietHoursStartInput.value = quietHours.start;
  quietHoursEndInput.value = quietHours.end;
  const snoozedUntil = Number(state.notificationsSnoozedUntil || 0);
  if (snoozedUntil > Date.now()) {
    alertPolicyStatus.textContent = `Snoozed until ${new Date(snoozedUntil).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Alerts are still saved in Recent alarms.`;
  } else if (quietHours.enabled) {
    alertPolicyStatus.textContent = `Quiet hours: ${quietHours.start}–${quietHours.end} JLab time.`;
  } else {
    alertPolicyStatus.textContent = "Notification delivery is active.";
  }
}

function renderDtmControls(state, enabled, activeBooks) {
  const health = normalizeHealthState(state.healthState).dtm;
  dtmStatusDot.className = "dot";
  if (!enabled) {
    dtmStatus.textContent = "DTM monitoring is paused";
    dtmStatusDetail.textContent = "Turn on the main monitor switch to resume DTM checks.";
    dtmStatusDot.classList.add("off");
  } else if (!activeBooks.length) {
    dtmStatus.textContent = "DTM is waiting for a logbook";
    dtmStatusDetail.textContent = "Enable at least one logbook to include DTM in automatic checks.";
    dtmStatusDot.classList.add("off");
  } else if (state.checking || health.status === "checking") {
    dtmStatus.textContent = "Checking DTM events…";
    dtmStatusDetail.textContent = "Reading the live JLab DTM open-events page.";
    dtmStatusDot.classList.add("working");
  } else if (health.status === "error") {
    dtmStatus.textContent = "DTM needs attention";
    dtmStatusDetail.textContent = actionableErrorMessage(health.error || "DTM check failed", "monitor");
    dtmStatusDot.classList.add("error");
  } else if (health.lastSuccess) {
    dtmStatus.textContent = health.detail || "DTM check succeeded";
    dtmStatusDetail.textContent = `Last successful DTM check ${formatHealthTime(health.lastSuccess)}.`;
    dtmStatusDot.classList.add("on");
  } else {
    dtmStatus.textContent = "Waiting for the first DTM check";
    dtmStatusDetail.textContent = "Select Check now to establish the current event status.";
    dtmStatusDot.classList.add("working");
  }
}

async function renderHealthDashboard(state, _intervalMinutes) {
  healthList.replaceChildren();
  const health = normalizeHealthState(state.healthState);
  const [monitorAlarm, shiftCrewAlarm] = await Promise.all([
    chrome.alarms.get("jlab-comment-check"),
    chrome.alarms.get("jlab-shift-crew-daily")
  ]);
  const nextCheck = Number(monitorAlarm?.scheduledTime || 0);
  const nextShiftCrewCheck = Number(shiftCrewAlarm?.scheduledTime || 0);
  appendHealthRow("Schedule", nextCheck
    ? `Next regular check ${formatHealthTime(nextCheck)} · Shift crew ${nextShiftCrewCheck ? formatHealthTime(nextShiftCrewCheck) : "not scheduled"} · Last successful ${formatHealthTime(state.lastSuccessfulCheck)}`
    : "Waiting for the first successful check", state.lastError ? "error" : "ok");
  const labels = { logbooks: "Logbooks", comments: "Comments", dtm: "DTM", shiftCrew: "Shift crew", email: "Email" };
  for (const source of MONITOR_HEALTH_SOURCES) {
    const item = health[source];
    const errorSource = source === "email" ? "email" : source === "shiftCrew" ? "shiftCrew" : "monitor";
    const summary = item.status === "error"
      ? `${actionableErrorMessage(item.error || "Check failed", errorSource)}${item.consecutiveFailures ? ` · Failed ${item.consecutiveFailures} consecutive check${item.consecutiveFailures === 1 ? "" : "s"}` : ""}`
      : [item.detail, item.lastSuccess ? `Success ${formatHealthTime(item.lastSuccess)}` : ""].filter(Boolean).join(" · ") || "Waiting for first check";
    appendHealthRow(labels[source], summary, item.status);
  }
}

function appendHealthRow(label, text, status) {
  const row = document.createElement("div");
  row.className = `health-row${status === "error" ? " error" : ""}`;
  const name = document.createElement("strong");
  name.textContent = label;
  const value = document.createElement("span");
  value.textContent = text;
  row.append(name, value);
  healthList.append(row);
}

function formatHealthTime(value) {
  if (!Number(value)) return "not yet";
  return new Date(Number(value)).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function copyDiagnostics() {
  const state = await chrome.storage.local.get(null);
  const snapshot = createDiagnosticSnapshot(state, chrome.runtime.getManifest());
  try {
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    copyDiagnosticsStatus.textContent = "Diagnostics copied. Passwords, recipients, and OAuth tokens were excluded.";
  } catch (error) {
    copyDiagnosticsStatus.textContent = `Could not copy diagnostics: ${error.message}`;
  }
}

async function testFullSetup() {
  testSetupButton.disabled = true;
  testSetupButton.textContent = "Testing…";
  setupTestResults.replaceChildren();
  const pending = document.createElement("span");
  pending.textContent = "Running five checks. Connected email will receive one test message.";
  setupTestResults.append(pending);
  try {
    const response = await chrome.runtime.sendMessage({ type: "test-setup" });
    if (!response?.ok) throw new Error(response?.error || "Setup test failed");
    setupTestResults.replaceChildren();
    for (const result of response.results || []) {
      const row = document.createElement("div");
      row.className = `setup-test-result ${result.status || "error"}`;
      const label = document.createElement("strong");
      const detail = document.createElement("span");
      label.textContent = `${result.status === "ok" ? "✓" : result.status === "skipped" ? "—" : "!"} ${result.label}`;
      const errorSource = result.key === "email" ? "email" : result.key === "shiftCrew" ? "shiftCrew" : "monitor";
      detail.textContent = result.status === "error"
        ? actionableErrorMessage(result.detail, errorSource)
        : result.detail;
      row.append(label, detail);
      setupTestResults.append(row);
    }
  } catch (error) {
    setupTestResults.replaceChildren();
    const row = document.createElement("div");
    row.className = "setup-test-result error";
    row.textContent = actionableErrorMessage(error, "monitor");
    setupTestResults.append(row);
  } finally {
    testSetupButton.disabled = false;
    testSetupButton.textContent = "Run setup test";
    await render();
  }
}

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
    "shiftCrewError", "lastShiftCrewCheck", "shiftCrewAlertEnabledHalls", "alertPreferences", "quietHours",
    "notificationsSnoozedUntil", "healthState", "lastSuccessfulCheck", "commentScanDiagnostic",
    "lastCommentRecoveryScan", "interfaceMode", "onboardingCompleted", "extensionUpdateState",
    "trackExtensionUpdates"
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
  renderInterfaceMode(state, monitoredBooks);
  enabledInput.checked = enabled;
  intervalInput.value = String(intervalMinutes);
  repeatDtmAlertsInput.checked = state.repeatDtmAlerts === true;
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
  renderExtensionUpdate(state.extensionUpdateState, state.trackExtensionUpdates !== false);
  renderShiftCrewControls(state);
  renderAlertPolicyControls(state);
  renderDtmControls(state, enabled, activeBooks);
  await renderHealthDashboard(state, intervalMinutes);
  renderEmailControls(state);
  if (!authorsLoaded) {
    const authors = Array.isArray(state.watchedAuthors) ? state.watchedAuthors : [];
    authorsInput.value = authors.join("\n");
    authorStatus.textContent = authors.length
      ? `Watching ${authors.length} ${authors.length === 1 ? "name" : "names"}`
      : "Exact match, ignoring capitalization";
    authorsLoaded = true;
  }

  const activeError = getActiveMonitorError(state);
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
    statusText.textContent = currentInterfaceMode === "simple" ? "Checking for updates…" : `Checking ${activeBookLabel}…`;
    detailText.textContent = currentInterfaceMode === "simple"
      ? "The monitor is checking logbooks, comments, and DTM events now."
      : "Checking new comment permalinks, entries, and beam events.";
    statusDot.classList.add("working");
  } else if (activeError) {
    statusText.textContent = currentInterfaceMode === "simple" ? "Something needs attention" : `${activeError.label} needs attention`;
    detailText.textContent = activeError.message;
    statusDot.classList.add("error");
  } else if (!state.initialized) {
    statusText.textContent = "Ready to establish baseline";
    detailText.textContent = "The first successful check will not alert for existing comments.";
    statusDot.classList.add("working");
  } else {
    const checked = state.lastCheck ? new Date(state.lastCheck).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "not yet";
    if (currentInterfaceMode === "simple") {
      statusText.textContent = "Everything is working";
      detailText.textContent = `Monitoring ${activeBookLabel} every ${intervalMinutes} minutes · Last checked ${checked}`;
    } else {
      statusText.textContent = `Monitoring ${activeBookLabel}`;
      detailText.textContent = `Every ${intervalMinutes} min · Last checked ${checked} · ${state.trackedEntries || 0} entries · comment cursor #${state.commentCursor || "—"} · ${state.lastDetectedEvents || 0} changes detected`;
    }
    statusDot.classList.add("on");
  }

  renderDiagnostics(state.bookDiagnostics, monitoredBooks, enabledBookSlugs);
  if (state.onboardingCompleted === false && setupWizard.hidden) await openSetupWizard();
}

function getActiveMonitorError(state) {
  if (state.lastError) return { label: "Logbook check", message: actionableErrorMessage(state.lastError, "monitor") };
  const health = normalizeHealthState(state.healthState);
  const sources = ["logbooks", "comments", "dtm"];
  if (Object.values(state.shiftCrewSchedules || {}).some(Boolean)) sources.push("shiftCrew");
  if (state.emailConfig?.enabled === true) sources.push("email");
  const labels = { logbooks: "Logbooks", comments: "Comments", dtm: "DTM", shiftCrew: "Shift Crew", email: "Email" };
  for (const source of sources) {
    if (health[source]?.status !== "error") continue;
    const errorSource = source === "email" ? "email" : source === "shiftCrew" ? "shiftCrew" : "monitor";
    return { label: labels[source], message: actionableErrorMessage(health[source].error, errorSource) };
  }
  return null;
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
    emailStatus.textContent = actionableErrorMessage(state.lastEmailError, "email");
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
  const alertEnabledHalls = new Set(Array.isArray(state.shiftCrewAlertEnabledHalls) ? state.shiftCrewAlertEnabledHalls : []);
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
    SHIFT_CREW_ALERT_INPUTS[hall].checked = alertEnabledHalls.has(hall);
    SHIFT_CREW_ALERT_INPUTS[hall].disabled = !schedules[hall];
  }

  const configuredCount = Object.values(schedules).filter(Boolean).length;
  shiftCrewStatus.className = state.shiftCrewError ? "shift-crew-status error" : "shift-crew-status";
  if (state.shiftCrewChecking) {
    shiftCrewStatus.textContent = "Checking shift schedules…";
  } else if (state.shiftCrewError) {
    shiftCrewStatus.textContent = actionableErrorMessage(state.shiftCrewError, "shiftCrew");
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
    return {
      text: "No current schedule",
      title: schedule.warning || "The page has no schedule row for today and may describe an older or future run."
    };
  }
  const currentHour = timeParts.hour;
  if (Array.isArray(schedule.hourlyCrew) && schedule.hourlyCrew.length) {
    const hourCrew = schedule.hourlyCrew.find((item) => Number(item?.hour) === currentHour);
    if (!hourCrew) return { text: "Current shift unavailable", title: schedule.title || "" };
    const crew = formatShiftCrewWorkers(hourCrew.workers);
    const nextCrew = findNextHourlyCrew(schedule.hourlyCrew, currentHour);
    const nextText = nextCrew
      ? ` · Next ${formatShiftHour(nextCrew.hour)}: ${formatShiftCrewWorkers(nextCrew.workers).join(" · ") || nextCrew.status || "No crew listed"}`
      : " · No later handoff today";
    return {
      text: `${hourCrew.shiftName || "Current"} · ${crew.length ? crew.join(" · ") : (hourCrew.status || "No crew listed")}${nextText}`,
      title: `${schedule.dateLabel || "Today"} · ${schedule.title || "JLab shift schedule"}`
    };
  }
  const shiftIndex = currentHour < 8 ? 0 : currentHour < 16 ? 1 : 2;
  const shift = Array.isArray(schedule.shifts) ? schedule.shifts[shiftIndex] : null;
  if (!shift) return { text: "Current shift unavailable", title: schedule.title || "" };
  const crew = formatShiftCrewWorkers(shift.workers);
  const detail = crew.length ? crew.join(" · ") : (shift.status || "No crew listed");
  const nextShift = schedule.shifts?.[shiftIndex + 1];
  const nextText = nextShift
    ? ` · Next ${formatShiftHour(nextShift.startHour)}: ${formatShiftCrewWorkers(nextShift.workers).join(" · ") || nextShift.status || "No crew listed"}`
    : " · No later handoff today";
  return {
    text: `${shift.name || ["Owl", "Day", "Swing"][shiftIndex]} · ${detail}${nextText}`,
    title: `${schedule.dateLabel || "Today"} · ${schedule.title || "JLab shift schedule"}`
  };
}

function findNextHourlyCrew(hourlyCrew, currentHour) {
  const current = hourlyCrew.find((item) => Number(item?.hour) === currentHour);
  const currentSignature = shiftCrewSignature(current);
  return hourlyCrew
    .filter((item) => Number(item?.hour) > currentHour)
    .sort((a, b) => Number(a.hour) - Number(b.hour))
    .find((item) => shiftCrewSignature(item) !== currentSignature) || null;
}

function shiftCrewSignature(value) {
  return JSON.stringify((value?.workers || []).map((worker) => [worker?.role || "", worker?.name || ""]));
}

function formatShiftHour(value) {
  return `${String(Number(value) || 0).padStart(2, "0")}:00`;
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

async function checkExtensionUpdateFromPopup() {
  checkExtensionUpdateButton.disabled = true;
  checkExtensionUpdateButton.textContent = "Checking…";
  extensionUpdateStatus.className = "extension-update-status";
  extensionUpdateStatus.textContent = "Checking GitHub releases…";
  const result = await chrome.runtime.sendMessage({ type: "check-extension-update" });
  if (!result?.ok) {
    extensionUpdateStatus.className = "extension-update-status error";
    extensionUpdateStatus.textContent = result?.error || "The update check failed. Try again later.";
  }
  await render();
  checkExtensionUpdateButton.disabled = false;
  checkExtensionUpdateButton.textContent = "Check now";
}

function renderExtensionUpdate(value, trackingEnabled = true) {
  const currentVersion = chrome.runtime.getManifest().version;
  const state = normalizeExtensionUpdateState(value, currentVersion);
  trackExtensionUpdatesInput.checked = trackingEnabled;
  extensionUpdateCurrentVersion.textContent = currentVersion;
  extensionUpdateStatus.className = "extension-update-status";
  currentExtensionUpdateDownloadUrl = state.assetUrl || state.releaseUrl || "";
  downloadExtensionUpdateButton.hidden = state.status !== "available";
  downloadExtensionUpdateButton.textContent = state.assetUrl
    ? `Download ${state.latestVersion}`
    : `View release ${state.latestVersion}`;

  if (!trackingEnabled) {
    extensionUpdateStatus.textContent = state.latestVersion
      ? `Automatic tracking is off. Last checked release: ${state.latestVersion}. Use Check now anytime.`
      : "Automatic tracking is off. Use Check now anytime.";
  } else if (state.status === "available") {
    extensionUpdateStatus.classList.add("available");
    const published = formatExtensionReleaseDate(state.publishedAt);
    extensionUpdateStatus.textContent = `Version ${state.latestVersion} is available${published ? ` · ${published}` : ""}.`;
  } else if (state.status === "current") {
    extensionUpdateStatus.textContent = `You have the latest stable version${state.latestVersion ? ` (${state.latestVersion})` : ""}.`;
  } else if (state.status === "development") {
    extensionUpdateStatus.textContent = `Installed version ${currentVersion} is newer than the latest published release (${state.latestVersion}).`;
  } else if (state.status === "error") {
    extensionUpdateStatus.classList.add("error");
    extensionUpdateStatus.textContent = state.error || "The latest release could not be checked.";
  } else {
    extensionUpdateStatus.textContent = "Checking GitHub releases…";
  }
}

function formatExtensionReleaseDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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
    meta.textContent = `${alertPriorityLabel(alarm.priority)} · ${formatAlarmTime(alarm.createdAt)} · ${alarm.message}`;
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
      createdAt: Number(alarm.createdAt),
      priority: normalizeAlertPriority(alarm.priority)
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
    openButton.className = "book-open-button";
    removeButton.className = "book-remove-button";
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
