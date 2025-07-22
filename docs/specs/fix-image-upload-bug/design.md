# 设计文档: 修复图片上传缺失 `mimeType` 错误

## 1. 概述
本次改动旨在确保 **solicit-input** 工具返回的图片对象包含 `mimeType` 字段，满足 MCP SDK 对图片格式的校验要求，消除 "image data or mimeType is missing" 报错。

## 2. 系统架构
```
MCP Tool Callback (src/mcp/index.ts)
└─> Image Transformer (NEW: src/utils/image.ts)
    ├─ extractMimeType(base64): string
    └─ normalizeImageFeedback(raw): { data: string; mimeType: string }
```

## 3. 模块设计

### 3.1 Image Transformer (`src/utils/image.ts`)  // 实现 R1, R2, R3
* **职责**: 解析前端传回的 base64 字符串，提取或补全 `mimeType` 并返回统一格式。
* **主要函数**:
  * `extractMimeType(base64: string): string` – 利用正则匹配 `data:image/<ext>;base64,` 头部，返回对应 MIME 类型；若未匹配返回 `image/png`。
  * `normalizeImageFeedback(raw: string): { data: string; mimeType: string }` – 去除 `data:*;base64,` 前缀，仅保留实际 base64 数据，并返回对象。
* **错误处理 & 日志**:
  * 若 `raw` 空值抛出 `Error('EMPTY_IMAGE_DATA')` 并记录 `logger.error`。
  * 未识别 MIME 时使用默认值并 `logger.warn`。

### 3.2 MCP Callback 修改 (`src/mcp/index.ts`)  // 实现 R1, R2, R3
* 在生成 `content` 数组时调用 `normalizeImageFeedback`，生成 `{ type: 'image', data, mimeType }` 对象。
* 支持单图与多图数组。
* 与现有逻辑解耦：文本 & 命令输出处理维持不变。

## 4. 依赖关系
* 无新增第三方依赖，使用内置 `RegExp` 进行解析。

## 5. 日志策略
* `logger.debug` 记录收到的原始 `imageData` 长度。
* `logger.info` 记录转换成功及输出 MIME 类型。
* `logger.warn` 当 MIME 无法解析时输出默认 MIME 提示。

## 6. 回滚方案
如出现兼容问题，可在 `mcp/index.ts` 中回退到旧逻辑（仅 `data` 字段），同时关闭校验开关（不推荐）。
