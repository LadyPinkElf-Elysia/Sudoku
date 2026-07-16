// SudokuGameHelper.js - 游戏辅助功能（单一职责）
import { SudokuGridHelper } from './SudokuGridHelper.js';
import { SudokuHistory } from './SudokuHistory.js';
import { SudokuEngine } from './SudokuEngine.js';

export class SudokuGameHelper {
    // 保存游戏状态
    static saveState(historyMap, stepPointer, board) {
        const snapshot = SudokuGridHelper.getGridSnapshot(board);
        return SudokuHistory.push(historyMap, stepPointer, snapshot);
    }

    // 应用历史记录
    static applyHistory(board, gridData, SIZE, BOX_SIZE) {
        SudokuGridHelper.applyGrid(board, gridData);
        return SudokuGameHelper.refreshAllConflicts(board, SIZE, BOX_SIZE);
    }

    // 刷新所有冲突
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

    // 获取提示
    static getHint(board, row, col, BOX_SIZE, SIZE) {
        if (board[row][col].value !== 0) return { candidates: [] };
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const candidates = SudokuEngine.getLegalCandidates(grid, row, col, BOX_SIZE, SIZE);
        return { candidates };
    }
}