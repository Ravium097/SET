import { useState } from 'react';
import { db } from '../../data';
import { activateLanguage, tr, useLanguage, type Language } from '../../i18n/runtime';
export function LanguagePicker() {
    const language = useLanguage();
    const [error, setError] = useState(false);
    return <article><h2>{tr('Sprache')}</h2><label>{tr('App-Sprache')}<select value={language} onChange={async (event) => {
            const next = event.target.value as Language;
            try {
                const saved = await db.settings.update('settings', { language: next });
                if (!saved)
                    throw new Error('Missing settings');
                activateLanguage(next);
                setError(false);
            }
            catch {
                setError(true);
            }
        }}><option value="de">{tr("Deutsch")}</option><option value="en">{tr("English")}</option></select></label>{error && <p role="alert">{tr('Sprache konnte nicht gespeichert werden.')}</p>}</article>;
}
