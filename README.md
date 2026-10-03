# Playlive

https://andrehora.github.io/playlive/

Playlive runs end-to-end tests live in the browser. Write tests in a small YAML
format, pick one of the 50 example sites, press **Run all**, and watch each step
happen while the results update. Tests export to Playwright and Cypress.

No build step: plain ES modules, served as they are. `index.html` is the page,
`src/` is the app, and each example site is a real page in `examples/`.

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

npm test                 # everything, about a minute
npm run test:examples    # every example site's own tests
npm run test:app         # the app: picker, editor, running, recorder, export, layout
npm run test:exports     # every export is valid JavaScript
npm run test:report      # open the report of the last run
```

The suite starts its own server. It needs network access, because the page loads
js-yaml from cdnjs.
