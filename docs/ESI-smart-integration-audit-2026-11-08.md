# ESI integration audit — 8 November 2026

This audit records the current code paths relevant to account identity, Single Player, Multiplayer, OneSignal, and app updates. It is intentionally conservative: no Firebase rules, Cloudflare secrets, live database contents, or real-device behaviour can be verified from repository files alone.

## Account and data architecture

- The public home page loads the OneSignal v16 browser SDK, `onesignal.js`, and `app.js`.
- `app.js` initializes a separately named Firebase app called `notifications` using the `elite-notification` Firebase project. It signs that app in anonymously for the general notification feed.
- `quiz.html` loads `multiplayer.js`, which loads `multiplayer-core.js`. Multiplayer initializes the `project-76067` Firebase project and uses anonymous Firebase Authentication. Multiplayer profile, room, chat, and notification paths are in that project's Realtime Database.
- `quiz1.html` loads `singleplay.js`. Single Player initializes the `leadersboard-7dacc` Firebase project and also signs in anonymously. Its profile/leaderboard/performance records are separate from Multiplayer's records.
- Both quiz systems read the separate `elitequestionbank-d6b6d` question-bank project.

### Consequence

A Google account enabled in one Firebase project does not automatically make the same Firebase UID or profile appear in the other projects. Google sign-in and safe legacy-account linking require provider configuration in each relevant Firebase project, a migration/linking design, and compatible Realtime Database rules. This repository-only pass deliberately does not replace the existing anonymous-auth flow or move user records.

## OneSignal findings

- The OneSignal SDK initializer is loaded by the home page, but not by `quiz.html`.
- Multiplayer's `sendNotif(toUid, ...)` writes an in-app record to `mp_notifications/{toUid}`; it does not itself call the OneSignal API.
- The existing `functions/api/onesignal/send.js` route is an administrator announcement route. It verifies an admin token from the `elite-notification` Firebase project and deliberately restricts external-ID targeting to that administrator's own UID.
- Therefore, the current code does not provide a safe, verified path for Multiplayer to send a OneSignal push to another Multiplayer user. A separate authenticated and abuse-resistant server route is needed. This audit does not weaken the admin-only endpoint or put the OneSignal REST key in browser code.

## PWA update behaviour

- `manifest.json` already has a stable app identity: `id: "/"`, `scope: "/"`, and `start_url: "/index.html"`. A normal browser-installed PWA at the same origin should update in place rather than become a second app.
- The previous service-worker install code used `cache: "reload"` for every app-shell resource, forcing unnecessary full resource downloads during each service-worker install.
- This branch changes shell fetches to revalidation and makes same-origin JavaScript/CSS network-first with an offline-cache fallback. When the hosting server supplies ETag/Last-Modified validators, unchanged assets can be revalidated without downloading their full contents. Changed assets are fetched and cached individually.
- This is a PWA/web-content update improvement. It does not by itself update native Android code embedded in an APK.

## Native Android APK limitation

- The repository contains a native Android WebView project with package ID `com.elitescholarinstitute.app`.
- The current GitHub Actions workflow builds `assembleDebug` and publishes that APK. GitHub-hosted runners are ephemeral, so their automatically generated debug signing key is not a dependable long-term update key.
- Android installs an APK update over an existing installation only when the package ID and signing certificate match and the version code increases. A different signing certificate is rejected; it does not create a safe in-place update.
- The current workflow does not show a persistent release keystore or a configured signing secret. I have not changed the APK workflow or claimed that a future APK can update an already-installed native app without first resolving the signing-key continuity problem.

## Changes made on this branch

- `sw.js`: bumped the cache version; revalidates app-shell files; uses network-first for same-origin JavaScript and CSS with an offline fallback.
- `app.js`: bumped the build identifier so the service-worker registration URL changes.
- `index.html`: updated its versioned app-controller URL.

## Validation and limits

- JavaScript syntax checks passed for the changed `sw.js` and `app.js`.
- The homepage's app-controller URL was checked against the new build identifier.
- No production deployment was made.
- No Google sign-in, OneSignal push delivery, Firebase data migration, room lifecycle, or native APK update was claimed as tested.
