export type Theme = "dark" | "light";
export function readTheme(): Theme {
  try {
    return localStorage.getItem("set-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#111111" : "#F7F7F7");
}
export function saveTheme(theme: Theme): boolean {
  applyTheme(theme);
  try {
    localStorage.setItem("set-theme", theme);
    return true;
  } catch {
    return false;
  }
}
