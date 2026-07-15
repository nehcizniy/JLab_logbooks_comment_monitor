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
let authorsLoaded = false;

extensionVersion.textContent = chrome.runtime.getManifest().version;

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
    ? `Watching ${watchedAuthors.length} ${watchedAuthors.length === 1 ? "author" : "authors"}`
    : "Author alerts are off";
  saveAuthorsButton.textContent = "Saved";
  setTimeout(() => { saveAuthorsButton.textContent = "Save authors"; }, 900);
});

testAuthorButton.addEventListener("click", async () => {
  testAuthorButton.disabled = true;
  testAuthorButton.textContent = "Searching…";
  const result = await chrome.runtime.sendMessage({ type: "test-author-match" });
  if (result?.ok) {
    authorStatus.textContent = `Matched ${result.match.author} on ${result.match.book} #${result.match.lognumber}`;
    testAuthorButton.textContent = "Alert opened";
  } else {
    authorStatus.textContent = result?.error || "No matching entry found";
    testAuthorButton.textContent = "No match";
  }
  setTimeout(() => {
    testAuthorButton.disabled = false;
    testAuthorButton.textContent = "Test author match";
  }, 1600);
});

chrome.storage.onChanged.addListener(() => render());
render();

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

async function render() {
  const state = await chrome.storage.local.get([
    "enabled", "monitoredBooks", "enabledBooks", "intervalMinutes", "checking", "initialized", "lastCheck", "lastError", "trackedEntries", "watchedAuthors",
    "lastDetectedEvents", "bookDiagnostics", "commentCursor", "shiftSummariesByBook", "repeatDtmAlerts"
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
  renderBookControls(monitoredBooks, enabledBookSlugs);
  renderShiftSummaries(state.shiftSummariesByBook, activeBooks, state.initialized);
  if (!authorsLoaded) {
    const authors = Array.isArray(state.watchedAuthors) ? state.watchedAuthors : [];
    authorsInput.value = authors.join("\n");
    authorStatus.textContent = authors.length
      ? `Watching ${authors.length} ${authors.length === 1 ? "author" : "authors"}`
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

function renderShiftSummaries(summariesByBook, activeBooks, initialized) {
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
    const heading = document.createElement("h3");
    const summaries = Array.isArray(summariesByBook?.[book.slug]) ? summariesByBook[book.slug] : [];
    heading.textContent = `${book.name} (${summaries.length})`;
    group.append(heading);

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
