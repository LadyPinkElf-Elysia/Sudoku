// SudokuGenerator.js - 数独生成器（封装 Worker 管理，静态方法）
import { GridUtils } from './SudokuGrid.js';

let _worker = null;

function _getWorker() {
    if (!_worker) {
        _worker = new Worker(`./util/SudokuWorker.js?t=${Date.now()}`, { type: 'module' });
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
    /**
     * 异步生成数独（使用 Web Worker）
     * @param {number} BOX_SIZE - 宫格大小
     * @param {number} SIZE - 棋盘大小
     * @param {number} blanks - 挖空数量
     * @returns {Promise<number[][]>} 生成的谜题二维数组
     */
    static generate(BOX_SIZE, SIZE, blanks) {
        return new Promise((resolve, reject) => {
            _terminateWorker();
            const worker = _getWorker();

            const timeout = setTimeout(() => {
                worker.terminate();
                _worker = null;
                // 超时回退到同步生成
                resolve(SudokuGenerator.generateSync(BOX_SIZE, SIZE, blanks));
            }, 30000); // 30秒超时

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

    /**
     * 同步生成数独（回退方案）
     */
    static generateSync(BOX_SIZE, SIZE, blanks) {
        const solution = GridUtils.generateSolution(BOX_SIZE, SIZE);
        return GridUtils.createPuzzle(solution, blanks);
    }

    /**
     * 终止当前 Worker
     */
    static abort() {
        _terminateWorker();
    }
}