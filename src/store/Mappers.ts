import * as Eff from "@tslibs/effect/effect-next";
import { Context } from "@tslibs/effect/effect-next";
import { Layer } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import * as SqliteDrizzle from "../libs/effect-drizzle/sqlite.js";
import { SqlBuilder } from "./SqlBuilder.js";
import { Schemas } from "./schema.js";

export class Mappers extends Context.Service<Mappers, SqlBuilder>()(
  "@yui-agent/brain-mastra/BrainStore/Mappers",
  {
    make: Eff.gen(function* () {
      const db = yield* SqliteDrizzle.DB;
      return new SqlBuilder(db as any);
    }),
  }
) {
  static makeLayer(): Eff.Layer<Mappers, never, SqlClient> {
    return Layer.effect(Mappers, Mappers.make).pipe(
      Layer.provide(
        SqliteDrizzle.makeLayer({
          schema: Schemas,
        })
      )
    );
  }
}
