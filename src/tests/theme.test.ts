// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { readTheme, saveTheme } from "../services/theme";
import { germanError } from "../i18n/de";
beforeEach(() => {
  localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="">';
});
afterEach(() => vi.restoreAllMocks());
it("defaults to dark and preserves light on reload", () => {
  expect(readTheme()).toBe("dark");
  expect(saveTheme("light")).toBe(true);
  expect(readTheme()).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.querySelector("meta")?.getAttribute("content")).toBe(
    "#F7F7F7",
  );
  saveTheme("dark");
  expect(readTheme()).toBe("dark");
});
it("keeps dark default for invalid preference and handles blocked storage", () => {
  localStorage.setItem("set-theme", "other");
  expect(readTheme()).toBe("dark");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("blocked");
  });
  expect(readTheme()).toBe("dark");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  expect(saveTheme("light")).toBe(false);
  expect(document.documentElement.dataset.theme).toBe("light");
});
it("does not expose English or raw validation errors", () => {
  expect(germanError(new Error("QuotaExceeded"))).toContain(
    "nicht gespeichert",
  );
  expect(germanError(new SyntaxError("Unexpected token"))).toContain(
    "Sicherungsdatei",
  );
  expect(germanError(new Error("Name und Datum fehlen"))).toBe(
    "Name und Datum fehlen",
  );
});
