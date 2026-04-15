import { defineConfig } from "tsup";
import UnpluginTypia from "@typia/unplugin/esbuild";
export default defineConfig({
  entry: ["./src/**/*", "!**/*.test.ts"],
  outDir: "dist",
  format: ["esm"],
  platform: "neutral",
  dts: false,
  clean: false,
  esbuildOptions: (options) => {
    options.ignoreAnnotations = false;
    options.minify = false;
    options.target = "esnext";
  },
  esbuildPlugins: [
    UnpluginTypia({ cache: true, enforce: "post", log: true }),
  ],
  onSuccess: "pnpm build:dts",
  bundle: false,
  skipNodeModulesBundle: true,
});
