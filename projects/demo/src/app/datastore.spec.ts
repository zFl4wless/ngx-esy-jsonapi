import 'reflect-metadata';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ErrorResponse } from 'ngx-esy-jsonapi';
import { Datastore } from './datastore';
import { DemoApi, demoApiInterceptor } from './demo-api';
import { Comment, Post } from './models';

describe('Example datastore with the local JSON:API', () => {
  let datastore: Datastore;
  let api: DemoApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([demoApiInterceptor]))],
    });
    datastore = TestBed.inject(Datastore);
    api = TestBed.inject(DemoApi);
  });

  it('maps included comments to models and rolls back without an API request', async () => {
    const document = await firstValueFrom(datastore.findAll(Post, { include: 'comments' }));
    const post = document.getModels()[0];
    const title = post.title;
    expect(post instanceof Post).toBeTrue();
    expect(post.comments[0] instanceof Comment).toBeTrue();
    expect(post.comments.length).toBe(2);
    expect(post.hasDirtyAttributes).toBeFalse();
    post.title = 'Unsaved title';
    expect(post.hasDirtyAttributes).toBeTrue();
    post.rollbackAttributes();
    expect(post.title).toBe(title);
    expect(post.hasDirtyAttributes).toBeFalse();
    expect(api.exchanges().length).toBe(1);
  });

  it('sends only dirty attributes in PATCH and establishes a new rollback baseline', async () => {
    const post = await firstValueFrom(datastore.findRecord(Post, '1', { include: 'comments' }));
    post.title = 'Saved title';
    await firstValueFrom(post.save({ include: 'comments' }));
    const exchange = api.exchanges()[0];
    expect(exchange.method).toBe('PATCH');
    expect(JSON.parse(exchange.request).data.attributes).toEqual({ title: 'Saved title' });
    expect(post.hasDirtyAttributes).toBeFalse();
    post.title = 'Another change';
    post.rollbackAttributes();
    expect(post.title).toBe('Saved title');
    const reloaded = await firstValueFrom(datastore.findRecord(Post, '1', { include: 'comments' }));
    expect(reloaded.title).toBe('Saved title');
    expect(reloaded.comments.length).toBe(2);
  });

  it('creates and deletes a record through POST and DELETE', async () => {
    const post = datastore.createRecord(Post, { title: 'New post', body: 'New body' });
    post.comments = [];
    await firstValueFrom(post.save({ include: 'comments' }));
    expect(api.exchanges()[0].status).toBe(201);
    expect(api.exchanges()[0].method).toBe('POST');
    expect(post.id).toBeTruthy();
    expect(post.hasDirtyAttributes).toBeFalse();
    await firstValueFrom(datastore.deleteRecord(Post, post.id));
    expect(api.exchanges()[0].status).toBe(204);
    expect(api.exchanges()[0].method).toBe('DELETE');
    const document = await firstValueFrom(datastore.findAll(Post));
    expect(document.getModels().some(item => item.id === post.id)).toBeFalse();
  });

  it('exposes JSON:API validation errors and preserves unsaved changes', async () => {
    const post = await firstValueFrom(datastore.findRecord(Post, '1'));
    post.title = '';
    try {
      await firstValueFrom(post.save());
      fail('Expected a validation error');
    } catch (error) {
      expect(error instanceof ErrorResponse).toBeTrue();
    }
    expect(api.exchanges()[0].status).toBe(422);
    expect(post.hasDirtyAttributes).toBeTrue();
    post.rollbackAttributes();
    expect(post.title).not.toBe('');
  });
});
