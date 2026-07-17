// SudokuRenderer.js - Canvas 渲染 + 键盘事件处理（合并版）

// ===== 键盘事件处理 =====
export function handleSudokuKeyDown(e, state, callbacks) {
    if (!state.started || state.isGenerating || state.complete || state.over) return;
    
    const key = e.key;
    if (key >= '1' && key <= '9') {
        const num = parseInt(key);
        if (num <= state.SIZE) callbacks.inputNumber(num);
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        callbacks.clearSelected();
    } else if (key === 'ArrowUp' && state.selectedRow !== null) {
        e.preventDefault();
        callbacks.selectCell(Math.max(0, state.selectedRow - 1), state.selectedCol);
    } else if (key === 'ArrowDown' && state.selectedRow !== null) {
        e.preventDefault();
        callbacks.selectCell(Math.min(state.SIZE - 1, state.selectedRow + 1), state.selectedCol);
    } else if (key === 'ArrowLeft' && state.selectedCol !== null) {
        e.preventDefault();
        callbacks.selectCell(state.selectedRow, Math.max(0, state.selectedCol - 1));
    } else if (key === 'ArrowRight' && state.selectedCol !== null) {
        e.preventDefault();
        callbacks.selectCell(state.selectedRow, Math.min(state.SIZE - 1, state.selectedCol + 1));
    } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.shiftKey ? callbacks.redo() : callbacks.undo();
    } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        callbacks.redo();
    }
}

// ===== Canvas 渲染 =====
export class SudokuRenderer {
    static draw(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol, zoom = 1.0) {
        if (!canvas || !board || board.length === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
        const pixelSize = Math.floor(displaySize * zoom * dpr);
        const cssSize = Math.floor(displaySize * zoom);
        
        if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
            canvas.width = pixelSize;
            canvas.height = pixelSize;
            canvas.style.width = cssSize + 'px';
            canvas.style.height = cssSize + 'px';
        }
        
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        
        const cellSize = displaySize / SIZE;

        ctx.clearRect(0, 0, displaySize, displaySize);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displaySize, displaySize);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const boxRow = selectedRow !== null ? Math.floor(selectedRow / BOX_SIZE) : -1;
        const boxCol = selectedCol !== null ? Math.floor(selectedCol / BOX_SIZE) : -1;

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

        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 1; i < SIZE; i++) {
            if (i % BOX_SIZE === 0) continue;
            const pos = i * cellSize;
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, displaySize);
            ctx.moveTo(0, pos);
            ctx.lineTo(displaySize, pos);
        }
        ctx.stroke();

        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0.5, 0.5, displaySize - 1, displaySize - 1);
    }
}