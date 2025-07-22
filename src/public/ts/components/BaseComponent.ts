/**
 * 基础组件接口
 * 定义所有UI组件的通用接口和生命周期方法
 */

export interface ComponentConfig {
  container: HTMLElement;
  className?: string;
  id?: string;
}

export abstract class BaseComponent {
  protected container: HTMLElement;
  protected element: HTMLElement;
  protected isDestroyed: boolean = false;

  constructor(config: ComponentConfig) {
    this.container = config.container;
    this.element = this.createElement(config);
    this.init();
  }

  /**
   * 创建组件的DOM元素
   */
  protected abstract createElement(config: ComponentConfig): HTMLElement;

  /**
   * 初始化组件
   */
  protected init(): void {
    this.container.appendChild(this.element);
    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   */
  protected abstract bindEvents(): void;

  /**
   * 更新组件状态
   */
  public abstract update(data: any): void;

  /**
   * 显示组件
   */
  public show(): void {
    this.element.style.display = '';
    this.element.classList.remove('hidden');
  }

  /**
   * 隐藏组件
   */
  public hide(): void {
    this.element.style.display = 'none';
    this.element.classList.add('hidden');
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.isDestroyed) return;
    
    this.unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.isDestroyed = true;
  }

  /**
   * 解绑事件监听器
   */
  protected abstract unbindEvents(): void;

  /**
   * 获取组件元素
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * 检查组件是否已销毁
   */
  public isComponentDestroyed(): boolean {
    return this.isDestroyed;
  }
}
