# 实施计划

- [x] 1. 设置项目结构和依赖管理
  - 在 package.json 中添加 Electron 作为可选依赖
  - 创建 src/electron/ 目录结构
  - 更新 TypeScript 配置以支持 Electron 编译
  - _需求: 4.1, 4.4_

- [x] 2. 实现核心配置管理
  - 在 config.ts 中添加 ELECTRON_CONFIG 配置对象
  - 添加环境变量解析逻辑（UI_MODE, ELECTRON_WINDOW_WIDTH, ELECTRON_WINDOW_HEIGHT）
  - 实现配置验证和默认值设置
  - _需求: 1.1, 1.2, 1.3, 5.1, 5.2_

- [x] 3. 创建 Electron 主进程核心组件
- [x] 3.1 实现 WindowManager 类
  - 创建 src/electron/window-manager.ts
  - 实现窗口创建、管理和事件处理逻辑
  - 配置安全的 webPreferences（禁用 nodeIntegration，启用 contextIsolation）
  - 实现窗口焦点管理和生命周期控制
  - 添加安全的导航和窗口打开限制
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.2 实现 LifecycleManager 类
  - 创建 src/electron/lifecycle.ts
  - 处理应用启动、关闭和窗口生命周期事件
  - 实现优雅的进程终止逻辑
  - _需求: 3.1, 3.2, 3.4, 3.5_

- [x] 3.3 创建 Electron 主进程入口
  - 创建 src/electron/main.ts
  - 集成 WindowManager 和 LifecycleManager
  - 实现应用单例模式防止多实例运行
  - _需求: 3.3_

- [x] 4. 实现预加载脚本和安全层
  - 创建 src/electron/preload.ts
  - 实现安全的 IPC 通信接口
  - 确保渲染进程无法直接访问 Node.js API
  - _需求: 2.2, 2.3, 2.4_

- [x] 5. 创建 ElectronLauncher 服务
  - 创建 src/electron/launcher.ts
  - 实现 Electron 应用启动、状态检查和关闭逻辑
  - 添加错误处理和回退机制
  - 实现动态导入以避免在浏览器模式下加载 Electron
  - _需求: 4.1, 4.2, 4.3_

- [x] 6. 修改 MCP 交互逻辑
  - 更新 src/mcp/solicit-input.ts 添加 UI 模式检测
  - 实现 Electron 和浏览器模式的条件启动逻辑
  - 保持现有浏览器模式的完整功能
  - 添加 Electron 不可用时的优雅降级
  - _需求: 1.1, 1.2, 1.3, 1.4, 4.1, 4.3_

- [x] 7. 实现窗口焦点和注意力管理
  - 在 WindowManager 中添加窗口焦点控制方法
  - 实现交互需要注意时的窗口前置逻辑
  - 处理窗口失去焦点但保持可见的场景
  - _需求: 5.4, 5.5_

- [x] 8. 添加多会话支持和实例复用
  - 修改 ElectronLauncher 以支持会话复用
  - 实现多个交互会话共享同一 Electron 实例的逻辑
  - 确保会话完成后的适当清理
  - _需求: 3.2, 3.3_

- [x] 9. 实现错误处理和日志集成
  - 在所有 Electron 组件中添加错误处理逻辑
  - 集成现有的 Winston 日志系统
  - 添加 Electron 特定的错误类型和消息
  - 实现用户友好的错误提示
  - _需求: 4.1, 4.2, 4.3_

- [x] 10. 更新构建系统
  - 修改 package.json 构建脚本以包含 Electron 编译
  - 更新 TypeScript 配置以正确处理 Electron 模块
  - 确保构建输出包含所有必要的 Electron 文件
  - _需求: 4.4_

- [ ] 11. 编写单元测试
  - 为 WindowManager 创建单元测试
  - 为 LifecycleManager 创建单元测试
  - 为 ElectronLauncher 创建单元测试
  - 为配置解析逻辑创建测试
  - _需求: 所有需求的测试覆盖_

- [ ] 12. 编写集成测试
  - 创建 Electron 应用启动和关闭的集成测试
  - 测试浏览器模式和 Electron 模式之间的切换
  - 测试 WebSocket 连接在 Electron 环境中的工作
  - 测试多会话处理逻辑
  - _需求: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

- [x] 13. 创建文档和使用指南
  - 更新 README.md 包含 Electron 模式的说明
  - 创建 Electron 安装和配置指南
  - 添加环境变量配置示例
  - 创建故障排除文档
  - _需求: 6.1, 6.2, 6.3, 6.4_