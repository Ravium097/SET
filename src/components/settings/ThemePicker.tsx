import { tr } from "../../i18n/runtime";
import { useState } from "react";
import { readTheme, saveTheme, type Theme } from "../../services/theme";
import { t } from "../../i18n/de";
export function ThemePicker() {
    const [theme, setTheme] = useState<Theme>(readTheme), [message, setMessage] = useState("");
    return (<article>
      <h2>{t("themeTitle")}</h2>
      <label>{tr("Farbschema")}<select value={theme} onChange={(e) => {
            const next = e.target.value as Theme;
            setTheme(next);
            setMessage(saveTheme(next) ? "" : t("preferenceError"));
        }}>
          <option value="dark">{t("dark")}{tr(" (Standard)")}</option>
          <option value="light">{t("light")}</option>
        </select>
      </label>
      {message && <p role="status">{tr(message)}</p>}
    </article>);
}
