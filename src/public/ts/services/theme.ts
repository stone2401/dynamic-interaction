/**
 * 主题服务模块
 * 处理应用主题切换和保存
 */

import { THEME_CONFIG } from '../config/constants.js';
import { eventBus, APP_EVENTS } from '../core/events.js';
import { getElementById } from '../utils/dom.js';

type Theme = typeof THEME_CONFIG.THEMES[number];

class ThemeService {
  private static instance: ThemeService;
  private currentTheme: Theme = THEME_CONFIG.DEFAULT_THEME as Theme;

  private constructor() {
    this.loadTheme();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  public initializeThemeSwitcher(): void {
    const themeSwitcher = getElementById('theme-switcher');
    const sunIcon = document.querySelector('.theme-icon-sun') as HTMLElement;
    const moonIcon = document.querySelector('.theme-icon-moon') as HTMLElement;

    if (!themeSwitcher || !sunIcon || !moonIcon) {
      console.error('Theme switcher elements not found!');
      return;
    }

    themeSwitcher.addEventListener('click', () => {
      this.toggleTheme();
    });

    this.applyTheme(this.currentTheme);
  }

  public toggleTheme(): void {
    const newTheme: Theme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  public setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(theme);
    eventBus.emit(APP_EVENTS.THEME_CHANGED, theme);
  }

  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;
    const sunIcon = document.querySelector('.theme-icon-sun') as HTMLElement;
    const moonIcon = document.querySelector('.theme-icon-moon') as HTMLElement;

    if (!sunIcon || !moonIcon) return;

    if (theme === 'light') {
      body.classList.add('light-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'inline-block';
    } else {
      body.classList.remove('light-theme');
      sunIcon.style.display = 'inline-block';
      moonIcon.style.display = 'none';
    }

    // Re-render Lucide icons
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(THEME_CONFIG.STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

    if (savedTheme && THEME_CONFIG.THEMES.includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else if (prefersDark) {
      this.currentTheme = 'dark';
    } else {
      this.currentTheme = 'light';
    }
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme);
  }
}

export const themeService = ThemeService.getInstance();

// 扩展全局 Window 接口
declare global {
  interface Window {
    lucide?: any;
  }
}