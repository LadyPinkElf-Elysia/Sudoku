export class SudokuEngine {
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
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
    static solve(grid, BOX_SIZE, SIZE) {
        let minCandidates = SIZE + 1, targetR = -1, targetC = -1, targetPossible = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) {
                    const possible = [];
                    for (let num = 1; num <= SIZE; num++) {
                        if (SudokuEngine.isValid(grid, r, c, num, BOX_SIZE, SIZE)) possible.push(num);
                    }
                    if (possible.length === 0) return false;
                    if (possible.length < minCandidates) { minCandidates = possible.length; targetR = r; targetC = c; targetPossible = possible; }
                }
            }
        }
        if (targetR === -1) return true;
        for (let num of targetPossible) {
            grid[targetR][targetC] = num;
            if (SudokuEngine.solve(grid, BOX_SIZE, SIZE)) return true;
            grid[targetR][targetC] = 0;
        }
        return false;
    }
    static generateSolution(BOX_SIZE, SIZE) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        const fillBox = (r, c) => {
            const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
            SudokuEngine.shuffle(nums); let idx = 0;
            for (let i = r; i < r + BOX_SIZE; i++)
                for (let j = c; j < c + BOX_SIZE; j++)
                    grid[i][j] = nums[idx++];
        };
        for (let i = 0; i < SIZE; i += BOX_SIZE) fillBox(i, i);
        SudokuEngine.solve(grid, BOX_SIZE, SIZE);
        return grid;
    }
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