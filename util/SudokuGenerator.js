// SudokuGenerator.js - 数独生成器（封装 Worker 管理，静态方法）
import { GridUtils } from './SudokuGrid.js';

// ===== Web Worker 代码（内联） =====
const workerCode = `
import { GridUtils } from './SudokuGrid.js';
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
`;

let _worker = null;

function _getWorker() {
    if (!_worker) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        _worker = new Worker(url, { type: 'module' });
        URL.revokeObjectURL(url);
    }
    return _worker;
}

function _terminateWorker() {
    if (_worker) {
        _worker.terminate();
        _worker = null;
    }
}

export class SudokuGenerator {
    static generate(BOX_SIZE, SIZE, blanks) {
        return new Promise((resolve, reject) => {
            _terminateWorker();
            const worker = _getWorker();

            const timeout = setTimeout(() => {
                worker.terminate();
                _worker = null;
                resolve(SudokuGenerator.generateSync(BOX_SIZE, SIZE, blanks));
            }, 30000);

            worker.onmessage = (e) => {
                clearTimeout(timeout);
                if (e.data.type === 'generateComplete' && e.data.success) {
                    resolve(e.data.puzzle);
                } else {
                    console.error('Worker error:', e.data.error);
                    resolve(SudokuGenerator.generateSync(BOX_SIZE, SIZE, blanks));
                }
            };

            worker.onerror = (err) => {
                clearTimeout(timeout);
                console.error('Worker error:', err);
                resolve(SudokuGenerator.generateSync(BOX_SIZE, SIZE, blanks));
            };

            worker.postMessage({ type: 'generate', BOX_SIZE, SIZE, blanks });
        });
    }

    static generateSync(BOX_SIZE, SIZE, blanks) {
        const solution = GridUtils.generateSolution(BOX_SIZE, SIZE);
        return GridUtils.createPuzzle(solution, blanks);
    }

    static abort() {
        _terminateWorker();
    }
}