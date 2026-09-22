# Cool Games

A mobile-first, offline-capable arcade with six original Canvas games: Neon Drift, Brick Burst, Glow Snake, Orbit Rush, Sky Stack, and Merge 2048. No dependencies, ads, analytics, or external game services.

## What is complete

- Four-digit keypad, plus keyboard input.
- Games code: **1807**.
- Six playable games with touch and keyboard controls, pause/restart, particles, and personal bests stored on the device.
- Home-screen name, icons, standalone manifest, and service worker for offline play after a successful online load.
- Immediate return to the passcode screen on `visibilitychange` to hidden, `blur`, `pagehide`, `pageshow`, and `freeze`. Unlock state is kept only in memory. A timer-gap check also relocks after a suspension that did not deliver a lifecycle event.
- Relative URLs support a GitHub Pages project URL such as `/cool-games/`.

## In-app web browser

The second code, **1857**, opens an in-site browser instead of leaving the arcade. It starts at `https://www.instagram.com` and has:

- An address bar with autocomplete from your history; type a domain like `wikipedia.org`, or any words to search.
- Back and forward buttons, reload, and a **⌂ Start** page.
- A start page with quick tiles (Instagram, Wikipedia, YouTube, Google, X, Example.com).
- **History** of every site you open, saved on the device, with a per-row delete and **Clear all**.
- **Bookmarks**: the ☆/★ button saves the current page; bookmarks appear on the start page and can be removed.
- An **↗** button that opens the current page in a real new tab.

History and bookmarks are kept in `localStorage` only (`cool-games-web-history`, `cool-games-web-bookmarks`); nothing is sent anywhere. The frame is cleared on relock.

### Instagram mini app

Instagram's normal site sends `X-Frame-Options: DENY`, so `instagram.com` itself cannot be embedded. Its **embed endpoints can**: `https://www.instagram.com/<user>/embed` and `https://www.instagram.com/p/<code>/embed` return `200` with no frame-blocking header. The viewer rewrites Instagram URLs to those endpoints and renders them in a phone-width pane, so a public profile or single post appears inside Cool Games instead of a new tab:

- `instagram.com/<user>` and `instagram.com/<user>/` load that profile's embed (and remember the username).
- `instagram.com/p/<code>`, `/reel/<code>`, `/tv/<code>` load that post's embed.
- Bare `instagram.com` loads the remembered username, or the official `@instagram` profile the first time, with a hint to type your own username.
- Login-walled paths (`/explore`, `/accounts`, `/direct`, `/stories`, `/reels`) have no embed; those show a username prompt plus an **Open the full site** button.

Only public profiles/posts render; a signed-in feed, DMs, and the logged-in app cannot be embedded from a static site, and the app never asks for Instagram credentials.

### Frame-blocking hosts

Other hosts — Facebook, Google, YouTube, X, TikTok, Reddit, LinkedIn, Discord, WhatsApp — send `X-Frame-Options: DENY` or `frame-ancestors`, so browsers refuse to render them inside another site. For those the viewer skips the embed and shows a clean in-app notice with an **Open the full site** button, avoiding the browser's raw “refused to connect” page. Sites that permit embedding, such as Wikipedia and Example.com, load directly. Any site not on that list is attempted; if nothing paints within six seconds, a dismissible notice appears.

The keypad is a casual screen lock, not secure authentication. Static source, passcode hashes, and behavior are available to visitors; four-digit codes can be discovered. The in-app browser does not hide activity from the device's own browser history. OS lock events and screenshots vary by phone, so test the installed app on your own phone. Use the visible lock button before handing the device to someone else.

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
