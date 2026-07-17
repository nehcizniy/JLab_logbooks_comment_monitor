importScripts("monitor-policy.js", "health.js", "jlab-parsers.js", "extension-updates.js", "email.js", "shift-crew.js");

const CHECK_ALARM = "jlab-comment-check";
const DEFAULT_CHECK_INTERVAL_MINUTES = 5;
const CHECK_INTERVAL_OPTIONS = [5, 10, 15, 30, 60];
const DEFAULT_ENTRY_LIMIT = 100;
const MAX_ENTRY_LIMIT = 1000;
const DEFAULT_RANGE_TYPE = "entries";
const DEFAULT_HOUR_RANGE = 24;
const DEFAULT_DAY_RANGE = 1;
const MAX_HOUR_RANGE = 720;
const MAX_DAY_RANGE = 30;
const MAX_TIME_RANGE_RESULTS = 5000;
const API_ROOT = "https://logbooks.jlab.org/api/elog/entries";
const ENTRY_ROOT = "https://logbooks.jlab.org/entry/";
const DEFAULT_BOOKS = [
  { name: "HCLOG", slug: "hclog", rangeType: DEFAULT_RANGE_TYPE, rangeValue: DEFAULT_ENTRY_LIMIT, rangeValues: defaultRangeValues() },
  { name: "HBLOG", slug: "hblog", rangeType: DEFAULT_RANGE_TYPE, rangeValue: DEFAULT_ENTRY_LIMIT, rangeValues: defaultRangeValues() },
  { name: "SOLID", slug: "solid", rangeType: DEFAULT_RANGE_TYPE, rangeValue: DEFAULT_ENTRY_LIMIT, rangeValues: defaultRangeValues() }
];
const NOTIFICATION_PREFIX = "jlab-comment:";
const ENTRY_NOTIFICATION_PREFIX = "jlab-entry:";
const SHIFT_EDIT_NOTIFICATION_PREFIX = "jlab-shift-edit:";
const EVENT_NOTIFICATION_PREFIX = "jlab-event:";
const SHIFT_CREW_NOTIFICATION_PREFIX = "jlab-shift-crew:";
const UPDATE_NOTIFICATION_PREFIX = "jlab-update:";
const TEST_NOTIFICATION_ID = "jlab-test";
const COMMENT_CURSOR_SEED = 58417;
const MAX_ALERT_HISTORY = 20;
const COMMENT_RECOVERY_INTERVAL_MILLISECONDS = 24 * 60 * 60 * 1000;

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "intervalMinutes", "entryLimit", "commentCounts", "watchedAuthors",
    "pageEventStates", "commentCursor", "repeatDtmAlerts", "notifyShiftSummaryEdits", "shiftSummaryEditEnabledBooks",
    "shiftSummaryFingerprints", "alertHistory", "emailConfig", "shiftCrewSchedules", "shiftCrewState",
    "alertPreferences", "quietHours", "notificationsSnoozedUntil", "healthState", "settingsSchemaVersion",
    "shiftCrewAlertEnabledHalls", "interfaceMode", "onboardingCompleted", "extensionUpdateState",
    "trackExtensionUpdates"
  ]);
  const updates = {};
  if (typeof current.enabled !== "boolean") updates.enabled = true;
  const monitoredBooks = normalizeMonitoredBooks(current.monitoredBooks, normalizeEntryLimit(current.entryLimit));
  updates.monitoredBooks = monitoredBooks;
  if (!Array.isArray(current.enabledBooks)) updates.enabledBooks = monitoredBooks.map((book) => book.slug);
  else updates.enabledBooks = normalizeEnabledBooks(current.enabledBooks, monitoredBooks).map((book) => book.slug);
  if (!CHECK_INTERVAL_OPTIONS.includes(Number(current.intervalMinutes))) {
    updates.intervalMinutes = DEFAULT_CHECK_INTERVAL_MINUTES;
  }
  if (!current.commentCounts) updates.commentCounts = {};
  if (!Array.isArray(current.watchedAuthors)) updates.watchedAuthors = [];
  if (!current.pageEventStates) updates.pageEventStates = {};
  if (!Number.isFinite(Number(current.commentCursor))) updates.commentCursor = COMMENT_CURSOR_SEED;
  if (typeof current.repeatDtmAlerts !== "boolean") updates.repeatDtmAlerts = false;
  if (!Array.isArray(current.shiftSummaryEditEnabledBooks)) {
    updates.shiftSummaryEditEnabledBooks = current.notifyShiftSummaryEdits === false
      ? []
      : monitoredBooks.map((book) => book.slug);
  } else {
    updates.shiftSummaryEditEnabledBooks = normalizeEnabledBooks(
      current.shiftSummaryEditEnabledBooks,
      monitoredBooks
    ).map((book) => book.slug);
  }
  if (!current.shiftSummaryFingerprints || typeof current.shiftSummaryFingerprints !== "object") {
    updates.shiftSummaryFingerprints = {};
  }
  if (!Array.isArray(current.alertHistory)) updates.alertHistory = [];
  if (!current.emailConfig || typeof current.emailConfig !== "object") {
    updates.emailConfig = normalizeEmailConfig(null);
  }
  updates.shiftCrewSchedules = normalizeShiftCrewSchedules(current.shiftCrewSchedules);
  if (!current.shiftCrewState || typeof current.shiftCrewState !== "object") updates.shiftCrewState = {};
  updates.alertPreferences = normalizeAlertPreferences(current.alertPreferences);
  updates.quietHours = normalizeQuietHours(current.quietHours);
  if (!Number.isFinite(Number(current.notificationsSnoozedUntil))) updates.notificationsSnoozedUntil = 0;
  updates.healthState = normalizeHealthState(current.healthState);
  if (!Array.isArray(current.shiftCrewAlertEnabledHalls)) updates.shiftCrewAlertEnabledHalls = [];
  updates.interfaceMode = normalizeInterfaceMode(current.interfaceMode);
  updates.extensionUpdateState = normalizeExtensionUpdateState(
    current.extensionUpdateState,
    chrome.runtime.getManifest().version
  );
  if (typeof current.trackExtensionUpdates !== "boolean") updates.trackExtensionUpdates = true;
  if (typeof current.onboardingCompleted !== "boolean") {
    updates.onboardingCompleted = details?.reason === "install" ? false : true;
  }
  updates.settingsSchemaVersion = MONITOR_SETTINGS_SCHEMA_VERSION;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
  await ensureMonitorSettings();
  await Promise.all([syncAlarm(), syncShiftCrewAlarm(), syncExtensionUpdateAlarm()]);
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  await updateAlertBadge(pendingAlerts);
  await Promise.all([
    checkForComments(),
    checkShiftCrewSchedulesIfDue(true),
    checkExtensionUpdateIfEnabled()
  ]);
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureMonitorSettings();
  await Promise.all([syncAlarm(), syncShiftCrewAlarm(), syncExtensionUpdateAlarm()]);
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  await updateAlertBadge(pendingAlerts);
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await Promise.all([
    enabled ? checkForComments() : Promise.resolve(),
    checkShiftCrewSchedulesIfDue(),
    checkExtensionUpdateIfEnabled()
  ]);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) checkForComments();
  if (alarm.name === SHIFT_CREW_ALARM) checkShiftCrewSchedules();
  if (alarm.name === EXTENSION_UPDATE_ALARM) checkExtensionUpdateIfEnabled();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.intervalMinutes || changes.enabledBooks || changes.monitoredBooks) syncAlarm();
  if (changes.shiftCrewSchedules) syncShiftCrewAlarm();
  if (changes.trackExtensionUpdates && typeof changes.trackExtensionUpdates.oldValue === "boolean") {
    syncExtensionUpdateAlarm();
    if (changes.trackExtensionUpdates.newValue === true) checkExtensionUpdate().catch(() => null);
    else clearExtensionUpdateNotifications();
  }
  if (changes.enabledBooks) handleEnabledBooksChange(changes.enabledBooks);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "check-now") {
    Promise.all([checkForComments(), checkShiftCrewSchedules(), checkExtensionUpdateIfEnabled()])
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "check-extension-update") {
    checkExtensionUpdate({ notify: false })
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: friendlyUpdateError(error) }));
    return true;
  }
  if (message?.type === "clear-notifications") {
    clearAllNotifications().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "test-notification") {
    showTestNotification()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "test-setup") {
    runFullSetupTest()
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }
  if (message?.type === "test-author-match") {
    testAuthorMatch()
      .then((match) => sendResponse({ ok: true, match }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "test-comment-match") {
    testCommentMatch()
      .then((match) => sendResponse({ ok: true, match }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "add-logbook") {
    addLogbook(message.value)
      .then((book) => sendResponse({ ok: true, book }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }
  if (message?.type === "remove-logbook") {
    removeLogbook(message.slug)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }
  if (message?.type === "settings-restored") {
    ensureMonitorSettings()
      .then(() => Promise.all([
        syncAlarm(), syncShiftCrewAlarm(), syncExtensionUpdateAlarm(), updateAlertBadge({}),
        checkShiftCrewSchedulesIfDue(true), checkExtensionUpdateIfEnabled()
      ]))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "save-shift-crew-schedules") {
    saveAndCheckShiftCrewSchedules(message.schedules)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: describeShiftCrewError(error) }));
    return true;
  }
  if (message?.type === "refresh-shift-crew-if-due") {
    checkShiftCrewSchedulesIfDue()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: describeShiftCrewError(error) }));
    return true;
  }
  if (message?.type === "connect-email") {
    connectEmailProvider()
      .then((auth) => sendResponse({ ok: true, auth }))
      .catch(async (error) => {
        const messageText = await recordEmailFailure(error);
        sendResponse({ ok: false, error: messageText });
      });
    return true;
  }
  if (message?.type === "disconnect-email") {
    disconnectEmailProvider()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: describeEmailError(error) }));
    return true;
  }
  if (message?.type === "test-email") {
    testEmailDelivery()
      .then((result) => sendResponse({ ok: true, result }))
      .catch(async (error) => {
        const messageText = await recordEmailFailure(error);
        sendResponse({ ok: false, error: messageText });
      });
    return true;
  }
  return false;
});

async function ensureMonitorSettings() {
  const state = await chrome.storage.local.get([
    "alertPreferences", "quietHours", "notificationsSnoozedUntil", "healthState",
    "settingsSchemaVersion", "shiftCrewAlertEnabledHalls", "interfaceMode", "onboardingCompleted",
    "trackExtensionUpdates"
  ]);
  await chrome.storage.local.set({
    alertPreferences: normalizeAlertPreferences(state.alertPreferences),
    quietHours: normalizeQuietHours(state.quietHours),
    notificationsSnoozedUntil: Number.isFinite(Number(state.notificationsSnoozedUntil))
      ? Number(state.notificationsSnoozedUntil)
      : 0,
    healthState: normalizeHealthState(state.healthState),
    shiftCrewAlertEnabledHalls: Array.isArray(state.shiftCrewAlertEnabledHalls)
      ? state.shiftCrewAlertEnabledHalls.filter((hall) => SHIFT_CREW_HALLS.includes(hall))
      : [],
    interfaceMode: normalizeInterfaceMode(state.interfaceMode),
    onboardingCompleted: typeof state.onboardingCompleted === "boolean" ? state.onboardingCompleted : true,
    trackExtensionUpdates: typeof state.trackExtensionUpdates === "boolean" ? state.trackExtensionUpdates : true,
    settingsSchemaVersion: MONITOR_SETTINGS_SCHEMA_VERSION
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (isUpdateNotification(notificationId)) {
    if (buttonIndex === 0) openAlert(notificationId);
    else dismissExtensionUpdateAlert(notificationId);
    return;
  }
  if (!isMonitorNotification(notificationId) && !isTestNotification(notificationId)) return;
  if (buttonIndex === 0) {
    removeAlert(notificationId);
  } else if (buttonIndex === 1) {
    openAlert(notificationId);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (isTestNotification(notificationId)) {
    removeAlert(notificationId);
    return;
  }
  if (isUpdateNotification(notificationId)) {
    openAlert(notificationId);
    return;
  }
  if (isMonitorNotification(notificationId)) openAlert(notificationId);
});

async function syncAlarm() {
  const { enabled = true, monitoredBooks, enabledBooks, intervalMinutes = DEFAULT_CHECK_INTERVAL_MINUTES } = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "intervalMinutes"
  ]);
  const activeBooks = normalizeEnabledBooks(enabledBooks, normalizeMonitoredBooks(monitoredBooks));
  const interval = CHECK_INTERVAL_OPTIONS.includes(Number(intervalMinutes))
    ? Number(intervalMinutes)
    : DEFAULT_CHECK_INTERVAL_MINUTES;
  await chrome.alarms.clear(CHECK_ALARM);
  if (enabled && activeBooks.length) {
    await chrome.alarms.create(CHECK_ALARM, {
      delayInMinutes: interval,
      periodInMinutes: interval
    });
  }
}

async function syncExtensionUpdateAlarm() {
  const { trackExtensionUpdates = true } = await chrome.storage.local.get("trackExtensionUpdates");
  await chrome.alarms.clear(EXTENSION_UPDATE_ALARM);
  if (!trackExtensionUpdates) return;
  await chrome.alarms.create(EXTENSION_UPDATE_ALARM, {
    delayInMinutes: EXTENSION_UPDATE_INTERVAL_MINUTES,
    periodInMinutes: EXTENSION_UPDATE_INTERVAL_MINUTES
  });
}

async function checkExtensionUpdateIfEnabled() {
  const { trackExtensionUpdates = true } = await chrome.storage.local.get("trackExtensionUpdates");
  if (!trackExtensionUpdates) return null;
  return checkExtensionUpdate().catch(() => null);
}

async function checkExtensionUpdate(options = {}) {
  const currentVersion = chrome.runtime.getManifest().version;
  const previous = await chrome.storage.local.get([
    "extensionUpdateState", "extensionUpdateLastNotifiedVersion", "extensionUpdateDismissedVersion"
  ]);
  const checkingState = {
    ...normalizeExtensionUpdateState(previous.extensionUpdateState, currentVersion),
    status: "checking",
    currentVersion,
    error: ""
  };
  await chrome.storage.local.set({ extensionUpdateState: checkingState });
  try {
    const response = await fetch(`${EXTENSION_RELEASE_API_URL}?monitor_time=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!response.ok) throw new Error(`GitHub releases returned HTTP ${response.status}`);
    const release = normalizeExtensionRelease(await response.json());
    const state = createExtensionUpdateState(release, currentVersion);
    await chrome.storage.local.set({ extensionUpdateState: state });
    const alreadyNotified = normalizeExtensionVersion(previous.extensionUpdateLastNotifiedVersion);
    const dismissed = normalizeExtensionVersion(previous.extensionUpdateDismissedVersion);
    if (options.notify !== false && state.status === "available" && state.latestVersion !== alreadyNotified && state.latestVersion !== dismissed) {
      await showExtensionUpdateNotification(state);
    }
    return state;
  } catch (error) {
    const state = {
      ...normalizeExtensionUpdateState(previous.extensionUpdateState, currentVersion),
      status: "error",
      currentVersion,
      checkedAt: Date.now(),
      error: friendlyUpdateError(error)
    };
    await chrome.storage.local.set({ extensionUpdateState: state });
    throw error;
  }
}

function friendlyUpdateError(error) {
  const message = String(error?.message || error || "Update check failed");
  if (/HTTP 403|rate limit/i.test(message)) return "GitHub temporarily limited update checks. Try again later.";
  if (/failed to fetch|network|load failed/i.test(message)) return "Could not reach GitHub. Check the network or VPN and try again.";
  return message.replace(/^Error:\s*/i, "").slice(0, 240);
}

async function showExtensionUpdateNotification(state) {
  const notificationId = createNotificationInstanceId(`${UPDATE_NOTIFICATION_PREFIX}${state.latestVersion}`);
  const storage = await chrome.storage.local.get("pendingAlerts");
  const pendingAlerts = storage.pendingAlerts || {};
  pendingAlerts[notificationId] = {
    id: notificationId,
    baseId: `${UPDATE_NOTIFICATION_PREFIX}${state.latestVersion}`,
    alertType: "extensionUpdate",
    systemTitle: `JLab monitor ${state.latestVersion} is available`,
    message: `Installed version: ${state.currentVersion}. Open the update guide to download it or choose an earlier version.`,
    url: chrome.runtime.getURL("update.html"),
    updateVersion: state.latestVersion,
    createdAt: Date.now()
  };
  await chrome.storage.local.set({
    pendingAlerts,
    extensionUpdateLastNotifiedVersion: state.latestVersion
  });
  await updateAlertBadge(pendingAlerts);
  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icon.png",
    title: `JLab monitor ${state.latestVersion} is available`,
    message: `You have ${state.currentVersion}. Update now or keep the current version.`,
    contextMessage: "Extension update",
    requireInteraction: true,
    priority: 1,
    buttons: [{ title: "Update guide" }, { title: "Dismiss" }]
  });
}

async function dismissExtensionUpdateAlert(id) {
  const alert = await getAlert(id);
  if (alert?.updateVersion) {
    await chrome.storage.local.set({ extensionUpdateDismissedVersion: alert.updateVersion });
  }
  await removeAlert(id);
}

async function clearExtensionUpdateNotifications() {
  const [notifications, storage] = await Promise.all([
    chrome.notifications.getAll(),
    chrome.storage.local.get("pendingAlerts")
  ]);
  await Promise.all(
    Object.keys(notifications)
      .filter((id) => isUpdateNotification(id))
      .map((id) => chrome.notifications.clear(id))
  );
  const pendingAlerts = Object.fromEntries(
    Object.entries(storage.pendingAlerts || {}).filter(([id]) => !isUpdateNotification(id))
  );
  await chrome.storage.local.set({ pendingAlerts });
  await updateAlertBadge(pendingAlerts);
}

async function handleEnabledBooksChange(change) {
  const { monitoredBooks } = await chrome.storage.local.get("monitoredBooks");
  const books = normalizeMonitoredBooks(monitoredBooks);
  const previousBooks = new Set(normalizeEnabledBooks(change.oldValue, books).map((book) => book.slug));
  const currentBooks = new Set(normalizeEnabledBooks(change.newValue, books).map((book) => book.slug));
  const disabledBooks = [...previousBooks].filter((slug) => !currentBooks.has(slug));
  const updates = {};

  if (disabledBooks.length) {
    const { commentCounts = {}, shiftSummaryFingerprints = {} } = await chrome.storage.local.get([
      "commentCounts", "shiftSummaryFingerprints"
    ]);
    const nextCounts = Object.fromEntries(
      Object.entries(commentCounts).filter(([key]) => !disabledBooks.some((slug) => key.startsWith(`${slug}:`)))
    );
    updates.commentCounts = nextCounts;
    updates.shiftSummaryFingerprints = Object.fromEntries(
      Object.entries(shiftSummaryFingerprints).filter(([slug]) => !disabledBooks.includes(slug))
    );
  }
  if (!currentBooks.size) updates.commentCursorInitialized = false;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
}

function normalizeMonitoredBooks(value, fallbackLimit = DEFAULT_ENTRY_LIMIT) {
  if (!Array.isArray(value)) return DEFAULT_BOOKS.map((book) => ({ ...book }));
  const books = [];
  for (const item of value) {
    const name = typeof item === "string" ? item : item?.name;
    const slugValue = typeof item === "string" ? item : item?.slug;
    const slug = String(slugValue || "").trim().toLocaleLowerCase();
    const displayName = String(name || slug).trim();
    const rangeType = normalizeRangeType(item?.rangeType);
    const legacyValue = item?.limit ?? fallbackLimit;
    const rangeValue = normalizeRangeValue(
      rangeType,
      item?.rangeValue ?? (rangeType === DEFAULT_RANGE_TYPE ? legacyValue : defaultRangeValue(rangeType))
    );
    const rangeValues = normalizeRangeValues(item?.rangeValues, rangeType, rangeValue);
    if (!slug || !displayName || !/^[a-z0-9_-]+$/.test(slug)) continue;
    if (!books.some((book) => book.slug === slug)) books.push({ name: displayName, slug, rangeType, rangeValue, rangeValues });
  }
  return books;
}

function normalizeEnabledBooks(value, monitoredBooks) {
  if (!Array.isArray(value)) return [...monitoredBooks];
  const selected = new Set(value.map((book) => String(book).trim().toLocaleLowerCase()));
  return monitoredBooks.filter(
    (book) => selected.has(book.slug) || selected.has(book.name.toLocaleLowerCase())
  );
}

function normalizeEntryLimit(value) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_ENTRY_LIMIT;
  return Math.min(MAX_ENTRY_LIMIT, Math.max(1, parsed));
}

function normalizeRangeType(value) {
  return ["entries", "hours", "days"].includes(value) ? value : DEFAULT_RANGE_TYPE;
}

function defaultRangeValue(rangeType) {
  if (rangeType === "hours") return DEFAULT_HOUR_RANGE;
  if (rangeType === "days") return DEFAULT_DAY_RANGE;
  return DEFAULT_ENTRY_LIMIT;
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
  const fallback = defaultRangeValue(rangeType);
  const normalized = Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
  if (rangeType === "hours") return Math.min(MAX_HOUR_RANGE, normalized);
  if (rangeType === "days") return Math.min(MAX_DAY_RANGE, normalized);
  return Math.min(MAX_ENTRY_LIMIT, normalized);
}

async function checkForComments() {
  const {
    enabled = true,
    monitoredBooks,
    enabledBooks,
    commentCounts = {},
    initialized = false,
    watchedAuthors = [],
    pageEventStates = {},
    renderedCommentCounts = {},
    renderedCommentsInitialized = false,
    seenCommentIds = {},
    commentIdsInitialized = false,
    commentCursor = COMMENT_CURSOR_SEED,
    commentCursorInitialized = false,
    commentRecoveryInitialized = false,
    lastCommentRecoveryScan = 0,
    repeatDtmAlerts = false,
    shiftSummaryEditEnabledBooks,
    shiftSummaryFingerprints = {}
  } = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "commentCounts", "initialized", "watchedAuthors", "pageEventStates",
    "renderedCommentCounts", "renderedCommentsInitialized", "seenCommentIds", "commentIdsInitialized",
    "commentCursor", "commentCursorInitialized", "commentRecoveryInitialized", "lastCommentRecoveryScan",
    "repeatDtmAlerts", "shiftSummaryEditEnabledBooks", "shiftSummaryFingerprints"
  ]);
  if (!enabled) return;
  const books = normalizeMonitoredBooks(monitoredBooks);
  const activeBooks = normalizeEnabledBooks(enabledBooks, books);
  const shiftEditEnabledBookSlugs = new Set(
    normalizeEnabledBooks(shiftSummaryEditEnabledBooks, books).map((book) => book.slug)
  );
  const recoveryDue = Date.now() - Number(lastCommentRecoveryScan || 0) >= COMMENT_RECOVERY_INTERVAL_MILLISECONDS;

  await chrome.storage.local.set({ checking: true, lastError: "" });
  await recordSourceHealth("logbooks", { status: "checking", lastAttempt: Date.now(), error: "" });
  await recordSourceHealth("comments", { status: "checking", lastAttempt: Date.now(), error: "" });
  await recordSourceHealth("dtm", { status: "checking", lastAttempt: Date.now(), error: "" });

  if (!activeBooks.length) {
    await chrome.storage.local.set({
      checking: false,
      lastCheck: Date.now(),
      lastError: "",
      trackedEntries: 0,
      latestShiftSummary: null,
      shiftSummariesByBook: {},
      shiftSummaryFingerprints: {},
      shiftSummaryEditError: "",
      lastDetectedEvents: 0,
      bookDiagnostics: {}
    });
    await recordSourceHealth("logbooks", { status: "idle", lastAttempt: Date.now(), error: "", checked: 0, detail: "No logbooks enabled" });
    await recordSourceHealth("comments", { status: "idle", lastAttempt: Date.now(), error: "", checked: 0, detail: "No logbooks enabled" });
    await recordSourceHealth("dtm", { status: "idle", lastAttempt: Date.now(), error: "", checked: 0, detail: "No logbooks enabled" });
    return;
  }

  try {
    const [results, dtmEvent] = await Promise.all([
      Promise.all(activeBooks.map((book) => fetchBook(book))),
      fetchDtmEvent()
    ]);
    const pageEvents = activeBooks.map((book) => ({ ...dtmEvent, book: book.name, bookSlug: book.slug }));
    const entries = results.flat();
    const shiftSummaryEntriesByBook = Object.fromEntries(
      results.map((bookEntries, index) => [
        activeBooks[index].slug,
        bookEntries
          .filter((entry) => cleanTitle(entry.title).toLocaleLowerCase().includes("shift summary"))
          .sort((a, b) => Number(b.lognumber) - Number(a.lognumber))
      ])
    );
    const shiftSummariesByBook = Object.fromEntries(
      activeBooks.map((book) => [
        book.slug,
        (shiftSummaryEntriesByBook[book.slug] || []).map((entry) => ({
            book: entry.book,
            bookSlug: entry.bookSlug,
            lognumber: entry.lognumber,
            title: cleanTitle(entry.title),
            created: entry.created,
            url: `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`
          }))
      ])
    );
    const shiftEditEntriesByBook = Object.fromEntries(
      Object.entries(shiftSummaryEntriesByBook).filter(([bookSlug]) => shiftEditEnabledBookSlugs.has(bookSlug))
    );
    const nextCounts = Object.fromEntries(
      Object.entries(commentCounts).filter(([key]) => activeBooks.some((book) => key.startsWith(`${book.slug}:`)))
    );
    const nextRenderedCommentCounts = { ...renderedCommentCounts };
    const nextSeenCommentIds = { ...seenCommentIds };
    const nextPageEventStates = { ...pageEventStates };
    const commentAlerts = [];
    const watchedNameAlerts = [];
    const eventAlerts = [];
    const watchedNameSet = new Set(watchedAuthors.map(normalizeAuthor).filter(Boolean));
    const baselineBooks = new Set(
      Object.keys(commentCounts).map((key) => key.split(":", 1)[0])
    );

    for (const entry of entries) {
      const key = `${entry.bookSlug}:${entry.lognumber}`;
      const current = parseCommentCount(entry);
      const isNewEntry = !Object.prototype.hasOwnProperty.call(commentCounts, key);
      const watchedMatches = findWatchedNameMatches(entry, watchedNameSet);

      if (initialized && baselineBooks.has(entry.bookSlug) && isNewEntry && watchedMatches.length) {
        watchedNameAlerts.push({ ...entry, watchedMatches });
      }
      nextCounts[key] = current;
    }

    const entryMetadata = new Map(entries.map((entry) => [`${entry.bookSlug}:${entry.lognumber}`, entry]));
    for (const pageResult of pageEvents) {
      for (const comment of Object.values(pageResult.commentRecords || {})) {
        nextSeenCommentIds[`${pageResult.bookSlug}:${comment.commentId}`] = true;
      }
      for (const comment of Object.values(pageResult.comments || {})) {
        const key = `${pageResult.bookSlug}:${comment.lognumber}`;
        const current = Number(comment.count || 0);
        nextRenderedCommentCounts[key] = current;
      }
    }

    const [commentScan, shiftEditResult] = await Promise.all([
      scanNewComments(
        Number(commentCursor) || COMMENT_CURSOR_SEED,
        commentCursorInitialized,
        entryMetadata,
        activeBooks,
        {
          recovery: recoveryDue,
          recoveryInitialized: commentRecoveryInitialized,
          seenCommentIds: nextSeenCommentIds
        }
      ),
      shiftEditEnabledBookSlugs.size
        ? scanLatestShiftSummaryEdits(shiftEditEntriesByBook, shiftSummaryFingerprints)
        : Promise.resolve({ alerts: [], fingerprints: {}, errors: [] })
    ]);
    commentAlerts.push(...combineCommentAlerts(commentScan.alerts));
    const shiftEditAlerts = shiftEditResult.alerts;

    const queuedEventChanges = new Set();
    for (const currentEvent of pageEvents) {
      const previousEvent = pageEventStates[currentEvent.bookSlug] || pageEventStates[currentEvent.book];
      if (currentEvent.status === "open") {
        const changeKey = `found:${currentEvent.identity}`;
        const eventChanged = !previousEvent
          || previousEvent.status !== "open"
          || previousEvent.identity !== currentEvent.identity
          || previousEvent.title !== currentEvent.title;
        if ((repeatDtmAlerts || eventChanged) && !queuedEventChanges.has(changeKey)) {
          const eventChange = !previousEvent || previousEvent.status !== "open"
            ? "opened"
            : previousEvent.identity !== currentEvent.identity || previousEvent.title !== currentEvent.title
              ? "changed"
              : "reminder";
          eventAlerts.push({
            ...currentEvent,
            eventState: "found",
            eventChange,
            priority: eventChange === "reminder" ? "informational" : "urgent"
          });
          queuedEventChanges.add(changeKey);
        }
        nextPageEventStates[currentEvent.bookSlug] = currentEvent;
      } else if (currentEvent.status === "closed") {
        if (previousEvent?.status === "open") {
          const changeKey = `closed:${previousEvent.identity}`;
          if (!queuedEventChanges.has(changeKey)) {
            eventAlerts.push({ ...previousEvent, eventState: "closed", eventChange: "closed", priority: "important" });
            queuedEventChanges.add(changeKey);
          }
        }
        nextPageEventStates[currentEvent.bookSlug] = currentEvent;
      }
    }

    await chrome.storage.local.set({
      commentCounts: nextCounts,
      renderedCommentCounts: nextRenderedCommentCounts,
      renderedCommentsInitialized: true,
      seenCommentIds: pruneSeenCommentIds(nextSeenCommentIds, commentScan.cursor),
      commentIdsInitialized: true,
      commentCursor: commentScan.cursor,
      commentCursorInitialized: commentCursorInitialized || commentScan.caughtUp,
      commentRecoveryInitialized: commentRecoveryInitialized || recoveryDue,
      lastCommentRecoveryScan: recoveryDue ? Date.now() : Number(lastCommentRecoveryScan || 0),
      commentScanDiagnostic: commentScan.diagnostic,
      pageEventStates: nextPageEventStates,
      initialized: true,
      checking: false,
      lastCheck: Date.now(),
      lastSuccessfulCheck: Date.now(),
      lastError: "",
      trackedEntries: entries.length,
      latestShiftSummary: null,
      shiftSummariesByBook,
      shiftSummaryFingerprints: shiftEditResult.fingerprints,
      shiftSummaryEditError: shiftEditResult.errors.join(" "),
      lastDetectedEvents: commentAlerts.length + watchedNameAlerts.length + shiftEditAlerts.length + eventAlerts.length,
      bookDiagnostics: Object.fromEntries(results.map((bookEntries, index) => {
        const newest = [...bookEntries].sort((a, b) => Number(b.lognumber) - Number(a.lognumber))[0];
        return [activeBooks[index].slug, {
          entries: bookEntries.length,
          newestLognumber: newest?.lognumber || null,
          newestTitle: newest ? cleanTitle(newest.title) : "No entries returned",
          newestAuthor: newest ? displayAuthor(newest.author) : "",
          pageEvent: pageEvents[index]
        }];
      }))
    });

    const completedAt = Date.now();
    await recordSourceHealth("logbooks", {
      status: "ok",
      lastSuccess: completedAt,
      error: "",
      checked: entries.length,
      detail: `${activeBooks.length} API result page${activeBooks.length === 1 ? "" : "s"} · ${entries.length} entries scanned`
    });
    await recordSourceHealth("comments", {
      status: "ok",
      lastSuccess: completedAt,
      error: "",
      checked: commentScan.checked,
      detail: commentScan.diagnostic
    });
    await recordSourceHealth("dtm", {
      status: "ok",
      lastSuccess: completedAt,
      error: "",
      checked: 1,
      detail: dtmEvent.diagnostic || dtmEvent.title || "DTM checked"
    });

    for (const entry of commentAlerts) await showCommentNotification(entry);
    for (const entry of watchedNameAlerts) await showWatchedNameNotification(entry);
    for (const entry of shiftEditAlerts) await showShiftSummaryEditNotification(entry);
    for (const entry of eventAlerts) await showEventNotification(entry);
  } catch (error) {
    const message = friendlyError(error);
    await chrome.storage.local.set({ checking: false, lastCheck: Date.now(), lastError: message });
    const failedAt = Date.now();
    await recordSourceHealth("logbooks", { status: "error", lastAttempt: failedAt, error: message });
    await recordSourceHealth("comments", { status: "error", lastAttempt: failedAt, error: message });
    await recordSourceHealth("dtm", { status: "error", lastAttempt: failedAt, error: message });
    throw error;
  }
}

async function addLogbook(value) {
  const input = String(value || "").trim();
  if (!input) throw new Error("Paste a JLab logbook URL first");

  let slug;
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    const match = url.pathname.match(/^\/book\/([a-z0-9_-]+)\/?$/i);
    if (url.origin !== "https://logbooks.jlab.org" || !match) {
      throw new Error("Use a URL like https://logbooks.jlab.org/book/moller");
    }
    slug = match[1].toLocaleLowerCase();
  } else {
    slug = input.replace(/^\/?book\//i, "").trim().toLocaleLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      throw new Error("Enter the logbook name from its URL, or paste the full JLab logbook URL");
    }
  }

  const pageUrl = `https://logbooks.jlab.org/book/${encodeURIComponent(slug)}`;
  const response = await fetch(`${pageUrl}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("AUTH_REQUIRED");
  if (!response.ok) throw new Error(`That logbook could not be loaded (HTTP ${response.status})`);

  const html = await response.text();
  const headingMatch = html.match(/<h1\b[^>]*id=["']page-title["'][^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const name = htmlToText(headingMatch?.[1] || titleMatch?.[1]?.split("|")[0]).trim();
  if (!name || /page not found|access denied/i.test(name)) {
    throw new Error("That JLab logbook was not found");
  }

  const book = {
    name,
    slug,
    rangeType: DEFAULT_RANGE_TYPE,
    rangeValue: DEFAULT_ENTRY_LIMIT,
    rangeValues: defaultRangeValues()
  };
  await fetchBook(book);

  const state = await chrome.storage.local.get(["monitoredBooks", "enabledBooks", "shiftSummaryEditEnabledBooks"]);
  const books = normalizeMonitoredBooks(state.monitoredBooks);
  const existing = books.find((item) => item.slug === slug);
  const nextBooks = existing ? books : [...books, book];
  const enabled = new Set(normalizeEnabledBooks(state.enabledBooks, books).map((item) => item.slug));
  enabled.add(slug);
  const shiftEditEnabled = new Set(
    normalizeEnabledBooks(state.shiftSummaryEditEnabledBooks, books).map((item) => item.slug)
  );
  if (!existing) shiftEditEnabled.add(slug);
  await chrome.storage.local.set({
    monitoredBooks: nextBooks,
    enabledBooks: nextBooks.filter((item) => enabled.has(item.slug)).map((item) => item.slug),
    shiftSummaryEditEnabledBooks: nextBooks
      .filter((item) => shiftEditEnabled.has(item.slug))
      .map((item) => item.slug)
  });
  return existing || book;
}

async function removeLogbook(value) {
  const slug = String(value || "").trim().toLocaleLowerCase();
  const state = await chrome.storage.local.get([
    "monitoredBooks", "enabledBooks", "commentCounts", "pageEventStates", "bookDiagnostics", "shiftSummariesByBook",
    "shiftSummaryFingerprints", "shiftSummaryEditEnabledBooks"
  ]);
  const books = normalizeMonitoredBooks(state.monitoredBooks);
  const nextBooks = books.filter((book) => book.slug !== slug);
  const nextEnabled = normalizeEnabledBooks(state.enabledBooks, books)
    .filter((book) => book.slug !== slug)
    .map((book) => book.slug);
  const nextShiftEditEnabled = normalizeEnabledBooks(state.shiftSummaryEditEnabledBooks, books)
    .filter((book) => book.slug !== slug)
    .map((book) => book.slug);
  const nextCounts = Object.fromEntries(
    Object.entries(state.commentCounts || {}).filter(([key]) => !key.startsWith(`${slug}:`))
  );
  const nextEventStates = { ...(state.pageEventStates || {}) };
  const nextDiagnostics = { ...(state.bookDiagnostics || {}) };
  const nextShiftSummaries = { ...(state.shiftSummariesByBook || {}) };
  const nextShiftFingerprints = { ...(state.shiftSummaryFingerprints || {}) };
  delete nextEventStates[slug];
  delete nextDiagnostics[slug];
  delete nextShiftSummaries[slug];
  delete nextShiftFingerprints[slug];
  await chrome.storage.local.set({
    monitoredBooks: nextBooks,
    enabledBooks: nextEnabled,
    commentCounts: nextCounts,
    pageEventStates: nextEventStates,
    bookDiagnostics: nextDiagnostics,
    shiftSummariesByBook: nextShiftSummaries,
    shiftSummaryFingerprints: nextShiftFingerprints,
    shiftSummaryEditEnabledBooks: nextShiftEditEnabled,
    ...(nextEnabled.length ? {} : { commentCursorInitialized: false })
  });
}

async function fetchBook(book) {
  const params = new URLSearchParams();
  const rangeType = normalizeRangeType(book.rangeType);
  const rangeValue = normalizeRangeValue(rangeType, book.rangeValue);
  const timeUnit = rangeValue === 1 ? rangeType.slice(0, -1) : rangeType;
  params.set("book", book.name);
  params.set("startdate", rangeType === "entries" ? "-180 days" : `-${rangeValue} ${timeUnit}`);
  // A changing, valid query parameter prevents intermediary caches from serving stale counts.
  params.set("enddate", new Date().toISOString());
  params.set("limit", String(rangeType === "entries" ? rangeValue : MAX_TIME_RANGE_RESULTS));
  for (const field of ["lognumber", "title", "created", "author", "entrymakers", "numcomments"]) {
    params.append("field", field);
  }

  const response = await fetch(`${API_ROOT}?${params}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!response.ok) throw new Error(`JLab returned HTTP ${response.status}`);

  const payload = await response.json();
  return normalizeEntries(payload).map((entry) => ({ ...entry, book: book.name, bookSlug: book.slug }));
}

async function fetchEntryDetails(lognumber) {
  const response = await fetch(`${API_ROOT}/${encodeURIComponent(lognumber)}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("AUTH_REQUIRED");
  if (!response.ok) throw new Error(`JLab returned HTTP ${response.status} for entry #${lognumber}`);

  const payload = await response.json();
  if (payload?.stat && payload.stat !== "ok") {
    throw new Error(payload.message || `JLab could not return entry #${lognumber}`);
  }
  const candidates = [
    payload?.data?.entry,
    payload?.data?.logentry,
    payload?.data?.entries?.[0],
    payload?.entry,
    payload?.logentry,
    payload?.data,
    payload
  ];
  const entry = candidates.find(
    (candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate) && "lognumber" in candidate
  );
  if (!entry) throw new Error(`JLab returned an unfamiliar response for entry #${lognumber}`);
  return entry;
}

async function scanLatestShiftSummaryEdits(shiftSummaryEntriesByBook, previousFingerprints) {
  const alerts = [];
  const fingerprints = {};
  const errors = [];
  const checks = Object.entries(shiftSummaryEntriesByBook || {}).map(async ([bookSlug, entries]) => {
    const latest = Array.isArray(entries) ? entries[0] : null;
    if (!latest?.lognumber) return;
    const previous = previousFingerprints?.[bookSlug];
    try {
      const details = await fetchEntryDetails(latest.lognumber);
      const fingerprint = await createShiftSummaryFingerprint(details);
      fingerprints[bookSlug] = {
        lognumber: String(latest.lognumber),
        fingerprint,
        title: cleanTitle(details.title || latest.title),
        created: details.created || latest.created || null
      };
      if (
        previous?.fingerprint
        && String(previous.lognumber) === String(latest.lognumber)
        && previous.fingerprint !== fingerprint
      ) {
        alerts.push({
          ...latest,
          ...details,
          book: latest.book,
          bookSlug,
          title: details.title || latest.title,
          created: details.created || latest.created
        });
      }
    } catch (error) {
      if (previous) fingerprints[bookSlug] = previous;
      errors.push(`${latest.book || bookSlug}: ${friendlyError(error)}`);
    }
  });
  await Promise.all(checks);
  return { alerts, fingerprints, errors };
}

async function createShiftSummaryFingerprint(entry) {
  const editableContent = {
    title: entry?.title ?? null,
    body: entry?.body ?? null,
    attachments: entry?.attachments ?? null,
    tags: entry?.tags ?? null,
    books: entry?.books ?? null,
    entrymakers: entry?.entrymakers ?? entry?.entryMakers ?? entry?.entry_makers ?? null,
    needsattention: entry?.needsattention ?? null
  };
  const serialized = JSON.stringify(sortForStableSerialization(editableContent));
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
    return `${serialized.length}:${stableHash(serialized)}`;
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sortForStableSerialization(value) {
  if (Array.isArray(value)) return value.map(sortForStableSerialization);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => typeof value[key] !== "undefined")
      .map((key) => [key, sortForStableSerialization(value[key])])
  );
}

async function fetchDtmEvent() {
  const pageUrl = "https://ace.jlab.org/dtm/open-events";
  const response = await fetch(`${pageUrl}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("DTM_AUTH_REQUIRED");
  if (!response.ok) throw new Error(`DTM returned HTTP ${response.status}`);

  return parseDtmEventHtml(await response.text(), pageUrl);
}

async function scanNewComments(startCursor, notify, entryMetadata, activeBooks, options = {}) {
  const plan = createCommentScanPlan(startCursor, options.recovery === true, COMMENT_CURSOR_SEED);
  const { originalCursor, scanStart, maximumChecks, missLimit, recovery } = plan;
  const seenCommentIds = options.seenCommentIds && typeof options.seenCommentIds === "object"
    ? options.seenCommentIds
    : {};
  let cursor = originalCursor;
  let consecutiveMisses = 0;
  let checked = 0;
  const alerts = [];
  const activeBookSlugs = new Set(activeBooks.map((book) => book.slug));

  for (let id = scanStart + 1; checked < maximumChecks; id += 1) {
    if (id > originalCursor && consecutiveMisses >= missLimit) break;
    const comment = await fetchCommentCandidate(id);
    checked += 1;
    if (!comment) {
      consecutiveMisses += 1;
      continue;
    }

    consecutiveMisses = 0;
    cursor = Math.max(cursor, id);
    const seenKey = `comment:${id}`;
    const alreadySeen = seenCommentIds[seenKey] === true;
    seenCommentIds[seenKey] = true;
    let metadata = null;
    const commentBookSlugs = new Set(comment.bookSlugs || (comment.bookSlug ? [comment.bookSlug] : []));
    if (comment.lognumber) {
      for (const candidateBook of activeBooks) {
        metadata = entryMetadata.get(`${candidateBook.slug}:${comment.lognumber}`) || null;
        if (metadata) break;
      }
      if (metadata?.bookSlug) commentBookSlugs.add(metadata.bookSlug);
    }

    const matchedBook = activeBooks.find((book) => commentBookSlugs.has(book.slug));
    const canNotifyRecoveredComment = !recovery || options.recoveryInitialized === true || id > originalCursor;
    if (notify && !alreadySeen && canNotifyRecoveredComment && matchedBook && activeBookSlugs.has(matchedBook.slug)) {
      alerts.push({
        ...metadata,
        ...comment,
        book: matchedBook.name,
        bookSlug: matchedBook.slug,
        added: 1
      });
    }
  }

  return {
    cursor,
    alerts,
    checked,
    caughtUp: consecutiveMisses >= missLimit,
    diagnostic: `${recovery ? "Recovery" : "Regular"} scan checked ${checked} comment IDs from #${scanStart + 1}; latest existing ID #${cursor}`
  };
}

function pruneSeenCommentIds(value, cursor) {
  const minimumId = Math.max(COMMENT_CURSOR_SEED, Number(cursor || 0) - 5000);
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => {
    const match = String(key).match(/(\d+)$/);
    return !match || Number(match[1]) >= minimumId;
  }));
}

async function fetchCommentCandidate(id) {
  const response = await fetch(`https://logbooks.jlab.org/comment/${id}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("AUTH_REQUIRED");
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) return null;

  return parseCommentPageHtml(await response.text(), id);
}

async function showCommentNotification(entry, recordHistory = true) {
  const notificationId = `${NOTIFICATION_PREFIX}${entry.bookSlug || entry.book}:${entry.lognumber || `comment-${entry.commentId}`}`;
  const plural = entry.added === 1 ? "comment" : "comments";
  await showSystemNotification({
    id: notificationId,
    alertType: "comments",
    priority: "important",
    systemTitle: `${entry.book}: ${cleanTitle(entry.title)}`,
    message: entry.created
      ? `Entry time: ${formatEntryTime(entry.created)} · ${entry.added} new ${plural}`
      : `${entry.added} new ${plural}`,
    url: entry.commentUrl || entry.url || `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`,
    recordHistory
  });
}

async function showWatchedNameNotification(entry, recordHistory = true) {
  const notificationId = `${ENTRY_NOTIFICATION_PREFIX}${entry.bookSlug || entry.book}:${entry.lognumber}`;
  const matches = Array.isArray(entry.watchedMatches) ? entry.watchedMatches : [];
  const matchSummary = formatWatchedNameMatches(matches)
    || `Author: ${displayAuthor(entry.author)}`;
  await showSystemNotification({
    id: notificationId,
    alertType: "watchedNames",
    priority: "important",
    systemTitle: `${entry.book}: New entry — ${matchSummary}`,
    message: `${cleanTitle(entry.title)}\nEntry time: ${formatEntryTime(entry.created)}`,
    url: `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`,
    recordHistory
  });
}

async function showShiftSummaryEditNotification(entry) {
  const notificationId = `${SHIFT_EDIT_NOTIFICATION_PREFIX}${entry.bookSlug || entry.book}:${entry.lognumber}`;
  await showSystemNotification({
    id: notificationId,
    alertType: "shiftSummaryEdits",
    priority: "important",
    systemTitle: `${entry.book}: Latest shift summary edited`,
    message: `${cleanTitle(entry.title)}\nEntry time: ${formatEntryTime(entry.created)}`,
    url: `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`
  });
}

async function showEventNotification(event) {
  const state = event.eventChange || (event.eventState === "closed" ? "closed" : "opened");
  const notificationId = `${EVENT_NOTIFICATION_PREFIX}${state}:${stableHash(event.identity || event.title)}`;
  await showSystemNotification({
    id: notificationId,
    alertType: "dtmEvents",
    priority: event.priority || (state === "reminder" ? "informational" : state === "closed" ? "important" : "urgent"),
    systemTitle: `DTM event ${state}`,
    message: event.detail || event.title || `Beam-down event ${state}`,
    url: event.url || `https://logbooks.jlab.org/book/${event.bookSlug || event.book.toLocaleLowerCase()}`
  });
}

async function showShiftCrewChangeNotification(schedule) {
  const notificationId = `${SHIFT_CREW_NOTIFICATION_PREFIX}${schedule.hall}:${schedule.dateCode || "current"}`;
  await showSystemNotification({
    id: notificationId,
    alertType: "shiftCrewChanges",
    priority: "informational",
    systemTitle: `${schedule.hallName}: Shift schedule changed`,
    message: `${schedule.dateLabel || "Today's schedule"} was updated. Open the schedule to review the crew assignments.`,
    url: schedule.url
  });
}

function stableHash(value) {
  let hash = 0;
  for (const character of String(value || "event")) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

async function showTestNotification() {
  await showSystemNotification({
    id: TEST_NOTIFICATION_ID,
    priority: "informational",
    systemTitle: "JLab monitor test",
    message: "Chrome system notifications are working.",
    url: "https://logbooks.jlab.org/book/hclog"
  });
}

async function runFullSetupTest() {
  const state = await chrome.storage.local.get([
    "monitoredBooks", "enabledBooks", "shiftCrewSchedules", "emailConfig", "emailAuth"
  ]);
  const results = [];
  const run = async (key, label, action) => {
    try {
      const detail = await action();
      results.push({ key, label, status: "ok", detail });
    } catch (error) {
      results.push({ key, label, status: "error", detail: friendlyError(error) });
    }
  };

  await run("system", "System notification", async () => {
    await showTestNotification();
    return "Test notification created";
  });

  const activeBooks = normalizeEnabledBooks(state.enabledBooks, normalizeMonitoredBooks(state.monitoredBooks));
  if (!activeBooks.length) {
    results.push({ key: "jlab", label: "JLab logbooks", status: "skipped", detail: "No logbook is enabled" });
  } else {
    await run("jlab", "JLab logbooks", async () => {
      const entries = await fetchBook(activeBooks[0]);
      return `${activeBooks[0].name} loaded ${entries.length} entries`;
    });
  }

  await run("dtm", "DTM events", async () => {
    const event = await fetchDtmEvent();
    return event.status === "open" ? `Open event: ${event.title}` : "Connected; no open event";
  });

  const schedules = normalizeShiftCrewSchedules(state.shiftCrewSchedules);
  const configuredHalls = SHIFT_CREW_HALLS.filter((hall) => schedules[hall]);
  if (!configuredHalls.length) {
    results.push({ key: "shiftCrew", label: "Shift Crew", status: "skipped", detail: "No schedules configured" });
  } else {
    await run("shiftCrew", "Shift Crew", async () => {
      const result = await checkShiftCrewSchedules();
      const failures = Object.values(result.state || {}).filter((item) => item.status === "error");
      if (failures.length) throw new Error(result.error || `${failures.length} schedule checks failed`);
      return `${configuredHalls.length} configured schedule${configuredHalls.length === 1 ? "" : "s"} loaded`;
    });
  }

  const emailConfig = normalizeEmailConfig(state.emailConfig);
  const emailConnected = state.emailAuth?.provider === emailConfig.provider;
  if (!emailConfig.recipients.length || !emailConnected) {
    results.push({
      key: "email",
      label: "Email",
      status: "skipped",
      detail: !emailConfig.recipients.length
        ? "No receiving addresses"
        : "Sending account is not connected"
    });
  } else {
    await run("email", "Email", async () => {
      const result = await testEmailDelivery();
      return `Test sent to ${result.recipients} address${result.recipients === 1 ? "" : "es"}`;
    });
  }
  return results;
}

async function testAuthorMatch() {
  const { watchedAuthors = [], monitoredBooks, enabledBooks } = await chrome.storage.local.get([
    "watchedAuthors", "monitoredBooks", "enabledBooks"
  ]);
  const watchedNameSet = new Set(watchedAuthors.map(normalizeAuthor).filter(Boolean));
  if (!watchedNameSet.size) throw new Error("Save at least one name first");
  const activeBooks = normalizeEnabledBooks(enabledBooks, normalizeMonitoredBooks(monitoredBooks));
  if (!activeBooks.length) throw new Error("Turn on at least one logbook first");

  const entries = (await Promise.all(activeBooks.map((book) => fetchBook(book)))).flat();
  const match = entries
    .map((entry) => ({ entry, watchedMatches: findWatchedNameMatches(entry, watchedNameSet) }))
    .filter(({ watchedMatches }) => watchedMatches.length)
    .sort((a, b) => Number(b.entry.lognumber) - Number(a.entry.lognumber))[0];

  if (!match) {
    throw new Error("No matching Author or Entry Maker was found within the configured check ranges of the enabled logbooks");
  }

  const matchedEntry = { ...match.entry, watchedMatches: match.watchedMatches };
  await showWatchedNameNotification(matchedEntry, false);
  return {
    book: matchedEntry.book,
    lognumber: matchedEntry.lognumber,
    matchSummary: formatWatchedNameMatches(match.watchedMatches),
    title: cleanTitle(matchedEntry.title)
  };
}

async function testCommentMatch() {
  const match = await fetchCommentCandidate(COMMENT_CURSOR_SEED);
  if (!match) throw new Error(`Comment ${COMMENT_CURSOR_SEED} could not be loaded`);
  const { monitoredBooks } = await chrome.storage.local.get("monitoredBooks");
  const books = normalizeMonitoredBooks(monitoredBooks);
  const configuredBook = books.find((book) => match.bookSlugs?.includes(book.slug));
  match.book = configuredBook?.name || match.bookSlug?.toLocaleUpperCase() || "JLab";

  await showCommentNotification({ ...match, added: 1 }, false);
  return {
    book: match.book,
    commentId: match.commentId,
    lognumber: match.lognumber,
    comments: 1,
    title: cleanTitle(match.title)
  };
}

async function showSystemNotification(alert) {
  const notificationId = createNotificationInstanceId(alert.id);
  const isTest = alert.id === TEST_NOTIFICATION_ID;
  const recordHistory = !isTest && alert.recordHistory !== false;
  const bypassDeliveryControls = isTest || alert.recordHistory === false;
  const state = await chrome.storage.local.get([
    "pendingAlerts", "alertHistory", "alertPreferences", "quietHours", "notificationsSnoozedUntil"
  ]);
  const pendingAlerts = state.pendingAlerts || {};
  const alertHistory = state.alertHistory || [];
  const createdAt = Date.now();
  const priority = normalizeAlertPriority(alert.priority);
  const deliverSystem = bypassDeliveryControls || shouldDeliverAlert(alert.alertType, "system", state, createdAt);
  const deliverEmail = recordHistory && shouldDeliverAlert(alert.alertType, "email", state, createdAt);
  if (deliverSystem) {
    pendingAlerts[notificationId] = {
      ...alert,
      id: notificationId,
      baseId: alert.id,
      createdAt
    };
  }
  const nextAlertHistory = recordHistory
    ? [{
        id: notificationId,
        baseId: alert.id,
        systemTitle: alert.systemTitle,
        message: alert.message,
        url: alert.url || "",
        createdAt,
        alertType: alert.alertType || "",
        priority,
        deliveredSystem: deliverSystem,
        deliveredEmail: deliverEmail
      }, ...normalizeAlertHistory(alertHistory)].slice(0, MAX_ALERT_HISTORY)
    : normalizeAlertHistory(alertHistory);
  await chrome.storage.local.set({ pendingAlerts, alertHistory: nextAlertHistory });
  await updateAlertBadge(pendingAlerts);
  if (deliverSystem) {
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "icon.png",
      title: alert.systemTitle,
      message: alert.message,
      contextMessage: `${alertPriorityLabel(priority)} · JLab Logbook`,
      requireInteraction: true,
      priority: chromeNotificationPriority(priority),
      buttons: isTest
        ? [{ title: "Clear" }]
        : [{ title: "Clear" }, { title: "Go to entry" }]
    });
  }
  if (deliverEmail) {
    await sendAlertEmail(alert).catch(recordEmailFailure);
  }
  return { notificationId, deliverSystem, deliverEmail };
}

function normalizeAlertHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.systemTitle === "string" && Number.isFinite(Number(item.createdAt)))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, MAX_ALERT_HISTORY);
}

function createNotificationInstanceId(baseId) {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  return `${baseId}:${randomPart}`;
}

async function getAlert(id) {
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  return pendingAlerts[id] || null;
}

async function removeAlert(id) {
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  delete pendingAlerts[id];
  await chrome.storage.local.set({ pendingAlerts });
  await updateAlertBadge(pendingAlerts);
  await chrome.notifications.clear(id);
}

async function openAlert(id) {
  const alert = await getAlert(id);
  if (alert?.url) await chrome.tabs.create({ url: alert.url });
  await removeAlert(id);
}

async function updateAlertBadge(pendingAlerts) {
  const count = Object.keys(pendingAlerts).filter((id) => !isTestNotification(id)).length;
  await chrome.action.setBadgeBackgroundColor({ color: "#cf3d46" });
  await chrome.action.setBadgeText({ text: count ? String(Math.min(count, 99)) : "" });
}

function normalizeAuthor(value) {
  const author = typeof value === "string" ? value : value?.name || value?.username || value?.value || "";
  return String(author).trim().toLocaleLowerCase();
}

function displayAuthor(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return value?.name || value?.username || value?.value || "unknown author";
}

function extractEntryMakerNames(entry) {
  const raw = entry?.entrymakers
    ?? entry?.entryMakers
    ?? entry?.entry_makers
    ?? entry?.["Entry Makers"]
    ?? "";
  return extractNameList(raw);
}

function extractNameList(value, depth = 0) {
  if (depth > 5 || value === null || typeof value === "undefined") return [];
  if (typeof value === "string") {
    return value
      .split(/[,;\n]+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap((item) => extractNameList(item, depth + 1));
  if (typeof value === "object") {
    for (const key of ["name", "username", "value", "content", "string"]) {
      if (key in value) return extractNameList(value[key], depth + 1);
    }
  }
  return [];
}

function findWatchedNameMatches(entry, watchedNameSet) {
  if (!(watchedNameSet instanceof Set) || !watchedNameSet.size) return [];
  const matches = [];
  const authorKey = normalizeAuthor(entry?.author);
  if (authorKey && watchedNameSet.has(authorKey)) {
    matches.push({ role: "Author", name: displayAuthor(entry.author) });
  }
  for (const name of extractEntryMakerNames(entry)) {
    const key = normalizeAuthor(name);
    if (!key || !watchedNameSet.has(key)) continue;
    if (!matches.some((match) => match.role === "Entry Maker" && normalizeAuthor(match.name) === key)) {
      matches.push({ role: "Entry Maker", name });
    }
  }
  return matches;
}

function formatWatchedNameMatches(matches) {
  const authors = matches.filter((match) => match.role === "Author").map((match) => match.name);
  const entryMakers = matches.filter((match) => match.role === "Entry Maker").map((match) => match.name);
  return [
    authors.length ? `Author: ${authors.join(", ")}` : "",
    entryMakers.length ? `Entry ${entryMakers.length === 1 ? "Maker" : "Makers"}: ${entryMakers.join(", ")}` : ""
  ].filter(Boolean).join(" · ");
}

function cleanTitle(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value?.value) return String(value.value).trim();
  return "Untitled entry";
}

function formatEntryTime(created) {
  if (typeof created === "string") {
    const parsed = new Date(created);
    if (/^\d{4}-\d{2}-\d{2}T/.test(created) && !Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
    return created;
  }
  if (typeof created === "number") return new Date(created * 1000).toLocaleString();
  if (created && typeof created === "object") {
    for (const key of ["string", "formatted", "value", "date"]) {
      if (typeof created[key] === "string") return created[key];
    }
    for (const key of ["timestamp", "unix", "time"]) {
      if (Number.isFinite(Number(created[key]))) return new Date(Number(created[key]) * 1000).toLocaleString();
    }
  }
  return "Unknown";
}

function friendlyError(error) {
  return actionableErrorMessage(error, "monitor");
}

async function clearAllNotifications() {
  const notifications = await chrome.notifications.getAll();
  await Promise.all(
    Object.keys(notifications)
      .filter((id) => isMonitorNotification(id) || isTestNotification(id))
      .map((id) => chrome.notifications.clear(id))
  );
  await chrome.storage.local.set({ pendingAlerts: {} });
  await updateAlertBadge({});
}

function isMonitorNotification(id) {
  return id.startsWith(NOTIFICATION_PREFIX)
    || id.startsWith(ENTRY_NOTIFICATION_PREFIX)
    || id.startsWith(SHIFT_EDIT_NOTIFICATION_PREFIX)
    || id.startsWith(EVENT_NOTIFICATION_PREFIX)
    || id.startsWith(SHIFT_CREW_NOTIFICATION_PREFIX)
    || id.startsWith(UPDATE_NOTIFICATION_PREFIX);
}

function isUpdateNotification(id) {
  return id.startsWith(UPDATE_NOTIFICATION_PREFIX);
}

function isTestNotification(id) {
  return id === TEST_NOTIFICATION_ID || id.startsWith(`${TEST_NOTIFICATION_ID}:`);
}
