/**
 * WindowManager 单元测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WindowManager } from '../../../src/electron/window-manager.js';

// Mock Electron modules
vi.mock('electron', () => ({
    BrowserWindow: vi.fn().mockImplementation(() => ({
        loadURL: vi.fn().mockResolvedValue(undefined),
        show: vi.fn(),
        focus: vi.fn(),
        close: vi.fn(),
        destroy: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false),
        isMinimized: vi.fn().mockReturnValue(false),
        restore: vi.fn(),
        setVisibleOnAllWorkspaces: vi.fn(),
        getSize: vi.fn().mockReturnValue([1200, 800]),
        on: vi.fn(),
        once: vi.fn(),
        removeAllListeners: vi.fn(),
        webContents: {
            openDevTools: vi.fn(),
            on: vi.fn(),
            setWindowOpenHandler: vi.fn()
        }
    })),
    screen: {
        getPrimaryDisplay: vi.fn().mockReturnValue({
            workAreaSize: { width: 1920, height: 1080 }
        })
    }
}));

vi.mock('../../../src/config.js', () => ({
    ELECTRON_CONFIG: {
        windowWidth: 1200,
        windowHeight: 800,
        minWidth: 800,
        minHeight: 600,
        center: true,
        windowTitle: 'Test Window',
        resizable: true,
        devTools: false
    },
    PORT: 10086
}));

vi.mock('../../../src/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}));

describe('WindowManager', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        windowManager = new WindowManager();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        if (windowManager.isWindowAvailable()) {
            await windowManager.closeWindow();
        }
    });

    describe('createWindow', () => {
        it('应该创建新窗口', () => {
            const window = windowManager.createWindow();

            expect(window).toBeDefined();
            expect(windowManager.isWindowAvailable()).toBe(true);
        });

        it('如果窗口已存在应该返回现有窗口', () => {
            const window1 = windowManager.createWindow();
            const window2 = windowManager.createWindow();

            expect(window1).toBe(window2);
        });
    });

    describe('getWindow', () => {
        it('应该返回当前窗口实例', () => {
            const createdWindow = windowManager.createWindow();
            const retrievedWindow = windowManager.getWindow();

            expect(retrievedWindow).toBe(createdWindow);
        });

        it('如果没有窗口应该返回 null', () => {
            const window = windowManager.getWindow();

            expect(window).toBeNull();
        });
    });

    describe('closeWindow', () => {
        it('应该关闭窗口', async () => {
            const window = windowManager.createWindow();
            const closeSpy = vi.spyOn(window, 'close');

            await windowManager.closeWindow();

            expect(closeSpy).toHaveBeenCalled();
        });

        it('如果没有窗口应该正常返回', async () => {
            await expect(windowManager.closeWindow()).resolves.toBeUndefined();
        });
    });

    describe('focusWindow', () => {
        it('应该将窗口带到前台', () => {
            const window = windowManager.createWindow();
            const showSpy = vi.spyOn(window, 'show');
            const focusSpy = vi.spyOn(window, 'focus');

            windowManager.focusWindow();

            expect(showSpy).toHaveBeenCalled();
            expect(focusSpy).toHaveBeenCalled();
        });

        it('如果窗口最小化应该先恢复', () => {
            const window = windowManager.createWindow();
            vi.spyOn(window, 'isMinimized').mockReturnValue(true);
            const restoreSpy = vi.spyOn(window, 'restore');

            windowManager.focusWindow();

            expect(restoreSpy).toHaveBeenCalled();
        });
    });

    describe('isWindowAvailable', () => {
        it('有可用窗口时应该返回 true', () => {
            windowManager.createWindow();

            expect(windowManager.isWindowAvailable()).toBe(true);
        });

        it('没有窗口时应该返回 false', () => {
            expect(windowManager.isWindowAvailable()).toBe(false);
        });
    });
});