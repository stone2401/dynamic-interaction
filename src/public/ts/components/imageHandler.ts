/**
 * 图片处理组件
 * 处理图片上传、预览和管理
 */

import type { CustomImageData } from '../core/types.js';
import { generateUniqueId } from '../utils/helpers.js';
import { createElement } from '../utils/dom.js';
import { openModal } from './modal.js';

class ImageHandlerComponent {
  private attachedImageData: CustomImageData[] = [];

  public getAttachedImages(): CustomImageData[] {
    return [...this.attachedImageData];
  }

  public clearPreview(): void {
    const previewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
    this.attachedImageData = [];
    if (previewContainer) {
      previewContainer.innerHTML = '';
    }
  }

  public processFiles(files: FileList | null, container: HTMLElement): void {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        this.processImageFile(file, container);
      }
    }
  }

  public setupDragAndDrop(dropZone: HTMLElement, previewContainer: HTMLElement): void {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropZone.classList.contains('disabled')) {
        dropZone.classList.add('dragover');
      }
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      if (dropZone.classList.contains('disabled')) return;
      if (e.dataTransfer) {
        this.processFiles(e.dataTransfer.files, previewContainer);
      }
    });

    dropZone.addEventListener('click', () => {
      if (dropZone.classList.contains('disabled')) return;
      this.createFileInput(previewContainer);
    });
  }

  public setupPasteListener(pasteTarget: HTMLElement, previewContainer: HTMLElement): void {
    pasteTarget.addEventListener('paste', (e: ClipboardEvent) => {
      if (pasteTarget.classList.contains('disabled')) return;

      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        this.processFiles(e.clipboardData.files, previewContainer);
      }
    });
  }

  private processImageFile(file: File, container: HTMLElement): void {
    const imageId = generateUniqueId('img');
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target && typeof e.target.result === 'string') {
        const dataUrl = e.target.result;
        const imageData: CustomImageData = {
          id: imageId,
          name: file.name,
          dataUrl: dataUrl,
        };
        this.attachedImageData.push(imageData);
        this.createPreviewItem(imageData, container);
      }
    };

    reader.onerror = () => {
      console.error(`文件读取失败: ${file.name}`);
    };

    reader.readAsDataURL(file);
  }

  private createPreviewItem(imageData: CustomImageData, container: HTMLElement): void {
    const previewItem = createElement('div', 'preview-item');
    previewItem.id = imageData.id!;

    const img = createElement('img') as HTMLImageElement;
    img.src = imageData.dataUrl!;
    img.alt = imageData.name;
    img.onclick = () => openModal(imageData.dataUrl!);

    const removeBtn = createElement('div', 'remove-image', '×');
    removeBtn.onclick = (event) => {
      event.stopPropagation();
      this.removeImage(imageData.id!);
    };

    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    container.appendChild(previewItem);
  }

  private removeImage(imageId: string): void {
    document.getElementById(imageId)?.remove();
    this.attachedImageData = this.attachedImageData.filter(item => item.id !== imageId);
  }

  private createFileInput(previewContainer: HTMLElement): void {
    const fileInput = createElement('input') as HTMLInputElement;
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.onchange = () => {
      if (fileInput.files) {
        this.processFiles(fileInput.files, previewContainer);
      }
    };
    fileInput.click();
  }
}

const imageHandler = new ImageHandlerComponent();

// 导出接口
export const processFiles = imageHandler.processFiles.bind(imageHandler);
export const clearPreview = imageHandler.clearPreview.bind(imageHandler);
export const setupDragAndDrop = imageHandler.setupDragAndDrop.bind(imageHandler);
export const setupPasteListener = imageHandler.setupPasteListener.bind(imageHandler);

// 导出获取附加图片数据的函数
export function getAttachedImageData(): CustomImageData[] {
  return imageHandler.getAttachedImages();
}

// 保持向后兼容
export { imageHandler };