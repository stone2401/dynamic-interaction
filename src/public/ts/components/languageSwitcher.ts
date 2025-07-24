/**
 * 语言切换组件
 * 处理语言切换功能和UI更新
 */

import { i18nService, type SupportedLanguage } from '../services/i18n.js';
import { getElementById } from '../utils/dom.js';
import { eventBus, APP_EVENTS } from '../core/events.js';

class LanguageSwitcherComponent {
  private elements: {
    languageSwitcher?: HTMLElement;
    languageText?: HTMLElement;
  } = {};

  public initialize(): void {
    this.initializeElements();
    this.setupEventListeners();
    this.updateLanguageDisplay();
    this.setupI18nListener();
  }

  private initializeElements(): void {
    this.elements = {
      languageSwitcher: getElementById('language-switcher') || undefined,
      languageText: getElementById('language-text') || undefined,
    };
  }

  private setupEventListeners(): void {
    if (this.elements.languageSwitcher) {
      this.elements.languageSwitcher.addEventListener('click', () => {
        this.toggleLanguage();
      });
    }
  }

  private setupI18nListener(): void {
    i18nService.addLanguageChangeListener((lang: SupportedLanguage) => {
      this.updateLanguageDisplay();
      this.updateAllI18nElements();
      this.updateTitle();
      
      // 广播语言变化事件
      eventBus.emit(APP_EVENTS.LANGUAGE_CHANGED, { language: lang });
    });
  }

  private toggleLanguage(): void {
    i18nService.toggleLanguage();
  }

  private updateLanguageDisplay(): void {
    if (this.elements.languageText) {
      const currentLang = i18nService.getCurrentLanguage();
      this.elements.languageText.textContent = currentLang === 'zh-CN' ? '中' : 'En';
      
      // 更新 title 属性
      if (this.elements.languageSwitcher) {
        this.elements.languageSwitcher.title = i18nService.t('language.switch');
      }
    }
  }

  private updateTitle(): void {
    document.title = i18nService.t('title');
  }

  /**
   * 更新页面中所有带有 data-i18n 属性的元素
   */
  private updateAllI18nElements(): void {
    // 更新文本内容
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach((element) => {
      // 跳过标记为 data-i18n-skip 的节点
      if (element.hasAttribute('data-i18n-skip')) return;
      const key = element.getAttribute('data-i18n');
      if (key) {
        const text = i18nService.t(key);
        element.textContent = text;
      }
    });

    // 更新 placeholder 属性
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach((element) => {
      if (element.hasAttribute('data-i18n-skip')) return;
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) {
        const text = i18nService.t(key);
        element.setAttribute('placeholder', text);
      }
    });

    // 更新 title 属性
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach((element) => {
      if (element.hasAttribute('data-i18n-skip')) return;
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        const text = i18nService.t(key);
        element.setAttribute('title', text);
      }
    });
  }
}

export const languageSwitcherComponent = new LanguageSwitcherComponent();