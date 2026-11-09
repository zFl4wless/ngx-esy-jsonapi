# Migrating to ngx-esy-jsonapi

`ngx-esy-jsonapi` continues `nab-angular2-jsonapi`, which builds on
`angular2-jsonapi`. The model decorators and datastore workflow remain familiar;
this is not a guarantee that every older application is a drop-in migration.

## 1. Match your Angular version

Upgrade Angular using its [official update guide](https://angular.dev/update-guide)
before installing a matching library major. `@angular/core` and `@angular/common`
must use the same Angular major.

| Your Angular major | Install |
| --- | --- |
| 22 | `npm install ngx-esy-jsonapi@22` |
| 21 | `npm install ngx-esy-jsonapi@21` |
| 20 | `npm install ngx-esy-jsonapi@20` |

For Angular 22, the package declares RxJS `^7.4.0` and
`@abraham/reflection` `^0.12.0` as peers. Keep compatible versions installed;
do not bypass a peer mismatch with `--force` or `--legacy-peer-deps`.

Remove the predecessor package you use:

```bash
npm uninstall nab-angular2-jsonapi
# Or: npm uninstall angular2-jsonapi
npm install ngx-esy-jsonapi@22 @abraham/reflection@^0.12.0 reflect-metadata@^0.2.2
```

Use `@21` or `@20` instead of `@22` for those Angular majors, and check that
release's peer dependencies with `npm view ngx-esy-jsonapi@21 peerDependencies`.
Applications still on Angular 19 or earlier need an Angular upgrade first.

## 2. Replace imports

Change imports from `nab-angular2-jsonapi` or `angular2-jsonapi` to the public
entry point `ngx-esy-jsonapi`:

```typescript
import {
  Attribute,
  HasMany,
  BelongsTo,
  JsonApiModel,
  JsonApiModelConfig,
  JsonApiDatastore,
  JsonApiDatastoreConfig,
} from 'ngx-esy-jsonapi';
```

Keep your resource `type` names, attribute mappings, relationship decorators,
API base URL, and datastore model registry. Replace imports into internal source
paths with public exports. Remove old TypeScript `paths` aliases if they still
resolve the predecessor package or a stale local build.

If you use the deprecated `query()` method, prefer `findAll()` and read models
from the returned document:

```typescript
datastore.findAll(Post, { include: 'comments' }).subscribe(document => {
  const posts = document.getModels();
  console.log(posts);
});
```

## 3. Keep runtime decorator metadata

The library uses legacy TypeScript decorators and reflected property types.
Keep these settings in your application `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

Load the metadata polyfill before your model classes, for example as the first
import in `main.ts`:

```typescript
import 'reflect-metadata';
```

Avoid initializing decorated attributes with class-field defaults: they can
overwrite values populated by the base model constructor. Declare their types
with definite assignment, such as `@Attribute() title!: string;`, and provide
new-record defaults through `datastore.createRecord()`.

## 4. Register HTTP and your datastore

An existing NgModule application can keep `JsonApiModule` and its datastore
provider. For a standalone application, register `provideHttpClient()` and your
datastore service (or give it `providedIn: 'root'`). The datastore subclass must
pass its injected `HttpClient` to `super(http)`.

The [complete standalone example](https://github.com/zFl4wless/ngx-esy-jsonapi/tree/main/projects/demo)
shows model declarations, datastore configuration, and application bootstrap.
It uses a mock API interceptor for demonstration; use your own API URL and omit
that interceptor in a real application.

## 5. Verify your integration

Build and test against your real backend. Check one list request with included
relationships, one single-record request, POST, PATCH, DELETE, error responses,
and dirty tracking/rollback. In particular, verify serialized attribute names
and date formats if your application relies on them. Requests are Observables:
they execute only when subscribed to.

The demo's integration tests exercise these core operations with a local API
simulation on Angular 22. They do not establish compatibility with every
backend, custom override, or historical release. If you hit a migration issue,
[report it](https://github.com/zFl4wless/ngx-esy-jsonapi/issues) with the previous
package version, Angular version, and a minimal reproduction.
