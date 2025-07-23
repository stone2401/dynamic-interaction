/**
 * DOM 操作工具函数
 */

/**
 * 安全获取DOM元素
 */
export function getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * 安全获取DOM元素，如果不存在则抛出错误
 */
export function requireElementById<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = getElementById<T>(id);
  if (!element) {
    throw new Error(`Required element with id '${id}' not found`);
  }
  return element;
}

/**
 * 创建带类名的元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

/**
 * 添加事件监听器的便捷方法
 */
export function addEventListeners<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  events: Partial<Record<K, (event: HTMLElementEventMap[K]) => void>>
): void {
  Object.entries(events).forEach(([eventType, handler]) => {
    if (handler) {
      element.addEventListener(eventType, handler as EventListener);
    }
  });
}