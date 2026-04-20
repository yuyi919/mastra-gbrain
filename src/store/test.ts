import { DateTime, Effect } from "effect";
import { UnknownError } from "effect/Cause";
import { Override } from "effect/unstable/schema/VariantSchema";
import { PageService } from "./page.js";

Effect.gen(function* () {
  const pageService = yield* PageService;
  //   console.log(yield* pageService.listNoEmpty());
  yield* pageService.upsert({
    slug: "test",
    type: "test",
    title: "test",
    compiled_truth: "test",
    timeline: "test",
    frontmatter: {},
    content_hash: "test",
    created_at: Override(yield* DateTime.now),
  });
  console.log(yield* pageService.list());
}).pipe(
  Effect.tapErrorTag("SchemaError", (e) => Effect.logFatal(e.toString())),
  Effect.catchTag(["SchemaError"], (error) =>
    Effect.fail(new UnknownError(error, error.issue.toString()))
  ),
  Effect.provide(PageService.Live),
  Effect.runPromise
);
