// Light/dark theme: light is the default; the visitor's choice is remembered.
(function () {
  var STORAGE_KEY = "theme";
  var root = document.documentElement;

  function savedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // storage can be blocked; the page still works
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // ignore: the choice just won't be remembered
    }
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var button = document.getElementById("theme-toggle");
    if (button) {
      var isDark = theme === "dark";
      button.setAttribute("aria-pressed", String(isDark));
      button.textContent = isDark ? "Switch to light theme" : "Switch to dark theme";
    }
  }

  // Runs immediately (this script loads in <head>) so there is no flash of the wrong theme.
  applyTheme(savedTheme() === "dark" ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    applyTheme(root.getAttribute("data-theme")); // refresh the button label now that it exists
    if (button) {
      button.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        saveTheme(next);
      });
    }
  });
})();
