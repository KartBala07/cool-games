# Cool Games

A mobile-first, offline-capable arcade with six original Canvas games: Neon Drift, Brick Burst, Glow Snake, Orbit Rush, Sky Stack, and Merge 2048. No dependencies, ads, analytics, or external game services.

## What is complete

- Four-digit keypad, plus keyboard input.
- Games code: **1807**.
- Six playable games with touch and keyboard controls, pause/restart, particles, and personal bests stored on the device.
- Home-screen name, icons, standalone manifest, and service worker for offline play after a successful online load.
- Immediate return to the passcode screen on `visibilitychange` to hidden, `blur`, `pagehide`, `pageshow`, and `freeze`. Unlock state is kept only in memory. A timer-gap check also relocks after a suspension that did not deliver a lifecycle event.
- Relative URLs support a GitHub Pages project URL such as `/cool-games/`.

## In-app web viewer

The second code, **1857**, opens an in-site web viewer instead of leaving the arcade. It starts at `https://www.instagram.com`. The viewer has an address bar (type a domain like `wikipedia.org` or any text to search), back/forward history, reload, a start page with quick links, and an **↗** button that opens the current page in a real new tab. Anything you do in the viewer stays inside Cool Games; nothing is stored or sent anywhere by the app.

Many sites — including Instagram, Google, YouTube, and Facebook — send `X-Frame-Options: DENY` or a `frame-ancestors` policy that browsers enforce, so they cannot be rendered inside another site. The viewer detects a blocked frame (or a six-second timeout) and shows a fallback with the address and an **Open in a new tab** button. Sites that permit embedding, such as Wikipedia, render directly in the pane. There is no way to bypass this from a static GitHub Pages site, and the app never asks for Instagram credentials.

The keypad is a casual screen lock, not secure authentication. Static source, passcode hashes, and behavior are available to visitors; four-digit codes can be discovered. Nothing here hides browsing history or guarantees that a phone's app-switcher screenshot will be obscured. The in-app viewer does not hide activity from the device's own browser history. OS lock events and screenshots vary by phone, so test the installed app on your own phone. Use the visible lock button before handing the device to someone else. The web viewer locks and clears its frame whenever the arcade relocks.

## Publish on GitHub Pages

1. Create a repository named `cool-games` on your GitHub account. A public repository works with GitHub Free; Pages from private repositories requires an eligible GitHub plan. An optional README makes the repository immediately available for connected editing.
2. Upload the **contents** of this folder to the repository root. `index.html` must be at the root, with `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, and the `icons` folder beside it. Do not upload just the ZIP.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`, and save.
4. Wait for GitHub's Pages deployment to finish. The repository's Pages settings show the actual published URL. For `KartBala07/cool-games`, the expected project URL is `https://kartbala07.github.io/cool-games/`; it is not live until deployment succeeds.

No build command, package install, API key, workflow, or server is required. The `.nojekyll` file is included; these files also work with the ordinary branch deployment if your upload tool omits dotfiles.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Add to your phone's home screen

- **iPhone:** Open the published URL in Safari → Share → Add to Home Screen. Enable “Open as Web App” if shown, then Add.
- **Android:** Open the published URL in Chrome → menu → Install app or Add to Home screen.
- Launch **Cool Games**, enter the games code, and choose a game.
- Background the app and return: it should show the passcode screen. Also test locking/unlocking your phone, returning through the app switcher, and reopening the app.
- Offline play requires the online service worker installation to finish first. If your browser clears site data, reconnect once.

## Local review

Run `python3 -m http.server 8080` from this folder and open `http://localhost:8080`. Opening the HTML directly may disable the service worker. For a phone connecting to a computer's IP address, serve via HTTPS so browser installation and cryptographic APIs are available.

## Controls

| Game | Touch | Keyboard |
|---|---|---|
| Neon Drift | Drag to change lanes | Left / right |
| Brick Burst | Drag paddle | Left / right |
| Glow Snake | Swipe / arrow controls | Arrow keys or WASD |
| Orbit Rush | Drag ship / arrow controls | Arrow keys or WASD |
| Sky Stack | Tap the arena to drop | Space |
| Merge 2048 | Swipe / arrow controls | Arrow keys or WASD |

`P` pauses, `Escape` locks. High scores are local to each browser installation; clearing site data clears them.

## Maintenance and verification

Run `node --check app.js` and `node --test tests/passcode.test.cjs` to check startup syntax, both passcodes, wrong-code retries, keypad corrections, and relocking during a pending check. These tests use Node's built-in test runner and require no package installation.

After changing cached files, change the `CACHE` version in `sw.js`. A newly installed worker takes over after older app windows close. This version uses network-first loading with offline fallback.

JavaScript syntax, local asset references, passcode outcomes, lifecycle lock logic, six game engines, and 2048 merging were checked in local automated checks. Those checks do not substitute for Safari/Chrome installation, actual phone-lock testing, or verification of a live GitHub Pages deployment. Browser visual QA and live hosting were not available in this run. Optional WebMCP registration is feature-detected, respects the lock, and has not been validated in a supported WebMCP browser.
