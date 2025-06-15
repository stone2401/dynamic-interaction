/**
 * 图片处理模块
 * 处理图片上传、预览和管理
 */
import { openModal } from './ui.js'; // 导入打开模态框的函数

// 存储附加的图片数据
let attachedImageData = [];
const previewContainer = document.getElementById('image-preview-container');
const resultsDiv = document.getElementById('results');

/**
 * 清除图片预览
 */
function clearPreview() {
    attachedImageData = [];
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 处理文件列表
 * @param {FileList} files - 文件列表对象
 * @returns {boolean} 是否成功处理了图片
 */
function processFiles(files) {
    if (!files || files.length === 0) return false;
    
    let filesProcessed = 0;
    
    // 确保预览容器可见
    if (files.length > 0) {
        previewContainer.style.display = 'flex';
    }
    
    // 处理每个文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file && file.type.startsWith('image/')) {
            filesProcessed++;
            const imageId = generateUniqueId();
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // 创建图片数据对象
                const imageData = {
                    id: imageId,
                    name: file.name,
                    dataUrl: e.target.result
                };
                
                // 添加到图片数据数组
                attachedImageData.push(imageData);
                
                // 创建预览项
                const previewItemDiv = document.createElement('div');
                previewItemDiv.className = 'preview-item';
                previewItemDiv.id = imageId;
                
                // 创建图片元素
                const img = document.createElement('img');
                img.src = imageData.dataUrl;
                img.alt = file.name;
                img.style.cursor = 'pointer'; // 添加指针样式，提示可点击
                img.onclick = () => openModal(imageData.dataUrl, file.name); // 点击时打开模态框
                
                // 图片加载错误处理
                img.onerror = () => {
                    console.error(`图片 ${file.name} 加载失败`);
                    const errorSpan = document.createElement('span');
                    errorSpan.textContent = `加载失败: ${file.name}`;
                    errorSpan.style.color = 'red';
                    previewItemDiv.innerHTML = '';
                    previewItemDiv.appendChild(errorSpan);
                };
                
                // 创建文件名显示
                const fileNameSpan = document.createElement('span');
                fileNameSpan.textContent = file.name;
                fileNameSpan.className = 'file-name';
                
                // 创建移除按钮
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.className = 'remove-image';
                removeBtn.onclick = () => {
                    // 从DOM中移除
                    document.getElementById(imageId)?.remove();
                    // 从数据数组中移除
                    attachedImageData = attachedImageData.filter(item => item.id !== imageId);
                    resultsDiv.textContent = `已移除图片: '${file.name}'`;
                    
                    // 如果没有图片了，隐藏预览容器
                    if (attachedImageData.length === 0) {
                        previewContainer.style.display = 'none';
                    }
                };
                
                // 组装预览项
                previewItemDiv.appendChild(img);
                previewItemDiv.appendChild(fileNameSpan);
                previewItemDiv.appendChild(removeBtn);

                // 防御性代码：确保 previewItemDiv 中除了 removeBtn 外没有其他 button 元素
                const childNodes = Array.from(previewItemDiv.childNodes);
                for (const node of childNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BUTTON' && node !== removeBtn) {
                        node.remove();
                        console.warn('Removed unexpected button from preview item:', node);
                    }
                }

                previewContainer.appendChild(previewItemDiv);
            };
            
            // 处理文件读取错误
            reader.onerror = () => {
                console.error(`文件读取失败: ${file.name}`);
                resultsDiv.textContent = `错误: 无法读取图片文件 ${file.name}`;
            };
            
            // 开始读取文件
            reader.readAsDataURL(file);
        }
    }
    
    // 更新处理结果
    if (filesProcessed > 0) {
        resultsDiv.textContent = `已添加 ${filesProcessed} 张图片`;
        return true;
    }
    
    resultsDiv.textContent = '未选择有效的图片文件';
    return false;
}

/**
 * 初始化图片处理事件监听器
 */
function initializeImageHandlers() {
    // 拖放事件
    const dropZone = document.getElementById('interaction-panel');
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            if (!processFiles(e.dataTransfer.files)) {
                resultsDiv.textContent = '错误: 请拖放图片文件';
            }
        }
    });
    
    // 粘贴事件
    document.addEventListener('paste', (e) => {
        if (e.clipboardData.files.length > 0) {
            if (processFiles(e.clipboardData.files)) {
                e.preventDefault();
            }
        }
    });
}

// 当DOM加载完成后初始化图片处理
document.addEventListener('DOMContentLoaded', initializeImageHandlers);

// 导出函数和数据供其他模块使用
export { processFiles, clearPreview, attachedImageData };
