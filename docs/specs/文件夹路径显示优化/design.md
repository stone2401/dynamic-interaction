# 设计方案：文件夹路径显示优化

## 总览
通过CSS样式调整实现文件夹路径的右对齐显示效果，当路径过长时自动隐藏前面部分，优先显示文件夹名称和最近的目录层级。

## 系统流程
1. 用户界面加载时显示工作区路径
2. CSS样式自动处理长路径的显示逻辑
3. 用户可通过悬停查看完整路径

## 模块结构与职责

### PathDisplayOptimizer
- **使用路径**：`src/public/css/components/status-bar.css`
- **主要功能**：
  - 实现路径文本的右对齐显示
  - 处理文本溢出时的省略效果
  - 提供悬停时的完整路径显示
- **异常处理**：无特殊异常处理需求
- **配置方式**：通过CSS类选择器配置

### ResponsivePathDisplay
- **使用路径**：`src/public/css/components/status-bar.css`
- **主要功能**：
  - 在不同屏幕尺寸下保持路径显示的一致性
  - 调整移动设备上的路径显示效果
- **异常处理**：通过媒体查询处理不同设备适配
- **配置方式**：通过CSS媒体查询配置

## 技术实现方案
使用CSS的`direction: rtl`和`text-align: right`属性组合，实现文本从右到左的显示效果，配合`text-overflow: ellipsis`在左侧显示省略号。

所有设计内容追踪至 Requirement R1（路径显示优化）和 Requirement R2（响应式适配）。