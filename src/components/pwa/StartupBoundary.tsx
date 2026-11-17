import React from "react";
export class StartupBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if (this.state.failed) return <main><h1>SET konnte die Ansicht nicht öffnen.</h1><p>Deine gespeicherten Trainings wurden nicht gelöscht.</p><p>Schließe andere SET-Fenster und lade diese Ansicht neu.</p><a className="button" href="/recovery.html">Starthilfe öffnen</a></main>;
    return this.props.children;
  }
}
