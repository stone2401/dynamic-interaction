/**
 * UI 交互模块
 * 处理图片预览模态框
 */

let modal: HTMLElement | null = null;
let modalImage: HTMLImageElement | null = null;

/**
 * 打开图片预览模态框
 * @param {string} src 图片的URL
 */
export function openModal(src: string): void {
  if (!modal) {
    initializeModal();
  }
  
  if (modal && modalImage) {
    modal.style.display = 'flex';
    modalImage.src = src;
  }
}

/**
 * 关闭图片预览模态框
 */
function closeModal(): void {
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 初始化图片预览模态框的DOM元素和事件监听
 */
function initializeModal(): void {
  modal = document.getElementById('image-modal');
  modalImage = document.getElementById('modal-image') as HTMLImageElement;
  const closeModalBtn = document.querySelector('.close-modal-btn');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (event: MouseEvent) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });
}

// 确保在DOM加载后可以找到元素
document.addEventListener('DOMContentLoaded', initializeModal);

