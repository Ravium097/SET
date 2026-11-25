# Language and iOS appearance synchronization

## Language

Settings → Sprache / App language selects German or English immediately. The
optional `settings.language` field is part of existing JSON backups. A startup
localStorage mirror selects the same language on the loading and recovery pages.
Existing backups without the field keep the German default. No data migration,
translation service or additional network requests are used.

App-owned copy uses `tr` and an English dictionary; German remains the canonical
copy. Interpolated workout/exercise names and user notes are not translated.
Canonical category, equipment, muscle, unit and route values remain unchanged
in storage. Only their display labels are localized. Common gym terminology
such as Push Day, Pull Day, Leg Day, RPE and RIR stays unchanged. Numbers, dates,
weekdays, charts, dialogs, accessible names, errors and update messages follow
the selected language.

Run `npm run test:i18n` to check literal translation coverage, raw JSX copy and
placeholder consistency. `language.test.tsx` covers switching both ways,
persistence/backups, dates/numbers, dynamic messages and custom names.

## iOS theme synchronization

The existing palette and status-bar styles are preserved. `syncTheme` updates
html, body and root backgrounds, startup background, CSS colour scheme,
`theme-color` and the Apple status-bar meta together. Existing root safe-area
painting inherits the active palette. The early inline startup script applies
the stored choice before the first application render. System appearance uses
a media-query listener, including the older Safari listener API.

The theme picker commits IndexedDB before the reactive theme hook applies the
change. The hook writes the startup mirror before considering a reload. All
browsers first receive a direct synchronization. iOS exposes no reliable API
to inspect the native status-bar repaint. For brightness changes in an installed
iOS app, a guarded fallback runs after 800 ms. Safari tabs and other browsers
never reload for this fallback.

The fallback is deferred while any workout is active, a dialog is open, the
page is hidden, an editor has focus or an input has been edited on the current
page. The theme selector itself is exempt. Dirty-input tracking is intentionally
conservative, including autosaved fields; it clears only when leaving that
route. Pending checks retry safely. No user input is serialized into web
storage and no page navigation is performed to force the reload.

A sessionStorage marker permits one reload for each transition; inability to
save the marker or startup preference disables automatic reloading. Before the
reload, the current URL and main scroll coordinates are saved. Startup consumes
the snapshot once and restores scrolling while local content loads, stopping
on user interaction or after five seconds. Existing workout records and timer
values are never changed by theme synchronization.

## Verification

Automated tests simulate light → dark, dark → light and System choices,
standalone vs Safari detection, metadata/background synchronization, one-reload
behaviour, storage persistence, protected workouts/drafts/dialogs and scroll
restoration. Build still targets Safari 15 and produces the existing PWA.

Real iOS Safari and an installed iOS PWA are not available in this execution
environment. The managed browser preview is also blocked by a relay timeout.
Before declaring native-device compatibility verified, check on an iPhone:

1. Switch Light → Dark → Light in Safari: no reload, matching backgrounds.
2. Repeat in the installed PWA: direct update followed by at most one fallback
   reload, same route and scroll position, correct Dynamic Island background.
3. Choose System and change system appearance with the app visible and while
   it is backgrounded; reopen and check the active appearance.
4. Repeat with an active workout and with an unsaved meal/settings draft: no
   automatic reload, session and input intact.
5. Force blocked storage: direct theme update remains usable, no reload loop.
