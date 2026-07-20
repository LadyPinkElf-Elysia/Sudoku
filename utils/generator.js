// generator.js - 数独生成器
// 使用 Web Worker 异步生成，不阻塞 UI

const WORKER_CODE = `
// 洗牌
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// 检查数字 n 在 (row, col) 位置是否合法
function isValid(grid, row, col, num, boxSize, size) {
    for (let i = 0; i < size; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const sr = Math.floor(row / boxSize) * boxSize;
    const sc = Math.floor(col / boxSize) * boxSize;
    for (let i = sr; i < sr + boxSize; i++)
        for (let j = sc; j < sc + boxSize; j++)
            if (grid[i][j] === num) return false;
    return true;
}

// 获取某个位置的所有候选数字
function getCandidates(grid, row, col, boxSize, size) {
    if (grid[row][col] !== 0) return [];
    const result = [];
    for (let n = 1; n <= size; n++) {
        if (isValid(grid, row, col, n, boxSize, size)) result.push(n);
    }
    return result;
}

// MRV（最小剩余值）回溯求解
function solve(grid, boxSize, size) {
    let minCount = size + 1, bestRow = -1, bestCol = -1, bestCandidates = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] !== 0) continue;
            const cand = getCandidates(grid, r, c, boxSize, size);
            if (cand.length === 0) return false;
            if (cand.length < minCount) {
                minCount = cand.length;
                bestRow = r; bestCol = c;
                bestCandidates = cand;
                if (minCount === 1) break;
            }
        }
        if (minCount === 1) break;
    }
    if (bestRow === -1) return true;
    shuffle(bestCandidates);
    for (const n of bestCandidates) {
        grid[bestRow][bestCol] = n;
        if (solve(grid, boxSize, size)) return true;
        grid[bestRow][bestCol] = 0;
    }
    return false;
}

// 填充对角线上的宫格（每个宫格互不影响，可以直接填）
function fillDiagonal(grid, boxSize, size) {
    for (let b = 0; b < size; b += boxSize + 1) {
        const sr = Math.floor(b / boxSize) * boxSize;
        const sc = (b % boxSize) * boxSize;
        const nums = Array.from({ length: size }, (_, i) => i + 1);
        shuffle(nums);
        let idx = 0;
        for (let r = sr; r < sr + boxSize; r++)
            for (let c = sc; c < sc + boxSize; c++)
                grid[r][c] = nums[idx++];
    }
}

// 生成完整数独解
function generateSolution(boxSize, size) {
    const maxAttempts = size <= 9 ? 10 : 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const grid = Array.from({ length: size }, () => Array(size).fill(0));
        fillDiagonal(grid, boxSize, size);
        if (solve(grid, boxSize, size)) return grid;
    }
    // 兜底：用顺序填对角线再求解
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    for (let b = 0; b < size; b += boxSize + 1) {
        const sr = Math.floor(b / boxSize) * boxSize;
        const sc = (b % boxSize) * boxSize;
        let num = 1;
        for (let r = sr; r < sr + boxSize; r++)
            for (let c = sc; c < sc + boxSize; c++)
                grid[r][c] = num++;
    }
    solve(grid, boxSize, size);
    return grid;
}

// 从完整解中挖空，生成谜题（每个宫格至少挖一个）
function createPuzzle(solution, blanks) {
    const puzzle = solution.map(row => [...row]);
    const size = puzzle.length;
    const boxSize = Math.sqrt(size);
    const maxBlanks = Math.max(size, Math.min(size * size - 1, blanks || size));
    const removed = new Set();
    
    // 每个宫格至少挖一个
    for (let b = 0; b < size; b++) {
        const sr = Math.floor(b / boxSize) * boxSize;
        const sc = (b % boxSize) * boxSize;
        const positions = [];
        for (let r = sr; r < sr + boxSize; r++)
            for (let c = sc; c < sc + boxSize; c++)
                positions.push({ r, c });
        shuffle(positions);
        puzzle[positions[0].r][positions[0].c] = 0;
        removed.add(positions[0].r + ',' + positions[0].c);
    }
    // 继续挖空到指定数量
    if (maxBlanks > size) {
        const remaining = [];
        for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++)
                if (!removed.has(r + ',' + c)) remaining.push({ r, c });
        shuffle(remaining);
        const toRemove = Math.min(maxBlanks - size, remaining.length);
        for (let i = 0; i < toRemove; i++)
            puzzle[remaining[i].r][remaining[i].c] = 0;
    }
    return puzzle;
}

self.onmessage = function(e) {
    try {
        const { boxSize, size, blanks } = e.data;
        const solution = generateSolution(boxSize, size);
        const puzzle = createPuzzle(solution, blanks);
        self.postMessage({ success: true, puzzle: puzzle });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};
`;

let worker = null;

function getWorker() {
    if (!worker) {
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        worker = new Worker(url);
        URL.revokeObjectURL(url);
    }
    return worker;
}

function killWorker() {
    if (worker) { worker.terminate(); worker = null; }
}

export const Generator = {
    generate(boxSize, size, blanks) {
        return new Promise(resolve => {
            killWorker();
            const w = getWorker();
            const timeout = setTimeout(() => {
                w.terminate();
                worker = null;
                resolve(Generator.sync(boxSize, size, blanks));
            }, 30000);
            w.onmessage = e => {
                clearTimeout(timeout);
                resolve(e.data.success ? e.data.puzzle : Generator.sync(boxSize, size, blanks));
            };
            w.onerror = () => {
                clearTimeout(timeout);
                resolve(Generator.sync(boxSize, size, blanks));
            };
            w.postMessage({ boxSize, size, blanks });
        });
    },

    sync(boxSize, size, blanks) {
        // 直接用内联的求解逻辑（和 Worker 中一致）
        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
        function isValid(grid, row, col, num, B, S) {
            for (let i = 0; i < S; i++) if (grid[row][i] === num || grid[i][col] === num) return false;
            const sr = Math.floor(row / B) * B, sc = Math.floor(col / B) * B;
            for (let i = sr; i < sr + B; i++) for (let j = sc; j < sc + B; j++) if (grid[i][j] === num) return false;
            return true;
        }
        function solve(grid, B, S) {
            let min = S + 1, br = -1, bc = -1, bcand = [];
            for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
                if (grid[r][c] !== 0) continue;
                const cand = [];
                for (let n = 1; n <= S; n++) if (isValid(grid, r, c, n, B, S)) cand.push(n);
                if (cand.length === 0) return false;
                if (cand.length < min) { min = cand.length; br = r; bc = c; bcand = cand; if (min === 1) break; }
            }
            if (br === -1) return true;
            shuffle(bcand);
            for (const n of bcand) { grid[br][bc] = n; if (solve(grid, B, S)) return true; grid[br][bc] = 0; }
            return false;
        }

        const grid = Array.from({ length: size }, () => Array(size).fill(0));
        for (let b = 0; b < size; b += boxSize + 1) {
            const sr = Math.floor(b / boxSize) * boxSize, sc = (b % boxSize) * boxSize;
            const nums = Array.from({ length: size }, (_, i) => i + 1);
            shuffle(nums); let idx = 0;
            for (let r = sr; r < sr + boxSize; r++) for (let c = sc; c < sc + boxSize; c++) grid[r][c] = nums[idx++];
        }
        solve(grid, boxSize, size);

        const puzzle = grid.map(r => [...r]);
        const b2 = Math.max(size, Math.min(size * size - 1, blanks || size));
        const removed = new Set();
        for (let b = 0; b < size; b++) {
            const sr = Math.floor(b / boxSize) * boxSize, sc = (b % boxSize) * boxSize;
            const pos = [];
            for (let r = sr; r < sr + boxSize; r++) for (let c = sc; c < sc + boxSize; c++) pos.push({ r, c });
            shuffle(pos);
            puzzle[pos[0].r][pos[0].c] = 0;
            removed.add(pos[0].r + ',' + pos[0].c);
        }
        if (b2 > size) {
            const remaining = [];
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!removed.has(r + ',' + c)) remaining.push({ r, c });
            shuffle(remaining);
            const t = Math.min(b2 - size, remaining.length);
            for (let i = 0; i < t; i++) puzzle[remaining[i].r][remaining[i].c] = 0;
        }
        return puzzle;
    },

    abort() { killWorker(); },
};