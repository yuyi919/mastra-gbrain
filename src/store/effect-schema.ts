import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

export class Page extends Model.Class<Page>("Pages")({
  id: Schema.Int.pipe(Model.Generated),
  slug: Schema.String,
  type: Schema.String,
  title: Schema.String,
  compiled_truth: Schema.String,
  timeline: Schema.String,
  frontmatter: Schema.Record(Schema.String, Schema.Any).pipe(
    Model.JsonFromString
  ),
  content_hash: Schema.NonEmptyString,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}

export const toPage = Schema.decodeSync(Page.select);
