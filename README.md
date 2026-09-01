# Faithful Hearts PWA

This folder is a deployable static web app. It requires no database and no Apple App Store submission.

## Publish it

The easiest route is GitHub Pages.

1. Create a repository, for example `faithful-hearts`.
2. Upload every file and folder in this package to the repository root.
3. In the repository settings, open Pages.
4. Select deployment from the main branch and the root folder.
5. Open the published HTTPS address on the iPhone.
6. In Safari, tap Share, choose Add to Home Screen, leave Open as Web App enabled, and tap Add.

Cloudflare Pages, Netlify, Vercel, or any ordinary HTTPS host will also work.

## Add another volume

1. Create the new reading page, for example `volume_two.html`.
2. Include the same manifest, icon, stylesheet, and `reader.js` references used in `volume_one.html`.
3. Give the page a unique volume meta value such as `volume_two`.
4. Add the volume to `catalog.json`, set its status to `available`, and increase the catalogue version.
5. Upload the changed files to the same hosting address.

The installed app does not need to be installed again. It fetches the current catalogue when opened online. A volume becomes available offline after it has loaded successfully at least once. Volume One is included in the initial offline cache.

## Updating existing text

Replace the relevant HTML file at the same address. The service worker uses a network first strategy for HTML and the catalogue, so updated text is fetched when the device is online and the saved copy remains available when it is offline.

## Local testing

A service worker will not run by opening `index.html` directly from the Files app. Test through an HTTPS host or through a local development server on a computer.

## Files

`index.html` is the library screen.

`catalog.json` controls which volumes appear.

`volume_one.html` contains the current 42 devotionals.

`app.js` builds the library and checks for content updates.

`reader.js` tracks progress and reading appearance on the device.

`service_worker.js` supplies offline caching.

`manifest.webmanifest` supplies the app name, icon, colour, scope, and standalone display mode.
