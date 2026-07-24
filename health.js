const MONITOR_HEALTH_SOURCES = ["logbooks", "comments", "dtm", "shiftCrew", "email"];
const LOGBOOK_DOWNTIME_CONFIRM_FAILURES = 2;
const LOGBOOK_DOWNTIME_RETENTION_DAYS = 8;
let monitorHealthWriteQueue = Promise.resolve();

function normalizeHealthState(value) {
  const stored = value && typeof value === "object" ? value : {};
  return Object.fromEntries(MONITOR_HEALTH_SOURCES.map((source) => {
    const item = stored[source] && typeof stored[source] === "object" ? stored[source] : {};
    return [source, {
      status: ["ok", "error", "checking", "idle"].includes(item.status) ? item.status : "idle",
      lastAttempt: Number(item.lastAttempt || 0),
      lastSuccess: Number(item.lastSuccess || 0),
      error: String(item.error || ""),
      detail: String(item.detail || ""),
      checked: Number(item.checked || 0),
      consecutiveFailures: Math.max(0, Number(item.consecutiveFailures || 0))
    }];
  }));
}

async function recordSourceHealth(source, update) {
  if (!MONITOR_HEALTH_SOURCES.includes(source) || typeof chrome === "undefined") return;
  monitorHealthWriteQueue = monitorHealthWriteQueue.then(async () => {
    const { healthState } = await chrome.storage.local.get("healthState");
    const next = normalizeHealthState(healthState);
    const previous = next[source];
    const consecutiveFailures = update.status === "error"
      ? previous.consecutiveFailures + 1
      : update.status === "ok"
        ? 0
        : previous.consecutiveFailures;
    next[source] = { ...previous, ...update, consecutiveFailures };
    await chrome.storage.local.set({ healthState: next });
  });
  return monitorHealthWriteQueue;
}

function createDiagnosticSnapshot(state, manifest = {}) {
  const health = normalizeHealthState(state?.healthState);
  const monitoredBooks = Array.isArray(state?.monitoredBooks) ? state.monitoredBooks : [];
  return {
    generatedAt: new Date().toISOString(),
    extension: {
      name: manifest.name || "JLab Logbook Comment Monitor",
      version: manifest.version || "unknown"
    },
    monitor: {
      interfaceMode: normalizeInterfaceMode(state?.interfaceMode),
      onboardingCompleted: state?.onboardingCompleted === true,
      enabled: state?.enabled !== false,
      intervalMinutes: Number(state?.intervalMinutes || 5),
      dtmIntervalMinutes: Number(state?.dtmIntervalMinutes || 5),
      lastCheck: Number(state?.lastCheck || 0),
      lastDtmCheck: Number(state?.lastDtmCheck || 0),
      lastSuccessfulCheck: Number(state?.lastSuccessfulCheck || 0),
      lastError: String(state?.lastError || ""),
      trackedEntries: Number(state?.trackedEntries || 0),
      commentCursor: Number(state?.commentCursor || 0),
      commentScanDiagnostic: String(state?.commentScanDiagnostic || ""),
      lastCommentRecoveryScan: Number(state?.lastCommentRecoveryScan || 0)
    },
    sources: health,
    logbooks: state?.bookDiagnostics && typeof state.bookDiagnostics === "object"
      ? state.bookDiagnostics
      : {},
    downtime: normalizeLogbookDowntime(state?.logbookDowntime, monitoredBooks),
    shiftCrew: state?.shiftCrewState && typeof state.shiftCrewState === "object"
      ? Object.fromEntries(Object.entries(state.shiftCrewState).map(([hall, value]) => [hall, {
          status: value?.status || "unknown",
          checkedAt: Number(value?.checkedAt || 0),
          dateCode: value?.dateCode || "",
          error: value?.error || ""
        }]))
      : {},
    email: {
      configured: Boolean(state?.emailConfig?.recipients?.length),
      enabled: state?.emailConfig?.enabled === true,
      connected: Boolean(state?.emailAuth?.provider),
      provider: state?.emailAuth?.provider || state?.emailConfig?.provider || "",
      lastSentAt: Number(state?.lastEmailSentAt || 0),
      lastError: String(state?.lastEmailError || "")
    }
  };
}

function normalizeLogbookDowntime(value, monitoredBooks = [], now = Date.now()) {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const storedBooks = stored.books && typeof stored.books === "object" && !Array.isArray(stored.books)
    ? stored.books
    : {};
  const books = {};
  const knownBooks = new Map(
    (Array.isArray(monitoredBooks) ? monitoredBooks : [])
      .filter((book) => book && book.slug)
      .map((book) => [String(book.slug).toLocaleLowerCase(), book])
  );
  for (const [slug, raw] of Object.entries(storedBooks)) {
    const normalizedSlug = String(slug).toLocaleLowerCase();
    const configured = knownBooks.get(normalizedSlug);
    books[normalizedSlug] = normalizeLogbookDowntimeBook(raw, {
      name: configured?.name || raw?.name || normalizedSlug.toLocaleUpperCase(),
      slug: normalizedSlug
    }, now);
  }
  for (const [slug, book] of knownBooks) {
    if (books[slug]) continue;
    books[slug] = normalizeLogbookDowntimeBook(null, { name: book.name, slug }, now);
  }
  return { version: 1, books };
}

function normalizeLogbookDowntimeBook(value, book, now = Date.now()) {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const status = ["unknown", "up", "suspected", "down", "login_required"].includes(stored.status)
    ? stored.status
    : "unknown";
  const retentionStart = getJlabDayBounds(now).start - (LOGBOOK_DOWNTIME_RETENTION_DAYS - 1) * 24 * 60 * 60 * 1000;
  const periods = (Array.isArray(stored.periods) ? stored.periods : [])
    .map((period) => ({
      start: Math.max(0, Number(period?.start || 0)),
      end: Math.max(0, Number(period?.end || 0))
    }))
    .filter((period) => period.start > 0 && (period.end === 0 || period.end > period.start) && (period.end === 0 || period.end >= retentionStart))
    .sort((a, b) => a.start - b.start)
    .slice(-200);
  return {
    name: String(book?.name || stored.name || book?.slug || "Logbook"),
    slug: String(book?.slug || stored.slug || "").toLocaleLowerCase(),
    status,
    consecutiveFailures: Math.max(0, Math.trunc(Number(stored.consecutiveFailures || 0))),
    firstFailureAt: Math.max(0, Number(stored.firstFailureAt || 0)),
    downSince: status === "down" ? Math.max(0, Number(stored.downSince || 0)) : 0,
    lastCheckAt: Math.max(0, Number(stored.lastCheckAt || 0)),
    lastSuccessAt: Math.max(0, Number(stored.lastSuccessAt || 0)),
    lastResponseAt: Math.max(0, Number(stored.lastResponseAt || 0)),
    lastError: String(stored.lastError || ""),
    periods
  };
}

function updateLogbookDowntime(value, book, outcome, at = Date.now(), error = "") {
  const state = normalizeLogbookDowntime(value, [book], at);
  const slug = String(book?.slug || "").toLocaleLowerCase();
  const item = state.books[slug];
  if (!item) return { state, transition: null };
  const checkedAt = Math.max(1, Number(at || Date.now()));
  let transition = null;

  if (outcome === "success" || outcome === "auth") {
    if (item.status === "down") {
      const openPeriod = [...item.periods].reverse().find((period) => period.end === 0);
      const start = item.downSince || openPeriod?.start || checkedAt;
      if (openPeriod) openPeriod.end = checkedAt;
      else item.periods.push({ start, end: checkedAt });
      transition = {
        type: "recovered",
        book: { name: item.name, slug },
        start,
        end: checkedAt,
        durationMs: Math.max(0, checkedAt - start),
        loginRequired: outcome === "auth"
      };
    }
    item.status = outcome === "auth" ? "login_required" : "up";
    item.consecutiveFailures = 0;
    item.firstFailureAt = 0;
    item.downSince = 0;
    item.lastCheckAt = checkedAt;
    item.lastResponseAt = checkedAt;
    if (outcome === "success") item.lastSuccessAt = checkedAt;
    item.lastError = outcome === "auth" ? "JLab sign-in required" : "";
    return { state, transition };
  }

  if (outcome !== "failure") return { state, transition: null };
  item.lastCheckAt = checkedAt;
  item.lastError = String(error?.message || error || "Logbook did not respond");
  if (item.status === "down") {
    item.consecutiveFailures += 1;
    return { state, transition: null };
  }

  const continuingFailure = item.status === "suspected" && item.firstFailureAt > 0;
  item.firstFailureAt = continuingFailure ? item.firstFailureAt : checkedAt;
  item.consecutiveFailures = continuingFailure ? item.consecutiveFailures + 1 : 1;
  if (item.consecutiveFailures < LOGBOOK_DOWNTIME_CONFIRM_FAILURES) {
    item.status = "suspected";
    return { state, transition: null };
  }

  item.status = "down";
  item.downSince = item.firstFailureAt;
  item.periods.push({ start: item.downSince, end: 0 });
  transition = {
    type: "down",
    book: { name: item.name, slug },
    start: item.downSince,
    detectedAt: checkedAt,
    error: item.lastError
  };
  return { state, transition };
}

function pauseLogbookDowntime(value, slugs, at = Date.now()) {
  const state = normalizeLogbookDowntime(value, [], at);
  const paused = new Set((Array.isArray(slugs) ? slugs : []).map((slug) => String(slug).toLocaleLowerCase()));
  for (const [slug, item] of Object.entries(state.books)) {
    if (!paused.has(slug)) continue;
    if (item.status === "down") {
      const openPeriod = [...item.periods].reverse().find((period) => period.end === 0);
      if (openPeriod) openPeriod.end = Number(at);
    }
    item.status = "unknown";
    item.consecutiveFailures = 0;
    item.firstFailureAt = 0;
    item.downSince = 0;
    item.lastError = "";
  }
  return state;
}

function summarizeDailyLogbookDowntime(value, monitoredBooks = [], now = Date.now()) {
  const state = normalizeLogbookDowntime(value, monitoredBooks, now);
  const bounds = getJlabDayBounds(now);
  const configuredSlugs = new Set((Array.isArray(monitoredBooks) ? monitoredBooks : []).map((book) => String(book.slug).toLocaleLowerCase()));
  const books = Object.values(state.books)
    .filter((book) => !configuredSlugs.size || configuredSlugs.has(book.slug))
    .map((book) => {
      const periods = dailyDowntimePeriods(book.periods, bounds, now);
      return {
        ...book,
        periods,
        totalMs: periods.reduce((sum, period) => sum + period.durationMs, 0)
      };
    });
  const mergedPeriods = mergeDowntimePeriods(books.flatMap((book) => book.periods));
  return {
    dateKey: bounds.dateKey,
    dayStart: bounds.start,
    dayEnd: bounds.end,
    totalMs: mergedPeriods.reduce((sum, period) => sum + period.durationMs, 0),
    periods: mergedPeriods,
    books
  };
}

function dailyDowntimePeriods(periods, bounds, now) {
  return (Array.isArray(periods) ? periods : []).map((period) => {
    const start = Math.max(Number(period.start || 0), bounds.start);
    const rawEnd = Number(period.end || 0);
    const end = Math.min(rawEnd || Number(now), bounds.end, Number(now));
    return {
      start,
      end,
      active: rawEnd === 0,
      durationMs: Math.max(0, end - start)
    };
  }).filter((period) => period.durationMs > 0);
}

function mergeDowntimePeriods(periods) {
  const sorted = (Array.isArray(periods) ? periods : [])
    .filter((period) => Number(period?.end) > Number(period?.start))
    .map((period) => ({ ...period }))
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const period of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || period.start > previous.end) {
      merged.push(period);
      continue;
    }
    previous.end = Math.max(previous.end, period.end);
    previous.active = previous.active || period.active;
    previous.durationMs = previous.end - previous.start;
  }
  return merged;
}

function getJlabDayBounds(now = Date.now()) {
  const current = getJlabDateTimeParts(now);
  const nextDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const start = jlabLocalDateTimeToTimestamp(current.year, current.month, current.day);
  const end = jlabLocalDateTimeToTimestamp(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate()
  );
  return {
    dateKey: `${current.year}-${String(current.month).padStart(2, "0")}-${String(current.day).padStart(2, "0")}`,
    start,
    end
  };
}

function jlabLocalDateTimeToTimestamp(year, month, day, hour = 0, minute = 0, second = 0) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getJlabDateTimeParts(guess);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const adjustment = desired - actualAsUtc;
    guess += adjustment;
    if (adjustment === 0) break;
  }
  return guess;
}

function getJlabDateTimeParts(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(Number(value))).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return Object.fromEntries(["year", "month", "day", "hour", "minute", "second"].map((key) => [key, Number(parts[key])]));
}

function formatDowntimeDuration(value) {
  const totalMinutes = Math.max(0, Math.floor(Number(value || 0) / 60000));
  if (totalMinutes < 1) return "<1 min";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} d` : "",
    hours ? `${hours} hr` : "",
    minutes || (!days && !hours) ? `${minutes} min` : ""
  ].filter(Boolean).join(" ");
}
