import type * as Eff from "@yuyi919/tslibs-effect/effect-next";
import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type {
  Page,
  PageFilters,
  PageInput,
  PageVersion,
} from "../../../../types.js";
import type { PutReturning } from "../../../BrainStore.js";
import type { StoreError } from "../../../BrainStoreError.js";

export type EngineEffect<T> = Eff.Effect<T, StoreError>;

export interface ContentPagesService {
  getPage(slug: string): EngineEffect<Page | null>;
  listPages(filters?: PageFilters): EngineEffect<Page[]>;
  resolveSlugs(partial: string): EngineEffect<string[]>;
  getTags(slug: string): EngineEffect<string[]>;
  createVersion(slug: string): EngineEffect<PutReturning<PageVersion>>;
  getVersions(slug: string): EngineEffect<PageVersion[]>;
  revertToVersion(slug: string, versionId: number): EngineEffect<void>;
  putPage(slug: string, page: PageInput): EngineEffect<PutReturning<Page>>;
  updateSlug(oldSlug: string, newSlug: string): EngineEffect<void>;
  deletePage(slug: string): EngineEffect<void>;
  addTag(slug: string, tag: string): EngineEffect<void>;
  removeTag(slug: string, tag: string): EngineEffect<void>;
}

export class ContentPages extends Context.Service<
  ContentPages,
  ContentPagesService
>()("@yui-agent/brain-mastra/BrainStoreTree/content/pages") {}
