// main.js
const { createApp, markRaw } = Vue;
import { SudokuGameHelper } from './SudokuGameHelper.js';
import { LoginComponent } from './components/LoginComponent.js';
import { MainMenuComponent } from './components/MainMenuComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { CreatePuzzleComponent } from './components/CreatePuzzleComponent.js';
import { SearchPuzzlesComponent } from './components/SearchPuzzlesComponent.js';
import { GameComponent } from './components/GameComponent.js';

// Web Worker 管理
let sudokuWorker = null;
const getWorker = () => {
    if (!sudokuWorker) {
        sudokuWorker = new Worker(`./util/SudokuWorker.js?t=${Date.now()}`, { type: 'module' });
    }
    return sudokuWorker;
};

const app = createApp({
    data() {
        return {
            page: 'login',
            currentUser: null,
            config: { N: 3, NMin: 3, NMax: 6, blanks: null, mode: 'infinite', errorLimit: 0, errorLimitMin: 0, errorLimitMax: 99 },
            game: { started: false, errors: 0, over: false, complete: false, board: [], selectedRow: null, selectedCol: null, conflictMessages: [], hintMessage: '', isGenerating: false },
            historyMap: {}, stepPointer: -1, zoom: 1.0, BOX_SIZE: 0, SIZE: 0,
            currentPuzzleData: null
        };
    },
    computed: {
        minBlanks() { if (!this.config.N) return 0; const total = this.config.N * this.config.N * this.config.N * this.config.N; return Math.ceil(total * 0.10); },
        maxBlanks() { if (!this.config.N) return 0; const total = this.config.N * this.config.N * this.config.N * this.config.N; return Math.floor(total * 0.40); }
    },
    watch: { 
        'config.N'() { 
            this.config.N = Math.max(this.config.NMin, Math.min(this.config.NMax, this.config.N));
            if (this.config.blanks < this.minBlanks) this.config.blanks = this.minBlanks; 
            if (this.config.blanks > this.maxBlanks) this.config.blanks = this.maxBlanks; 
        },
        'config.blanks'() {
            this.config.blanks = Math.max(this.minBlanks, Math.min(this.maxBlanks, this.config.blanks));
        }
    },
    methods: {
        // ===== 页面导航 =====
        onLogin(user) {
            this.currentUser = user;
            this.page = 'mainMenu';
        },
        onLogout() {
            this.currentUser = null;
            this.page = 'login';
        },
        goToConfig() { this.page = 'config'; },
        goToCreatePuzzle() { this.page = 'createPuzzle'; },
        goToSearchPuzzles() { this.page = 'searchPuzzles'; },
        goToMainMenu() { this.page = 'mainMenu'; },
        
        // ===== 游戏启动 =====
        startSystemGame() {
            this.page = 'config';
        },
        startFromConfig() {
            if (this.game.isGenerating) return;
            
            let blanks = this.config.blanks !== null ? this.config.blanks : this.minBlanks;
            blanks = Math.max(this.minBlanks, Math.min(this.maxBlanks, blanks));
            this.config.blanks = blanks;
            this.game.errors = 0;
            this.game.over = false;
            this.game.complete = false;
            this.game.started = true;
            this.game.isGenerating = true;
            this.currentPuzzleData = null;
            this.BOX_SIZE = this.config.N;
            this.SIZE = this.config.N * this.config.N;
            
            // 立即切换到游戏页面显示加载遮罩
            this.page = 'game';
            
            if (sudokuWorker) sudokuWorker.terminate();
            sudokuWorker = null;
            const worker = getWorker();
            
            const handleMessage = (e) => {
                if (e.data.type === 'generateComplete' && e.data.success) {
                    this._applyBoard(e.data.puzzle);
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                } else if (e.data.type === 'generateError') {
                    console.error('Worker generation error:', e.data.error);
                    this.game.isGenerating = false;
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                    this._generateSynchronous();
                }
            };
            
            const handleError = (error) => {
                console.error('Worker error:', error);
                this.game.isGenerating = false;
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                this._generateSynchronous();
            };
            
            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);
            
            worker.postMessage({
                type: 'generate',
                BOX_SIZE: this.BOX_SIZE,
                SIZE: this.SIZE,
                blanks: this.config.blanks
            });
        },
        _generateSynchronous() {
            const puzzle = SudokuGameHelper.generateSync(this.BOX_SIZE, this.SIZE, this.config.blanks);
            this._applyBoard(puzzle);
        },
        _applyBoard(puzzle) {
            this.game.board = markRaw(SudokuGameHelper.createBoard(puzzle));
            this.game.selectedRow = null; this.game.selectedCol = null;
            this.game.conflictMessages = [];
            this.historyMap = {}; this.stepPointer = -1;
            this.game.hintMessage = ''; this.zoom = 1.0;
            this.game.isGenerating = false;
            this.saveState();
        },
        saveState() {
            const result = SudokuGameHelper.saveState(this.historyMap, this.stepPointer, this.game.board);
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
            this.game.hintMessage = '';
        },
        
        // ===== 用户题目 =====
        startUserPuzzle(puzzleData) {
            this.currentPuzzleData = puzzleData;
            this.SIZE = puzzleData.size || puzzleData.SIZE;
            this.BOX_SIZE = puzzleData.box_size || puzzleData.BOX_SIZE;
            this.config.N = this.BOX_SIZE;
            
            this.game.errors = 0;
            this.game.over = false;
            this.game.complete = false;
            this.game.started = true;
            this.game.isGenerating = false;
            
            // 解析题目数据（API 返回的是 JSON 字符串）
            let puzzle = puzzleData.puzzle_data || puzzleData.puzzle;
            if (typeof puzzle === 'string') {
                try { puzzle = JSON.parse(puzzle); } catch(e) { console.error('解析题目失败:', e); puzzle = []; }
            }
            if (!Array.isArray(puzzle) || puzzle.length === 0) {
                console.error('无效的题目数据:', puzzleData);
                alert('题目数据无效，无法开始游戏');
                return;
            }
            this._applyBoard(puzzle);
            this.page = 'game';
        },
        async startRandomUserPuzzle() {
            const { PuzzleStorage } = await import('./PuzzleStorage.js');
            const puzzle = await PuzzleStorage.getRandom();
            if (!puzzle) {
                alert('暂无用户题目');
                return;
            }
            this.startUserPuzzle(puzzle);
        },
        
        // ===== 游戏重置 =====
        resetGame() {
            if (this.game.isGenerating) return;
            this.game.started = false;
            this.game.hintMessage = '';
            this.page = 'mainMenu';
        },
        
        // ===== 游戏状态更新 =====
        updateGame(newGame) { this.game = newGame; },
        updateHistoryMap(newMap) { this.historyMap = newMap; },
        updateStepPointer(newPtr) { this.stepPointer = newPtr; },
        updateZoom(newZoom) { this.zoom = newZoom; }
    },
    mounted() { 
        this.config.blanks = this.minBlanks; 
    }
});

app.component('login-component', LoginComponent);
app.component('main-menu-component', MainMenuComponent);
app.component('config-component', ConfigComponent);
app.component('create-puzzle-component', CreatePuzzleComponent);
app.component('search-puzzles-component', SearchPuzzlesComponent);
app.component('game-component', GameComponent);

app.mount('#app');