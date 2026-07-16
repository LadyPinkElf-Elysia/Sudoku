// SudokuGridHelper.js - 网格操作（单一职责）
import { GridUtils } from './SudokuEngine.js';

export class SudokuGridHelper {
    // 获取网格快照
    static getGridSnapshot(board) {
        return board.map(row => row.map(cell => cell.value));
    }

    // 同步冲突状态
    static syncConflicts(board, conflictMap) {
        for (const { r, c } of GridUtils.allCoords(board.length)) {
            board[r][c].conflict = conflictMap[r][c];
        }
    }

    // 更新局部冲突
    static updateConflictsLocal(board, row, col, BOX_SIZE, SIZE) {
        const { r: boxStartR, c: boxStartC } = GridUtils.boxStart(row, col, BOX_SIZE);
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const clearSet = new Set();

        // 收集需要清除冲突的格子（行+列+宫格）
        for (const { r, c } of GridUtils.rowCoords(row, SIZE)) clearSet.add(`${r},${c}`);
        for (const { r, c } of GridUtils.colCoords(col, SIZE)) clearSet.add(`${r},${c}`);
        for (const { r, c } of GridUtils.boxCoords(row, col, BOX_SIZE)) clearSet.add(`${r},${c}`);

        // 清除冲突
        clearSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            board[r][c].conflict = false;
        });

        // 检查行、列、宫的重复（使用 GridUtils.findDuplicates）
        const allPositions = [], messages = [];
        const boxLabel = `第${Math.floor(boxStartR / BOX_SIZE) + 1}行第${Math.floor(boxStartC / BOX_SIZE) + 1}列的宫`;

        for (const { coords, label, args } of [
            { coords: GridUtils.rowCoords, label: `第${row + 1}行`, args: [row, SIZE] },
            { coords: GridUtils.colCoords, label: `第${col + 1}列`, args: [col, SIZE] },
            { coords: GridUtils.boxCoords, label: boxLabel, args: [row, col, BOX_SIZE] }
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
}