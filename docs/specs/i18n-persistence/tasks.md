### 语言持久化与 SSR 默认语言 - 任务清单

- [x] **后端** 在 `src/config.ts` 新增 `DEFAULT_LANGUAGE` 配置
- [x] **文档** 更新 `docs/README-zh.md` 配置示例，加入 `DEFAULT_LANGUAGE` 变量说明
- [x] **后端** 若不存在 `/config` 路由，则创建简单 JSON API
- [x] **后端** 在 `src/server/core/app.ts` 渲染 `index.html` 时注入 `window.__DEFAULT_LANG__` 与 `<html lang>`
- [x] **前端** `src/public/ts/services/i18n.ts` 添加 `getInitialLang()` 并修改 `setLang` 逻辑
- [x] **前端** `core/app.ts` 启动时调用 `i18n.setLang(getInitialLang())`
- [x] **前端** 切换语言时写入 `localStorage`
- [ ] **测试** 手动测试：切换语言、刷新页面、首屏语言正确、无闪烁
