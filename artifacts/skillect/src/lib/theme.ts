/** Skillect navy theme helpers */
export const THEME_STORAGE_KEY = "skillect-theme";

export type ThemeMode = "light" | "dark";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return v === "dark" ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function toggleTheme(): ThemeMode {
  const next = getStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
