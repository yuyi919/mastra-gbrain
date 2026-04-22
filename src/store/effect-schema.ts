import { Effect, Schema, Struct } from "effect";
import { Model } from "effect/unstable/schema";

export const PageType = Schema.Literals([
  "person",
  "company",
  "deal",
  "project",
  "source",
  "media",
  "yc",
  "civic",
  "concept",
  "writing",
  "analysis",
  "guide",
  "hardware",
  "architecture",
]);
export type PageType = (typeof PageType)["Type"];
export class GraphNode extends Model.Class<GraphNode>("GraphNodes")({
  slug: Schema.String,
  type: PageType,
  title: Schema.String,
  depth: Schema.Int,
  links: Schema.Array(
    Schema.Struct({ to_slug: Schema.String, link_type: Schema.String })
  ).pipe(
    Schema.fromJsonString,
  ),
}) {
  static decodeUnsafe(page: (typeof GraphNode)["Encoded"]): GraphNode {
    return Schema.decodeSync(GraphNode)(page);
  }
  /**
   * Decode a page from its raw data.
   */
  static decode(
    page: (typeof GraphNode)["Encoded"]
  ): Effect.Effect<GraphNode, Schema.SchemaError, never> {
    return Schema.decodeEffect(GraphNode)(page);
  }
}

export class PageVersion extends Model.Class<PageVersion>("PageVersions")({
  id: Schema.Int.pipe(Model.Generated),
  page_id: Schema.Int,
  compiled_truth: Schema.String,
  frontmatter: Schema.Record(Schema.String, Schema.Any).pipe(
    Model.JsonFromString
  ),
  snapshot_at: Schema.DateTimeUtcFromString,
}) {
  static decodeUnsafe(page: (typeof PageVersion)["Encoded"]): PageVersion {
    return Schema.decodeSync(PageVersion)(page);
  }
  /**
   * Decode a page from its raw data.
   */
  static decode(
    page: (typeof PageVersion)["Encoded"]
  ): Effect.Effect<PageVersion, Schema.SchemaError, never> {
    return Schema.decodeEffect(PageVersion)(page);
  }
}

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
  content_hash: Schema.NullOr(Schema.String),
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

  /**
   * @internal
   */
  static JSONSchema = Schema.toStandardJSONSchemaV1(Page);
}

export const PartialPage = Page.select.mapFields(
  Struct.map(Schema.optionalKey)
);

// console.log(
//   Bun.inspect(
//     SchemaRepresentation.toCodeDocument(
//       SchemaRepresentation.toMultiDocument(
//         SchemaRepresentation.fromAST(Page.ast)
//       )
//     )
//   )
// );
