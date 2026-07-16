// SudokuRenderer.js - Canvas 渲染（单一职责）
export class SudokuRenderer {
    static draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol, zoom = 1.0) {
        if (!canvas || !board || board.length === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // 获取父容器实际显示宽度
        const displayWidth = canvas.parentElement.clientWidth;
        const displaySize = Math.floor(displayWidth * 0.95);
        
        // 根据 zoom 计算实际像素尺寸（高DPI）
        const pixelSize = Math.floor(displaySize * zoom * dpr);
        const cssSize = Math.floor(displaySize * zoom);
        
        // 只在尺寸变化时重新设置 Canvas 缓冲区
        if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
            canvas.width = pixelSize;
            canvas.height = pixelSize;
            canvas.style.width = cssSize + 'px';
            canvas.style.height = cssSize + 'px';
        }
        
        // 缩放上下文以匹配 DPR
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        
        const cellSize = displaySize / SIZE;

        ctx.clearRect(0, 0, displaySize, displaySize);
        
        // 1. 棋盘整体背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displaySize, displaySize);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 预计算宫格索引
        const boxRow = selectedRow !== null ? Math.floor(selectedRow / BOX_SIZE) : -1;
        const boxCol = selectedCol !== null ? Math.floor(selectedCol / BOX_SIZE) : -1;

        // 2. 绘制所有单元格背景
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                const x = c * cellSize, y = r * cellSize;
                const cellBoxRow = Math.floor(r / BOX_SIZE);
                const cellBoxCol = Math.floor(c / BOX_SIZE);

                if (cell.conflict) {
                    ctx.fillStyle = '#fecaca';
                } else if (selectedRow === r && selectedCol === c) {
                    ctx.fillStyle = '#bbf7d0';
                } else if (boxRow !== -1 && cellBoxRow === boxRow && cellBoxCol === boxCol) {
                    ctx.fillStyle = '#f0f4f8';
                } else {
                    const isEvenBox = (cellBoxRow + cellBoxCol) % 2 === 0;
                    ctx.fillStyle = isEvenBox ? '#ffffff' : '#fafafa';
                }
                ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
            }
        }

        // 3. 绘制数字
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                if (cell.value === 0) continue;
                
                const x = c * cellSize, y = r * cellSize;
                const fontSize = Math.round(cellSize * 0.45);
                ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
                
                if (cell.conflict) {
                    ctx.fillStyle = '#dc2626';
                } else if (cell.editable) {
                    ctx.fillStyle = '#475569';
                } else {
                    ctx.fillStyle = '#1f2937';
                }
                ctx.fillText(cell.value, x + cellSize / 2, y + cellSize / 2);
            }
        }

        // 4. 绘制冲突固定题目的橙色边框
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                if (cell.conflict && !cell.editable) {
                    const x = c * cellSize, y = r * cellSize;
                    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                }
            }
        }

        // 5. 绘制宫格粗线（路径批处理）
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= SIZE; i += BOX_SIZE) {
            const pos = i * cellSize;
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, displaySize);
            ctx.moveTo(0, pos);
            ctx.lineTo(displaySize, pos);
        }
        ctx.stroke();

        // 6. 绘制细网格线（宫格内部的线）
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 1; i < SIZE; i++) {
            if (i % BOX_SIZE === 0) continue; // 宫格线已画
            const pos = i * cellSize;
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, displaySize);
            ctx.moveTo(0, pos);
            ctx.lineTo(displaySize, pos);
        }
        ctx.stroke();

        // 7. 绘制外边框
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0.5, 0.5, displaySize - 1, displaySize - 1);
    }
}