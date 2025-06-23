/**
 * 图片处理模块
 * 处理图片上传、预览和管理
 */

import { openModal } from './ui.js';

export let attachedImageData: CustomImageData[] = [];

function generateUniqueId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function clearPreview(): void {
  const previewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
  attachedImageData = [];
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }
}

export function processFiles(files: FileList | null, container: HTMLElement): void {
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && file.type.startsWith('image/')) {
      const imageId = generateUniqueId();
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target && typeof e.target.result === 'string') {
          const dataUrl = e.target.result;
          const imageData: CustomImageData = {
            id: imageId,
            name: file.name,
            dataUrl: dataUrl,
          };
          attachedImageData.push(imageData);

          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          previewItem.id = imageId;

          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = file.name;
          img.onclick = () => openModal(dataUrl);

          const removeBtn = document.createElement('div');
          removeBtn.className = 'remove-image';
          removeBtn.innerHTML = '&times;';
          removeBtn.onclick = (event) => {
            event.stopPropagation();
            document.getElementById(imageId)?.remove();
            attachedImageData = attachedImageData.filter(item => item.id !== imageId);
          };

          previewItem.appendChild(img);
          previewItem.appendChild(removeBtn);
          container.appendChild(previewItem);
        }
      };

      reader.onerror = () => {
        console.error(`文件读取失败: ${file.name}`);
      };

      reader.readAsDataURL(file);
    }
  }
}

export function setupDragAndDrop(dropZone: HTMLElement, previewContainer: HTMLElement): void {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
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
    if (e.dataTransfer) {
      processFiles(e.dataTransfer.files, previewContainer);
    }
  });

  dropZone.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.onchange = () => {
      if (fileInput.files) {
        processFiles(fileInput.files, previewContainer);
      }
    };
    fileInput.click();
  });
}

export function setupPasteListener(pasteTarget: HTMLElement, previewContainer: HTMLElement): void {
  pasteTarget.addEventListener('paste', (e: ClipboardEvent) => {
    if (e.clipboardData) {
      processFiles(e.clipboardData.files, previewContainer);
    }
  });
}

