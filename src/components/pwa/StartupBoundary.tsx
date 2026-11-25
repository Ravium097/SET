import { tr } from "../../i18n/runtime";
import React from "react";
export class StartupBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed)
            return <main><h1>{tr("BASE. konnte die Ansicht nicht \u00F6ffnen.")}</h1><p>{tr("Deine gespeicherten Trainings wurden nicht gel\u00F6scht.")}</p><p>{tr("Schlie\u00DFe andere BASE.-Fenster und lade diese Ansicht neu.")}</p><a className="button" href="/recovery.html">{tr("Starthilfe \u00F6ffnen")}</a></main>;
        return this.props.children;
    }
}
