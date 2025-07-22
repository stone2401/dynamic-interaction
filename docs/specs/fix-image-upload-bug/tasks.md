# 任务分解: 修复图片上传缺失 `mimeType` 错误

- [x] 1. 创建 Image Transformer 工具模块 _Requirements: R1, R2, R3_ _Design: Image Transformer_
  - 实现 `extractMimeType` 函数
  - 实现 `normalizeImageFeedback` 函数
  - 添加单元测试（若测试框架已配置）

- [x] 2. 更新类型定义 _Requirements: R1_ _Design: MCP Callback_
  - 在 `types/feedback.ts` 中新增 `mimeType?: string | string[]` 字段（向后兼容）

- [x] 3. 修改 `src/mcp/index.ts` 回调逻辑 _Requirements: R1, R2_ _Design: MCP Callback_
  - 引入 `normalizeImageFeedback`
  - 将图片数据转换为 `{ type: 'image', data, mimeType }`
  - 处理数组和单值两种情况

- [x] 4. 更新日志输出 _Requirements: R3_ _Design: MCP Callback_
  - 增加解析成功、默认 MIME 回退的日志

- [x] 5. 文档与自测 _Requirements: R1, R2, R3_ _Design: 全局_
  - 确认 `requirements.md`, `design.md` 与实现一致
  - 本地跑 lint / 单元测试确保通过
