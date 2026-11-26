import { db,type Settings } from "../../data";
import { tr } from "../../i18n/runtime";
export function Modules({ settings }: {
    settings: Settings;
}) {
    return (<article>
      <h2>{tr("Modules")}</h2>
      <p>{tr("Optional. Deine gespeicherten Daten bleiben beim Deaktivieren erhalten.")}</p>
      {(["nutrition", "hydration"] as const).map((key) => (<label key={key}>
          <input type="checkbox" checked={!!settings[key]} onChange={(e) => db.settings
                .update("settings", key === "nutrition" ? { nutrition: e.target.checked } : { hydration: e.target.checked })
                .catch(() => alert(tr("Einstellung konnte nicht gespeichert werden.")))}/>
          {key === "nutrition" ? tr(" Ern\u00E4hrungstagebuch") : tr(" Trinktagebuch")}
        </label>))}
    </article>);
}
