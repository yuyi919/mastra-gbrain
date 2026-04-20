import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as D from "drizzle-orm/sqlite-core";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import * as SqliteDrizzle from "./sqlite.js";

// setup

const SqlLive = SqliteClient.layer({
  filename: "tmp/test.db",
});
const DrizzleLive = SqliteDrizzle.layer.pipe(Layer.provide(SqlLive));
const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive);

// usage

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name"),
});

Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const db = yield* SqliteDrizzle.SqliteDrizzle;
  yield* sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`;
  yield* db.delete(users);
  yield* db.insert(users).values({ id: 1, name: "Alice" });
  yield* db
    .insert(users)
    .values({ id: 1, name: "Alice" })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Alice3",
      },
    });
  const count = yield* db.$count(users);
  yield* Effect.log("count", count);
  const results = yield* db.select().from(users);

  yield* Effect.log("results", results);
}).pipe(Effect.provide(DatabaseLive), Effect.runPromise);
