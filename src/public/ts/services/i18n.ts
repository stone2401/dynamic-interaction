/**
 * 国际化服务
 * 支持中英文切换，默认根据用户系统语言自动检测
 */

export interface LanguageData {
  title: string;
  status: {
    workspace: string;
    sessionId: string;
    sessionTimer: string;
    connectionStatus: {
      connected: string;
      disconnected: string;
      highLatency: string;
      reconnecting: string;
    };
    messageStatus: {
      idle: string;
      sending: string;
      waiting: string;
      received: string;
      timeout: string;
    };
    themeSwitch: string;
  };
  summary: {
    title: string;
  };
  feedback: {
    title: string;
    submitButton: string;
    textLabel: string;
    textPlaceholder: string;
    hints: {
      title: string;
      shortcut: string;
      pasteImage: string;
    };
    attachments: {
      title: string;
      dropZoneText: string;
      supportedFormats: string;
    };
    messages: {
      enterFeedback: string;
      feedbackSent: string;
      sendFailed: string;
      checkConnection: string;
      unsavedContent: string;
      loadingWorkspace: string;
      loadingSession: string;
      unknownDirectory: string;
      unknown: string;
      timeout: string;
    };
  };
  language: {
    switch: string;
    chinese: string;
    english: string;
  };
}

// 中文语言数据
const zhCN: LanguageData = {
  title: "交互式反馈系统",
  status: {
    workspace: "工作区：",
    sessionId: "会话ID：",
    sessionTimer: "会话剩余时间：",
    connectionStatus: {
      connected: "已连接",
      disconnected: "未连接",
      highLatency: "延迟高",
      reconnecting: "正在重连..."
    },
    messageStatus: {
      idle: "暂无新消息",
      sending: "正在发送...",
      waiting: "等待AI响应...",
      received: "已收到回复",
      timeout: "会话已超时"
    },
    themeSwitch: "切换主题"
  },
  summary: {
    title: "AI 工作摘要"
  },
  feedback: {
    title: "提供反馈",
    submitButton: "提交反馈",
    textLabel: "文字反馈",
    textPlaceholder: "请在这里输入您的指示或回复...",
    hints: {
      title: "小提示:",
      shortcut: "按 Ctrl+Enter (或 Cmd+Enter) 可快速提交",
      pasteImage: "支持 Ctrl+V (或 Cmd+V) 粘贴图片"
    },
    attachments: {
      title: "图片附件 (可选)",
      dropZoneText: "点击选择或拖拽图片到此处",
      supportedFormats: "支持 PNG, JPG, GIF, WebP 等格式"
    },
    messages: {
      enterFeedback: "请输入反馈文本或添加图片",
      feedbackSent: "反馈已发送",
      sendFailed: "发送失败，请检查连接",
      checkConnection: "请检查连接",
      unsavedContent: "您有未发送的内容，确定要离开吗？",
      loadingWorkspace: "加载中...",
      loadingSession: "加载中...",
      unknownDirectory: "未知目录",
      unknown: "未知",
      timeout: "超时"
    }
  },
  language: {
    switch: "切换语言",
    chinese: "中文",
    english: "English"
  }
};

// 英文语言数据
const enUS: LanguageData = {
  title: "Interactive Feedback System",
  status: {
    workspace: "Workspace:",
    sessionId: "Session ID:",
    sessionTimer: "Session Time Remaining:",
    connectionStatus: {
      connected: "Connected",
      disconnected: "Disconnected",
      highLatency: "High Latency",
      reconnecting: "Reconnecting..."
    },
    messageStatus: {
      idle: "No new messages",
      sending: "Sending...",
      waiting: "Waiting for AI response...",
      received: "Reply received",
      timeout: "Session timed out"
    },
    themeSwitch: "Switch Theme"
  },
  summary: {
    title: "AI Work Summary"
  },
  feedback: {
    title: "Provide Feedback",
    submitButton: "Submit Feedback",
    textLabel: "Text Feedback",
    textPlaceholder: "Please enter your instructions or reply here...",
    hints: {
      title: "Tips:",
      shortcut: "Press Ctrl+Enter (or Cmd+Enter) for quick submit",
      pasteImage: "Support Ctrl+V (or Cmd+V) to paste images"
    },
    attachments: {
      title: "Image Attachments (Optional)",
      dropZoneText: "Click to select or drag images here",
      supportedFormats: "Supports PNG, JPG, GIF, WebP and other formats"
    },
    messages: {
      enterFeedback: "Please enter feedback text or add images",
      feedbackSent: "Feedback sent",
      sendFailed: "Send failed, please check connection",
      checkConnection: "Please check connection",
      unsavedContent: "You have unsaved content, are you sure you want to leave?",
      loadingWorkspace: "Loading...",
      loadingSession: "Loading...",
      unknownDirectory: "Unknown directory",
      unknown: "Unknown",
      timeout: "Timeout"
    }
  },
  language: {
    switch: "Switch Language",
    chinese: "中文",
    english: "English"
  }
};

type SupportedLanguage = 'zh-CN' | 'en-US';

class I18nService {
  private currentLanguage: SupportedLanguage = 'zh-CN';
  private languages: Record<SupportedLanguage, LanguageData> = {
    'zh-CN': zhCN,
    'en-US': enUS
  };
  private listeners: Array<(lang: SupportedLanguage, data: LanguageData) => void> = [];

  constructor() {
    this.detectAndSetLanguage();
  }

  /**
   * 检测用户系统语言并设置默认语言
   */
  private detectAndSetLanguage(): void {
    // 优先读取 localStorage，其次读取 SSR 注入的默认语言，最后回退浏览器语言
    const savedLanguage = localStorage.getItem('app-language') as SupportedLanguage;
    const ssrDefault = (window as any).__DEFAULT_LANG__ as string | undefined;
    
    if (savedLanguage && this.languages[savedLanguage as SupportedLanguage]) {
      // 本地已保存偏好
      this.currentLanguage = savedLanguage as SupportedLanguage;
    } else if (ssrDefault && (ssrDefault === 'zh' || ssrDefault === 'en')) {
      // 服务器注入首选
      this.currentLanguage = ssrDefault === 'zh' ? 'zh-CN' : 'en-US';
    } else {
      // 检测浏览器语言
      const browserLanguage = navigator.language || navigator.languages?.[0] || 'en-US';
      
      if (browserLanguage.startsWith('zh')) {
        this.currentLanguage = 'zh-CN';
      } else {
        this.currentLanguage = 'en-US';
      }
    }
  }

  /**
   * 获取当前语言代码
   */
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 获取当前语言的所有文本数据
   */
  public getLanguageData(): LanguageData {
    return this.languages[this.currentLanguage];
  }

  /**
   * 获取指定路径的文本
   */
  public t(path: string): string {
    const data = this.getLanguageData();
    const keys = path.split('.');
    let result: any = data;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        console.warn(`I18n key not found: ${path}`);
        return path;
      }
    }
    
    return typeof result === 'string' ? result : path;
  }

  /**
   * 切换语言
   */
  public switchLanguage(language: SupportedLanguage): void {
    if (!this.languages[language]) {
      console.warn(`Unsupported language: ${language}`);
      return;
    }

    this.currentLanguage = language;
    localStorage.setItem('app-language', language);
    
    // 更新 HTML lang 属性
    document.documentElement.lang = language;
    
    // 通知所有监听器
    this.notifyListeners();
  }

  /**
   * 切换到下一个语言
   */
  public toggleLanguage(): void {
    const languages = Object.keys(this.languages) as SupportedLanguage[];
    const currentIndex = languages.indexOf(this.currentLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    this.switchLanguage(languages[nextIndex]);
  }

  /**
   * 添加语言变化监听器
   */
  public addLanguageChangeListener(listener: (lang: SupportedLanguage, data: LanguageData) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除语言变化监听器
   */
  public removeLanguageChangeListener(listener: (lang: SupportedLanguage, data: LanguageData) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器语言已变化
   */
  private notifyListeners(): void {
    const data = this.getLanguageData();
    this.listeners.forEach(listener => {
      try {
        listener(this.currentLanguage, data);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });
  }

  /**
   * 获取所有支持的语言列表
   */
  public getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
    return [
      { code: 'zh-CN', name: this.languages['zh-CN'].language.chinese },
      { code: 'en-US', name: this.languages['en-US'].language.english }
    ];
  }
}

export const i18nService = new I18nService();

// 获取初始语言，供应用启动时使用
export function getInitialLang(): SupportedLanguage {
  return i18nService.getCurrentLanguage();
}

export type { SupportedLanguage };