import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JsonApiDatastore, JsonApiDatastoreConfig } from 'ngx-esy-jsonapi';
import { Comment, Post } from './models';

@Injectable({ providedIn: 'root' })
@JsonApiDatastoreConfig({
  baseUrl: 'demo-api',
  models: { posts: Post, comments: Comment },
})
export class Datastore extends JsonApiDatastore {
  constructor(http: HttpClient) {
    super(http);
  }
}
