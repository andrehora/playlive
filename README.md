# Playlive

https://andrehora.github.io/playlive/

Playlive runs end-to-end tests live in the browser.
Write tests in a small YAML format.

## Running it locally

The app must be served over http (it uses ES modules, and the **Copy** button
needs a secure context), so open it through a server rather than from disk:

```sh
npm run serve      # then open http://localhost:4173
```

## Tests

Playlive tests itself with Playwright. This is dev tooling only — it is not part
of the shipped page.

```sh
npm install
npx playwright install chromium

npm test
```
