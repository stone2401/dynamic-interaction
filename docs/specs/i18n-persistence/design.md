### 设计概览
本设计文档基于已批准的需求（语言偏好持久化 + SSR 默认语言），描述后端与前端的改动方案。

---

#### 1. 配置层 (Backend)
| 位置 | 变更 |
|------|------|
| `src/config.ts` | 新增 `DEFAULT_LANGUAGE` 常量，读取 `process.env.DEFAULT_LANGUAGE`，默认 `zh` |
| `docs/README-zh.md` | 示例配置增加 `DEFAULT_LANGUAGE` 说明 |
| `src/server/core/app.ts` | 在渲染首屏 HTML 时，通过模板变量注入 `defaultLang` 值 |

#### 2. API 层 (Backend)
若前端已有 `/config` 或等效接口，则响应体扩展：
```jsonc
{
  "defaultLanguage": "zh"
}
```
若无，则在 `src/server/core/app.ts` 中添加简单 `/config` JSON 路由。

#### 3. SSR 注入 (Backend → Frontend)
1. 在服务器渲染 `index.html` 时，通过 string replace 或模板引擎注入：
   ```html
   <script>window.__DEFAULT_LANG__ = "zh";</script>
   ```
2. 同时将 `<html lang="zh">` 语言属性同步。

#### 4. 前端初始化流程
文件：`src/public/ts/services/i18n.ts`
1. `getInitialLang()`
   ```ts
   export function getInitialLang(): Lang {
     return localStorage.getItem('preferredLanguage') as Lang
         ?? (window as any).__DEFAULT_LANG__
         ?? 'zh';
   }
   ```
2. 应用启动 (`core/app.ts`) 调用 `i18n.setLang(getInitialLang())`。

#### 5. 语言切换逻辑
1. 切换按钮点击后：
   - 调用 `i18n.setLang(newLang)`
   - `localStorage.setItem('preferredLanguage', newLang)`
2. 页面刷新后读取 `localStorage`。

#### 6. 无闪烁保障
1. SSR 已设置 `<html lang>` 与 `window.__DEFAULT_LANG__`，首屏即为正确语言。
2. SPA 脚本加载后会读取相同语言，不会发生重新渲染闪烁。

#### 7. 回退策略
- 如 `localStorage` 键损坏或非法值，则使用 `window.__DEFAULT_LANG__`。
- 如后端未注入，则回退到硬编码 `zh`。
