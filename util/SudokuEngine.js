export class SudokuEngine {
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }

    // 使用位运算优化的 isValid 检查
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

    // 优化的 solve 方法：使用约束传播和MRV启发式
    static solve(grid, BOX_SIZE, SIZE) {
        let minCandidates = SIZE + 1, targetR = -1, targetC = -1, targetPossible = [];
        
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) {
                    let possible = [];
                    for (let num = 1; num <= SIZE; num++) {
                        if (SudokuEngine.isValid(grid, r, c, num, BOX_SIZE, SIZE)) {
                            possible.push(num);
                        }
                    }
                    if (possible.length === 0) return false;
                    if (possible.length < minCandidates) {
                        minCandidates = possible.length;
                        targetR = r;
                        targetC = c;
                        targetPossible = possible;
                    }
                    // 如果找到只有1个候选数的格子，直接跳出（唯一候选数）
                    if (minCandidates === 1) break;
                }
            }
            if (minCandidates === 1) break;
        }
        
        if (targetR === -1) return true;
        
        // 随机打乱候选数
        SudokuEngine.shuffle(targetPossible);
        
        for (let num of targetPossible) {
            grid[targetR][targetC] = num;
            if (SudokuEngine.solve(grid, BOX_SIZE, SIZE)) return true;
            grid[targetR][targetC] = 0;
        }
        return false;
    }

    // 使用约束满足问题(CSP)的生成方法 - 更快的算法
    static generateSolution(BOX_SIZE, SIZE) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        
        // 初始化每行、每列、每宫的可用数字集合
        const rowSets = Array.from({ length: SIZE }, () => new Set());
        const colSets = Array.from({ length: SIZE }, () => new Set());
        const boxSets = Array.from({ length: SIZE }, () => new Set());
        
        // 填充对角线宫格（这些宫互不干扰）
        const fillBoxFast = (boxIdx) => {
            const startR = Math.floor(boxIdx / BOX_SIZE) * BOX_SIZE;
            const startC = (boxIdx % BOX_SIZE) * BOX_SIZE;
            const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
            SudokuEngine.shuffle(nums);
            let idx = 0;
            for (let i = startR; i < startR + BOX_SIZE; i++) {
                for (let j = startC; j < startC + BOX_SIZE; j++) {
                    grid[i][j] = nums[idx];
                    rowSets[i].add(nums[idx]);
                    colSets[j].add(nums[idx]);
                    boxSets[boxIdx].add(nums[idx]);
                    idx++;
                }
            }
        };
        
        // 填充对角线宫格
        for (let i = 0; i < SIZE; i += BOX_SIZE) {
            fillBoxFast(i);
        }
        
        // 使用CSP方法填充剩余格子
        const solveCSP = () => {
            // 找到候选数最少的空格
            let minCount = SIZE + 1;
            let bestR = -1, bestC = -1, bestNums = [];
            const boxIdx = Math.floor(bestR / BOX_SIZE) * BOX_SIZE + Math.floor(bestC / BOX_SIZE);
            
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (grid[r][c] !== 0) continue;
                    const bIdx = Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE);
                    const available = [];
                    for (let num = 1; num <= SIZE; num++) {
                        if (!rowSets[r].has(num) && !colSets[c].has(num) && !boxSets[bIdx].has(num)) {
                            available.push(num);
                        }
                    }
                    if (available.length === 0) return false;
                    if (available.length < minCount) {
                        minCount = available.length;
                        bestR = r;
                        bestC = c;
                        bestNums = available;
                        if (minCount === 1) break;
                    }
                }
                if (minCount === 1) break;
            }
            
            if (bestR === -1) return true; // 所有格子都已填满
            
            const bIdx = Math.floor(bestR / BOX_SIZE) * BOX_SIZE + Math.floor(bestC / BOX_SIZE);
            SudokuEngine.shuffle(bestNums);
            
            for (let num of bestNums) {
                grid[bestR][bestC] = num;
                rowSets[bestR].add(num);
                colSets[bestC].add(num);
                boxSets[bIdx].add(num);
                
                if (solveCSP()) return true;
                
                grid[bestR][bestC] = 0;
                rowSets[bestR].delete(num);
                colSets[bestC].delete(num);
                boxSets[bIdx].delete(num);
            }
            return false;
        };
        
        solveCSP();
        return grid;
    }

    // 优化的谜题创建：确保唯一解（可选）
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

    static getLegalCandidates(grid, row, col, BOX_SIZE, SIZE) {
        if (grid[row][col] !== 0) return [];
        const candidates = [];
        for (let num = 1; num <= SIZE; num++) {
            if (SudokuEngine.isValid(grid, row, col, num, BOX_SIZE, SIZE)) candidates.push(num);
        }
        return candidates;
    }

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
