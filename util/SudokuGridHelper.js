// SudokuGridHelper.js - 网格操作（单一职责）
export class SudokuGridHelper {
    // 获取网格快照
    static getGridSnapshot(board) {
        return board.map(row => row.map(cell => cell.value));
    }

    // 应用网格数据
    static applyGrid(board, gridData) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                if (board[r][c].value !== gridData[r][c]) {
                    board[r][c].value = gridData[r][c];
                }
            }
        }
    }

    // 清除所有冲突标记
    static clearConflicts(board) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                board[r][c].conflict = false;
            }
        }
    }

    // 生成区域列表
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
            const boxRow = Math.floor(b / BOX_SIZE) + 1;
            const boxCol = (b % BOX_SIZE) + 1;
            regions.push({
                r1: startR, c1: startC,
                r2: startR + BOX_SIZE - 1, c2: startC + BOX_SIZE - 1,
                label: `第${boxRow}行第${boxCol}列的宫`
            });
        }
        return regions;
    }

    // 同步冲突状态
    static syncConflicts(board, conflictMap) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                board[r][c].conflict = conflictMap[r][c];
            }
        }
    }

    // 更新局部冲突
    static updateConflictsLocal(board, row, col, BOX_SIZE, SIZE) {
        const boxStartR = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxStartC = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const clearSet = new Set();

        for (let c = 0; c < SIZE; c++) clearSet.add(`${row},${c}`);
        for (let r = 0; r < SIZE; r++) clearSet.add(`${r},${col}`);
        for (let r = boxStartR; r < boxStartR + BOX_SIZE; r++) {
            for (let c = boxStartC; c < boxStartC + BOX_SIZE; c++) {
                clearSet.add(`${r},${c}`);
            }
        }

        clearSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            board[r][c].conflict = false;
        });

        const allPositions = [], messages = [];
        let result = SudokuGridHelper.checkRow(grid, row, SIZE, `第${row + 1}行`);
        allPositions.push(...result.positions);
        messages.push(...result.messages);

        result = SudokuGridHelper.checkCol(grid, col, SIZE, `第${col + 1}列`);
        allPositions.push(...result.positions);
        messages.push(...result.messages);

        result = SudokuGridHelper.checkBox(grid, boxStartR, boxStartC, BOX_SIZE, SIZE,
            `第${Math.floor(boxStartR / BOX_SIZE) + 1}行第${Math.floor(boxStartC / BOX_SIZE) + 1}列的宫`);
        allPositions.push(...result.positions);
        messages.push(...result.messages);

        allPositions.forEach(p => { board[p.r][p.c].conflict = true; });
        return messages;
    }

    // 检查是否完成
    static checkComplete(board, SIZE) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                if (cell.value === 0 || cell.conflict) return false;
            }
        }
        return true;
    }

    // 检查行重复
    static checkRow(grid, row, SIZE, label) {
        const rowVals = [], posMap = {};
        for (let c = 0; c < SIZE; c++) {
            const val = grid[row][c];
            if (val === 0) continue;
            rowVals.push(val);
            if (!posMap[val]) posMap[val] = [];
            posMap[val].push({ r: row, c });
        }
        if (new Set(rowVals).size < rowVals.length) {
            return SudokuGridHelper.extractDuplicates(posMap, label);
        }
        return { positions: [], messages: [] };
    }

    // 检查列重复
    static checkCol(grid, col, SIZE, label) {
        const colVals = [], posMap = {};
        for (let r = 0; r < SIZE; r++) {
            const val = grid[r][col];
            if (val === 0) continue;
            colVals.push(val);
            if (!posMap[val]) posMap[val] = [];
            posMap[val].push({ r, c: col });
        }
        if (new Set(colVals).size < colVals.length) {
            return SudokuGridHelper.extractDuplicates(posMap, label);
        }
        return { positions: [], messages: [] };
    }

    // 检查宫重复
    static checkBox(grid, boxStartR, boxStartC, BOX_SIZE, SIZE, label) {
        const boxVals = [], posMap = {};
        for (let r = boxStartR; r < boxStartR + BOX_SIZE; r++) {
            for (let c = boxStartC; c < boxStartC + BOX_SIZE; c++) {
                const val = grid[r][c];
                if (val === 0) continue;
                boxVals.push(val);
                if (!posMap[val]) posMap[val] = [];
                posMap[val].push({ r, c });
            }
        }
        if (new Set(boxVals).size < boxVals.length) {
            return SudokuGridHelper.extractDuplicates(posMap, label);
        }
        return { positions: [], messages: [] };
    }

    // 提取重复项
    static extractDuplicates(posMap, label) {
        const positions = [], messages = [];
        for (let val in posMap) {
            if (posMap[val].length > 1) {
                positions.push(...posMap[val]);
                messages.push(`${label}有重复的数字 ${Number(val)}`);
            }
        }
        return { positions, messages };
    }
}