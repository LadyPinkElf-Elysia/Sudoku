// util/SudokuRenderer.js
export class SudokuRenderer {
    static draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol) {
        if (!canvas) return;
        
        const rect = canvas.parentElement.getBoundingClientRect();
        // 取整，防止手机高 DPI 屏幕下出现模糊虚边
        const size = Math.floor(rect.width * 0.95); 
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        const cellSize = size / SIZE;
        if (!board || board.length === 0) return;

        // 1. 绘制纯白底色，彻底去除旧版杂色和阴影
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 禁用任何由之前阴影引起的抗锯齿残留
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 2. 绘制单元格
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                const x = c * cellSize, y = r * cellSize;

                // 背景色：冲突 > 选中 > 默认
                if (cell.conflict) ctx.fillStyle = '#fee2e2';
                else if (selectedRow === r && selectedCol === c) ctx.fillStyle = '#dbeafe';
                else ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, cellSize, cellSize);

                // 绘制极细的网格线
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);

                // 绘制文字：无阴影、高对比度、绝对清晰
                if (cell.value !== 0) {
                    // 根据格子大小动态调整字号，确保文字不溢出
                    ctx.font = `600 ${cellSize * 0.6}px Arial, sans-serif`;
                    ctx.fillStyle = cell.editable ? '#4f46e5' : '#1f2937';
                    if (cell.conflict) ctx.fillStyle = '#b91c1c';
                    
                    ctx.fillText(cell.value, x + cellSize / 2, y + cellSize / 2);
                }
            }
        }

        // 3. 绘制宫格粗线（覆盖在细线之上，线条干净）
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#9ca3af';
        ctx.shadowColor = 'transparent'; // 确保粗线绝对没有阴影
        for (let i = 0; i <= SIZE; i += BOX_SIZE) {
            const pos = i * cellSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
    }
}