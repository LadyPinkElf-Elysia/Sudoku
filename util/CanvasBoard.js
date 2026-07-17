// CanvasBoard.js - Canvas 棋盘交互工具（静态方法，通用）
import { SudokuRenderer } from './SudokuRenderer.js';

export class CanvasBoard {
    /**
     * 获取 Canvas 元素
     */
    static getCanvas(id = 'sudokuCanvas') {
        return document.getElementById(id);
    }

    /**
     * 渲染棋盘
     */
    static render(canvasId, board, SIZE, BOX_SIZE, selectedRow, selectedCol, zoom = 1.0) {
        const canvas = CanvasBoard.getCanvas(canvasId);
        if (!canvas) return;
        SudokuRenderer.draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol, zoom);
    }

    /**
     * 从点击事件计算棋盘坐标
     * @param {MouseEvent} e - 点击事件
     * @param {string} canvasId - Canvas 元素 ID
     * @param {number} SIZE - 棋盘大小
     * @returns {{ row: number, col: number } | null} 棋盘坐标，无效返回 null
     */
    static getCellFromClick(e, canvasId, SIZE) {
        const canvas = CanvasBoard.getCanvas(canvasId);
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
        const scale = rect.width / displaySize;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        const cellSize = displaySize / SIZE;
        const row = Math.floor(y / cellSize);
        const col = Math.floor(x / cellSize);

        if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) {
            return { row, col };
        }
        return null;
    }

    /**
     * 绑定 Canvas 点击事件（自动清理旧监听器）
     * @param {Function} handler - 点击处理函数，接收 { row, col }
     * @param {string} canvasId - Canvas 元素 ID
     */
    static bindClick(handler, canvasId = 'sudokuCanvas') {
        const canvas = CanvasBoard.getCanvas(canvasId);
        if (!canvas) return;
        canvas.removeEventListener('click', handler);
        canvas.addEventListener('click', handler);
    }

    /**
     * 解绑 Canvas 点击事件
     */
    static unbindClick(handler, canvasId = 'sudokuCanvas') {
        const canvas = CanvasBoard.getCanvas(canvasId);
        if (!canvas) return;
        canvas.removeEventListener('click', handler);
    }
}