* [x] `spec.md` 明确要求：`libsql.ts` 不直接导入 `"drizzle-orm"`

* [x] `tasks.md` 覆盖盘点、迁移、替换、验证四个阶段

* [x] `SqlBuilder.ts` 覆盖 `libsql.ts` 所需的全部 Drizzle 构建职责

* [x] `SqlBuilder.ts` 不包含任何 `async/await` 语法

* [x] `libsql.ts` 仅负责执行与映射，不含内联 Drizzle 构建表达式

* [x] `libsql.ts` 不存在 `from "drizzle-orm"` 导入

* [x] 相关类型检查与测试通过（至少 `test/libsql.test.ts`）

