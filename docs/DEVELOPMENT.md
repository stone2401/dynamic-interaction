# Dynamic Interaction 开发规范

## 🎯 核心原则

### 1. 不破坏现有架构
- ❌ **禁止修改项目的分层架构设计**
- ❌ **禁止修改 MCP 协议实现方式**
- ❌ **禁止破坏 WebSocket 通信机制**
- ❌ **禁止修改双 TypeScript 配置**

### 2. 保持代码一致性
- ✅ **遵循现有的命名规范**（camelCase 文件名，PascalCase 类名）
- ✅ **使用中文注释**提高团队理解
- ✅ **保持现有的导入导出结构**
- ✅ **使用项目既定的设计模式**（单例、事件总线等）

### 3. 类型安全优先
- ✅ **严格使用 TypeScript 类型**，避免 `any`
- ✅ **所有公共 API 都要有类型定义**
- ✅ **使用类型守卫进行运行时检查**
- ✅ **处理所有可能的 null/undefined 情况**

## 🚫 严格禁止

### 代码修改禁忌
```typescript
// ❌ 禁止
function badCode(data: any): any {
  return data.whatever;
}

// ✅ 正确
function goodCode(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as any).value);
  }
  throw new Error('数据格式不正确');
}
```

### 架构修改禁忌
- ❌ 删除或重命名核心文件
- ❌ 修改 `package.json` 的基础配置
- ❌ 破坏现有的模块导入关系
- ❌ 引入不必要的第三方依赖

## 📝 快速检查清单

### 提交前必检
- [ ] 代码能正常编译 (`pnpm run build`)
- [ ] 遵循了现有的命名规范
- [ ] 没有使用 `any` 类型
- [ ] 添加了必要的错误处理
- [ ] 没有破坏现有功能

### 文件组织
```
src/
├── mcp/           # MCP协议 - 不要随意修改
├── server/        # 后端服务 - 保持分层结构
├── public/ts/     # 前端代码 - 保持组件化
├── types/         # 类型定义 - 严格类型安全
└── utils/         # 工具函数 - 保持简洁
```

## 💡 最佳实践

### 组件开发
```typescript
// ✅ 标准组件结构
class MyComponent {
  private elements: { button?: HTMLElement } = {};
  private state = { isActive: false };
  
  public initialize(): void {
    this.initializeElements();
    this.setupEventListeners();
  }
  
  private initializeElements(): void {
    this.elements.button = getElementById('my-button');
  }
  
  private setupEventListeners(): void {
    eventBus.on(APP_EVENTS.SOME_EVENT, this.handleEvent.bind(this));
  }
}
```

### 错误处理
```typescript
// ✅ 标准错误处理
try {
  await someOperation();
  logger.info('操作成功');
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error('操作失败:', error);
  }
  throw error;
}
```

## 🆘 问题解决

### 遇到问题时
1. **查看 `CLAUDE.md`** - 项目配置和说明
2. **参考现有代码** - 理解实现方式
3. **最小化修改** - 用最少的改动解决问题
4. **测试完整性** - 确保不影响其他功能

### 紧急情况
- 系统无法启动 → 优先恢复基础功能
- 功能异常 → 定位根源，针对性修复
- 性能问题 → 分析瓶颈，渐进式优化

---

**核心原则：一致性比完美更重要。不确定时，保持与现有代码的一致性。**