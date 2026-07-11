// util/SudokuEngine.js
export class SudokuEngine {
    // 纯粹用来打乱挖空的位置，不影响答案的正确性
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // 严密检查某数字是否合法
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

    // 【核心】极速 MRV 回溯（不进行随机尝试，强行按顺序填，绝对收敛）
    static solve(grid, BOX_SIZE, SIZE) {
        let minCandidates = SIZE + 1;
        let targetR = -1, targetC = -1;
        let targetPossible = [];

        // 1. 全局扫描，找出当前候选数字最少的空格（MRV策略）
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) {
                    const possible = [];
                    for (let num = 1; num <= SIZE; num++) {
                        if (SudokuEngine.isValid(grid, r, c, num, BOX_SIZE, SIZE)) {
                            possible.push(num);
                        }
                    }
                    if (possible.length === 0) return false; // 死胡同，立刻回溯
                    if (possible.length < minCandidates) {
                        minCandidates = possible.length;
                        targetR = r;
                        targetC = c;
                        targetPossible = possible;
                    }
                }
            }
        }

        if (targetR === -1) return true; // 没有空格，解答完成！

        // 2. 确定性的按顺序尝试填数（禁止乱序，保证速度）
        for (let num of targetPossible) {
            grid[targetR][targetC] = num;
            if (SudokuEngine.solve(grid, BOX_SIZE, SIZE)) {
                return true;
            }
            grid[targetR][targetC] = 0; // 回溯
        }
        return false;
    }

    // 生成完美合法的完整答案（这里的生成 100% 正确）
    static generateSolution(BOX_SIZE, SIZE) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        const fillBox = (r, c) => {
            const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
            SudokuEngine.shuffle(nums); // 打乱宫格的初始填充，保证每次游戏盘面不同
            let idx = 0;
            for (let i = r; i < r + BOX_SIZE; i++)
                for (let j = c; j < c + BOX_SIZE; j++)
                    grid[i][j] = nums[idx++];
        };
        // 提前预填对角线宫格，极大降低递归深度
        for (let i = 0; i < SIZE; i += BOX_SIZE) fillBox(i, i);
        
        // 调用绝对不会卡死的求解器
        SudokuEngine.solve(grid, BOX_SIZE, SIZE);
        return grid;
    }

    // 随机挖空（这里不需要检验，因为来源 100% 正确）
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

    // 获取当前空格候选数字（给提示用）
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

    // 检查有没有冲突（给红字报错用）
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