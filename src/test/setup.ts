// mp-zhiming/src/test/setup.ts · vitest 全局初始化（M17）
// Taro runtime 在 happy-dom 环境期望全局变量 ENABLE_*
// （dom-external/index.ts 模块顶层 if 引用，未声明即 ReferenceError）
const g = globalThis as Record<string, unknown>
g.ENABLE_INNER_HTML = true
g.ENABLE_ADJACENT_HTML = true
g.ENABLE_CLONE_NODE = true
g.ENABLE_CONTAINS = true
g.ENABLE_SIZE_APIS = true
g.ENABLE_TEMPLATE_CONTENT = true
g.process = g.process ?? { env: { TARO_PLATFORM: "h5" } }

// vitest 启用 global 自动 mock（见 vitest.config.ts `globals: true`）
// 必须在 import 之前用 vi.mock 让 Taro 不在 happy-dom 跑真实 init
// (ESM/CJS 兼容问题：module.exports.default = module.exports 在 strict mode 报 TypeError)
// 实际 mock 在各 *.test.ts 顶部按需用 vi.mock("@tarojs/taro", ...) 覆盖
