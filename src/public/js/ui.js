/**
 * UI 交互模块
 * 处理用户界面交互，如标签页切换等
 */

/**
 * 切换标签页
 * @param {string} tabId - 要激活的标签页ID
 */
function switchTab(tabId) {
    // 隐藏所有标签页内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 取消所有标签的激活状态
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 激活选中的标签页
    document.getElementById(tabId).classList.add('active');
    
    // 激活对应的标签
    document.querySelector(`.tab[data-target="${tabId}"]`).classList.add('active');
}

/**
 * 初始化UI事件监听器
 */
function initializeUI() {
    // 为所有标签添加点击事件
    document.querySelectorAll('.tab').forEach(tab => {
        const tabId = tab.getAttribute('data-target');
        tab.addEventListener('click', () => switchTab(tabId));
    });

    // 初始化拖放区域
    const dropZone = document.getElementById('interaction-panel');
    
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    // 命令输入框回车键监听
    const commandInput = document.getElementById('command');
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('run-command-btn').click();
        }
    });
    initializeModal(); // 初始化模态框
}

// 图片预览模态框元素
let modal = null;
let modalImage = null;
let modalCaption = null;
let closeModalBtn = null;

/**
 * 打开图片预览模态框
 * @param {string} src 图片的URL
 * @param {string} alt 图片的替代文本/文件名
 */
function openModal(src, alt) {
    if (modal && modalImage && modalCaption) {
        modal.style.display = "block";
        modalImage.src = src;
        modalCaption.textContent = alt;
    }
}

/**
 * 关闭图片预览模态框
 */
function closeModal() {
    if (modal) {
        modal.style.display = "none";
    }
}

/**
 * 初始化图片预览模态框的DOM元素和事件监听
 */
function initializeModal() {
    modal = document.getElementById('image-modal');
    modalImage = document.getElementById('modal-image');
    modalCaption = document.getElementById('modal-caption');
    closeModalBtn = document.querySelector('.close-modal-btn');

    if (closeModalBtn) {
        closeModalBtn.onclick = closeModal;
    }

    // 点击模态框背景也可以关闭
    if (modal) {
        modal.onclick = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        };
    }
    // 按ESC键关闭模态框
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape" && modal && modal.style.display === "block") {
            closeModal();
        }
    });
}

// 当DOM加载完成后初始化UI
document.addEventListener('DOMContentLoaded', initializeUI);

// 导出UI相关的函数
export { initializeUI, switchTab, openModal, closeModal, initializeModal };
