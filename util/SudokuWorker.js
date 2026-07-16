// SudokuWorker.js - Web Worker for Sudoku generation
// 包含完整的数独生成逻辑，独立于主线程运行

// 内部实现数独引擎（Worker无法直接导入ES6模块，所以需要内联代码）
const SudokuEngineWorker = {
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    },

    // 使用约束满足问题(CSP)的生成方法 - 更快的算法
    generateSolution(BOX_SIZE, SIZE) {
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
            SudokuEngineWorker.shuffle(nums);
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
        
        // 使用CSP方法填充剩余格子 - 优化版：维护候选数列表避免重复扫描
        const solveCSP = () => {
            // 找到候选数最少的空格
            let minCount = SIZE + 1;
            let bestR = -1, bestC = -1, bestNums = [];
            
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
            
            if (bestR === -1) return true;
            
            const bIdx = Math.floor(bestR / BOX_SIZE) * BOX_SIZE + Math.floor(bestC / BOX_SIZE);
            SudokuEngineWorker.shuffle(bestNums);
            
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
        
        // 对于大棋盘使用更高效的策略
        if (SIZE >= 36) {
            // 大棋盘：先填充更多宫格减少搜索空间
            // 填充所有对角线宫格
            for (let i = 0; i < SIZE; i += BOX_SIZE) {
                fillBoxFast(i);
            }
            // 再填充一些随机宫格
            const extraBoxes = Math.min(BOX_SIZE, Math.floor(SIZE / BOX_SIZE) - 1);
            const shuffledBoxes = Array.from({ length: SIZE }, (_, i) => i);
            SudokuEngineWorker.shuffle(shuffledBoxes);
            let filled = 0;
            for (let bi of shuffledBoxes) {
                if (bi % BOX_SIZE === 0 && bi < SIZE) continue; // 跳过已填充的对角线
                if (filled >= extraBoxes) break;
                // 检查此宫是否全空
                const sr = Math.floor(bi / BOX_SIZE) * BOX_SIZE;
                const sc = (bi % BOX_SIZE) * BOX_SIZE;
                let empty = true;
                for (let r = sr; r < sr + BOX_SIZE && empty; r++)
                    for (let c = sc; c < sc + BOX_SIZE && empty; c++)
                        if (grid[r][c] !== 0) empty = false;
                if (empty) {
                    fillBoxFast(bi);
                    filled++;
                }
            }
            
            // 尝试求解，最多3次
            for (let attempt = 0; attempt < 3; attempt++) {
                if (solveCSP()) return grid;
                // 失败时重新填充对角线宫格
                for (let r = 0; r < SIZE; r++)
                    for (let c = 0; c < SIZE; c++)
                        grid[r][c] = 0;
                for (let i = 0; i < SIZE; i++) {
                    rowSets[i].clear();
                    colSets[i].clear();
                    boxSets[i].clear();
                }
                for (let i = 0; i < SIZE; i += BOX_SIZE) fillBoxFast(i);
                // 重新填充额外宫格
                filled = 0;
                SudokuEngineWorker.shuffle(shuffledBoxes);
                for (let bi of shuffledBoxes) {
                    if (bi % BOX_SIZE === 0 && bi < SIZE) continue;
                    if (filled >= extraBoxes) break;
                    const sr = Math.floor(bi / BOX_SIZE) * BOX_SIZE;
                    const sc = (bi % BOX_SIZE) * BOX_SIZE;
                    let empty = true;
                    for (let r = sr; r < sr + BOX_SIZE && empty; r++)
                        for (let c = sc; c < sc + BOX_SIZE && empty; c++)
                            if (grid[r][c] !== 0) empty = false;
                    if (empty) {
                        fillBoxFast(bi);
                        filled++;
                    }
                }
            }
            return grid;
        }
        
        // 小棋盘（9x9, 16x16）：直接求解，最多3次尝试
        for (let attempt = 0; attempt < 3; attempt++) {
            if (solveCSP()) return grid;
            // 重置
            for (let r = 0; r < SIZE; r++)
                for (let c = 0; c < SIZE; c++)
                    grid[r][c] = 0;
            for (let i = 0; i < SIZE; i++) {
                rowSets[i].clear();
                colSets[i].clear();
                boxSets[i].clear();
            }
            for (let i = 0; i < SIZE; i += BOX_SIZE) fillBoxFast(i);
        }
        
        return grid;
    },

    createPuzzle(solution, blanks) {
        const puzzle = solution.map(row => [...row]);
        const positions = [];
        for (let r = 0; r < puzzle.length; r++)
            for (let c = 0; c < puzzle.length; c++)
                positions.push({ r, c });
        SudokuEngineWorker.shuffle(positions);
        for (let i = 0; i < blanks; i++) {
            const { r, c } = positions[i];
            puzzle[r][c] = 0;
        }
        return puzzle;
    }
};

// Worker 消息处理
self.onmessage = function(e) {
    try {
        const { BOX_SIZE, SIZE, blanks, type } = e.data;

        if (type === 'generate') {
            // 生成完整解
            const solution = SudokuEngineWorker.generateSolution(BOX_SIZE, SIZE);
            // 创建谜题
            const puzzle = SudokuEngineWorker.createPuzzle(solution, blanks);
            
            self.postMessage({
                success: true,
                puzzle: puzzle,
                solution: solution,
                type: 'generateComplete'
            });
        }
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message,
            type: 'generateError'
        });
    }
};