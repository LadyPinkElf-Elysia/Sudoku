// SudokuGridUtils.js - 数独网格通用工具函数（纯算法，无状态）
export const GridUtils = {
    // 获取宫格起始行列
    boxStart(row, col, BOX_SIZE) {
        return {
            r: Math.floor(row / BOX_SIZE) * BOX_SIZE,
            c: Math.floor(col / BOX_SIZE) * BOX_SIZE
        };
    },

    // 坐标生成器
    *rowCoords(row, SIZE) {
        for (let c = 0; c < SIZE; c++) yield { r: row, c };
    },
    *colCoords(col, SIZE) {
        for (let r = 0; r < SIZE; r++) yield { r, c: col };
    },
    *boxCoords(row, col, BOX_SIZE) {
        const { r: sr, c: sc } = GridUtils.boxStart(row, col, BOX_SIZE);
        for (let r = sr; r < sr + BOX_SIZE; r++)
            for (let c = sc; c < sc + BOX_SIZE; c++)
                yield { r, c };
    },
    *rectCoords(r1, c1, r2, c2) {
        for (let r = r1; r <= r2; r++)
            for (let c = c1; c <= c2; c++)
                yield { r, c };
    },
    *allCoords(SIZE) {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                yield { r, c };
    },

    // 遍历格子，对每个值调用 fn(val, r, c)，fn 返回 true 时提前终止
    each(grid, coords, fn, ...args) {
        for (const { r, c } of coords(...args)) {
            if (fn(grid[r][c], r, c)) return true;
        }
        return false;
    },

    // 检查一组格子是否有重复值
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

    // 验证整个数独
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

    // 随机打乱数组
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },

    // 填充对角线宫格
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

    // 检查某个位置放某个数是否合法
    isValid(grid, row, col, num, BOX_SIZE, SIZE) {
        for (let i = 0; i < SIZE; i++) {
            if (grid[row][i] === num || grid[i][col] === num) return false;
        }
        const { r: sr, c: sc } = GridUtils.boxStart(row, col, BOX_SIZE);
        for (let i = sr; i < sr + BOX_SIZE; i++)
            for (let j = sc; j < sc + BOX_SIZE; j++)
                if (grid[i][j] === num) return false;
        return true;
    },

    // 获取某个格子的候选数
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

    // MRV 回溯求解（直接修改 grid）
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

    // 生成数独
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

    // 创建谜题（挖空）- 保证每个宫格至少有一个空格，以用户指定数量为准
    createPuzzle(solution, blanks) {
        const puzzle = solution.map(row => [...row]);
        const SIZE = puzzle.length;
        const BOX_SIZE = Math.sqrt(SIZE);
        const totalCells = SIZE * SIZE;
        
        // 限制 blanks 在合理范围内
        blanks = Math.max(SIZE, Math.min(totalCells - 1, blanks || SIZE));
        
        // 第一步：每个宫格至少挖 1 个空（硬性要求）
        const removed = new Set();
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
        
        // 第二步：如果还需要更多空格，随机挖剩余的空
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
    },

    // 查找一组格子中的重复值及其位置
    findDuplicates(grid, coords, ...args) {
        const posMap = {};
        GridUtils.each(grid, coords, (val, r, c) => {
            if (val === 0) return false;
            if (!posMap[val]) posMap[val] = [];
            posMap[val].push({ r, c });
            return false;
        }, ...args);
        const conflicts = [], duplicateValues = [];
        for (let val in posMap) {
            if (posMap[val].length > 1) {
                conflicts.push(...posMap[val]);
                duplicateValues.push(Number(val));
            }
        }
        return { conflicts, duplicateValues };
    }
};