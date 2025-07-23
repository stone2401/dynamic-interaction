/**
 * 消息处理器入口
 * 自动导入所有处理器模块
 */

// 导入所有处理器模块，这会自动注册它们
import './feedback';
import './ping'; 
import './system';

// 可以在这里添加更多处理器的导入

export * from './feedback';
export * from './ping';
export * from './system';