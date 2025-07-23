/**
 * 模态框组件
 * 处理图片预览模态框
 */

import { getElementById, addEventListeners } from '../utils/dom.js';

class ModalComponent {
  private modal: HTMLElement | null = null;
  private modalImage: HTMLImageElement | null = null;
  private isInitialized: boolean = false;

  public openModal(src: string): void {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    if (this.modal && this.modalImage) {
      this.modal.style.display = 'flex';
      this.modalImage.src = src;
    }
  }

  private closeModal(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  private initialize(): void {
    this.modal = getElementById('image-modal');
    this.modalImage = getElementById<HTMLImageElement>('modal-image');
    const closeModalBtn = document.querySelector('.close-modal-btn') as HTMLElement;

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (event: MouseEvent) => {
        if (event.target === this.modal) {
          this.closeModal();
        }
      });
    }

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
        this.closeModal();
      }
    });

    this.isInitialized = true;
  }
}

const modalComponent = new ModalComponent();

export function openModal(src: string): void {
  modalComponent.openModal(src);
}