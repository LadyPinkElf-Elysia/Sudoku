// BoardManager.js - 棋盘管理类（纯函数，只负责接收数据、处理数据、返回新数据）
// 所有方法都是静态的、纯函数，不依赖外部状态

// ===== 基础工具（纯函数，无副作用） =====
export const _ = {
    cloneNum(board) { return board.map(row => [...row]); },
    cloneObj(board) { return board.map(row => row.map(cell => ({ ...cell }))); },
    cell(value, editable = true, given = false) { return { value, editable, conflict: false, given }; },
    grid(board) { return board.map(row => row.map(cell => cell.value)); },
    boxStart(r, c, B) { return { r: Math.floor(r / B) * B, c: Math.floor(c / B) * B }; },
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } },
    isValid(grid, r, c, n, B, S) {
        for (let i = 0; i < S; i++) { if (grid[r][i] === n || grid[i][c] === n) return false; }
        const { r: sr, c: sc } = _.boxStart(r, c, B);
        for (let i = sr; i < sr + B; i++) for (let j = sc; j < sc + B; j++) if (grid[i][j] === n) return false;
        return true;
    },
    candidates(grid, r, c, B, S) {
        if (grid[r][c] !== 0) return [];
        const res = [];
        for (let n = 1; n <= S; n++) { if (_.isValid(grid, r, c, n, B, S)) res.push(n); }
        return res;
    },
    solve(grid, B, S) {
        let min = S + 1, bestR = -1, bestC = -1, bestCand = [];
        for (let r = 0; r < S; r++) {
            for (let c = 0; c < S; c++) {
                if (grid[r][c] !== 0) continue;
                const cand = _.candidates(grid, r, c, B, S);
                if (cand.length === 0) return false;
                if (cand.length < min) { min = cand.length; bestR = r; bestC = c; bestCand = cand; if (min === 1) break; }
            }
            if (min === 1) break;
        }
        if (bestR === -1) return true;
        _.shuffle(bestCand);
        for (const n of bestCand) { grid[bestR][bestC] = n; if (_.solve(grid, B, S)) return true; grid[bestR][bestC] = 0; }
        return false;
    },
    findDups(grid, coords, ...args) {
        const map = {};
        for (const { r, c } of coords(...args)) {
            const v = grid[r][c]; if (!v) continue;
            if (!map[v]) map[v] = []; map[v].push({ r, c });
        }
        const conflicts = [], vals = [];
        for (const v in map) { if (map[v].length > 1) { conflicts.push(...map[v]); vals.push(Number(v)); } }
        return { conflicts, vals };
    },
    *row(r, S) { for (let c = 0; c < S; c++) yield { r, c }; },
    *col(c, S) { for (let r = 0; r < S; r++) yield { r, c }; },
    *box(r, c, B) { const { r: sr, c: sc } = _.boxStart(r, c, B); for (let r = sr; r < sr + B; r++) for (let c = sc; c < sc + B; c++) yield { r, c }; },
    *rect(r1, c1, r2, c2) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) yield { r, c }; },
    *all(S) { for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) yield { r, c }; },
};

// ===== 冲突管理 =====
export const Conflict = {
    update(board, r, c, B, S) {
        const grid = _.grid(board);
        const { r: sr, c: sc } = _.boxStart(r, c, B);
        const clear = new Set();
        for (const p of _.row(r, S)) clear.add(`${p.r},${p.c}`);
        for (const p of _.col(c, S)) clear.add(`${p.r},${p.c}`);
        for (const p of _.box(r, c, B)) clear.add(`${p.r},${p.c}`);
        clear.forEach(k => { const [r, c] = k.split(',').map(Number); board[r][c].conflict = false; });
        const all = [], msgs = [];
        for (const { coords, label, args } of [
            { coords: _.row, label: `第${r + 1}行`, args: [r, S] },
            { coords: _.col, label: `第${c + 1}列`, args: [c, S] },
            { coords: _.box, label: `第${Math.floor(sr / B) + 1}行第${Math.floor(sc / B) + 1}列的宫`, args: [r, c, B] }
        ]) {
            const { conflicts } = _.findDups(grid, coords, ...args);
            all.push(...conflicts);
            if (conflicts.length > 0) msgs.push(`${label}有重复的数字`);
        }
        all.forEach(p => { board[p.r][p.c].conflict = true; });
        return msgs;
    },
    refresh(board, B, S) {
        const grid = _.grid(board);
        const map = Array.from({ length: S }, () => Array(S).fill(false));
        const msgs = [];
        for (let r = 1; r <= S; r++) {
            const { conflicts, vals } = _.findDups(grid, _.row, r - 1, S);
            conflicts.forEach(p => map[p.r][p.c] = true);
            vals.forEach(v => msgs.push(`第${r}行有重复的数字 ${v}`));
        }
        for (let c = 1; c <= S; c++) {
            const { conflicts, vals } = _.findDups(grid, _.col, c - 1, S);
            conflicts.forEach(p => map[p.r][p.c] = true);
            vals.forEach(v => msgs.push(`第${c}列有重复的数字 ${v}`));
        }
        for (let b = 0; b < S; b++) {
            const sr = Math.floor(b / B) * B, sc = (b % B) * B;
            const { conflicts, vals } = _.findDups(grid, _.rect, sr, sc, sr + B - 1, sc + B - 1);
            conflicts.forEach(p => map[p.r][p.c] = true);
            vals.forEach(v => msgs.push(`第${Math.floor(b / B) + 1}行第${(b % B) + 1}列的宫有重复的数字 ${v}`));
        }
        for (const { r, c } of _.all(S)) board[r][c].conflict = map[r][c];
        return { messages: msgs };
    },
    isComplete(board, S) {
        for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) { const cell = board[r][c]; if (cell.value === 0 || cell.conflict) return false; }
        return true;
    }
};

// ===== 历史记录 =====
export const History = {
    save(map, ptr, board) {
        ptr++;
        const snap = board.map(row => row.map(cell => ({ value: cell.value, editable: cell.editable })));
        const newMap = { ...map, [ptr]: snap };
        Object.keys(newMap).map(Number).forEach(k => { if (k > ptr) delete newMap[k]; });
        return { ptr, map: newMap };
    },
    apply(board, snap, B, S) {
        for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) { board[r][c].value = snap[r][c].value; board[r][c].editable = snap[r][c].editable; board[r][c].conflict = false; }
        return Conflict.refresh(board, B, S);
    }
};

// ===== Canvas 渲染 =====
function drawCanvas(canvas, board, S, B, sr, sc, zoom = 1.0) {
    if (!canvas || !board || !board.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const ds = Math.floor(canvas.parentElement.clientWidth * 0.95);
    const ps = Math.floor(ds * zoom * dpr), cs = Math.floor(ds * zoom);
    if (canvas.width !== ps || canvas.height !== ps) { canvas.width = ps; canvas.height = ps; canvas.style.width = cs + 'px'; canvas.style.height = cs + 'px'; }
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    const cell = ds / S;
    ctx.clearRect(0, 0, ds, ds); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ds, ds);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const boxR = sr !== null ? Math.floor(sr / B) : -1, boxC = sc !== null ? Math.floor(sc / B) : -1;
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
        const cell = board[r][c], x = c * cell, y = r * cell;
        const cr = Math.floor(r / B), cc = Math.floor(c / B);
        ctx.fillStyle = cell.conflict ? '#fecaca' : (sr === r && sc === c ? '#bbf7d0' : (boxR !== -1 && cr === boxR && cc === boxC ? '#f0f4f8' : ((cr + cc) % 2 === 0 ? '#fff' : '#fafafa')));
        ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
        const cell = board[r][c]; if (!cell.value) continue;
        const x = c * cell, y = r * cell, fs = Math.round(cell * 0.45);
        ctx.font = `500 ${fs}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.fillStyle = cell.conflict ? '#dc2626' : (cell.editable ? '#475569' : '#1f2937');
        ctx.fillText(cell.value, x + cell / 2, y + cell / 2);
    }
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) { const cell = board[r][c]; if (cell.conflict && !cell.editable) { const x = c * cell, y = r * cell; ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4); } }
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= S; i += B) { const p = i * cell; ctx.moveTo(p, 0); ctx.lineTo(p, ds); ctx.moveTo(0, p); ctx.lineTo(ds, p); }
    ctx.stroke();
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = 1; i < S; i++) { if (i % B === 0) continue; const p = i * cell; ctx.moveTo(p, 0); ctx.lineTo(p, ds); ctx.moveTo(0, p); ctx.lineTo(ds, p); }
    ctx.stroke();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2.5; ctx.strokeRect(0.5, 0.5, ds - 1, ds - 1);
}

// ===== 键盘事件 =====
function handleKeyDown(e, state, cb) {
    if (!state.started || state.isGenerating || state.complete || state.over) return;
    const k = e.key;
    if (k >= '1' && k <= '9') { const n = parseInt(k); if (n <= state.SIZE) cb.inputNumber(n); }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') cb.clearSelected();
    else if (k === 'ArrowUp' && state.selectedRow !== null) { e.preventDefault(); cb.selectCell(Math.max(0, state.selectedRow - 1), state.selectedCol); }
    else if (k === 'ArrowDown' && state.selectedRow !== null) { e.preventDefault(); cb.selectCell(Math.min(state.SIZE - 1, state.selectedRow + 1), state.selectedCol); }
    else if (k === 'ArrowLeft' && state.selectedCol !== null) { e.preventDefault(); cb.selectCell(state.selectedRow, Math.max(0, state.selectedCol - 1)); }
    else if (k === 'ArrowRight' && state.selectedCol !== null) { e.preventDefault(); cb.selectCell(state.selectedRow, Math.min(state.SIZE - 1, state.selectedCol + 1)); }
    else if (k === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? cb.redo() : cb.undo(); }
    else if (k === 'y' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); cb.redo(); }
}

// ===== Web Worker 代码 =====
const workerCode = `function bS(r,c,B){return{r:Math.floor(r/B)*B,c:Math.floor(c/B)*B}}function sh(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}function iv(g,r,c,n,B,S){for(let i=0;i<S;i++){if(g[r][i]===n||g[i][c]===n)return false}const{sr,sc}=bS(r,c,B);for(let i=sr;i<sr+B;i++)for(let j=sc;j<sc+B;j++)if(g[i][j]===n)return false;return true}function gc(g,r,c,B,S){if(g[r][c]!==0)return[];const a=[];for(let n=1;n<=S;n++){if(iv(g,r,c,n,B,S))a.push(n)}return a}function sl(g,B,S){let m=S+1,bR=-1,bC=-1,bC=[];for(let r=0;r<S;r++){for(let c=0;c<S;c++){if(g[r][c]!==0)continue;const a=gc(g,r,c,B,S);if(a.length===0)return false;if(a.length<m){m=a.length;bR=r;bC=c;bC=a;if(m===1)break}}if(m===1)break}if(bR===-1)return true;sh(bC);for(let n of bC){g[bR][bC]=n;if(sl(g,B,S))return true;g[bR][bC]=0}return false}function fd(g,B,S){for(let b=0;b<S;b+=B+1){const sr=Math.floor(b/B)*B,sc=(b%B)*B;const n=Array.from({length:S},(_,i)=>i+1);sh(n);let idx=0;for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++)g[r][c]=n[idx++]}}function vl(g,B,S){for(let r=0;r<S;r++){const s=new Set();for(let c=0;c<S;c++){if(g[r][c]===0)continue;if(s.has(g[r][c]))return false;s.add(g[r][c])}}for(let c=0;c<S;c++){const s=new Set();for(let r=0;r<S;r++){if(g[r][c]===0)continue;if(s.has(g[r][c]))return false;s.add(g[r][c])}}for(let b=0;b<S;b++){const sr=Math.floor(b/B)*B,sc=(b%B)*B;const s=new Set();for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++){if(g[r][c]===0)continue;if(s.has(g[r][c]))return false;s.add(g[r][c])}}return true}function gS(B,S){for(let a=0;a<(S<=9?10:50);a++){const g=Array.from({length:S},()=>Array(S).fill(0));fd(g,B,S);if(sl(g,B,S)&&vl(g,B,S))return g}const g=Array.from({length:S},()=>Array(S).fill(0));for(let b=0;b<S;b+=B+1){const sr=Math.floor(b/B)*B,sc=(b%B)*B;let n=1;for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++)g[r][c]=n++}if(sl(g,B,S)&&vl(g,B,S))return g;return Array.from({length:S},()=>Array(S).fill(0))}function cP(s,b){const p=s.map(r=>[...r]);const S=p.length,B=Math.sqrt(S);b=Math.max(S,Math.min(S*S-1,b||S));const rm=new Set();for(let i=0;i<S;i++){const sr=Math.floor(i/B)*B,sc=(i%B)*B;const pos=[];for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++)pos.push({r,c});sh(pos);p[pos[0].r][pos[0].c]=0;rm.add(pos[0].r+','+pos[0].c)}if(b>S){const rp=[];for(let r=0;r<S;r++)for(let c=0;c<S;c++)if(!rm.has(r+','+c))rp.push({r,c});sh(rp);const t=Math.min(b-S,rp.length);for(let i=0;i<t;i++)p[rp[i].r][rp[i].c]=0}return p}
self.onmessage=function(e){try{const{BOX_SIZE,SIZE,blanks,type}=e.data;if(type==='generate'){const s=gS(BOX_SIZE,SIZE);const p=cP(s,blanks);self.postMessage({success:true,puzzle:p,type:'generateComplete'})}}catch(error){self.postMessage({success:false,error:error.message,type:'generateError'})}};`;

let _worker = null;
function _getWorker() {
    if (!_worker) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        _worker = new Worker(url);
        URL.revokeObjectURL(url);
    }
    return _worker;
}
function _termWorker() { if (_worker) { _worker.terminate(); _worker = null; } }

// ===== BoardManager - 只保留最通用的方法 =====
export const BoardManager = {
    // 棋盘生成
    createEmptyBoard: (size) => Array.from({ length: size }, () => Array(size).fill(0)),
    createBoardFromPuzzle: (puzzle) => puzzle.map(row => row.map(v => _.cell(v, v === 0, v !== 0))),
    toObjectBoard: (board) => board.map(row => row.map(v => _.cell(v))),
    toNumberBoard: (board) => board.map(row => row.map(cell => cell.value)),
    serializeBoard: (board, meta = false) => board.map(row => row.map(cell => { const b = { value: cell.value, editable: cell.editable }; return meta ? { ...b, conflict: false, given: cell.given } : b; })),

    // 渲染
    render: (id, board, size, boxSize, sr, sc, zoom = 1.0) => {
        const canvas = document.getElementById(id);
        if (!canvas || !board || !board.length) return;
        drawCanvas(canvas, board, size, boxSize, sr, sc, zoom);
    },
    getCellFromClick: (e, id, size) => {
        const canvas = document.getElementById(id); if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const ds = Math.floor(canvas.parentElement.clientWidth * 0.95);
        const scale = rect.width / ds;
        const x = (e.clientX - rect.left) / scale, y = (e.clientY - rect.top) / scale;
        const cell = ds / size;
        const r = Math.floor(y / cell), c = Math.floor(x / cell);
        return (r >= 0 && r < size && c >= 0 && c < size) ? { row: r, col: c } : null;
    },
    bindClick: (handler, id = 'sudokuCanvas') => {
        const canvas = document.getElementById(id); if (!canvas) return;
        canvas.removeEventListener('click', handler); canvas.addEventListener('click', handler);
    },
    unbindClick: (handler, id = 'sudokuCanvas') => {
        const canvas = document.getElementById(id); if (!canvas) return;
        canvas.removeEventListener('click', handler);
    },

    // 键盘
    handleKeyDown: (e, state, cb) => handleKeyDown(e, state, cb),

    // ===== 游戏状态操作（复合方法） =====
    initGame: (puzzle) => {
        const board = BoardManager.createBoardFromPuzzle(puzzle);
        return { board, selectedRow: null, selectedCol: null, conflictMessages: [], hintMessage: '', historyMap: {}, stepPointer: -1, zoom: 1.0 };
    },
    applyPuzzle: (state, puzzle) => {
        const init = BoardManager.initGame(puzzle);
        return { ...state, ...init, errors: 0, over: false, complete: false, started: true, isGenerating: false };
    },
    operateGameCell: (game, config, row, col, num, history) => {
        if (game.complete || game.over || row === null || col === null || game.isGenerating) return null;
        const cell = game.board[row][col]; if (!cell.editable) return null;
        const r = BoardManager.operateCell(game.board, row, col, num, { boxSize: config.boxSize, size: config.boxSize * config.boxSize, history });
        if (!r) return null;
        let ng = { ...game, board: r.board, conflictMessages: r.conflictMessages, hintMessage: '' };
        if (cell.conflict && config.mode === 'limited') { ng.errors++; if (ng.errors > config.errorLimit) { ng.over = true; ng.selectedRow = null; ng.selectedCol = null; } }
        if (r.complete) { ng.complete = true; ng.selectedRow = null; ng.selectedCol = null; ng.hintMessage = ''; }
        return { newGame: ng, newHistoryMap: r.historyMap, newStepPointer: r.stepPointer };
    },
    navigateHistory: (board, historyMap, targetStep, boxSize, size) => {
        if (!historyMap[targetStep]) return null;
        const nb = _.cloneObj(board);
        const r = History.apply(nb, historyMap[targetStep], boxSize, size);
        return { board: nb, messages: r.messages };
    },
    getHint: (board, row, col, boxSize, size) => {
        if (row === null || col === null) return '💡 请先在棋盘上点击选中一个空格';
        const cell = board[row][col];
        if (!cell.editable) return '💡 此格是初始题目，不可编辑';
        if (cell.value !== 0) return '💡 此格已填入数字';
        const grid = _.grid(board);
        const cand = _.candidates(grid, row, col, boxSize, size);
        return cand.length === 0 ? '💡 此格当前没有任何合法数字可以填入，请检查盘面是否有冲突' : `💡 此格可以填：${cand.join('、')}`;
    },

    // 操作格子（核心方法）
    operateCell: (board, row, col, num, opts = {}) => {
        const { isNumberBoard, boxSize, size, history } = opts;
        if (isNumberBoard) {
            const nb = _.cloneNum(board);
            nb[row][col] = (nb[row][col] === num) ? 0 : num;
            return { board: nb };
        }
        const cell = board[row][col];
        if (!cell || !cell.editable) return null;
        const nb = _.cloneObj(board);
        let newMap, newPtr;
        if (history) { const r = History.save(history.historyMap, history.stepPointer, board); newMap = r.map; newPtr = r.ptr; }
        nb[row][col].value = (nb[row][col].value === num) ? 0 : num;
        const msgs = boxSize && size ? Conflict.update(nb, row, col, boxSize, size) : [];
        const complete = size ? Conflict.isComplete(nb, size) : false;
        return { board: nb, historyMap: newMap, stepPointer: newPtr, conflictMessages: msgs, complete };
    },

    // 数独生成
    generate: (BOX_SIZE, SIZE, blanks) => new Promise((resolve) => {
        _termWorker();
        const w = _getWorker();
        const t = setTimeout(() => { w.terminate(); _worker = null; resolve(BoardManager.generateSync(BOX_SIZE, SIZE, blanks)); }, 30000);
        w.onmessage = (e) => { clearTimeout(t); if (e.data.type === 'generateComplete' && e.data.success) resolve(e.data.puzzle); else resolve(BoardManager.generateSync(BOX_SIZE, SIZE, blanks)); };
        w.onerror = () => { clearTimeout(t); resolve(BoardManager.generateSync(BOX_SIZE, SIZE, blanks)); };
        w.postMessage({ type: 'generate', BOX_SIZE, SIZE, blanks });
    }),
    generateSync: (BOX_SIZE, SIZE, blanks) => {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        for (let b = 0; b < SIZE; b += (BOX_SIZE + 1)) {
            const sr = Math.floor(b / BOX_SIZE) * BOX_SIZE, sc = (b % BOX_SIZE) * BOX_SIZE;
            const nums = Array.from({ length: SIZE }, (_, i) => i + 1); _.shuffle(nums); let idx = 0;
            for (let r = sr; r < sr + BOX_SIZE; r++) for (let c = sc; c < sc + BOX_SIZE; c++) grid[r][c] = nums[idx++];
        }
        _.solve(grid, BOX_SIZE, SIZE);
        const puzzle = _.cloneNum(grid);
        const b2 = Math.max(SIZE, Math.min(SIZE * SIZE - 1, blanks || SIZE));
        const rm = new Set();
        for (let i = 0; i < SIZE; i++) {
            const sr = Math.floor(i / BOX_SIZE) * BOX_SIZE, sc = (i % BOX_SIZE) * BOX_SIZE;
            const pos = [];
            for (let r = sr; r < sr + BOX_SIZE; r++) for (let c = sc; c < sc + BOX_SIZE; c++) pos.push({ r, c });
            _.shuffle(pos); puzzle[pos[0].r][pos[0].c] = 0; rm.add(`${pos[0].r},${pos[0].c}`);
        }
        if (b2 > SIZE) {
            const rp = [];
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!rm.has(`${r},${c}`)) rp.push({ r, c });
            _.shuffle(rp); const tr = Math.min(b2 - SIZE, rp.length);
            for (let i = 0; i < tr; i++) puzzle[rp[i].r][rp[i].c] = 0;
        }
        return puzzle;
    },
    abort: () => _termWorker()
};

// ===== BoardMixin - 棋盘组件通用逻辑（Vue mixin） =====
export const BoardMixin = {
    props: { zoom: { type: Number, default: 1.0 } },
    emits: ['update:zoom'],
    computed: {
        boxSize() { return this.config?.boxSize || this.$props.boxSize || 3; },
        size() { return this.boxSize * this.boxSize; },
        getSizeLabel() { const s = this.size; return s > 0 ? s + '×' + s : '配置中'; },
        stepKeys() { return Object.keys(this.historyMap || {}).map(Number).sort((a, b) => a - b); }
    },
    methods: {
        zoomIn() { const n = Math.min(3.0, this.zoom + 0.1); this.$emit('update:zoom', n); this.$nextTick(() => this._renderBoard()); },
        zoomOut() { const n = Math.max(0.5, this.zoom - 0.1); this.$emit('update:zoom', n); this.$nextTick(() => this._renderBoard()); },
        _renderBoard() {
            const id = this._canvasId || 'sudokuCanvas';
            const board = this._getBoard();
            if (!board || !board.length) return;
            BoardManager.render(id, board, this.size, this.boxSize, this._getSelectedRow(), this._getSelectedCol(), this.zoom);
        },
        _onCanvasClick(e) {
            const id = this._canvasId || 'sudokuCanvas';
            const pos = BoardManager.getCellFromClick(e, id, this.size);
            if (pos) this._onCellClick(pos.row, pos.col);
        },
        _bindCanvas() {
            const id = this._canvasId || 'sudokuCanvas';
            this._clickHandler = (e) => this._onCanvasClick(e);
            this.$nextTick(() => { BoardManager.bindClick(this._clickHandler, id); this._renderBoard(); });
        },
        _unbindCanvas() {
            const id = this._canvasId || 'sudokuCanvas';
            if (this._clickHandler) { BoardManager.unbindClick(this._clickHandler, id); this._clickHandler = null; }
        },
        _bindKeyboard() { document.addEventListener('keydown', this._handleKeyDown); },
        _unbindKeyboard() { document.removeEventListener('keydown', this._handleKeyDown); },
        _handleKeyDown(e) {
            const state = this._getGameState ? this._getGameState() : {};
            BoardManager.handleKeyDown(e, {
                started: true, isGenerating: state.isGenerating || false, complete: state.complete || false, over: state.over || false,
                SIZE: this.size, selectedRow: this._getSelectedRow(), selectedCol: this._getSelectedCol()
            }, {
                inputNumber: (num) => this._onInputNumber(num),
                clearSelected: () => this._onClearSelected(),
                selectCell: (r, c) => this._onCellClick(r, c),
                undo: () => this.undo ? this.undo() : this._onUndo(),
                redo: () => this.redo ? this.redo() : this._onRedo()
            });
        },
        _saveState() { const r = History.save(this.historyMap, this.stepPointer, this._getBoard()); this._onSaveState(r.newHistoryMap, r.newStepPointer); },
        _onUndo() { if (this.stepPointer > 0) this._onMovePointer(this.stepPointer - 1); },
        _onRedo() { if (this.historyMap[this.stepPointer + 1]) this._onMovePointer(this.stepPointer + 1); },
        _getBoard() { return []; },
        _getSelectedRow() { return null; },
        _getSelectedCol() { return null; },
        _onCellClick(row, col) {},
        _onInputNumber(num) {},
        _onClearSelected() {},
        _onHistoryNavigate(messages) {},
        _onSaveState(newHistoryMap, newStepPointer) {},
        _onMovePointer(targetStep) {}
    }
};