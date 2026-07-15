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
const EVENT_NOTIFICATION_PREFIX = "jlab-event:";
const TEST_NOTIFICATION_ID = "jlab-test";
const COMMENT_CURSOR_SEED = 58417;

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(["enabled", "monitoredBooks", "enabledBooks", "intervalMinutes", "entryLimit", "commentCounts", "watchedAuthors", "pageEventStates", "commentCursor", "repeatDtmAlerts"]);
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
  if (typeof current.repeatDtmAlerts !== "boolean") updates.repeatDtmAlerts = true;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
  await syncAlarm();
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  await updateAlertBadge(pendingAlerts);
  await checkForComments();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncAlarm();
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  await updateAlertBadge(pendingAlerts);
  const { enabled = true } = await chrome.storage.local.get("enabled");
  if (enabled) await checkForComments();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) checkForComments();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.intervalMinutes || changes.enabledBooks || changes.monitoredBooks) syncAlarm();
  if (changes.enabledBooks) handleEnabledBooksChange(changes.enabledBooks);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "check-now") {
    checkForComments()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
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
  return false;
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
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

async function handleEnabledBooksChange(change) {
  const { monitoredBooks } = await chrome.storage.local.get("monitoredBooks");
  const books = normalizeMonitoredBooks(monitoredBooks);
  const previousBooks = new Set(normalizeEnabledBooks(change.oldValue, books).map((book) => book.slug));
  const currentBooks = new Set(normalizeEnabledBooks(change.newValue, books).map((book) => book.slug));
  const disabledBooks = [...previousBooks].filter((slug) => !currentBooks.has(slug));
  const updates = {};

  if (disabledBooks.length) {
    const { commentCounts = {} } = await chrome.storage.local.get("commentCounts");
    const nextCounts = Object.fromEntries(
      Object.entries(commentCounts).filter(([key]) => !disabledBooks.some((slug) => key.startsWith(`${slug}:`)))
    );
    updates.commentCounts = nextCounts;
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
    repeatDtmAlerts = true
  } = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "commentCounts", "initialized", "watchedAuthors", "pageEventStates",
    "renderedCommentCounts", "renderedCommentsInitialized", "seenCommentIds", "commentIdsInitialized",
    "commentCursor", "commentCursorInitialized", "repeatDtmAlerts"
  ]);
  if (!enabled) return;
  const books = normalizeMonitoredBooks(monitoredBooks);
  const activeBooks = normalizeEnabledBooks(enabledBooks, books);

  await chrome.storage.local.set({ checking: true, lastError: "" });

  if (!activeBooks.length) {
    await chrome.storage.local.set({
      checking: false,
      lastCheck: Date.now(),
      lastError: "",
      trackedEntries: 0,
      latestShiftSummary: null,
      shiftSummariesByBook: {},
      lastDetectedEvents: 0,
      bookDiagnostics: {}
    });
    return;
  }

  try {
    const [results, dtmEvent] = await Promise.all([
      Promise.all(activeBooks.map((book) => fetchBook(book))),
      fetchDtmEvent()
    ]);
    const pageEvents = activeBooks.map((book) => ({ ...dtmEvent, book: book.name, bookSlug: book.slug }));
    const entries = results.flat();
    const shiftSummariesByBook = Object.fromEntries(
      results.map((bookEntries, index) => [
        activeBooks[index].slug,
        bookEntries
          .filter((entry) => cleanTitle(entry.title).toLocaleLowerCase().includes("shift summary"))
          .sort((a, b) => Number(b.lognumber) - Number(a.lognumber))
          .map((entry) => ({
            book: entry.book,
            bookSlug: entry.bookSlug,
            lognumber: entry.lognumber,
            title: cleanTitle(entry.title),
            created: entry.created,
            url: `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`
          }))
      ])
    );
    const nextCounts = Object.fromEntries(
      Object.entries(commentCounts).filter(([key]) => activeBooks.some((book) => key.startsWith(`${book.slug}:`)))
    );
    const nextRenderedCommentCounts = { ...renderedCommentCounts };
    const nextSeenCommentIds = { ...seenCommentIds };
    const nextPageEventStates = { ...pageEventStates };
    const commentAlerts = [];
    const authorAlerts = [];
    const eventAlerts = [];
    const authorSet = new Set(watchedAuthors.map(normalizeAuthor).filter(Boolean));
    const baselineBooks = new Set(
      Object.keys(commentCounts).map((key) => key.split(":", 1)[0])
    );

    for (const entry of entries) {
      const key = `${entry.bookSlug}:${entry.lognumber}`;
      const current = parseCommentCount(entry);
      const isNewEntry = !Object.prototype.hasOwnProperty.call(commentCounts, key);
      const isWatchedAuthor = authorSet.has(normalizeAuthor(entry.author));

      if (initialized && baselineBooks.has(entry.bookSlug) && isNewEntry && isWatchedAuthor) {
        authorAlerts.push(entry);
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

    const commentScan = await scanNewComments(
      Number(commentCursor) || COMMENT_CURSOR_SEED,
      commentCursorInitialized,
      entryMetadata,
      activeBooks
    );
    commentAlerts.push(...commentScan.alerts);

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
          eventAlerts.push({ ...currentEvent, eventState: "found" });
          queuedEventChanges.add(changeKey);
        }
        nextPageEventStates[currentEvent.bookSlug] = currentEvent;
      } else if (currentEvent.status === "closed") {
        if (previousEvent?.status === "open") {
          const changeKey = `closed:${previousEvent.identity}`;
          if (!queuedEventChanges.has(changeKey)) {
            eventAlerts.push({ ...previousEvent, eventState: "closed" });
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
      seenCommentIds: nextSeenCommentIds,
      commentIdsInitialized: true,
      commentCursor: commentScan.cursor,
      commentCursorInitialized: commentCursorInitialized || commentScan.caughtUp,
      commentScanDiagnostic: commentScan.diagnostic,
      pageEventStates: nextPageEventStates,
      initialized: true,
      checking: false,
      lastCheck: Date.now(),
      lastError: "",
      trackedEntries: entries.length,
      latestShiftSummary: null,
      shiftSummariesByBook,
      lastDetectedEvents: commentAlerts.length + authorAlerts.length + eventAlerts.length,
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

    for (const entry of commentAlerts) await showCommentNotification(entry);
    for (const entry of authorAlerts) await showAuthorNotification(entry);
    for (const entry of eventAlerts) await showEventNotification(entry);
  } catch (error) {
    const message = friendlyError(error);
    await chrome.storage.local.set({ checking: false, lastCheck: Date.now(), lastError: message });
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

  const state = await chrome.storage.local.get(["monitoredBooks", "enabledBooks"]);
  const books = normalizeMonitoredBooks(state.monitoredBooks);
  const existing = books.find((item) => item.slug === slug);
  const nextBooks = existing ? books : [...books, book];
  const enabled = new Set(normalizeEnabledBooks(state.enabledBooks, books).map((item) => item.slug));
  enabled.add(slug);
  await chrome.storage.local.set({
    monitoredBooks: nextBooks,
    enabledBooks: nextBooks.filter((item) => enabled.has(item.slug)).map((item) => item.slug)
  });
  return existing || book;
}

async function removeLogbook(value) {
  const slug = String(value || "").trim().toLocaleLowerCase();
  const state = await chrome.storage.local.get([
    "monitoredBooks", "enabledBooks", "commentCounts", "pageEventStates", "bookDiagnostics", "shiftSummariesByBook"
  ]);
  const books = normalizeMonitoredBooks(state.monitoredBooks);
  const nextBooks = books.filter((book) => book.slug !== slug);
  const nextEnabled = normalizeEnabledBooks(state.enabledBooks, books)
    .filter((book) => book.slug !== slug)
    .map((book) => book.slug);
  const nextCounts = Object.fromEntries(
    Object.entries(state.commentCounts || {}).filter(([key]) => !key.startsWith(`${slug}:`))
  );
  const nextEventStates = { ...(state.pageEventStates || {}) };
  const nextDiagnostics = { ...(state.bookDiagnostics || {}) };
  const nextShiftSummaries = { ...(state.shiftSummariesByBook || {}) };
  delete nextEventStates[slug];
  delete nextDiagnostics[slug];
  delete nextShiftSummaries[slug];
  await chrome.storage.local.set({
    monitoredBooks: nextBooks,
    enabledBooks: nextEnabled,
    commentCounts: nextCounts,
    pageEventStates: nextEventStates,
    bookDiagnostics: nextDiagnostics,
    shiftSummariesByBook: nextShiftSummaries,
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
  for (const field of ["lognumber", "title", "created", "author", "numcomments"]) params.append("field", field);

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

async function fetchDtmEvent() {
  const pageUrl = "https://ace.jlab.org/dtm/open-events";
  const response = await fetch(`${pageUrl}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("DTM_AUTH_REQUIRED");
  if (!response.ok) throw new Error(`DTM returned HTTP ${response.status}`);

  const html = await response.text();
  const eventMatch = html.match(/<h3\b[^>]*id=["']header-(\d+)["'][^>]*>([\s\S]*?)<\/h3>/i);
  if (!eventMatch) {
    return {
      status: "closed",
      identity: null,
      title: "No open event",
      url: pageUrl,
      comments: {},
      commentRecords: {},
      diagnostic: "DTM reports no open events"
    };
  }

  const eventId = eventMatch[1];
  const header = eventMatch[2];
  const titleMatch = header.match(/class=["'][^"']*\baccordion-event-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const durationMatch = header.match(/class=["'][^"']*\bevent-header-time-elapsed-wrap\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const periodMatch = header.match(/class=["'][^"']*\bevent-header-period\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const title = htmlToText(titleMatch?.[1]) || `Open DTM event #${eventId}`;
  const duration = htmlToText(durationMatch?.[1]);
  const start = htmlToText(periodMatch?.[1]);
  const detail = [title, start && `Started ${start}`, duration].filter(Boolean).join(" · ");
  const url = `${pageUrl}?event_id=${encodeURIComponent(eventId)}`;

  return {
    status: "open",
    identity: `dtm:${eventId}`,
    title,
    detail,
    url,
    comments: {},
    commentRecords: {},
    diagnostic: `Direct DTM check detected event #${eventId}: ${detail}`
  };
}

function parseCommentCount(entry) {
  const raw = entry?.numcomments ?? entry?.comment_count ?? entry?.commentCount ?? entry?.comments ?? 0;
  return extractNumericCount(raw);
}

function extractNumericCount(raw, depth = 0) {
  if (depth > 5 || raw === null || typeof raw === "undefined") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }
  if (Array.isArray(raw)) {
    return raw.reduce((maximum, value) => Math.max(maximum, extractNumericCount(value, depth + 1)), 0);
  }
  if (typeof raw === "object") {
    for (const key of ["count", "value", "total", "content", "numcomments"]) {
      if (key in raw) return extractNumericCount(raw[key], depth + 1);
    }
    return Object.values(raw).reduce(
      (maximum, value) => Math.max(maximum, extractNumericCount(value, depth + 1)),
      0
    );
  }
  return 0;
}

async function scanNewComments(startCursor, notify, entryMetadata, activeBooks) {
  let cursor = Math.max(COMMENT_CURSOR_SEED, Number(startCursor) || 0);
  let consecutiveMisses = 0;
  let checked = 0;
  const alerts = [];
  const activeBookSlugs = new Set(activeBooks.map((book) => book.slug));

  for (let id = cursor + 1; checked < 200 && consecutiveMisses < 20; id += 1) {
    const comment = await fetchCommentCandidate(id);
    checked += 1;
    if (!comment) {
      consecutiveMisses += 1;
      continue;
    }

    consecutiveMisses = 0;
    cursor = id;
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
    if (notify && matchedBook && activeBookSlugs.has(matchedBook.slug)) {
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
    caughtUp: consecutiveMisses >= 20,
    diagnostic: `Scanned ${checked} comment IDs after ${startCursor}; latest existing ID ${cursor}`
  };
}

async function fetchCommentCandidate(id) {
  const commentUrl = `https://logbooks.jlab.org/comment/${id}#comment-${id}`;
  const response = await fetch(`https://logbooks.jlab.org/comment/${id}?monitor_time=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/html" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("AUTH_REQUIRED");
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) return null;

  const html = await response.text();
  // JLab includes a login form in the sidebar of public pages, even when the
  // requested comment is fully visible. Only report an authentication failure
  // when access is denied and the requested comment is absent.
  const commentIdentity = new RegExp(`(?:/comment/${id}\\b|comment-${id}\\b)`, "i");
  if (/access denied/i.test(html) && !commentIdentity.test(html)) throw new Error("AUTH_REQUIRED");
  if (/page\s+not\s+found|requested\s+page\s+could\s+not\s+be\s+found|does\s+not\s+exist/i.test(html)) return null;
  if (!commentIdentity.test(html)) return null;

  const entryHeadingMatch = html.match(/<h1\b[^>]*class=["'][^"']*\bnode-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["'][^"']*\/entry\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h1>/i);
  const entryMatch = entryHeadingMatch || html.match(/\/entry\/(\d+)/i);
  const bookCellMatch = html.match(/<th\b[^>]*>\s*Logbooks?:?\s*<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/i);
  const bookSlugs = [...String(bookCellMatch?.[1] || "").matchAll(/\/book\/([a-z0-9_-]+)/gi)]
    .map((match) => match[1].toLocaleLowerCase())
    .filter((slug, index, values) => values.indexOf(slug) === index);
  const createdMatch = html.match(/class=["'][^"']*\bauthor-datetime\b[^"']*["'][^>]*>[\s\S]*?Lognumber[\s\S]*?<time\b[^>]*datetime=["']([^"']+)["']/i);
  const title = entryHeadingMatch?.[2]
    ? htmlToText(entryHeadingMatch[2])
    : `Entry containing comment #${id}`;

  return {
    commentId: String(id),
    lognumber: entryMatch?.[1] || null,
    bookSlug: bookSlugs[0] || null,
    bookSlugs,
    title,
    created: createdMatch?.[1] || null,
    commentUrl,
    url: commentUrl
  };
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEntries(payload) {
  if (Array.isArray(payload)) return payload;

  if (payload?.stat && payload.stat !== "ok") {
    throw new Error(payload.message || "The JLab API reported an error");
  }

  // JLab's documented response is { stat: "ok", data: { ..., entries: [] } }.
  if (Array.isArray(payload?.data?.entries)) return payload.data.entries;

  for (const key of ["entries", "data", "results", "items"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  // Be tolerant of equivalent wrappers used by older/newer Drupal endpoints.
  for (const wrapper of Object.values(payload || {})) {
    if (!wrapper || typeof wrapper !== "object" || Array.isArray(wrapper)) continue;
    for (const key of ["entries", "results", "items"]) {
      if (Array.isArray(wrapper[key])) return wrapper[key];
    }
  }

  if (payload && typeof payload === "object") {
    const entryValues = Object.values(payload).filter(
      (value) => value && typeof value === "object" && !Array.isArray(value) && "lognumber" in value
    );
    if (entryValues.length) return entryValues;
  }
  throw new Error("The JLab API returned an unfamiliar response format");
}

async function showCommentNotification(entry) {
  const notificationId = `${NOTIFICATION_PREFIX}${entry.bookSlug || entry.book}:${entry.lognumber || `comment-${entry.commentId}`}`;
  const plural = entry.added === 1 ? "comment" : "comments";
  await showSystemNotification({
    id: notificationId,
    systemTitle: `${entry.book}: ${cleanTitle(entry.title)}`,
    message: entry.created
      ? `Entry time: ${formatEntryTime(entry.created)} · ${entry.added} new ${plural}`
      : `${entry.added} new ${plural}`,
    url: entry.commentUrl || entry.url || `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`
  });
}

async function showAuthorNotification(entry) {
  const notificationId = `${ENTRY_NOTIFICATION_PREFIX}${entry.bookSlug || entry.book}:${entry.lognumber}`;
  await showSystemNotification({
    id: notificationId,
    systemTitle: `${entry.book}: New entry by ${displayAuthor(entry.author)}`,
    message: `${cleanTitle(entry.title)}\nEntry time: ${formatEntryTime(entry.created)}`,
    url: `${ENTRY_ROOT}${encodeURIComponent(entry.lognumber)}`
  });
}

async function showEventNotification(event) {
  const state = event.eventState === "closed" ? "closed" : "found";
  const notificationId = `${EVENT_NOTIFICATION_PREFIX}${state}:${stableHash(event.identity || event.title)}`;
  await showSystemNotification({
    id: notificationId,
    systemTitle: `DTM event ${state}`,
    message: event.detail || event.title || `Beam-down event ${state}`,
    url: event.url || `https://logbooks.jlab.org/book/${event.bookSlug || event.book.toLocaleLowerCase()}`
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
    systemTitle: "JLab monitor test",
    message: "Chrome system notifications are working.",
    url: "https://logbooks.jlab.org/book/hclog"
  });
}

async function testAuthorMatch() {
  const { watchedAuthors = [], monitoredBooks, enabledBooks } = await chrome.storage.local.get([
    "watchedAuthors", "monitoredBooks", "enabledBooks"
  ]);
  const authorSet = new Set(watchedAuthors.map(normalizeAuthor).filter(Boolean));
  if (!authorSet.size) throw new Error("Save at least one author first");
  const activeBooks = normalizeEnabledBooks(enabledBooks, normalizeMonitoredBooks(monitoredBooks));
  if (!activeBooks.length) throw new Error("Turn on at least one logbook first");

  const entries = (await Promise.all(activeBooks.map((book) => fetchBook(book)))).flat();
  const match = entries
    .filter((entry) => authorSet.has(normalizeAuthor(entry.author)))
    .sort((a, b) => Number(b.lognumber) - Number(a.lognumber))[0];

  if (!match) {
    throw new Error("No matching author was found within the configured check ranges of the enabled logbooks");
  }

  await showAuthorNotification(match);
  return {
    book: match.book,
    lognumber: match.lognumber,
    author: displayAuthor(match.author),
    title: cleanTitle(match.title)
  };
}

async function testCommentMatch() {
  const match = await fetchCommentCandidate(COMMENT_CURSOR_SEED);
  if (!match) throw new Error(`Comment ${COMMENT_CURSOR_SEED} could not be loaded`);
  const { monitoredBooks } = await chrome.storage.local.get("monitoredBooks");
  const books = normalizeMonitoredBooks(monitoredBooks);
  const configuredBook = books.find((book) => match.bookSlugs?.includes(book.slug));
  match.book = configuredBook?.name || match.bookSlug?.toLocaleUpperCase() || "JLab";

  await showCommentNotification({ ...match, added: 1 });
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
  const { pendingAlerts = {} } = await chrome.storage.local.get("pendingAlerts");
  pendingAlerts[notificationId] = {
    ...alert,
    id: notificationId,
    baseId: alert.id,
    createdAt: Date.now()
  };
  await chrome.storage.local.set({ pendingAlerts });
  await updateAlertBadge(pendingAlerts);
  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icon.png",
    title: alert.systemTitle,
    message: alert.message,
    contextMessage: "JLab Logbook",
    requireInteraction: true,
    priority: 2,
    buttons: isTest
      ? [{ title: "Clear" }]
      : [{ title: "Clear" }, { title: "Go to entry" }]
  });
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
  if (error?.message === "AUTH_REQUIRED") {
    return "JLab login required. Open either logbook, sign in, then click Check now.";
  }
  return error?.message || "Unable to check the logbooks";
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
  return id.startsWith(NOTIFICATION_PREFIX) || id.startsWith(ENTRY_NOTIFICATION_PREFIX) || id.startsWith(EVENT_NOTIFICATION_PREFIX);
}

function isTestNotification(id) {
  return id === TEST_NOTIFICATION_ID || id.startsWith(`${TEST_NOTIFICATION_ID}:`);
}
