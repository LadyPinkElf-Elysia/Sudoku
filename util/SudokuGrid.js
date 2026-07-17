// SudokuGrid.js - 数独网格工具 + 游戏辅助功能（合并版）

// ===== 网格工具 =====
export const GridUtils = {
    boxStart(row, col, BOX_SIZE) {
        return {
            r: Math.floor(row / BOX_SIZE) * BOX_SIZE,
            c: Math.floor(col / BOX_SIZE) * BOX_SIZE
        };
    },

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
            if (grid[row][i] === num || grid[i][col] === num) return false;
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
        const maxAttempts = SIZE <= 9 ? 10 : 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
            GridUtils.fillDiagonalBoxes(grid, BOX_SIZE, SIZE);
            if (GridUtils.solve(grid, BOX_SIZE, SIZE)) {
                if (GridUtils.validate(grid, BOX_SIZE, SIZE)) return grid;
            }
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
        if (GridUtils.solve(grid, BOX_SIZE, SIZE)) {
            if (GridUtils.validate(grid, BOX_SIZE, SIZE)) return grid;
        }
        return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    },

    createPuzzle(solution, blanks) {
        const puzzle = solution.map(row => [...row]);
        const SIZE = puzzle.length;
        const BOX_SIZE = Math.sqrt(SIZE);
        const totalCells = SIZE * SIZE;
        
        blanks = Math.max(SIZE, Math.min(totalCells - 1, blanks || SIZE));
        
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

// ===== 网格操作 =====
export class SudokuGridHelper {
    static getGridSnapshot(board) {
        return board.map(row => row.map(cell => cell.value));
    }

    static syncConflicts(board, conflictMap) {
        for (const { r, c } of GridUtils.allCoords(board.length)) {
            board[r][c].conflict = conflictMap[r][c];
        }
    }

    static updateConflictsLocal(board, row, col, BOX_SIZE, SIZE) {
        const { r: boxStartR, c: boxStartC } = GridUtils.boxStart(row, col, BOX_SIZE);
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const clearSet = new Set();

        for (const { r, c } of GridUtils.rowCoords(row, SIZE)) clearSet.add(`${r},${c}`);
        for (const { r, c } of GridUtils.colCoords(col, SIZE)) clearSet.add(`${r},${c}`);
        for (const { r, c } of GridUtils.boxCoords(row, col, BOX_SIZE)) clearSet.add(`${r},${c}`);

        clearSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            board[r][c].conflict = false;
        });

        const allPositions = [], messages = [];

        for (const { coords, label, args } of [
            { coords: GridUtils.rowCoords, label: `第${row + 1}行`, args: [row, SIZE] },
            { coords: GridUtils.colCoords, label: `第${col + 1}列`, args: [col, SIZE] },
            { coords: GridUtils.boxCoords, label: `第${Math.floor(boxStartR / BOX_SIZE) + 1}行第${Math.floor(boxStartC / BOX_SIZE) + 1}列的宫`, args: [row, col, BOX_SIZE] }
        ]) {
            const { conflicts } = GridUtils.findDuplicates(grid, coords, ...args);
            allPositions.push(...conflicts);
            if (conflicts.length > 0) {
                messages.push(`${label}有重复的数字`);
            }
        }

        allPositions.forEach(p => { board[p.r][p.c].conflict = true; });
        return messages;
    }

    static checkComplete(board, SIZE) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                if (cell.value === 0 || cell.conflict) return false;
            }
        }
        return true;
    }
}

// ===== 游戏辅助功能 =====
export class SudokuGameHelper {
    // 历史记录管理
    static saveState(historyMap, stepPointer, board) {
        stepPointer++;
        const snapshot = board.map(row => row.map(cell => ({
            value: cell.value,
            editable: cell.editable
        })));
        const newMap = { ...historyMap, [stepPointer]: snapshot };
        const keys = Object.keys(newMap).map(Number);
        for (let key of keys) {
            if (key > stepPointer) delete newMap[key];
        }
        return { newStepPointer: stepPointer, newHistoryMap: newMap };
    }

    static applyHistory(board, snapshot, BOX_SIZE, SIZE) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                board[r][c].value = snapshot[r][c].value;
                board[r][c].editable = snapshot[r][c].editable;
                board[r][c].conflict = false;
            }
        }
        return SudokuGameHelper.refreshAllConflicts(board, BOX_SIZE, SIZE);
    }

    // 冲突管理
    static generateRegions(BOX_SIZE, SIZE) {
        const regions = [];
        for (let r = 1; r <= SIZE; r++) {
            regions.push({ r1: r, c1: 1, r2: r, c2: SIZE, label: `第${r}行` });
        }
        for (let c = 1; c <= SIZE; c++) {
            regions.push({ r1: 1, c1: c, r2: SIZE, c2: c, label: `第${c}列` });
        }
        for (let b = 0; b < SIZE; b++) {
            const startR = Math.floor(b / BOX_SIZE) * BOX_SIZE + 1;
            const startC = (b % BOX_SIZE) * BOX_SIZE + 1;
            regions.push({
                r1: startR, c1: startC,
                r2: startR + BOX_SIZE - 1, c2: startC + BOX_SIZE - 1,
                label: `第${Math.floor(b / BOX_SIZE) + 1}行第${(b % BOX_SIZE) + 1}列的宫`
            });
        }
        return regions;
    }

    static refreshAllConflicts(board, BOX_SIZE, SIZE) {
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const conflictMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
        const messages = [];
        const regions = SudokuGameHelper.generateRegions(BOX_SIZE, SIZE);

        for (let region of regions) {
            const result = GridUtils.findDuplicates(grid, GridUtils.rectCoords, region.r1 - 1, region.c1 - 1, region.r2 - 1, region.c2 - 1);
            result.conflicts.forEach(p => conflictMap[p.r][p.c] = true);
            [...new Set(result.duplicateValues)].forEach(val => {
                messages.push(`${region.label}有重复的数字 ${val}`);
            });
        }

        SudokuGridHelper.syncConflicts(board, conflictMap);
        return { messages };
    }

    // 提示
    static getHint(board, row, col, BOX_SIZE, SIZE) {
        if (board[row][col].value !== 0) return [];
        const grid = SudokuGridHelper.getGridSnapshot(board);
        return GridUtils.getCandidates(grid, row, col, BOX_SIZE, SIZE);
    }

    // 游戏逻辑
    static createBoard(puzzle) {
        return puzzle.map(row => row.map(val => ({
            value: val,
            editable: val === 0,
            conflict: false
        })));
    }

    static navigateHistory(board, historyMap, targetStep, BOX_SIZE, SIZE) {
        if (!historyMap[targetStep]) return null;
        const result = SudokuGameHelper.applyHistory(board, historyMap[targetStep], BOX_SIZE, SIZE);
        return { messages: result.messages };
    }

    // 题目验证
    static validateSolution(solution, BOX_SIZE, SIZE) {
        if (!solution || solution.length !== SIZE) {
            return { valid: false, message: `题目尺寸不正确，应为 ${SIZE}×${SIZE}` };
        }
        for (let r = 0; r < SIZE; r++) {
            if (!solution[r] || solution[r].length !== SIZE) {
                return { valid: false, message: `第${r + 1}行尺寸不正确` };
            }
        }

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = solution[r][c];
                if (typeof val !== 'number' || val < 0 || val > SIZE || !Number.isInteger(val)) {
                    return { valid: false, message: `第${r + 1}行第${c + 1}列的值 ${val} 不合法（应为 0-${SIZE} 的整数）` };
                }
            }
        }

        for (let r = 0; r < SIZE; r++) {
            const set = new Set();
            for (let c = 0; c < SIZE; c++) {
                const val = solution[r][c];
                if (val === 0) continue;
                if (set.has(val)) return { valid: false, message: `第${r + 1}行有重复的数字 ${val}` };
                set.add(val);
            }
        }

        for (let c = 0; c < SIZE; c++) {
            const set = new Set();
            for (let r = 0; r < SIZE; r++) {
                const val = solution[r][c];
                if (val === 0) continue;
                if (set.has(val)) return { valid: false, message: `第${c + 1}列有重复的数字 ${val}` };
                set.add(val);
            }
        }

        for (let b = 0; b < SIZE; b++) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
            const sc = (b % BOX_SIZE) * BOX_SIZE;
            const set = new Set();
            for (let r = sr; r < sr + BOX_SIZE; r++) {
                for (let c = sc; c < sc + BOX_SIZE; c++) {
                    const val = solution[r][c];
                    if (val === 0) continue;
                    if (set.has(val)) return { valid: false, message: `第${Math.floor(b / BOX_SIZE) + 1}行第${(b % BOX_SIZE) + 1}列的宫有重复的数字 ${val}` };
                    set.add(val);
                }
            }
        }

        const grid = solution.map(row => [...row]);
        const hasSolution = GridUtils.solve(grid, BOX_SIZE, SIZE);
        if (!hasSolution) return { valid: false, message: '此题目无解，请检查题目设置' };

        return { valid: true, message: '✅ 题目验证通过！' };
    }

    static getHintMessage(board, row, col, BOX_SIZE, SIZE) {
        if (row === null || col === null) return '💡 请先在棋盘上点击选中一个空格';
        const cell = board[row][col];
        if (!cell.editable) return '💡 此格是初始题目，不可编辑';
        if (cell.value !== 0) return '💡 此格已填入数字';
        const candidates = SudokuGameHelper.getHint(board, row, col, BOX_SIZE, SIZE);
        return candidates.length === 0
            ? '💡 此格当前没有任何合法数字可以填入，请检查盘面是否有冲突'
            : `💡 此格可以填：${candidates.join('、')}`;
    }
}