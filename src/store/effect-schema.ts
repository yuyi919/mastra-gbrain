import { type Effect, Schema } from "effect";
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
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {
  /**
   * Decode a page from its raw data. (unsafe)
   * @throws {Error} if the raw data is not valid.
   * @param page - The raw data of the page.
   * @returns The decoded page.
   */
  static decodeUnsafe(page: (typeof Page)["Encoded"]): Page {
    return Schema.decodeSync(Page)(page);
  }
  /**
   * Decode a page from its raw data.
   */
  static decode(
    page: (typeof Page)["Encoded"]
  ): Effect.Effect<Page, Schema.SchemaError, never> {
    return Schema.decodeEffect(Page)(page);
  }
}
