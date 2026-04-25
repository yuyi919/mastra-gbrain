import { Context } from "@yuyi919/tslibs-effect/effect-next";
import type { BrainStoreService } from "../../BrainStore.js";

export interface BrainStoreCompatService extends BrainStoreService {}

export class BrainStoreCompat extends Context.Service<
  BrainStoreCompat,
  BrainStoreCompatService
>()("@yui-agent/brain-mastra/BrainStoreTree/compat") {}
