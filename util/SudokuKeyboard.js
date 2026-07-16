// SudokuKeyboard.js - 键盘事件处理（工具函数）
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