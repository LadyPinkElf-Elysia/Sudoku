// BoardManager.js - 棋盘管理类（纯函数，只负责接收数据、处理数据、返回新数据）
// 不修改外部数据，修改数据由主组件负责

import { SudokuGameHelper, SudokuGridHelper } from './SudokuGrid.js';

// ===== Canvas 渲染 =====
function drawCanvas(canvas, board, SIZE, BOX_SIZE, selectedRow, selectedCol, zoom = 1.0) {
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
            if (cell.conflict) ctx.fillStyle = '#fecaca';
            else if (selectedRow === r && selectedCol === c) ctx.fillStyle = '#bbf7d0';
            else if (boxRow !== -1 && cellBoxRow === boxRow && cellBoxCol === boxCol) ctx.fillStyle = '#f0f4f8';
            else ctx.fillStyle = (cellBoxRow + cellBoxCol) % 2 === 0 ? '#ffffff' : '#fafafa';
            ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        }
    }
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = board[r][c];
            if (cell.value === 0) continue;
            const x = c * cellSize, y = r * cellSize;
            const fontSize = Math.round(cellSize * 0.45);
            ctx.font = '500 ' + fontSize + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
            ctx.fillStyle = cell.conflict ? '#dc2626' : (cell.editable ? '#475569' : '#1f2937');
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

// ===== 键盘事件处理 =====
function handleKeyDown(e, state, callbacks) {
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

export class BoardManager {
    // ===== 棋盘格式转换 =====
    static createEmptyBoard(size) {
        return Array.from({ length: size }, () => Array(size).fill(0));
    }

    static createBoardFromPuzzle(puzzle) {
        return puzzle.map(row =>
            row.map(v => ({
                value: v, editable: v === 0, conflict: false, given: v !== 0
            }))
        );
    }

    static toObjectBoard(board) {
        return board.map(row =>
            row.map(v => ({ value: v, editable: true, conflict: false, given: false }))
        );
    }

    static toNumberBoard(board) {
        return board.map(row => row.map(cell => cell.value));
    }

    static serializeBoard(board, includeMeta = false) {
        return board.map(row => row.map(cell => {
            const base = { value: cell.value, editable: cell.editable };
            return includeMeta ? { ...base, conflict: false, given: cell.given } : base;
        }));
    }

    // ===== 棋盘渲染 =====
    static render(canvasId, board, size, boxSize, selectedRow, selectedCol, zoom = 1.0) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !board || !board.length) return;
        drawCanvas(canvas, board, size, boxSize, selectedRow, selectedCol, zoom);
    }

    static getCellFromClick(e, canvasId, size) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
        const scale = rect.width / displaySize;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        const cellSize = displaySize / size;
        const row = Math.floor(y / cellSize);
        const col = Math.floor(x / cellSize);
        if (row >= 0 && row < size && col >= 0 && col < size) return { row, col };
        return null;
    }

    static bindClick(handler, canvasId = 'sudokuCanvas') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.removeEventListener('click', handler);
        canvas.addEventListener('click', handler);
    }

    static unbindClick(handler, canvasId = 'sudokuCanvas') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.removeEventListener('click', handler);
    }

    // ===== 键盘事件 =====
    static handleKeyDown(e, state, callbacks) {
        handleKeyDown(e, state, callbacks);
    }

    // ===== 棋盘操作（纯函数，返回新数据，不修改原数据） =====
    static operateCell(board, row, col, num, options = {}) {
        const { isNumberBoard, boxSize, size, history } = options;

        if (isNumberBoard) {
            const newBoard = board.map(row => [...row]);
            newBoard[row][col] = (newBoard[row][col] === num) ? 0 : num;
            return { board: newBoard };
        }

        const cell = board[row][col];
        if (!cell || !cell.editable) return null;

        const newBoard = board.map(row => row.map(cell => ({ ...cell })));

        let newHistoryMap, newStepPointer;
        if (history) {
            const result = SudokuGameHelper.saveState(history.historyMap, history.stepPointer, board);
            newHistoryMap = result.newHistoryMap;
            newStepPointer = result.newStepPointer;
        }

        newBoard[row][col].value = (newBoard[row][col].value === num) ? 0 : num;

        const messages = boxSize && size
            ? SudokuGridHelper.updateConflictsLocal(newBoard, row, col, boxSize, size) : [];

        const complete = size ? SudokuGridHelper.checkComplete(newBoard, size) : false;

        return {
            board: newBoard,
            historyMap: newHistoryMap,
            stepPointer: newStepPointer,
            conflictMessages: messages,
            complete
        };
    }

    // ===== 游戏状态操作 =====
    static initGame(puzzle) {
        const board = BoardManager.createBoardFromPuzzle(puzzle);
        return {
            board,
            selectedRow: null,
            selectedCol: null,
            conflictMessages: [],
            hintMessage: '',
            historyMap: {},
            stepPointer: -1,
            zoom: 1.0
        };
    }

    static applyPuzzle(state, puzzle) {
        const init = BoardManager.initGame(puzzle);
        return {
            ...state,
            ...init,
            errors: 0,
            over: false,
            complete: false,
            started: true,
            isGenerating: false
        };
    }

    static operateGameCell(game, config, row, col, num, history) {
        if (game.complete || game.over || row === null || col === null || game.isGenerating) return null;
        const cell = game.board[row][col];
        if (!cell.editable) return null;

        const result = BoardManager.operateCell(game.board, row, col, num, {
            boxSize: config.boxSize,
            size: config.boxSize * config.boxSize,
            history
        });
        if (!result) return null;

        let newGame = { ...game, board: result.board, conflictMessages: result.conflictMessages, hintMessage: '' };

        if (cell.conflict && config.mode === 'limited') {
            newGame.errors++;
            if (newGame.errors > config.errorLimit) {
                newGame.over = true;
                newGame.selectedRow = null;
                newGame.selectedCol = null;
            }
        }

        if (result.complete) {
            newGame.complete = true;
            newGame.selectedRow = null;
            newGame.selectedCol = null;
            newGame.hintMessage = '';
        }

        return { newGame, newHistoryMap: result.historyMap, newStepPointer: result.stepPointer };
    }

    // ===== 历史记录 =====
    static navigateHistory(board, historyMap, targetStep, boxSize, size) {
        if (!historyMap[targetStep]) return null;
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        const result = SudokuGameHelper.applyHistory(newBoard, historyMap[targetStep], boxSize, size);
        return { board: newBoard, messages: result.messages };
    }

    static saveHistory(historyMap, stepPointer, board) {
        return SudokuGameHelper.saveState(historyMap, stepPointer, board);
    }

    // ===== 棋盘判断 =====
    static hasNumber(board) {
        if (!board || !board.length) return false;
        return board.some(row => row.some(cell => cell > 0));
    }

    static isBoardComplete(board) {
        if (!board || !board.length) return false;
        return board.every(row => row.every(cell => cell.value > 0 && !cell.conflict));
    }

    static getHint(board, row, col, boxSize, size) {
        return SudokuGameHelper.getHintMessage(board, row, col, boxSize, size);
    }
}
