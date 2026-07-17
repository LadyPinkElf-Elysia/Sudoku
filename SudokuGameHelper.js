// SudokuGameHelper.js - 游戏辅助功能（含历史记录管理）
import { SudokuGridHelper, GridUtils } from './util/SudokuGrid.js';

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
            regions.push({
                r1: startR, c1: startC,
                r2: startR + BOX_SIZE - 1, c2: startC + BOX_SIZE - 1,
                label: `第${Math.floor(b / BOX_SIZE) + 1}行第${(b % BOX_SIZE) + 1}列的宫`
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
            const result = GridUtils.findDuplicates(grid, GridUtils.rectCoords, region.r1 - 1, region.c1 - 1, region.r2 - 1, region.c2 - 1);
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
        if (board[row][col].value !== 0) return [];
        const grid = SudokuGridHelper.getGridSnapshot(board);
        return GridUtils.getCandidates(grid, row, col, BOX_SIZE, SIZE);
    }

    // ===== 游戏逻辑 =====

    // 从 puzzle 创建 board 对象
    static createBoard(puzzle) {
        return puzzle.map(row => row.map(val => ({
            value: val,
            editable: val === 0,
            conflict: false
        })));
    }

    // 历史导航
    static navigateHistory(board, historyMap, targetStep, SIZE, BOX_SIZE) {
        if (!historyMap[targetStep]) return null;
        const result = SudokuGameHelper.applyHistory(board, historyMap[targetStep], SIZE, BOX_SIZE);
        return { messages: result.messages };
    }

    // ===== 题目验证 =====

    // 验证参考答案是否合法（使用集合检测，检查行列宫格是否有重复）
    // 返回 { valid: boolean, message: string }
    static validateSolution(solution, BOX_SIZE, SIZE) {
        // 检查尺寸
        if (!solution || solution.length !== SIZE) {
            return { valid: false, message: `题目尺寸不正确，应为 ${SIZE}×${SIZE}` };
        }
        for (let r = 0; r < SIZE; r++) {
            if (!solution[r] || solution[r].length !== SIZE) {
                return { valid: false, message: `第${r + 1}行尺寸不正确` };
            }
        }

        // 检查每个格子是否在 0~SIZE 范围内
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = solution[r][c];
                if (typeof val !== 'number' || val < 0 || val > SIZE || !Number.isInteger(val)) {
                    return { valid: false, message: `第${r + 1}行第${c + 1}列的值 ${val} 不合法（应为 0-${SIZE} 的整数）` };
                }
            }
        }

        // 使用集合检测行列宫格是否有重复
        // 检查行
        for (let r = 0; r < SIZE; r++) {
            const set = new Set();
            for (let c = 0; c < SIZE; c++) {
                const val = solution[r][c];
                if (val === 0) continue;
                if (set.has(val)) {
                    return { valid: false, message: `第${r + 1}行有重复的数字 ${val}` };
                }
                set.add(val);
            }
        }

        // 检查列
        for (let c = 0; c < SIZE; c++) {
            const set = new Set();
            for (let r = 0; r < SIZE; r++) {
                const val = solution[r][c];
                if (val === 0) continue;
                if (set.has(val)) {
                    return { valid: false, message: `第${c + 1}列有重复的数字 ${val}` };
                }
                set.add(val);
            }
        }

        // 检查宫格
        for (let b = 0; b < SIZE; b++) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE;
            const sc = (b % BOX_SIZE) * BOX_SIZE;
            const set = new Set();
            for (let r = sr; r < sr + BOX_SIZE; r++) {
                for (let c = sc; c < sc + BOX_SIZE; c++) {
                    const val = solution[r][c];
                    if (val === 0) continue;
                    if (set.has(val)) {
                        return { valid: false, message: `第${Math.floor(b / BOX_SIZE) + 1}行第${(b % BOX_SIZE) + 1}列的宫有重复的数字 ${val}` };
                    }
                    set.add(val);
                }
            }
        }

        // 检查是否至少有一个解（即每个空格都能填）
        // 使用 GridUtils 的 solve 来验证（传入深拷贝，避免修改原数组）
        const grid = solution.map(row => [...row]);
        const hasSolution = GridUtils.solve(grid, BOX_SIZE, SIZE);
        if (!hasSolution) {
            return { valid: false, message: '此题目无解，请检查题目设置' };
        }

        return { valid: true, message: '✅ 题目验证通过！' };
    }

    // 获取提示消息
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