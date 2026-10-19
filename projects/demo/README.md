# Interactive Angular example

A standalone Angular 22 application using the **built library package** through
the `ngx-esy-jsonapi` public entry point.

## Run locally

From the repository root, with Node.js 24.15 or newer on the 24.x line:

```bash
npm ci
npm start
```

Open `http://localhost:4200`. The start command builds the library first, then
serves the application. If you change library source, rebuild the library and
restart the demo. For a static production build:

```bash
npm run build:demo
```

The deployable files are in `dist/demo/browser`.

## Try it

1. Select a post and inspect its included comments.
2. Edit its title or body: the status becomes **Unsaved changes**.
3. Click **Rollback**: attributes revert without an API request.
4. Edit again and click **Save post**: inspect the PATCH request and its dirty attributes.
5. Click **New post**, then save it: POST returns a server-assigned ID.
6. Delete a saved post: DELETE returns 204.
7. Save an empty title to see a JSON:API validation error; rollback still works.

Switching posts or reloading the list discards unsaved edits. All data lives in
memory and resets on a full page refresh. Requests shown in the UI are simulated
HTTP exchanges, not outgoing network traffic.

## How it works

- `src/app/models.ts`: decorated Post and Comment models.
- `src/app/datastore.ts`: the resource registry and demo base URL.
- `src/main.ts`: standalone, zoneless bootstrap with HTTP providers.
- `src/app/demo-api.ts`: a demo-only interceptor simulating JSON:API responses.
- `src/app/demo.component.ts`: the real library's query, create, save, delete,
  and rollback methods.
- `src/app/datastore.spec.ts`: integration tests through the library and interceptor.

For a real backend, change the datastore base URL and remove `demoApiInterceptor`
from the HTTP providers. The simulation implements only the endpoints and
features used by this demo; it is not a general JSON:API server.

## Publish on GitHub Pages

The `Demo on GitHub Pages` workflow builds and tests the application before
uploading `dist/demo/browser`. It sets the base URL to `/ngx-esy-jsonapi/` so
assets work under the repository's Pages path.

After these files are on `main`:

1. In repository **Settings → Pages → Build and deployment**, set **Source**
   to **GitHub Actions**.
2. Under **Actions → Demo on GitHub Pages**, choose **Run workflow** on `main`.
3. Wait for the deployment to finish. The workflow reports the deployed URL,
   expected to be `https://zfl4wless.github.io/ngx-esy-jsonapi/`.

Deployment is manual so the first publication and later updates are deliberate.
Once deployed, add the live URL to the root and package READMEs. The project has
no client-side routes, so it does not need a Pages SPA fallback.
