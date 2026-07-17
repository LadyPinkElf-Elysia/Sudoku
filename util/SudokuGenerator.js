// SudokuGenerator.js - 数独生成器（封装 Worker 管理，静态方法）
import { GridUtils } from './SudokuGrid.js';

// ===== Web Worker 代码（内联，包含 GridUtils 依赖） =====
const workerCode = `
// GridUtils 核心函数（内联，避免 import 在 Blob URL 中失效）
function boxStart(row, col, BOX_SIZE) {
    return { r: Math.floor(row / BOX_SIZE) * BOX_SIZE, c: Math.floor(col / BOX_SIZE) * BOX_SIZE };
}
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
function isValid(grid, row, col, num, BOX_SIZE, SIZE) {
    for (let i = 0; i < SIZE; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const { r: sr, c: sc } = boxStart(row, col, BOX_SIZE);
    for (let i = sr; i < sr + BOX_SIZE; i++)
        for (let j = sc; j < sc + BOX_SIZE; j++)
            if (grid[i][j] === num) return false;
    return true;
}
function getCandidates(grid, row, col, BOX_SIZE, SIZE) {
    if (grid[row][col] !== 0) return [];
    const candidates = [];
    for (let num = 1; num <= SIZE; num++) {
        if (isValid(grid, row, col, num, BOX_SIZE, SIZE)) candidates.push(num);
    }
    return candidates;
}
function solve(grid, BOX_SIZE, SIZE) {
    let minCount = SIZE + 1, bestR = -1, bestC = -1, bestCandidates = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] !== 0) continue;
            const candidates = getCandidates(grid, r, c, BOX_SIZE, SIZE);
            if (candidates.length === 0) return false;
            if (candidates.length < minCount) {
                minCount = candidates.length;
                bestR = r; bestC = c; bestCandidates = candidates;
                if (minCount === 1) break;
            }
        }
        if (minCount === 1) break;
    }
    if (bestR === -1) return true;
    shuffle(bestCandidates);
    for (let num of bestCandidates) {
        grid[bestR][bestC] = num;
        if (solve(grid, BOX_SIZE, SIZE)) return true;
        grid[bestR][bestC] = 0;
    }
    return false;
}
function fillDiagonalBoxes(grid, BOX_SIZE, SIZE) {
    for (let b = 0; b < SIZE; b += (BOX_SIZE + 1)) {
        const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const sc = (b % BOX_SIZE) * BOX_SIZE;
        const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
        shuffle(nums);
        let idx = 0;
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++)
                grid[r][c] = nums[idx++];
    }
}
function validate(grid, BOX_SIZE, SIZE) {
    for (let r = 0; r < SIZE; r++) {
        const set = new Set();
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) continue;
            if (set.has(grid[r][c])) return false;
            set.add(grid[r][c]);
        }
    }
    for (let c = 0; c < SIZE; c++) {
        const set = new Set();
        for (let r = 0; r < SIZE; r++) {
            if (grid[r][c] === 0) continue;
            if (set.has(grid[r][c])) return false;
            set.add(grid[r][c]);
        }
    }
    for (let b = 0; b < SIZE; b++) {
        const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const sc = (b % BOX_SIZE) * BOX_SIZE;
        const set = new Set();
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++) {
                if (grid[r][c] === 0) continue;
                if (set.has(grid[r][c])) return false;
                set.add(grid[r][c]);
            }
    }
    return true;
}
function generateSolution(BOX_SIZE, SIZE) {
    const maxAttempts = SIZE <= 9 ? 10 : 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        fillDiagonalBoxes(grid, BOX_SIZE, SIZE);
        if (solve(grid, BOX_SIZE, SIZE) && validate(grid, BOX_SIZE, SIZE)) return grid;
    }
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let b = 0; b < SIZE; b += (BOX_SIZE + 1)) {
        const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const sc = (b % BOX_SIZE) * BOX_SIZE;
        let num = 1;
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++)
                grid[r][c] = num++;
    }
    if (solve(grid, BOX_SIZE, SIZE) && validate(grid, BOX_SIZE, SIZE)) return grid;
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}
function createPuzzle(solution, blanks) {
    const puzzle = solution.map(row => [...row]);
    const SIZE = puzzle.length;
    const BOX_SIZE = Math.sqrt(SIZE);
    blanks = Math.max(SIZE, Math.min(SIZE * SIZE - 1, blanks || SIZE));
    const removed = new Set();
    for (let b = 0; b < SIZE; b++) {
        const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const sc = (b % BOX_SIZE) * BOX_SIZE;
        const positions = [];
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++)
                positions.push({ r, c });
        shuffle(positions);
        puzzle[positions[0].r][positions[0].c] = 0;
        removed.add(positions[0].r + ',' + positions[0].c);
    }
    if (blanks > SIZE) {
        const remainingPositions = [];
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (!removed.has(r + ',' + c)) remainingPositions.push({ r, c });
        shuffle(remainingPositions);
        const toRemove = Math.min(blanks - SIZE, remainingPositions.length);
        for (let i = 0; i < toRemove; i++)
            puzzle[remainingPositions[i].r][remainingPositions[i].c] = 0;
    }
    return puzzle;
}

self.onmessage = function(e) {
    try {
        const { BOX_SIZE, SIZE, blanks, type } = e.data;
        if (type === 'generate') {
            const solution = generateSolution(BOX_SIZE, SIZE);
            const puzzle = createPuzzle(solution, blanks);
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
        _worker = new Worker(url);
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
        return new Promise((resolve) => {
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
                    resolve(SudokuGenerator.generateSync(BOX_SIZE, SIZE, blanks));
                }
            };

            worker.onerror = () => {
                clearTimeout(timeout);
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