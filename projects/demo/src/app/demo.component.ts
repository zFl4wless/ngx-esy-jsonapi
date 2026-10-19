import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { ErrorResponse } from 'ngx-esy-jsonapi';
import { Datastore } from './datastore';
import { DemoApi } from './demo-api';
import { Post } from './models';

@Component({
  selector: 'lib-demo',
  imports: [FormsModule],
  templateUrl: './demo.component.html',
})
export class DemoComponent {
  readonly api = inject(DemoApi);
  private readonly datastore = inject(Datastore);
  readonly posts = signal<Post[]>([]);
  readonly selected = signal<Post | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly snippet = `datastore.findAll(Post, { include: 'comments' })
  .subscribe(document => {
    const posts = document.getModels();
    console.log(posts[0].comments);
  });`;

  constructor() {
    this.reload();
  }

  reload(): void {
    this.run(this.datastore.findAll(Post, { include: 'comments' }), document => {
      const posts = document.getModels();
      const selectedId = this.selected()?.id;
      this.posts.set(posts);
      this.selected.set(posts.find(post => post.id === selectedId) ?? posts[0] ?? null);
      this.message.set('Posts and their included comments loaded.');
    });
  }

  select(post: Post): void {
    this.selected()?.rollbackAttributes();
    this.selected.set(post);
    this.error.set('');
    this.message.set('');
  }

  create(): void {
    this.selected()?.rollbackAttributes();
    const post = this.datastore.createRecord(Post, { title: 'A new idea', body: 'Write something worth sharing.' });
    post.comments = [];
    this.selected.set(post);
    this.error.set('');
    this.message.set('New draft. Save it to send a POST request.');
  }

  save(): void {
    const post = this.selected();
    if (!post) return;
    const isNew = !post.id;
    this.run(post.save({ include: 'comments' }), saved => {
      if (isNew) this.posts.update(posts => [...posts, saved]);
      this.selected.set(saved);
      this.message.set(isNew ? 'Created with POST. The API assigned an ID.' : 'Saved with PATCH. No unsaved changes.');
    });
  }

  rollback(): void {
    const post = this.selected();
    if (!post?.id) return;
    post.rollbackAttributes();
    this.error.set('');
    this.message.set('Unsaved changes rolled back locally. No API request.');
  }

  remove(): void {
    const post = this.selected();
    if (!post?.id) return;
    this.run(this.datastore.deleteRecord(Post, post.id), () => {
      this.posts.update(posts => posts.filter(item => item.id !== post.id));
      this.selected.set(this.posts()[0] ?? null);
      this.message.set('Deleted with DELETE.');
    });
  }

  clearFeedback(): void {
    this.error.set('');
    this.message.set('');
  }

  private run<T>(operation: Observable<T>, success: (value: T) => void): void {
    this.busy.set(true);
    this.clearFeedback();
    operation.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: success,
      error: error => {
        this.error.set(error instanceof ErrorResponse
          ? (error.errors ?? []).map(item => item.detail || item.title).join(' ')
          : 'The request failed. Try reloading the example.');
      },
    });
  }
}
