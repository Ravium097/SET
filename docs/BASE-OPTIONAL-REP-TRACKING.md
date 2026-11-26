# Optional push-up rep tracking

## Integration

Only the current unfinished set in the existing active-workout focus view gets
**Track Reps**, and only for the basic names Push-up(s), Push Up(s), Pushup(s) or
Liegestütze (including umlaut spelling variants). Incline/wide and other exercises
are intentionally excluded. There is no new page, widget, history or setting.
Tracking is off by default and is never resumed automatically after a reload.

Tapping the button requests the front camera with audio disabled. The local
MediaPipe Face Landmarker loads only then. Denied permission, unsupported camera,
model/WASM failure or unavailable model assets leave manual input usable.

1. Keep the camera stationary and the face fully in view.
2. Hold the top position and choose **Oben kalibrieren**.
3. Hold the bottom position and choose **Unten kalibrieren**.
4. Return to the top; only subsequent complete top–bottom–top distance cycles count.

Calibration requires stable samples for approximately 0.8 seconds at each end
and a distinguishable relative face-size difference. An incomplete calibration
never produces repetitions. Automatic numbers flow through the existing workout
save path. Manual corrections update the counter baseline; typing in a numeric
field pauses detection. Starting does not erase an existing manual/carried-over
rep value; the first detected rep replaces that prior target with the actual
counter value. Stopping retains the latest saved/manual count.

Smoothing, separate top/bottom thresholds, sustained endpoint detection, minimum
cycle times and resets on missing/ambiguous faces, changed head pose or frame gaps
reduce duplicate and false counts. Counting never completes a set automatically.

Camera tracks, animation callbacks, model instance and calibration samples are
released on Stop, set completion, exercise/set change, leaving focus, navigation,
page hiding or unmount. A permission/model promise resolving after cancellation
is disposed rather than restarting the camera.

## Local processing and assets

No camera images, video, face landmarks or calibration measurements are saved or
sent to a server. No recording, image upload, face identification or separate
tracking database exists. Only integer rep values use the existing set record.
The preview is mirrored and displayed in grayscale; the detector still receives
the local unfiltered video element.

`@mediapipe/tasks-vision` is pinned to 1.2.3 (Apache-2.0). Official Google Face
Landmarker v1 assets are fetched at build time by `prepare-rep-model.mjs`, with a
pinned SHA-256 checksum, and hosted under BASE's own origin. The build needs
network access on a fresh checkout; subsequent builds reuse verified local assets.
Generated model/WASM files are ignored by Git. Upstream model information:
https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

The public model URL and SHA are recorded in `rep-tracker.config.json`. The model
is approximately 3.7 MB; the selected WASM runtime is approximately 14 MB. Model
and WASM assets are excluded from startup precaching. A dedicated versioned cache
stores them only after first use. The first use needs a connection; later offline
use requires that download/cache to have completed and not been evicted by iOS.
A missing offline model falls back to manual input. No paid API or external
inference service is used.

## Limitations

This is a relative face-distance estimate, not a body/form/depth judge. It cannot
prove that the arms completed a correctly performed push-up. Moving the phone can
mimic a repetition. Framing, lighting, head rotation, occlusion, glasses, other
faces, low frame rates or a small apparent distance change can prevent calibration
or undercount. The conservative thresholds deliberately prefer missing a rep to
inventing one. Manual entry remains authoritative and available throughout.

The phone must remain stationary with its front camera facing the face through
both calibrated positions. Recalibrate after repositioning by stopping and
starting again. Slow/old devices may not support the WASM runtime or may process
frames too slowly; use manual entry in that case.

## Verification and iPhone gate

Unit tests cover name gating, full cycles, partial movement/jitter, face loss,
pose changes, frame gaps, stable calibration, permission denial, late asynchronous
results, model failure, cleanup and manual correction. The browser test uses an
isolated fake camera, initializes the **real local WASM/model**, checks that no
external requests occur, and verifies cleanup, offline reuse and existing manual
save/completion. It does not record any camera footage.

An actual iPhone is not available in this environment. Therefore **real iOS
Safari/installed-PWA tracking accuracy and compatibility are not verified**.
Before treating this as device-validated, test on an iPhone in both Safari and
the installed PWA: permission accept/deny, both calibrations, several complete
cycles plus partial/jitter movements, corrections, Stop, completion, switching
exercises, leaving focus, backgrounding/locking, offline reuse and a fresh start.
Compare counts manually; do not assume laboratory accuracy from synthetic tests.
