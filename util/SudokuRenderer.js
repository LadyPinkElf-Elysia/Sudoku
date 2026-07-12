export class SudokuRenderer {
    static draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol) {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const size = Math.floor(rect.width * 0.95);
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cellSize = size / SIZE;
        if (!board || board.length === 0) return;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                const x = c * cellSize, y = r * cellSize;

                // 1. 绘制背景色：红黄区分！
                if (cell.conflict) {
                    if (!cell.editable) ctx.fillStyle = '#ffffff'; // 固定题目保持白底
                    else ctx.fillStyle = '#fee2e2';                // 玩家输入红底
                } else if (selectedRow === r && selectedCol === c) {
                    ctx.fillStyle = '#dbeafe';
                } else {
                    ctx.fillStyle = '#ffffff';
                }
                ctx.fillRect(x, y, cellSize, cellSize);

                // 2. 绘制网格细线
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);

                // 3. 绘制文字（冲突时文字统一变红）
                if (cell.value !== 0) {
                    ctx.font = `600 ${cellSize * 0.6}px Arial, sans-serif`;
                    if (cell.conflict) ctx.fillStyle = '#b91c1c';
                    else ctx.fillStyle = cell.editable ? '#4f46e5' : '#1f2937';
                    ctx.fillText(cell.value, x + cellSize / 2, y + cellSize / 2);
                }

                // 4. 【关键】绘制固定题目的黄色粗边框
                if (cell.conflict && !cell.editable) {
                    ctx.strokeStyle = '#eab308'; // 黄色
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, cellSize, cellSize);
                }
            }
        }

        // 5. 覆盖宫格粗线
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#9ca3af';
        for (let i = 0; i <= SIZE; i += BOX_SIZE) {
            const pos = i * cellSize;
            ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke();
        }
    }
}