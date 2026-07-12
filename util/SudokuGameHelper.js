import { SudokuGridHelper } from './SudokuGridHelper.js';
import { SudokuHistory } from './SudokuHistory.js';
import { SudokuEngine } from './SudokuEngine.js';

export class SudokuGameHelper {
    static saveState(historyMap, stepPointer, board) {
        const snapshot = SudokuGridHelper.getGridSnapshot(board);
        return SudokuHistory.push(historyMap, stepPointer, snapshot);
    }
    static applyHistory(board, gridData, SIZE, BOX_SIZE) {
        SudokuGridHelper.applyGrid(board, gridData);
        const result = this.refreshAllConflicts(board, SIZE, BOX_SIZE);
        return result;
    }
    static refreshAllConflicts(board, SIZE, BOX_SIZE) {
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const conflictMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
        const messages = [];
        const regions = SudokuGridHelper.generateRegions(BOX_SIZE, SIZE);
        for (let region of regions) {
            const result = SudokuEngine.checkRegion(grid, region.r1, region.c1, region.r2, region.c2);
            result.conflicts.forEach(p => conflictMap[p.r][p.c] = true);
            [...new Set(result.duplicateValues)].forEach(val => {
                messages.push(`${region.label}有重复的数字 ${val}`);
            });
        }
        SudokuGridHelper.syncConflicts(board, conflictMap);
        return { messages };
    }
    static getHint(board, row, col, BOX_SIZE, SIZE) {
        if (board[row][col].value !== 0) return { candidates: [] };
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const candidates = SudokuEngine.getLegalCandidates(grid, row, col, BOX_SIZE, SIZE);
        return { candidates };
    }
}