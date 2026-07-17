// SudokuWorker.js - Web Worker for Sudoku generation
import { GridUtils } from './SudokuGrid.js';

// Worker 消息处理
self.onmessage = function(e) {
    try {
        const { BOX_SIZE, SIZE, blanks, type } = e.data;
        if (type === 'generate') {
            const solution = GridUtils.generateSolution(BOX_SIZE, SIZE);
            const puzzle = GridUtils.createPuzzle(solution, blanks);
            self.postMessage({ success: true, puzzle, type: 'generateComplete' });
        }
    } catch (error) {
        self.postMessage({ success: false, error: error.message, type: 'generateError' });
    }
};