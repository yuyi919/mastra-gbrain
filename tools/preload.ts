import { plugin } from "bun";
import UnpluginTypia from "@typia/unplugin/bun";

plugin(
  UnpluginTypia({
    /* options */
    log: true,
    cache: true,
  })
);