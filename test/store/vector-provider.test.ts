import { describe, expect } from "bun:test";
import * as BunTester from "@yuyi919/tslibs-effect/BunTester";
import * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Layer, ManagedRuntime } from "effect";
import {
  makeNoopVectorProvider,
  makeVectorProvider,
  makeLayer as makeVectorProviderLayer,
  VectorProvider,
  type VectorProviderService,
} from "../../src/store/brainstore/ops/vector/index.js";

function makeFakeVectorClient() {
  const calls: { method: string; input?: unknown }[] = [];
  return {
    calls,
    client: {
      query: (input: {
        indexName: string;
        queryVector: number[];
        topK: number;
        filter?: Record<string, unknown>;
      }) => {
        calls.push({ method: "query", input });
        return Promise.resolve([
          {
            id: "alpha::0",
            score: 0.9,
            metadata: { slug: "alpha", chunk_index: 0 },
          },
        ]);
      },
      upsert: (input: {
        indexName: string;
        vectors: number[][];
        ids: string[];
        metadata: Record<string, unknown>[];
      }) => {
        calls.push({ method: "upsert", input });
        return Promise.resolve(input.ids);
      },
      deleteVectors: (input: {
        indexName: string;
        ids?: string[];
        filter?: Record<string, unknown>;
      }) => {
        calls.push({ method: "deleteVectors", input });
        return Promise.resolve();
      },
      createIndex: (input: { indexName: string; dimension: number }) => {
        calls.push({ method: "createIndex", input });
        return Promise.resolve();
      },
      dispose: () => {
        calls.push({ method: "dispose" });
        return Promise.resolve();
      },
    },
  };
}

describe("VectorProvider", () => {
  BunTester.it.effect(
    "supports direct service injection with Layer.succeed",
    () => {
      const service: VectorProviderService = VectorProvider.of({
        query: () => Eff.succeed([{ id: "direct", score: 1, metadata: {} }]),
        upsert: () => Eff.void,
        deleteVectors: () => Eff.void,
        createIndex: () => Eff.void,
        dispose: () => Eff.void,
      });

      return Eff.gen(function* () {
        const runtime = ManagedRuntime.make(
          Layer.succeed(VectorProvider, service)
        );
        const results = yield* Eff.promise(() =>
          runtime.runPromise(
            VectorProvider.use((provider) =>
              provider.query({
                indexName: "idx",
                queryVector: [0.1],
                topK: 1,
              })
            )
          )
        );
        expect(results.map((result) => result.id)).toEqual(["direct"]);
      });
    }
  );

  BunTester.it.effect(
    "delegates live operations to a supplied vector client",
    () => {
      const fake = makeFakeVectorClient();
      const provider = makeVectorProvider({
        vectorStore: fake.client,
        disposeVector: fake.client.dispose,
      });

      return Eff.gen(function* () {
        const queryResults = yield* provider.query({
          indexName: "idx",
          queryVector: [0.1, 0.2],
          topK: 2,
          filter: { slug: { $eq: "alpha" } },
        });
        yield* provider.upsert({
          indexName: "idx",
          vectors: [[0.1, 0.2]],
          ids: ["alpha::0"],
          metadata: [
            {
              slug: "alpha",
              title: "Alpha",
              type: "concept",
              chunk_index: 0,
              chunk_source: "compiled_truth",
              chunk_text: "alpha",
              token_count: 1,
            },
          ],
        });
        yield* provider.deleteVectors({
          indexName: "idx",
          filter: { slug: { $eq: "alpha" } },
        });
        yield* provider.createIndex({ indexName: "idx", dimension: 2 });
        yield* provider.dispose();

        expect(queryResults[0]?.id).toBe("alpha::0");
        expect(fake.calls.map((call) => call.method)).toEqual([
          "query",
          "upsert",
          "deleteVectors",
          "createIndex",
          "dispose",
        ]);
      });
    }
  );

  BunTester.it.effect("uses noop behavior when no vector client exists", () => {
    const provider = makeNoopVectorProvider();

    return Eff.gen(function* () {
      expect(
        yield* provider.query({
          indexName: "idx",
          queryVector: [0.1],
          topK: 5,
        })
      ).toEqual([]);
      yield* provider.upsert({
        indexName: "idx",
        vectors: [[0.1]],
        ids: ["alpha::0"],
        metadata: [],
      });
      yield* provider.deleteVectors({ indexName: "idx", ids: ["alpha::0"] });
      yield* provider.createIndex({ indexName: "idx", dimension: 1 });
      yield* provider.dispose();
    });
  });

  BunTester.it.effect("builds a live provider through makeLayer", () => {
    const fake = makeFakeVectorClient();
    const runtime = ManagedRuntime.make(
      makeVectorProviderLayer({
        vectorStore: fake.client,
        disposeVector: fake.client.dispose,
      })
    );

    return Eff.gen(function* () {
      yield* Eff.promise(() =>
        runtime.runPromise(
          VectorProvider.use((provider) =>
            provider.createIndex({ indexName: "idx", dimension: 2 })
          )
        )
      );
      expect(fake.calls.map((call) => call.method)).toEqual(["createIndex"]);
    });
  });
});
