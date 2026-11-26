# BASE. 3.1 – Refinement

## Scope and preservation

This release refines the existing application. No palette, typography, icon set,
navigation structure, translation dictionary or date/number formatting changed.
The existing Progress segmented control is the reference for the other segmented
controls. Optional nutrition/hydration modules and removable body widgets remain
optional. Existing template groups remain available.

Storage remains the existing `SET` IndexedDB database with its current tables and
schema versions. No destructive migration or new remote service is introduced.
The initial audit covered routes, components, styles, catalog and workout services,
planner logic, local nutrition/cache logic, backups, theme/PWA code and test scripts.

## Fixed

- Viewport height and safe-area handling now share the measured app viewport.
  The floating dock retains its own reserved row; content scrolls separately.
- Scrollbars are hidden on scrollable content and sheets; scrolling, momentum
  and horizontal food tabs remain functional. Sheet height respects the top inset.
- Opening a sheet locks the underlying main scroll and restores its position and
  focus when closed. Shared sheet and nutrition-preference styles load eagerly,
  independent of which routes have been opened.
- Segmented controls now share the Progress surface, padding, corners and touch
  height. Template heading/group spacing is slightly tighter.
- Dashboard drag starts only after movement on the dedicated handle. A tap or
  normal scrolling does not reorder widgets. Edge scrolling moves the actual
  main scroller. Cancellation does not persist a move.
- Gallery size selection previews the actual card wrappers and saves the selected
  Small/Medium/Large size. Existing layouts, reset, hide/remove and replace persist.
- Autosave merges changes against the latest persisted workout, preventing rapid
  weight/rep edits from overwriting each other. Removed records are not resurrected.
- Workout completion reads the latest record inside its transaction. Queued edits
  cannot reactivate a completed session or change its completed duration.
- Exercise-note storage failures are visible and keep the typed draft in memory.
- Backup validation rejects duplicate nested exercise/set identities and duplicate
  widget/plan identities before any table is cleared. Existing valid backups remain
  compatible and restoration remains atomic and explicitly confirmed.

## Improved

- Individual dated workouts can be postponed through temporary overrides. The
  recurring schedule is unchanged; skipped/rest days remain neutral. Multiple
  schedules and actual-history completion matching are preserved.
- Service-worker updates wait for explicit activation rather than immediately
  taking over. App-triggered updates cannot reload an active workout or edited
  input. Reloads preserve the route and main scroll using the existing safe view
  restoration. Offline training remains local and auto-saved.
- Release metadata and backup appVersion identify 3.1 / Refinement.

## Performance

- The rest timer ticks in its own component, rather than re-rendering the whole
  app every second.
- Statistics, muscle map and nutrition JavaScript load on demand. The main entry
  module drops from approximately 1.07 MB to 0.64 MB uncompressed (about 40%).
  Total offline precaching remains intentional so those screens work offline.
- History lookup uses a date index. Weekly-plan matching indexes completed history
  once per calculation. Dashboard aggregates are memoized across clock ticks.
- Charts memoize their input, debounce resizing and disable expensive animations
  for large series or reduced-motion preferences. Chart values are not sampled.
- Muscle calculations use a library index and memoized aggregates. Exercise catalog
  matching uses ID/name indexes instead of repeated full catalog scans.

## Validation

- TypeScript, production build and the existing localization/placeholder audit.
- Full Vitest suite including concurrency-safe autosave, completion, rejected
  backup identities, postponements, drag threshold, gallery sizes, update safety,
  language preservation and existing workout/nutrition behavior.
- Browser scripts: `check-ui`, `check-theme`, `check-library`,
  `check-rest-duration`, `check-nutrition`, `check-pwa-update`.
- Chromium mobile/touch profiles and widths 320, 375, 393, 430, 820 and 1180;
  light/dark/system, floating dock bounds, first-use/template flows, workouts,
  JSON export/restore, offline editing/reload, catalog and old-worker updates.
- Older browser selectors were brought up to date with the already-existing
  navigation, template play actions, menu visibility and explicit worker activation.

## Remaining limits

Real iOS Safari and an installed iOS PWA are not available here. Native Dynamic
Island/status-bar painting and real-device touch/momentum remain a device QA gate;
Chromium tests and simulated iOS theme tests do not establish that verification.
The managed visible preview relay is unavailable; local repository browser tests
use fresh isolated Chromium contexts and never read production user data.
The main bundle still emits Vite's >500 kB advisory, although its execution payload
is significantly smaller. No additional dependency or paid service was added.
