function normalizeExtensionThemeMode(value) {
  return value === "dark" ? "dark" : "light";
}

function applyExtensionThemeMode(value) {
  document.documentElement.dataset.theme = normalizeExtensionThemeMode(value);
}

applyExtensionThemeMode("light");

chrome.storage.local.get("themeMode")
  .then(({ themeMode }) => applyExtensionThemeMode(themeMode))
  .catch(() => applyExtensionThemeMode("light"));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.themeMode) {
    applyExtensionThemeMode(changes.themeMode.newValue);
  }
});
