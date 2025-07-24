## 设计方案：语言切换后保持状态栏动态数据

### 背景
切换中/英文时，`LanguageSwitcherComponent.updateAllI18nElements()` 会遍历所有带有 `data-i18n` 属性的节点并直接覆盖 `textContent`。状态栏中的动态数值节点（工作区目录、会话 ID、连接状态、延迟等）同时也被覆盖，导致 UI 被还原为初始占位文本。

### 解决思路
1. **引入忽略标记**：
   * 约定 `data-i18n-skip` 属性用于标记不应由语言切换逻辑覆盖的节点。
   * 仅当节点未声明 `data-i18n-skip` 时才执行文本替换。
2. **标记动态节点**：
   * 在 `index.html` 和/或 `StatusBarComponent.initializeElements()` 中，为动态数值节点添加 `data-i18n-skip` 属性，防止被覆盖。
3. **复用现有逻辑**：
   * 保持 `data-i18n` 语义不变，新增忽略标记不会影响现有静态文案替换。
4. **回归测试**：
   * 切换语言前后，观察状态栏动态数值保持不变。
   * 连接状态、延迟定时更新过程中切换语言，确保数值实时刷新且不重置。

### 受影响文件
- `src/public/ts/components/languageSwitcher.ts`
- `src/public/ts/components/statusBar.ts`（仅添加属性或初始化标记）
- `src/public/index.html`（如需直接在模板中加属性）

### 向后兼容性
- `data-i18n-skip` 为新增可选属性，不影响现有功能。
- 若节点未添加此属性，则维持原先自动翻译行为。
