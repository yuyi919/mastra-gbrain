/** biome-ignore-all lint/correctness/useImportExtensions: * */

import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Context, DateTime, Effect, flow, Layer, Schema } from "effect";
import { type Model, VariantSchema } from "effect/unstable/schema";
import {
  SqlClient,
  SqlModel,
  SqlResolver,
  SqlSchema,
} from "effect/unstable/sql";
import { Page } from "./effect-schema";
import init from "./init.sql" with { type: "text" };

export class PageService extends Context.Service<PageService>()("PageService", {
  make: Effect.gen(function* () {
    const config = {
      tableName: "pages",
      spanPrefix: "Pages",
      idColumn: "slug",
    } as const;
    const sql = yield* SqlClient.SqlClient;
    const resolver = yield* SqlModel.makeResolvers(Page, {
      ...config,
      idColumn: "id",
    });
    const resolverWithSlug = yield* SqlModel.makeResolvers(Page, {
      ...config,
      idColumn: "slug",
    });
    const repository = yield* SqlModel.makeRepository(Page, {
      ...config,
      idColumn: "id",
    });
    const repositoryWithSlug = yield* SqlModel.makeRepository(Page, {
      ...config,
      idColumn: "slug",
    });
    const makeInsert = Effect.fnUntraced(function* (
      { created_at, updated_at, ...other },
      opt
    ) {
      created_at ??= VariantSchema.Override(yield* DateTime.now);
      updated_at ??= created_at;
      return yield* Page.insert.makeEffect(
        { created_at, updated_at, ...other },
        opt
      );
    }) as typeof Page.insert.makeEffect;
    const additional = yield* makeRepository(Page, config);
    const base = {
      getById: SqlResolver.request(resolver.findById),
      getBySlug: SqlResolver.request(resolverWithSlug.findById),
      insertGet: flow(
        makeInsert,
        Effect.flatMap(SqlResolver.request(resolver.insert))
      ),
      upsert: flow(makeInsert, Effect.flatMap(additional.upsert)),
      insert: flow(
        makeInsert,
        Effect.flatMap(SqlResolver.request(resolver.insertVoid))
      ),
      list: additional.list,
      listNoEmpty: additional.listNoEmpty,
      deleteById: SqlResolver.request(resolver.delete),
      deleteBySlug: SqlResolver.request(resolverWithSlug.delete),
      update: flow(Page.update.makeEffect, Effect.flatMap(repository.update)),
      updateBySlug: flow(
        Page.update.makeEffect,
        Effect.flatMap(repositoryWithSlug.update)
      ),
    };
    return {
      ...base,
      deleteByIds: (ids: Iterable<number>) =>
        Effect.forEach(ids, base.deleteById, { concurrency: "unbounded" }),
      findByIds: (ids: Iterable<number>) =>
        Effect.forEach(ids, base.getById, { concurrency: "unbounded" }),
    };
  }),
}) {
  static Live = Layer.effect(PageService, PageService.make).pipe(
    Layer.merge(
      Layer.effectDiscard(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          //   console.log(init);
          //  Migrator.make({ dumpSchema(path, migrationsTable) {
          yield* sql.unsafe(init);
          // } });
        })
      )
    ),
    Layer.provideMerge(
      SqliteClient.layer({
        filename: "./tmp/global-brain.db",
      })
    )
  );
}
export const makeRepository = <
  S extends Model.Any,
  Id extends keyof S["Type"] & keyof S["update"]["Type"] & keyof S["fields"],
>(
  Model: S,
  options: {
    readonly tableName: string;
    readonly spanPrefix: string;
    readonly idColumn: Id;
  }
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const idSchema = Model.fields[options.idColumn] as Schema.Top;
    const idColumn = options.idColumn as string;

    const insertSchema = SqlSchema.findOne({
      Request: Model.insert,
      Result: Model,
      execute: (request) =>
        sql.onDialectOrElse({
          mysql: () =>
            sql`insert into ${sql(options.tableName)} ${sql.insert(request as never)};
select * from ${sql(options.tableName)} where ${sql(idColumn)} = LAST_INSERT_ID();`.unprepared.pipe(
              Effect.map(([, results]) => results as never)
            ),
          orElse: () =>
            sql`insert into ${sql(options.tableName)} ${sql.insert(request as never).returning("*")}`,
        }),
    });
    const listSchema = SqlSchema.findAll({
      Request: Schema.Void,
      Result: Model,
      execute: () => sql`select * from ${sql(options.tableName)}`,
    });

    const listNonEmptySchema = SqlSchema.findNonEmpty({
      Request: Schema.Void,
      Result: Model,
      execute: () => sql`select * from ${sql(options.tableName)}`,
    });
    const updateFields = Object.keys((Model.update as S).fields);
    const excludeInsertFields = Object.keys((Model.insert as S).fields).filter(
      (key) => !updateFields.includes(key)
    ) as [];
    const upsertSchema = SqlSchema.void({
      Request: Model.insert as S["insert"],
      execute: (request: any) => {
        const [rawSql, params] = sql`insert into ${sql(
          options.tableName
        )} ${sql.insert(request)} on conflict (${sql(options.tableName)}.${sql(options.idColumn as string)}) do update set ${sql.update(
          request,
          [options.idColumn, ...excludeInsertFields]
        )}`.compile();
        return sql.withTransaction(sql.unsafe(rawSql, params));
      },
    });
    return {
      upsert: flow(
        upsertSchema,
        Effect.withSpan(
          `${options.spanPrefix}.upsert`,
          {},
          { captureStackTrace: false }
        )
      ),
      list: flow(
        listSchema,
        Effect.withSpan(
          `${options.spanPrefix}.list`,
          {},
          { captureStackTrace: false }
        )
      ),
      listNoEmpty: flow(
        listNonEmptySchema,
        Effect.withSpan(
          `${options.spanPrefix}.listNoEmpty`,
          {},
          { captureStackTrace: false }
        )
      ),
    } as const;
  });
