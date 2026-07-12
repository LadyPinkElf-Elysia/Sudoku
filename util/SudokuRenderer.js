export class SudokuRenderer {
    static draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol) {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const size = rect.width * 0.95;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cellSize = size / SIZE;
        if (!board || board.length === 0) return;
        ctx.clearRect(0, 0, size, size);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                const x = c * cellSize, y = r * cellSize;
                if (cell.conflict) ctx.fillStyle = '#fee2e2';
                else if (selectedRow === r && selectedCol === c) ctx.fillStyle = '#dbeafe';
                else ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);
                if (cell.value !== 0) {
                    ctx.font = `bold ${cellSize * 0.6}px Arial`;
                    ctx.fillStyle = cell.editable ? '#4f46e5' : '#1f2937';
                    if (cell.conflict) ctx.fillStyle = '#b91c1c';
                    ctx.fillText(cell.value, x + cellSize / 2, y + cellSize / 2);
                }
            }
        }
        ctx.lineWidth = 3; ctx.strokeStyle = '#9ca3af';
        for (let i = 0; i <= SIZE; i += BOX_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(size, i * cellSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, size); ctx.stroke();
        }
    }
}