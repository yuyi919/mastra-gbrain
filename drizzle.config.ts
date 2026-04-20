//drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/store/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./tmp/cache/base.db",
  },
  casing: "snake_case",
  introspect: {
    casing: "preserve",
  },
});
