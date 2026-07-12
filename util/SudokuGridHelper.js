export class SudokuGridHelper {
    static getGridSnapshot(board) {
        return board.map(row => row.map(cell => cell.value));
    }
    static applyGrid(board, gridData) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                if (board[r][c].value !== gridData[r][c]) {
                    board[r][c].value = gridData[r][c];
                }
            }
        }
    }
    static clearConflicts(board) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                board[r][c].conflict = false;
            }
        }
    }
    static generateRegions(BOX_SIZE, SIZE) {
        const regions = [];
        for (let r = 1; r <= SIZE; r++) regions.push({ r1: r, c1: 1, r2: r, c2: SIZE, label: `第${r}行` });
        for (let c = 1; c <= SIZE; c++) regions.push({ r1: 1, c1: c, r2: SIZE, c2: c, label: `第${c}列` });
        for (let b = 0; b < SIZE; b++) {
            const startR = Math.floor(b / BOX_SIZE) * BOX_SIZE + 1;
            const startC = (b % BOX_SIZE) * BOX_SIZE + 1;
            const boxRow = Math.floor(b / BOX_SIZE) + 1;
            const boxCol = (b % BOX_SIZE) + 1;
            regions.push({ r1: startR, c1: startC, r2: startR + BOX_SIZE - 1, c2: startC + BOX_SIZE - 1, label: `第${boxRow}行第${boxCol}列的宫` });
        }
        return regions;
    }
    static extractConflicts(vals, label) {
        const positions = [], messages = [];
        for (let val in vals) {
            if (vals[val].length > 1) {
                vals[val].forEach(p => positions.push(p));
                messages.push(`${label}有重复的数字 ${Number(val)}`);
            }
        }
        return { positions, messages };
    }
    static checkRow(grid, row, SIZE, label) {
        const vals = {};
        for (let c = 0; c < SIZE; c++) {
            const val = grid[row][c];
            if (val === 0) continue;
            if (!vals[val]) vals[val] = [];
            vals[val].push({ r: row, c });
        }
        return this.extractConflicts(vals, label);
    }
    static checkCol(grid, col, SIZE, label) {
        const vals = {};
        for (let r = 0; r < SIZE; r++) {
            const val = grid[r][col];
            if (val === 0) continue;
            if (!vals[val]) vals[val] = [];
            vals[val].push({ r, c: col });
        }
        return this.extractConflicts(vals, label);
    }
    static checkBox(grid, boxStartR, boxStartC, BOX_SIZE, SIZE, label) {
        const vals = {};
        for (let r = boxStartR; r < boxStartR + BOX_SIZE; r++) {
            for (let c = boxStartC; c < boxStartC + BOX_SIZE; c++) {
                const val = grid[r][c];
                if (val === 0) continue;
                if (!vals[val]) vals[val] = [];
                vals[val].push({ r, c });
            }
        }
        return this.extractConflicts(vals, label);
    }
    static syncConflicts(board, conflictMap) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                board[r][c].conflict = conflictMap[r][c];
            }
        }
    }
    static updateConflictsLocal(board, row, col, BOX_SIZE, SIZE) {
        const boxStartR = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxStartC = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        const grid = this.getGridSnapshot(board);
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
        let result = this.checkRow(grid, row, SIZE, `第${row+1}行`);
        allPositions.push(...result.positions); messages.push(...result.messages);
        result = this.checkCol(grid, col, SIZE, `第${col+1}列`);
        allPositions.push(...result.positions); messages.push(...result.messages);
        result = this.checkBox(grid, boxStartR, boxStartC, BOX_SIZE, SIZE, `第${Math.floor(boxStartR/BOX_SIZE)+1}行第${Math.floor(boxStartC/BOX_SIZE)+1}列的宫`);
        allPositions.push(...result.positions); messages.push(...result.messages);
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