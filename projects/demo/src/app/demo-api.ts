import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { defer, delay, of, throwError } from 'rxjs';

interface Resource {
  type: string;
  id: string;
  attributes: Record<string, string>;
  relationships?: { comments: { data: { type: string; id: string }[] } };
}

export interface Exchange {
  method: string;
  url: string;
  status: number;
  request: string;
  response: string;
}

// This interceptor replaces only the demo API. The datastore and model methods
// still execute the library's real serialization and relationship mapping.
@Injectable({ providedIn: 'root' })
export class DemoApi {
  readonly exchanges = signal<Exchange[]>([]);
  private nextId = 3;
  private readonly posts: Resource[] = [
    {
      type: 'posts', id: '1',
      attributes: { title: 'Less plumbing. More building.', body: 'Load a JSON:API response and work with connected TypeScript models.' },
      relationships: { comments: { data: [{ type: 'comments', id: '1' }, { type: 'comments', id: '2' }] } },
    },
    {
      type: 'posts', id: '2',
      attributes: { title: 'Try a change, then roll it back.', body: 'Edit this post to see dirty tracking. Save sends a PATCH; rollback makes no API request.' },
      relationships: { comments: { data: [] } },
    },
  ];
  private readonly comments: Resource[] = [
    { type: 'comments', id: '1', attributes: { body: 'Included resources become Comment instances.' } },
    { type: 'comments', id: '2', attributes: { body: 'The post.comments relationship connects them for you.' } },
  ];

  handle(request: HttpRequest<unknown>) {
    return defer(() => {
      const url = new URL(request.urlWithParams, 'https://demo.invalid/');
      const path = url.pathname.split('/').filter(Boolean);
      const id = path[2];
      const index = this.posts.findIndex(post => post.id === id);
      let status = 200;
      let body: unknown;

      const document = (data: Resource | Resource[]) => {
        const resources = Array.isArray(data) ? data : [data];
        const ids = resources.flatMap(post => post.relationships?.comments.data.map(comment => comment.id) ?? []);
        return {
          data,
          ...(url.searchParams.get('include') === 'comments'
            ? { included: this.comments.filter(comment => ids.includes(comment.id)) }
            : {}),
        };
      };

      if (path[1] !== 'posts' || path.length > 3) {
        status = 404;
      } else if (request.method === 'GET') {
        if (!id) body = document(this.posts);
        else if (index >= 0) body = document(this.posts[index]);
        else status = 404;
      } else if (request.method === 'POST' || request.method === 'PATCH') {
        const data = (request.body as { data?: { attributes?: Record<string, string> } } | null)?.data;
        const attributes = data?.attributes ?? {};
        if (request.method === 'PATCH' && index < 0) {
          status = 404;
        } else if ((request.method === 'POST' && !attributes['title']?.trim()) ||
                   ('title' in attributes && !attributes['title'].trim())) {
          status = 422;
          body = { errors: [{ status: '422', title: 'A title is required', detail: 'Enter a title before saving.' }] };
        } else {
          const post = request.method === 'POST'
            ? { type: 'posts', id: String(this.nextId++), attributes: { title: '', body: '', ...attributes }, relationships: { comments: { data: [] } } }
            : this.posts[index];
          Object.assign(post.attributes, attributes);
          if (request.method === 'POST') {
            this.posts.push(post);
            status = 201;
          }
          body = document(post);
        }
      } else if (request.method === 'DELETE' && index >= 0) {
        this.posts.splice(index, 1);
        status = 204;
        body = null;
      } else {
        status = 404;
      }

      if (status === 404) body = { errors: [{ status: '404', title: 'Record not found' }] };
      // The library may normalize response objects; keep API state and the log independent.
      const responseBody = structuredClone(body);
      this.exchanges.update(exchanges => [{
        method: request.method, url: request.urlWithParams, status,
        request: request.body ? JSON.stringify(request.body, null, 2) : 'No request body',
        response: status === 204 ? 'No response body' : JSON.stringify(body, null, 2),
      }, ...exchanges].slice(0, 8));

      if (status >= 400) {
        return throwError(() => new HttpErrorResponse({ status, error: responseBody, url: request.urlWithParams }));
      }
      return of(new HttpResponse({
        status, body: responseBody, url: request.urlWithParams,
        headers: new HttpHeaders({ 'Content-Type': 'application/vnd.api+json' }),
      })).pipe(delay(150));
    });
  }
}

export const demoApiInterceptor: HttpInterceptorFn = (request, next) =>
  /^demo-api(?:\/|$)/.test(request.url)
    ? inject(DemoApi).handle(request)
    : next(request);
