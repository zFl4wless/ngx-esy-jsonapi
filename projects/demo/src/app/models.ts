import { Attribute, HasMany, JsonApiModel, JsonApiModelConfig } from 'ngx-esy-jsonapi';

@JsonApiModelConfig({ type: 'comments' })
export class Comment extends JsonApiModel {
  @Attribute() body!: string;
}

@JsonApiModelConfig({ type: 'posts' })
export class Post extends JsonApiModel {
  @Attribute() title!: string;
  @Attribute() body!: string;
  @HasMany() comments!: Comment[];
}
