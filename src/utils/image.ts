/**
 * 图片工具模块
 * 负责解析 base64 字符串中的 MIME 类型，并统一格式化为
 * { data: string; mimeType: string } 结构。
 */
import { logger } from '../logger';

/**
 * 从 base64 字符串提取 MIME 类型。
 * @param base64 含或不含 `data:*;base64,` 前缀的字符串
 * @returns MIME 类型字符串，默认 `image/png`
 */
export function extractMimeType(base64: string): string {
  const match = /^data:(.*?);base64,/i.exec(base64);
  if (match && match[1]) {
    return match[1];
  }
  logger.warn('无法解析 MIME 类型，使用默认 image/png');
  return 'image/png';
}

/**
 * 规范化图片反馈，去除前缀并补全 MIME。
 * @param raw 原始 base64 字符串
 */
export function normalizeImageFeedback(raw: string): { data: string; mimeType: string } {
  if (!raw) throw new Error('EMPTY_IMAGE_DATA');

  const mimeType = extractMimeType(raw);
  // 移除 data:*;base64, 前缀
  const data = raw.replace(/^data:.*?;base64,/, '');

  logger.info(`图片已解析，mimeType=${mimeType}，长度=${data.length}`);
  return { data, mimeType };
}
