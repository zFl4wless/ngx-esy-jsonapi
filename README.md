# ngx-esy-jsonapi

[![CI](https://github.com/zFl4wless/ngx-esy-jsonapi/actions/workflows/ci.yml/badge.svg)](https://github.com/zFl4wless/ngx-esy-jsonapi/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ngx-esy-jsonapi)](https://www.npmjs.com/package/ngx-esy-jsonapi)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/LICENSE)

A maintained [JSON:API](https://jsonapi.org/) adapter for Angular. Map resources and relationships to TypeScript models, with CRUD operations, dirty tracking, and rollback.

This project continues the work of [nab-angular2-jsonapi](https://github.com/karwank/nab-angular2-jsonapi), building on the original [angular2-jsonapi](https://github.com/ghidoz/angular2-jsonapi) library, with versioned releases for Angular 20, 21, and 22.

## Angular compatibility

Choose the library major version that matches your Angular application. The current major version supports Angular 22.

| Angular | ngx-esy-jsonapi | npm tag |
| --- | --- | --- |
| 22 | `22.x` | `latest` |
| 21 | `21.x` | `angular21` |
| 20 | `20.x` | `angular20` |

## Try the example

The [interactive Angular example](https://github.com/zFl4wless/ngx-esy-jsonapi/tree/main/projects/demo) demonstrates relationships, CRUD operations, dirty tracking, rollback, and JSON:API errors. A local API simulation makes it runnable without a backend; edits reset when you refresh the page.

From a clone of this repository:

```bash
npm ci
npm start
```

Open `http://localhost:4200`. The example README also describes how to publish the static build on GitHub Pages.

**Migrating from `nab-angular2-jsonapi` or `angular2-jsonapi`?** Start with the [migration guide](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/docs/MIGRATION.md).

## Table of Contents

- [Angular compatibility](#angular-compatibility)
- [Try the example](#try-the-example)
- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
    - [Configuration](#configuration)
    - [Finding Records](#finding-records)
        - [Querying for Multiple Records](#querying-for-multiple-records)
        - [Retrieving a Single Record](#retrieving-a-single-record)
    - [Creating, Updating and Deleting](#creating-updating-and-deleting)
        - [Creating Records](#creating-records)
        - [Updating Records](#updating-records)
        - [Persisting Records](#persisting-records)
        - [Deleting Records](#deleting-records)
    - [Relationships](#relationships)
    - [Metadata](#metadata)
    - [Custom Headers](#custom-headers)
    - [Error handling](#error-handling)
    - [Dates](#dates)
- [Development](#development)
- [Maintenance and contributing](#maintenance-and-contributing)
- [Additional tools](#additional-tools)
- [License](#license)

## Introduction

JSON:API responses describe resources, attributes, and relationships. `ngx-esy-jsonapi` maps those responses to TypeScript model instances so your Angular application can work with connected objects instead of manually resolving raw response data.

Use the datastore to query, create, update, and delete records, load related resources, and access records already in the store. Model instances track attribute changes and let you roll back unsaved changes.

For example, a post and its included comments become models connected through their relationships:

```javascript
[
    Post{
        id: 1,
        title: 'My post',
        content: 'My content',
        comments: [
            Comment{
                id: 1,
                // ...
            },
            Comment{
                id: 2,
                // ...
            }
        ]
    },
    // ...
]
```


## Installation

To install this library, run:
```bash
$ npm install ngx-esy-jsonapi --save
```

This library uses reflected property types. Keep `experimentalDecorators: true`, `emitDecoratorMetadata: true`, and `useDefineForClassFields: false` in your application TypeScript configuration. Load `reflect-metadata` before your models. See the [migration guide](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/docs/MIGRATION.md#3-keep-runtime-decorator-metadata) for the configuration and dependency setup.

For a standalone application, register `provideHttpClient()` and your datastore service. The [example bootstrap](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/projects/demo/src/main.ts) and [datastore](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/projects/demo/src/app/datastore.ts) show the complete setup. Use your own API URL and omit the example's mock interceptor.

For an NgModule application, add `JsonApiModule` to your app module imports:
```typescript
import { JsonApiModule } from 'ngx-esy-jsonapi';

@NgModule({
  imports: [
    BrowserModule,
    JsonApiModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## Usage

### Configuration

Firstly, create your `Datastore` service:
- Extend the `JsonApiDatastore` class
- Decorate it with `@JsonApiDatastoreConfig`, set the `baseUrl` for your APIs and map your models (Optional: you can set `apiVersion`, `baseUrl` will be suffixed with it)
- Pass the `HttpClient` depencency to the parent constructor.

```typescript
import { JsonApiDatastoreConfig, JsonApiDatastore, DatastoreConfig } from 'ngx-esy-jsonapi';

const config: DatastoreConfig = {
  baseUrl: 'http://localhost:8000/v1/',
  models: {
    posts: Post,
    comments: Comment,
    users: User
  }
}

@Injectable()
@JsonApiDatastoreConfig(config)
export class Datastore extends JsonApiDatastore {

    constructor(http: HttpClient) {
        super(http);
    }

}
```

Then set up your models:
- Extend the `JsonApiModel` class
- Decorate it with `@JsonApiModelConfig`, passing the `type`
- Decorate the class properties with `@Attribute`
- Decorate the relationships attributes with `@HasMany` and `@BelongsTo`
- (optional) Define your [Metadata](#metadata)

```typescript
import { JsonApiModelConfig, JsonApiModel, Attribute, HasMany, BelongsTo } from 'ngx-esy-jsonapi';

@JsonApiModelConfig({
    type: 'posts'
})
export class Post extends JsonApiModel {

    @Attribute()
    title: string;

    @Attribute()
    content: string;

    @Attribute({ serializedName: 'created-at' })
    createdAt: Date;

    @HasMany()
    comments: Comment[];
}

@JsonApiModelConfig({
    type: 'comments'
})
export class Comment extends JsonApiModel {

    @Attribute()
    title: string;

    @Attribute()
    created_at: Date;

    @BelongsTo()
    post: Post;

    @BelongsTo()
    user: User;
}

@JsonApiModelConfig({
    type: 'users'
})
export class User extends JsonApiModel {

    @Attribute()
    name: string;
    // ...
}
```

### Finding Records

#### Querying for Multiple Records

Now, you can use your `Datastore` in order to query your API with the `findAll()` method:
- The first argument is the type of object you want to query.
- The second argument is the list of params: write them in JSON format, and they will be serialized.
- The returned value is a document that gives access to the metadata and the models.
```typescript
// ...
constructor(private datastore: Datastore) { }

getPosts(){
    this.datastore.findAll(Post, {
        page: { size: 10, number: 1 },
        filter: {
          title: 'My Post',
        },
    }).subscribe(
        (posts: JsonApiQueryData<Post>) => console.log(posts.getModels())
    );
}
```

Use `peekAll()` to retrieve all the records for a given type that are already loaded into the store, without making a network request:

```typescript
let posts = this.datastore.peekAll(Post);
```


#### Retrieving a Single Record

Use `findRecord()` to retrieve a record by its type and ID:

```typescript
this.datastore.findRecord(Post, '1').subscribe(
    (post: Post) => console.log(post)
);
```

Use `peekRecord()` to retrieve a record by its type and ID, without making a network request. This will return the record only if it is already present in the store:

```typescript
let post = this.datastore.peekRecord(Post, '1');
```

### Creating, Updating and Deleting

#### Creating Records

You can create records by calling the `createRecord()` method on the datastore:
- The first argument is the type of object you want to create.
- The second is a JSON with the object attributes.

```typescript
this.datastore.createRecord(Post, {
    title: 'My post',
    content: 'My content'
});
```

#### Updating Records

Making changes to records is as simple as setting the attribute you want to change:

```typescript
this.datastore.findRecord(Post, '1').subscribe(
    (post: Post) => {
        post.title = 'New title';
    }
);
```

#### Persisting Records

Records are persisted on a per-instance basis. Call `save()` on any instance of `JsonApiModel` and it will make a network request.

The library takes care of tracking the state of each record for you so that newly created records are treated differently from existing records when saving.

Newly created records will be `POST`ed:

```typescript
let post = this.datastore.createRecord(Post, {
    title: 'My post',
    content: 'My content'
});

post.save().subscribe();  // => POST to '/posts'
```

Records that already exist on the backend are updated using the HTTP `PATCH` verb:

```typescript
this.datastore.findRecord(Post, '1').subscribe(
    (post: Post) => {
        post.title = 'New title';
        post.save().subscribe();  // => PATCH to '/posts/1'
    }
);
```

The `save()` method will return an `Observer` that you need to subscribe:

```typescript
post.save().subscribe(
    (post: Post) => console.log(post)
);
```

**Note**: always remember to call the `subscribe()` method, even if you are not interested in doing something with the response. Since the `http` method return a [cold Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md#cold-vs-hot-observables), the request won't go out until something subscribes to the observable.

You can tell if a record has outstanding changes that have not yet been saved by checking its `hasDirtyAttributes` property.

At this point, you can either persist your changes via `save()` or you can roll back your changes. Calling `rollbackAttributes()` for a saved record reverts all the dirty attributes to their original value.

```typescript
this.datastore.findRecord(Post, '1').subscribe(
    (post: Post) => {
        console.log(post.title);                // => 'Old title'
        console.log(post.hasDirtyAttributes);   // => false
        post.title = 'New title';
        console.log(post.hasDirtyAttributes);   // => true
        post.rollbackAttributes();
        console.log(post.hasDirtyAttributes);   // => false
        console.log(post.title);                // => 'Old title'
    }
);
```

#### Deleting Records

For deleting a record, call the datastore's method `deleteRecord()`, passing the type and the id of the record:

```typescript
this.datastore.deleteRecord(Post, '1').subscribe(() => {
    // deleted!
});
```

### Relationships

#### Querying records

To query an object including its relationships, you can pass in its options the attribute name you want to load with the relationships:

```typescript
this.datastore.findAll(Post, {
    page: { size: 10, number: 1},
    include: 'comments'
}).subscribe(
    (document) => {
        console.log(document.getMeta()); // metadata
        console.log(document.getModels()); // models
    }
);
```

The same if you want to include relationships when finding a record:

```typescript
this.datastore.findRecord(Post, '1', {
    include: 'comments,comments.user'
}).subscribe(
    (post: Post) => console.log(post)
);
```

The library will try to resolve relationships on infinite levels connecting nested objects by reference. So that you can have a `Post`, with a list of `Comment`s, that have a `User` that has `Post`s, that have `Comment`s... etc.

**Note**: If you `include` multiple relationships, **do not** use whitespaces in the `include` string (e.g. `comments, comments.user`) as those will be encoded to `%20` and this results in a broken URL.

#### Creating Records

If the object you want to create has a **one-to-many** relationship, you can do this:

```typescript
let post = this.datastore.peekRecord(Post, '1');
let comment = this.datastore.createRecord(Comment, {
    title: 'My comment',
    post: post
});
comment.save().subscribe();
```

The library will do its best to discover which relationships map to one another. In the code above, for example, setting the `comment` relationship with the `post` will update the `post.comments` array, automatically adding the `comment` object!

If you want to include a relationship when creating a record to have it parsed in the response, you can pass the `params` object to the `save()` method:

```typescript
comment.save({
    include: 'user'
}).subscribe(
    (comment: Comment) => console.log(comment)
);
```

#### Updating Records

You can also update an object that comes from a relationship:

```typescript
this.datastore.findRecord(Post, '1', {
    include: 'comments'
}).subscribe(
    (post: Post) => {
        let comment: Comment = post.comments[0];
        comment.title = 'Cool';
        comment.save().subscribe((comment: Comment) => {
            console.log(comment);
        });
    }
);
```

### Metadata
Metadata such as links or data for pagination purposes can also be included in the result.

For each model a specific MetadataModel can be defined. To do this, the class name needs to be added in the ModelConfig.

If no MetadataModel is explicitly defined, the default one will be used, which contains an array of links and `meta` property.
```
@JsonApiModelConfig({
    type: 'deals',
    meta: JsonApiMetaModel
})
export class Deal extends JsonApiModel
```

An instance of a class provided in `meta` property will get the whole response in a constructor.

### Datastore config

Datastore config can be specified through the `JsonApiDatastoreConfig` decorator and/or by setting a `config` variable of the `Datastore` class. If an option is specified in both objects, a value from `config` variable will be taken into account.

```typescript
@JsonApiDatastoreConfig(config: DatastoreConfig)
export class Datastore extends JsonApiDatastore {
    private customConfig: DatastoreConfig = {
        baseUrl: 'http://something.com'
    }

    constructor() {
        this.config = this.customConfig;
    }
}
```

`config`:

* `models` - all the models which will be stored in the datastore
* `baseUrl` - base API URL
* `apiVersion` - optional, a string which will be appended to the baseUrl
* `overrides` - used for overriding internal methods to achive custom functionalities

##### Overrides

* `getDirtyAttributes` - determines which model attributes are dirty
* `toQueryString` - transforms query parameters to a query string


### Model config

```typescript
@JsonApiModelConfig(options: ModelOptions)
export class Post extends JsonApiModel { }
```

`options`:

* `type`
* `baseUrl` - if not specified, the global `baseUrl` will be used
* `apiVersion` - if not specified, the global `apiVersion` will be used
* `modelEndpointUrl` - if not specified, `type` will be used instead
* `meta` - optional, metadata model

### Decorators

#### Model decorators

* `Attribute(options: AttributeDecoratorOptions)`

    * `AttributeDecoratorOptions`:

        * `converter`, optional, must implement `PropertyConverter` interface
        * `serializedName`, optional

### Custom Headers

By default, the library adds these headers, according to the [JSON API MIME Types](http://jsonapi.org/#mime-types):

```
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json
```

You can also add your custom headers to be appended to each http call:

```typescript
this.datastore.headers = new HttpHeaders({'Authorization': 'Bearer ' + accessToken});
```

Or you can pass the headers as the last argument of any datastore call method:

```typescript
this.datastore.findAll(Post, {
    include: 'comments'
}, new HttpHeaders({'Authorization': 'Bearer ' + accessToken}));
```

and in the `save()` method:

```typescript
post.save({}, new HttpHeaders({'Authorization': 'Bearer ' + accessToken})).subscribe();
```

### Custom request options

You can add your custom request options to be appended to each http call:

```typescript
this.datastore.requestOptions = {
    withCredentials: false,
    myOption: 123
}
```

### Error handling

Error handling is done in the `subscribe` method of the returned Observables.
If your server returns valid [JSON API Error Objects](http://jsonapi.org/format/#error-objects) you can access them in your onError method:

```typescript
import {ErrorResponse} from "ngx-esy-jsonapi";

...

this.datastore.findAll(Post).subscribe(
    (posts: Post[]) => console.log(posts),
    (errorResponse) => {
        if (errorResponse instanceof ErrorResponse) {
              // do something with errorResponse
              console.log(errorResponse.errors);
        }
    }
);
```

It's also possible to handle errors for all requests by overriding `handleError(error: any): Observable` in the datastore.

### Dates

The library will automatically transform date values into `Date` objects, and it will serialize them when sending to the server. To do that, remember to set the type of the corresponding attribute as `Date`:

```typescript
@JsonApiModelConfig({
    type: 'posts'
})
export class Post extends JsonApiModel {

    // ...

    @Attribute()
    created_at: Date;

}
```

Moreover, it should be noted that the following assumptions have been made:
- Dates are expected to be received in one of the ISO 8601 formats, as per the [JSON API spec recommendation](http://jsonapi.org/recommendations/#date-and-time-fields);
- Dates are always sent in full ISO 8601 format, with local timezone and without milliseconds (example: `2001-02-03T14:05:06+07:00`).


## Development

Use a Node.js version matching `package.json` (Node.js 24.15+ on the 24.x line is recommended for this workspace).

```bash
npm ci
npm run build       # build the library package
npm run lint        # lint the library and example
npm run test:ci     # library tests in headless Chrome, with coverage
npm run test:demo   # example integration tests; build the library first
npm run build:demo  # build the library and production example
npm start          # build the library and serve the example locally
```

Browser tests require Chrome or Chromium. Set `CHROME_BIN` if it is not in the usual location.

GitHub Actions runs lint, both builds, library tests, example integration tests, and a package contents check on pushes and pull requests. The separate Pages workflow publishes the tested example when manually triggered on `main`.

## Maintenance and contributing

Maintained by [Noah (zFl4wless)](https://github.com/zFl4wless), continuing the work of the upstream authors and contributors.

- The current major targets Angular 22. Angular 20 and 21 releases remain available for compatibility; CI in this branch tests Angular 22.
- Security updates target the current major. See the [security policy](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/SECURITY.md) for supported versions and private reporting.
- For bugs and migration problems, [open an issue](https://github.com/zFl4wless/ngx-esy-jsonapi/issues) with your Angular/library versions, reproduction steps, and expected behavior.
- Documentation improvements, minimal reproductions, and fixes with regression coverage are welcome. Include the relevant local checks with your pull request.
- Browse the [releases](https://github.com/zFl4wless/ngx-esy-jsonapi/releases) and [changelog](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/CHANGELOG.md) for version history.

If this library is useful to you, consider starring the repository to help others discover it.

## Additional tools
* Gem for generating the model definitions based on active model serializers: https://github.com/oncore-education/jsonapi_models

## Thanks

This library is inspired by the draft of [this never implemented library](https://github.com/beauby/angular2-jsonapi).

## License

[MIT](https://github.com/zFl4wless/ngx-esy-jsonapi/blob/main/LICENSE), with attribution to Daniele Ghidoli, KarwanK, Noah (zFl4wless), and contributors. The license is included in the published package.
