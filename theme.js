(() => {
  const storageKey = "zwh-theme";

  function storedTheme() {
    try {
      return localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = normalized;
    const button = document.querySelector("#themeToggle");
    if (button) {
      const dark = normalized === "dark";
      button.textContent = dark ? "☀" : "☾";
      button.setAttribute("aria-label", dark ? "切换浅色模式" : "切换深色模式");
      button.setAttribute("title", dark ? "切换浅色模式" : "切换深色模式");
      button.setAttribute("aria-pressed", String(dark));
    }
  }

  applyTheme(storedTheme());

  function bindThemeButton() {
    applyTheme(storedTheme());
    document.querySelector("#themeToggle")?.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, next); } catch { /* Theme still applies for this page. */ }
      applyTheme(next);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindThemeButton, { once: true });
  else bindThemeButton();

  window.addEventListener("storage", event => {
    if (event.key === storageKey) applyTheme(event.newValue);
  });
})();
