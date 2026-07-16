// CreatePuzzleComponent.js - 出题组件
import { SudokuGameHelper } from './SudokuGameHelper.js';
import { PuzzleStorage } from './PuzzleStorage.js';

export const CreatePuzzleComponent = {
    template: `
        <div class="create-puzzle-panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>✏️ 出题</h2>
            </div>
            
            <div class="config-item">
                <label>宫格大小 N:</label>
                <div class="input-group">
                    <input type="number" v-model.number="puzzleN" :min="2" :max="6">
                    <span class="hint">生成 {{ puzzleN * puzzleN }} x {{ puzzleN * puzzleN }} 的棋盘</span>
                </div>
            </div>
            
            <div class="config-item">
                <label>题目标题（可选）:</label>
                <div class="input-group">
                    <input type="text" v-model="puzzleTitle" placeholder="给题目起个名字" style="width:100%;max-width:300px;">
                </div>
            </div>
            
            <div class="puzzle-input-area">
                <div class="input-label">
                    <span>📋 题目（数字用空格或逗号分隔，0表示空格）</span>
                    <button class="btn btn-secondary btn-sm" @click="fillExample">填入示例</button>
                </div>
                <textarea v-model="puzzleInput" rows="6" placeholder="例如：&#10;5 3 0 0 7 0 0 0 0&#10;6 0 0 1 9 5 0 0 0&#10;0 9 8 0 0 0 0 6 0&#10;8 0 0 0 6 0 0 0 3&#10;4 0 0 8 0 3 0 0 1&#10;7 0 0 0 2 0 0 0 6&#10;0 6 0 0 0 0 2 8 0&#10;0 0 0 4 1 9 0 0 5&#10;0 0 0 0 8 0 0 7 9"></textarea>
            </div>
            
            <div class="puzzle-input-area">
                <div class="input-label">
                    <span>✅ 参考答案（完整解，格式同上）</span>
                </div>
                <textarea v-model="solutionInput" rows="6" placeholder="输入完整的参考答案..."></textarea>
            </div>
            
            <button class="btn btn-primary btn-block" @click="submitPuzzle" :disabled="!puzzleInput || !solutionInput">📤 提交题目</button>
            
            <div v-if="message" class="auth-message" :class="{ success: message.includes('成功') || message.includes('通过') }">{{ message }}</div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true }
    },
    emits: ['back'],
    data() {
        return {
            puzzleInput: '',
            solutionInput: '',
            puzzleTitle: '',
            puzzleN: 3,
            message: ''
        };
    },
    methods: {
        parseGridInput(text) {
            const lines = text.trim().split('\n').filter(line => line.trim() !== '');
            const grid = [];
            for (const line of lines) {
                const nums = line.trim().split(/[\s,，]+/).map(s => {
                    const n = parseInt(s);
                    return isNaN(n) ? 0 : n;
                });
                if (nums.length > 0) grid.push(nums);
            }
            return grid;
        },
        fillExample() {
            this.puzzleInput = `5 3 0 0 7 0 0 0 0
6 0 0 1 9 5 0 0 0
0 9 8 0 0 0 0 6 0
8 0 0 0 6 0 0 0 3
4 0 0 8 0 3 0 0 1
7 0 0 0 2 0 0 0 6
0 6 0 0 0 0 2 8 0
0 0 0 4 1 9 0 0 5
0 0 0 0 8 0 0 7 9`;
            this.solutionInput = `5 3 4 6 7 8 9 1 2
6 7 2 1 9 5 3 4 8
1 9 8 3 4 2 5 6 7
8 5 9 7 6 1 4 2 3
4 2 6 8 5 3 7 9 1
7 1 3 9 2 4 8 5 6
9 6 1 5 3 7 2 8 4
2 8 7 4 1 9 6 3 5
3 4 5 2 8 6 1 7 9`;
            this.puzzleN = 3;
        },
        async submitPuzzle() {
            this.message = '';
            
            const puzzle = this.parseGridInput(this.puzzleInput);
            const solution = this.parseGridInput(this.solutionInput);
            
            if (puzzle.length === 0) {
                this.message = '请输入题目';
                return;
            }
            if (solution.length === 0) {
                this.message = '请输入参考答案';
                return;
            }
            
            const SIZE = puzzle.length;
            const BOX_SIZE = this.puzzleN;
            
            if (solution.length !== SIZE) {
                this.message = '题目和参考答案尺寸不一致';
                return;
            }
            
            // 验证参考答案
            const result = SudokuGameHelper.validateSolution(solution, BOX_SIZE, SIZE);
            if (!result.valid) {
                this.message = result.message;
                return;
            }
            
            // 保存题目
            this.message = '正在保存...';
            const saveResult = await PuzzleStorage.add(
                this.currentUser.id,
                this.currentUser.username,
                puzzle,
                solution,
                SIZE,
                BOX_SIZE,
                this.puzzleTitle || undefined
            );
            
            if (saveResult.success) {
                this.message = '✅ 题目保存成功！题目ID: ' + saveResult.puzzleId;
                this.puzzleInput = '';
                this.solutionInput = '';
                this.puzzleTitle = '';
            } else {
                this.message = saveResult.message || '保存失败，请重试';
            }
        }
    }
};