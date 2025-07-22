# Web Notifications API 使用指南

## 功能概述

Web Notifications API 功能允许系统在用户浏览器标签页不活跃时，通过浏览器通知机制提醒用户有新的消息。目前支持两种类型的通知：

1. **AI通知（notification）**：单向通知，告知用户AI的工作进展或状态更新。
2. **会话请求（session_request）**：交互式会话请求，需要用户提供反馈或输入。

## 使用前提

- 用户的浏览器必须支持 Web Notifications API（大多数现代浏览器都支持）
- 用户必须授予网站显示通知的权限

## 权限管理

### 权限状态

通知权限有三种状态：

- **default（默认）**：用户尚未做出选择
- **granted（已授权）**：用户已允许显示通知
- **denied（已拒绝）**：用户已拒绝显示通知

### 权限请求流程

1. 系统会在WebSocket连接建立后自动检查通知权限状态
2. 如果权限状态为"default"，系统会自动请求权限
3. 用户可以选择"允许"或"阻止"通知
4. 用户的选择将被浏览器记住，除非用户在浏览器设置中更改

## 通知行为

### 触发条件

通知仅在以下条件同时满足时显示：

1. 用户已授予通知权限
2. 浏览器标签页不活跃（用户切换到了其他标签页或应用程序）
3. 收到了notification或session_request类型的消息

### 通知内容

- **AI通知**：显示带有AI图标的通知，包含消息摘要（最多150字符）
- **会话请求**：显示带有交互图标的通知，包含会话请求摘要（最多150字符）

### 通知交互

- 点击通知：将焦点返回到应用页面
- 通知会在指定时间后自动关闭（默认为5秒）

## 开发者配置选项

通知相关配置位于`src/public/ts/config.ts`文件中的`NotificationConfig`对象：

```typescript
export const NotificationConfig = {
  // 通知图标
  icons: {
    aiNotification: '/images/ai-icon.png',
    sessionRequest: '/images/interactive-icon.png'
  },
  // 通知显示时间（毫秒）
  displayTime: 5000,
  // 内容最大长度
  maxContentLength: 150,
  // 通知标题
  titles: {
    aiNotification: 'AI通知',
    sessionRequest: '交互请求'
  },
  // 通知选项
  options: {
    requireInteraction: false, // 是否需要用户交互才关闭
    silent: false // 是否静音
  }
};
```

## 浏览器兼容性

- **完全支持**：Chrome, Firefox, Edge, Opera, Safari
- **不支持**：IE
- **HTTP环境支持**：本实现支持在HTTP环境下使用通知功能（大多数浏览器允许）

## 常见问题

### 通知不显示？

1. 检查浏览器是否支持Web Notifications API
2. 确认已授予通知权限（可在浏览器设置中查看和修改）
3. 确认标签页处于非活跃状态（切换到其他标签页）
4. 检查浏览器是否启用了"勿扰模式"或类似功能

### 如何更改通知权限？

1. 在Chrome中：点击地址栏左侧的锁图标 > 网站设置 > 通知
2. 在Firefox中：点击地址栏左侧的锁图标 > 连接安全 > 更多信息 > 权限
3. 在Safari中：偏好设置 > 网站 > 通知

### 通知显示但无法点击？

某些操作系统的通知中心可能会影响通知的交互行为。尝试在系统通知设置中调整相关选项。

## 安全考虑

- 通知中不包含敏感信息，仅显示摘要
- 支持HTTP和HTTPS环境下的通知功能
- 用户可以随时在浏览器设置中撤销通知权限
