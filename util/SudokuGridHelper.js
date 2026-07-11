// util/SudokuGridHelper.js
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

    // 优化点3：新增同步冲突方法，消除 main.js 里的循环
    static syncConflicts(board, conflictMap) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board.length; c++) {
                board[r][c].conflict = conflictMap[r][c];
            }
        }
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