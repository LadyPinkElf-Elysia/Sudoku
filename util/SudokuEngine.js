// util/SudokuEngine.js
export class SudokuEngine {
    // 数组随机打乱（仅用于增加每次游戏的随机性）
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // 检查填入的数字是否合法（保留给冲突检测和提示功能使用）
    static isValid(grid, row, col, num, BOX_SIZE, SIZE) {
        for (let i = 0; i < SIZE; i++) {
            if (grid[row][i] === num || grid[i][col] === num) return false;
        }
        const br = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const bc = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        for (let i = br; i < br + BOX_SIZE; i++)
            for (let j = bc; j < bc + BOX_SIZE; j++)
                if (grid[i][j] === num) return false;
        return true;
    }

    // 【核心变革】直接生成一个完美的拉丁方阵，舍弃所有递归回溯
    static generateSolution(BOX_SIZE, SIZE) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        // 生成基准行：1 ~ SIZE
        const baseLine = Array.from({ length: SIZE }, (_, i) => i + 1);
        // 打乱基准行，让每次生成的题目不一样
        SudokuEngine.shuffle(baseLine);

        for (let r = 0; r < SIZE; r++) {
            // 每一行相对于上一行，偏移一个宫格宽度（BOX_SIZE）
            const shift = r * BOX_SIZE;
            for (let c = 0; c < SIZE; c++) {
                // 循环移位赋值，自动确保行、列、宫都不重复
                grid[r][c] = baseLine[(shift + c) % SIZE];
            }
        }
        return grid;
    }

    // 挖空生成谜题
    static createPuzzle(solution, blanks) {
        const puzzle = solution.map(row => [...row]);
        const positions = [];
        for (let r = 0; r < puzzle.length; r++)
            for (let c = 0; c < puzzle.length; c++)
                positions.push({ r, c });
        SudokuEngine.shuffle(positions);
        for (let i = 0; i < blanks; i++) {
            const { r, c } = positions[i];
            puzzle[r][c] = 0;
        }
        return puzzle;
    }

    // 获取合法候选数字（用于提示功能）
    static getLegalCandidates(grid, row, col, BOX_SIZE, SIZE) {
        if (grid[row][col] !== 0) return [];
        const candidates = [];
        for (let num = 1; num <= SIZE; num++) {
            if (SudokuEngine.isValid(grid, row, col, num, BOX_SIZE, SIZE)) {
                candidates.push(num);
            }
        }
        return candidates;
    }

    // 检查指定范围内是否有冲突（用于红色冲突高亮）
    static checkRegion(grid, r1, c1, r2, c2) {
        const startR = Math.min(r1, r2) - 1, endR = Math.max(r1, r2) - 1;
        const startC = Math.min(c1, c2) - 1, endC = Math.max(c1, c2) - 1;
        const values = []; const posMap = {};
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                const val = grid[r][c];
                if (val === 0) continue;
                values.push(val);
                if (!posMap[val]) posMap[val] = [];
                posMap[val].push({ r, c });
            }
        }
        if (new Set(values).size < values.length) {
            const conflicts = []; const duplicateValues = [];
            for (let val in posMap) {
                if (posMap[val].length > 1) {
                    conflicts.push(...posMap[val]);
                    duplicateValues.push(Number(val));
                }
            }
            return { conflicts, duplicateValues };
        }
        return { conflicts: [], duplicateValues: [] };
    }
}