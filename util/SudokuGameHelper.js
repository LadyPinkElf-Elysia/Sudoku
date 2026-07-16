// SudokuGameHelper.js - 游戏辅助功能（含历史记录管理）
import { SudokuGridHelper } from './SudokuGridHelper.js';
import { SudokuEngine } from './SudokuEngine.js';

export class SudokuGameHelper {
    // ===== 历史记录管理 =====

    // 推入新状态（存储完整单元格数据：value + editable）
    static saveState(historyMap, stepPointer, board) {
        stepPointer++;
        const snapshot = board.map(row => row.map(cell => ({
            value: cell.value,
            editable: cell.editable
        })));
        const newMap = { ...historyMap, [stepPointer]: snapshot };
        // 删除当前步骤之后的所有状态
        const keys = Object.keys(newMap).map(Number);
        for (let key of keys) {
            if (key > stepPointer) delete newMap[key];
        }
        return { newStepPointer: stepPointer, newHistoryMap: newMap };
    }

    // 应用历史记录（恢复完整单元格状态：value + editable）
    static applyHistory(board, snapshot, SIZE, BOX_SIZE) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                board[r][c].value = snapshot[r][c].value;
                board[r][c].editable = snapshot[r][c].editable;
                board[r][c].conflict = false;
            }
        }
        return SudokuGameHelper.refreshAllConflicts(board, SIZE, BOX_SIZE);
    }

    // ===== 冲突管理 =====

    // 生成区域列表（行、列、宫格）
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

    // 刷新所有冲突
    static refreshAllConflicts(board, SIZE, BOX_SIZE) {
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const conflictMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
        const messages = [];
        const regions = SudokuGameHelper.generateRegions(BOX_SIZE, SIZE);

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

    // ===== 提示 =====

    // 获取提示
    static getHint(board, row, col, BOX_SIZE, SIZE) {
        if (board[row][col].value !== 0) return { candidates: [] };
        const grid = SudokuGridHelper.getGridSnapshot(board);
        const candidates = SudokuEngine.getLegalCandidates(grid, row, col, BOX_SIZE, SIZE);
        return { candidates };
    }
}