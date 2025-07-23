/**
 * 应用配置常量
 */

export const WEBSOCKET_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  INITIAL_RECONNECT_DELAY: 2000,
  MAX_RECONNECT_DELAY: 10000,
} as const;

export const NOTIFICATION_CONFIG = {
  AUTO_CLOSE_DELAY: 10000,
  MAX_TEXT_LENGTH: 100,
  MAX_SUMMARY_LENGTH: 80,
} as const;

export const UI_CONFIG = {
  SESSION_TIMEOUT_DEFAULT: 300,
  PING_INTERVAL: 10000,
} as const;

export const THEME_CONFIG = {
  STORAGE_KEY: 'app-theme',
  DEFAULT_THEME: 'light',
  THEMES: ['light', 'dark'] as const,
} as const;