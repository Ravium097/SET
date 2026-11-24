export const de = {
  themeTitle: "Darstellung",
  dark: "Dunkel",
  light: "Hell",
  onboardingTitle: "Beispielvorlage",
  onboardingText:
    "Drei Übungen als bearbeitbare Vorlage.",
  loadExample: "Beispielvorlage laden",
  dismiss: "Verstanden",
  currentSet: "Aktueller Satz",
  nextSet: "Nächster Satz",
  storageError:
    "Die Änderung konnte nicht gespeichert werden. Bitte prüfe den verfügbaren Gerätespeicher und versuche es erneut.",
  importError:
    "Die Sicherungsdatei ist ungültig oder konnte nicht gelesen werden. Deine vorhandenen Daten bleiben erhalten.",
  preferenceError:
    "Die Einstellung konnte nicht dauerhaft gespeichert werden. Sie gilt vorerst nur bis zum Neuladen.",
} as const;
export const t = (key: keyof typeof de): string => de[key];
export function germanError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "Name und Datum fehlen") return message;
  if (message === "Backup ist zu groß")
    return "Die Sicherungsdatei ist zu groß (maximal 20 MB).";
  if (
    error instanceof Error &&
    (error.name === "ZodError" || error.name === "SyntaxError")
  )
    return t("importError");
  return t("storageError");
}
