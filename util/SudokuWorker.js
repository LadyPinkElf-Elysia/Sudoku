// SudokuWorker.js - Web Worker for Sudoku generation

// ===== 通用工具函数（与 SudokuEngine.js 中的 GridUtils 相同）=====
const GridUtils = {
    boxStart(row, col, BOX_SIZE) {
        return {
            r: Math.floor(row / BOX_SIZE) * BOX_SIZE,
            c: Math.floor(col / BOX_SIZE) * BOX_SIZE
        };
    },

    *rowCoords(row, SIZE) { for (let c = 0; c < SIZE; c++) yield { r: row, c }; },
    *colCoords(col, SIZE) { for (let r = 0; r < SIZE; r++) yield { r, c: col }; },
    *boxCoords(row, col, BOX_SIZE) {
        const { r: sr, c: sc } = GridUtils.boxStart(row, col, BOX_SIZE);
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++)
                yield { r, c };
    },
    *allCoords(SIZE) {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                yield { r, c };
    },

    each(grid, coords, fn, ...args) {
        for (const { r, c } of coords(...args)) {
            if (fn(grid[r][c], r, c)) return true;
        }
        return false;
    },

    hasDuplicate(grid, coords, ...args) {
        const set = new Set();
        return GridUtils.each(grid, coords, (val) => {
            if (val !== 0) {
                if (set.has(val)) return true;
                set.add(val);
            }
            return false;
        }, ...args);
    },

    validate(grid, BOX_SIZE, SIZE) {
        for (let r = 0; r < SIZE; r++)
            if (GridUtils.hasDuplicate(grid, GridUtils.rowCoords, r, SIZE)) return false;
        for (let c = 0; c < SIZE; c++)
            if (GridUtils.hasDuplicate(grid, GridUtils.colCoords, c, SIZE)) return false;
        for (let b = 0; b < SIZE; b++) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
            const sc = (b % BOX_SIZE) * BOX_SIZE;
            if (GridUtils.hasDuplicate(grid, GridUtils.boxCoords, sr, sc, BOX_SIZE)) return false;
        }
        return true;
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },

    fillDiagonalBoxes(grid, BOX_SIZE, SIZE) {
        for (let b = 0; b < SIZE; b += (BOX_SIZE + 1)) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
            const sc = (b % BOX_SIZE) * BOX_SIZE;
            const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
            GridUtils.shuffle(nums);
            let idx = 0;
            for (let r = sr; r < sr + BOX_SIZE; r++)
                for (let c = sc; c < sc + BOX_SIZE; c++)
                    grid[r][c] = nums[idx++];
        }
    },

    isValid(grid, row, col, num, BOX_SIZE, SIZE) {
        for (let i = 0; i < SIZE; i++) {
            if (grid[row][i] === num) return false;
        }
        for (let i = 0; i < SIZE; i++) {
            if (grid[i][col] === num) return false;
        }
        const { r: sr, c: sc } = GridUtils.boxStart(row, col, BOX_SIZE);
        for (let i = sr; i < sr + BOX_SIZE; i++)
            for (let j = sc; j < sc + BOX_SIZE; j++)
                if (grid[i][j] === num) return false;
        return true;
    },

    getCandidates(grid, row, col, BOX_SIZE, SIZE) {
        if (grid[row][col] !== 0) return [];
        const candidates = [];
        for (let num = 1; num <= SIZE; num++) {
            if (GridUtils.isValid(grid, row, col, num, BOX_SIZE, SIZE)) {
                candidates.push(num);
            }
        }
        return candidates;
    },

    solve(grid, BOX_SIZE, SIZE) {
        let minCount = SIZE + 1, bestR = -1, bestC = -1, bestCandidates = [];
        
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] !== 0) continue;
                const candidates = GridUtils.getCandidates(grid, r, c, BOX_SIZE, SIZE);
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
        
        GridUtils.shuffle(bestCandidates);
        
        for (let num of bestCandidates) {
            grid[bestR][bestC] = num;
            if (GridUtils.solve(grid, BOX_SIZE, SIZE)) return true;
            grid[bestR][bestC] = 0;
        }
        return false;
    },

    generateSolution(BOX_SIZE, SIZE) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
            GridUtils.fillDiagonalBoxes(grid, BOX_SIZE, SIZE);
            if (GridUtils.solve(grid, BOX_SIZE, SIZE)) {
                if (GridUtils.validate(grid, BOX_SIZE, SIZE)) return grid;
            }
        }
        return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    },

    createPuzzle(solution, blanks) {
        const puzzle = solution.map(row => [...row]);
        const SIZE = puzzle.length;
        const BOX_SIZE = Math.sqrt(SIZE);
        const removed = new Set();
        
        // 第一步：每个宫格至少挖 1 个空（硬性要求）
        for (let b = 0; b < SIZE; b++) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
            const sc = (b % BOX_SIZE) * BOX_SIZE;
            const positions = [];
            for (let r = sr; r < sr + BOX_SIZE; r++)
                for (let c = sc; c < sc + BOX_SIZE; c++)
                    positions.push({ r, c });
            GridUtils.shuffle(positions);
            const pos = positions[0];
            puzzle[pos.r][pos.c] = 0;
            removed.add(`${pos.r},${pos.c}`);
        }
        
        // 第二步：如果用户指定的数量大于宫格数，随机挖剩余的空
        if (blanks > SIZE) {
            const remainingPositions = [];
            for (let r = 0; r < SIZE; r++)
                for (let c = 0; c < SIZE; c++)
                    if (!removed.has(`${r},${c}`)) remainingPositions.push({ r, c });
            GridUtils.shuffle(remainingPositions);
            
            const toRemove = Math.min(blanks - SIZE, remainingPositions.length);
            for (let i = 0; i < toRemove; i++) {
                puzzle[remainingPositions[i].r][remainingPositions[i].c] = 0;
            }
        }
        
        return puzzle;
    }
};

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