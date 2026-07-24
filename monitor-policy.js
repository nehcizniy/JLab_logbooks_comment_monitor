const MONITOR_SETTINGS_SCHEMA_VERSION = 7;
const MONITOR_INTERFACE_MODES = ["simple", "large", "advanced", "large-advanced"];
const MONITOR_THEME_MODES = ["light", "dark"];
const MONITOR_SHIFT_CREW_HALLS = ["hallA", "hallB", "hallC", "hallD"];
const MONITOR_ALERT_TYPES = [
  { key: "comments", label: "Comments" },
  { key: "watchedNames", label: "Watched names" },
  { key: "shiftSummaryEdits", label: "Shift-summary edits" },
  { key: "dtmEvents", label: "DTM events" },
  { key: "shiftCrewChanges", label: "Shift-crew changes" },
  { key: "logbookDowntime", label: "Logbook downtime" }
];
const MONITOR_ALERT_PRESETS = ["essential", "standard", "everything"];

function normalizeInterfaceMode(value) {
  return MONITOR_INTERFACE_MODES.includes(value) ? value : "simple";
}

function normalizeThemeMode(value) {
  return MONITOR_THEME_MODES.includes(value) ? value : "light";
}

function normalizeSimpleShiftCrewHalls(value) {
  if (!Array.isArray(value)) return [...MONITOR_SHIFT_CREW_HALLS];
  const selected = new Set(value.map(String));
  return MONITOR_SHIFT_CREW_HALLS.filter((hall) => selected.has(hall));
}

function defaultAlertPreferences() {
  return alertPreferencesForPreset("standard");
}

function alertPreferencesForPreset(value) {
  const preset = MONITOR_ALERT_PRESETS.includes(value) ? value : "standard";
  const enabledTypes = preset === "essential"
    ? new Set(["watchedNames", "dtmEvents", "logbookDowntime"])
    : preset === "standard"
      ? new Set(["comments", "watchedNames", "shiftSummaryEdits", "dtmEvents", "logbookDowntime"])
      : new Set(MONITOR_ALERT_TYPES.map(({ key }) => key));
  return Object.fromEntries(MONITOR_ALERT_TYPES.map(({ key }) => [
    key,
    { system: enabledTypes.has(key), email: enabledTypes.has(key) }
  ]));
}

function detectAlertPreset(value) {
  const preferences = normalizeAlertPreferences(value);
  for (const preset of MONITOR_ALERT_PRESETS) {
    if (JSON.stringify(preferences) === JSON.stringify(alertPreferencesForPreset(preset))) return preset;
  }
  return "custom";
}

function normalizeAlertPreferences(value) {
  const stored = value && typeof value === "object" ? value : {};
  const defaults = defaultAlertPreferences();
  return Object.fromEntries(MONITOR_ALERT_TYPES.map(({ key }) => {
    const preference = stored[key] && typeof stored[key] === "object" ? stored[key] : {};
    return [key, {
      system: typeof preference.system === "boolean" ? preference.system : defaults[key].system,
      email: typeof preference.email === "boolean" ? preference.email : defaults[key].email
    }];
  }));
}

function normalizeQuietHours(value) {
  const stored = value && typeof value === "object" ? value : {};
  return {
    enabled: stored.enabled === true,
    start: normalizeClockTime(stored.start, "22:00"),
    end: normalizeClockTime(stored.end, "07:00")
  };
}

function normalizeClockTime(value, fallback) {
  const match = String(value || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function isWithinQuietHours(value, now = Date.now()) {
  const quietHours = normalizeQuietHours(value);
  if (!quietHours.enabled) return false;
  const current = getJlabMinuteOfDay(now);
  const start = clockTimeToMinutes(quietHours.start);
  const end = clockTimeToMinutes(quietHours.end);
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function getJlabMinuteOfDay(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(now)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function clockTimeToMinutes(value) {
  const [hour, minute] = normalizeClockTime(value, "00:00").split(":").map(Number);
  return hour * 60 + minute;
}

function isNotificationSnoozed(snoozedUntil, now = Date.now()) {
  return Number(snoozedUntil || 0) > Number(now);
}

function shouldDeliverAlert(alertType, channel, state, now = Date.now()) {
  if (!MONITOR_ALERT_TYPES.some(({ key }) => key === alertType)) return true;
  const preferences = normalizeAlertPreferences(state?.alertPreferences);
  if (preferences[alertType]?.[channel] !== true) return false;
  if (isNotificationSnoozed(state?.notificationsSnoozedUntil, now)) return false;
  return !isWithinQuietHours(state?.quietHours, now);
}

function alertTypeLabel(value) {
  return MONITOR_ALERT_TYPES.find(({ key }) => key === value)?.label || "Monitor alert";
}

function normalizeAlertPriority(value) {
  return ["urgent", "important", "informational"].includes(value) ? value : "important";
}

function alertPriorityLabel(value) {
  const priority = normalizeAlertPriority(value);
  return priority === "urgent" ? "Urgent" : priority === "informational" ? "Info" : "Important";
}

function chromeNotificationPriority(value) {
  const priority = normalizeAlertPriority(value);
  return priority === "urgent" ? 2 : priority === "important" ? 1 : 0;
}

function actionableErrorMessage(value, source = "monitor") {
  const raw = String(value?.message || value || "").replace(/^Error:\s*/i, "").trim();
  if (!raw) return "The check could not be completed. Check your connection, then select Check now.";
  if (/DTM_AUTH_REQUIRED/i.test(raw)) {
    return "The DTM page needs JLab access. Open the DTM page once, sign in if asked, then select Check now.";
  }
  if (/AUTH_REQUIRED|login required|HTTP (?:401|403)/i.test(raw)) {
    return source === "email"
      ? "The email connection has expired. Open Advanced → Alerts, reconnect the sender, then try again."
      : "JLab sign-in is needed. Open a JLab logbook, sign in, then return here and select Check now.";
  }
  if (/failed to fetch|networkerror|network request|internet|offline/i.test(raw)) {
    return "The extension could not reach JLab. Check your network or VPN connection, then select Check now.";
  }
  if (/unfamiliar response|response format/i.test(raw)) {
    return "JLab returned an unexpected page format. Select Check now once more; if it continues, copy diagnostics from Advanced → Monitoring health.";
  }
  if (source === "shiftCrew") {
    const hallPrefix = raw.match(/^(Hall [A-D]):/i)?.[1];
    const prefix = hallPrefix ? `${hallPrefix}: ` : "";
    if (/valid shift-schedule URL|supported JLab|must use HTTPS|missing experimentRunId/i.test(raw)) {
      return `${prefix}That shift-schedule URL is not supported. Paste the full HTTPS schedule URL for that hall, then select Enter.`;
    }
    if (/recognized shift schedule|does not contain|schedule row is incomplete/i.test(raw)) {
      return `${prefix}The schedule page could not be read. Verify that the URL opens the actual JLab schedule, then select Enter again.`;
    }
    if (/HTTP \d+/i.test(raw)) {
      return "The shift-schedule page is temporarily unavailable. Verify the URL and try Enter again later.";
    }
  }
  if (source === "email") {
    if (/Email is optional|Advanced → Alerts|Add at least one valid receiving/i.test(raw)) return raw;
    if (/client id|oauth|redirect|unauthorized|invalid_client|access token|sender is not connected/i.test(raw)) {
      return "Email is optional, but its connection needs attention. Open Advanced → Alerts, check the provider setup, and reconnect the sender.";
    }
    if (/receiving address|valid email|recipient/i.test(raw)) {
      return "Add at least one valid receiving email address, save it, then try again.";
    }
    return `${raw.replace(/[.\s]+$/, "")}. Email is optional; reconnect the sender in Advanced → Alerts or leave email alerts off.`;
  }
  if (/HTTP \d+/i.test(raw)) {
    return "A JLab page is temporarily unavailable. Select Check now again later; if it continues, open Advanced → Monitoring health.";
  }
  return raw;
}
