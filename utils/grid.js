// grid.js - 棋盘纯函数
// 第一层：scan / dup / clone
// 第二层：scanRow / scanCol / scanBox / rowDup / colDup / boxDup / cand
// 第三层：conflict / done / solve / cell / fromPuzzle / toNum / empty
// UI层：setupCanvas / drawCell / drawLines / render

export const Grid = {

    // ===== 第一层：基本操作 =====

    scan(grid, r1, c1, r2, c2) {
        const vals = []
        for (let r = r1; r <= r2; r++)
            for (let c = c1; c <= c2; c++)
                if (grid[r][c] !== 0) vals.push(grid[r][c])
        return vals
    },

    dup(arr) {
        return arr.length !== new Set(arr).size
    },

    clone(board) {
        return board[0]?.[0]?.value != null
            ? board.map(r => r.map(c => ({ ...c })))
            : board.map(r => [...r])
    },

    // ===== 第二层：常用组合 =====

    scanRow(grid, r, S) { return Grid.scan(grid, r, 0, r, S - 1) },
    scanCol(grid, c, S) { return Grid.scan(grid, 0, c, S - 1, c) },
    scanBox(grid, r, c, B) {
        const sr = Math.floor(r / B) * B, sc = Math.floor(c / B) * B
        return Grid.scan(grid, sr, sc, sr + B - 1, sc + B - 1)
    },

    rowDup(grid, r, S) { return Grid.dup(Grid.scanRow(grid, r, S)) },
    colDup(grid, c, S) { return Grid.dup(Grid.scanCol(grid, c, S)) },
    boxDup(grid, r, c, B) { return Grid.dup(Grid.scanBox(grid, r, c, B)) },

    cand(grid, r, c, B, S) {
        if (grid[r][c] !== 0) return []
        const res = []
        for (let n = 1; n <= S; n++) {
            grid[r][c] = n
            const ok = !Grid.rowDup(grid, r, S) && !Grid.colDup(grid, c, S) && !Grid.boxDup(grid, r, c, B)
            grid[r][c] = 0
            if (ok) res.push(n)
        }
        return res
    },

    // ===== 第三层：高级组合 =====

    cell(v, e, g) {
        return { value: v, editable: e ?? v === 0, conflict: false, given: g ?? v !== 0 }
    },

    fromPuzzle(p) {
        return p.map(r => r.map(v => Grid.cell(v)))
    },

    toNum(b) {
        return b.map(r => r.map(c => c.value ?? c))
    },

    empty(s) {
        return Array.from({ length: s }, () => Array(s).fill(0))
    },

    conflict(board, r, c, B, S) {
        const g = Grid.toNum(board)
        const sr = Math.floor(r / B) * B, sc = Math.floor(c / B) * B
        for (let i = 0; i < S; i++) { board[r][i].conflict = false; board[i][c].conflict = false }
        for (let i = sr; i < sr + B; i++) for (let j = sc; j < sc + B; j++) board[i][j].conflict = false
        if (Grid.rowDup(g, r, S)) board[r][c].conflict = true
        if (Grid.colDup(g, c, S)) board[r][c].conflict = true
        if (Grid.boxDup(g, r, c, B)) board[r][c].conflict = true
    },

    done(board) {
        const g = Grid.toNum(board)
        const S = g.length, B = Math.round(Math.sqrt(S))
        for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) if (g[r][c] === 0) return false
        for (let r = 0; r < S; r++) if (Grid.rowDup(g, r, S)) return false
        for (let c = 0; c < S; c++) if (Grid.colDup(g, c, S)) return false
        for (let b = 0; b < S; b++) {
            const sr = Math.floor(b / B) * B, sc = (b % B) * B
            if (Grid.dup(Grid.scan(g, sr, sc, sr + B - 1, sc + B - 1))) return false
        }
        return true
    },

    solve(grid, B, S) {
        let min = S + 1, br = -1, bc = -1, bcand = []
        for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
            if (grid[r][c] !== 0) continue
            const cand = Grid.cand(grid, r, c, B, S)
            if (cand.length === 0) return false
            if (cand.length < min) { min = cand.length; br = r; bc = c; bcand = cand; if (min === 1) break }
        }
        if (br === -1) return true
        for (let i = bcand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bcand[i], bcand[j]] = [bcand[j], bcand[i]] }
        for (const n of bcand) { grid[br][bc] = n; if (Grid.solve(grid, B, S)) return true; grid[br][bc] = 0 }
        return false
    },

    // ===== UI层 =====

    // 基本步骤1：设置画布，返回 { ctx, cellSize }
    setupCanvas(id, size, zoom) {
        const canvas = document.getElementById(id)
        if (!canvas) return null
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95)
        const pixelSize = Math.floor(displaySize * zoom * dpr)
        const cssSize = Math.floor(displaySize * zoom)
        if (canvas.width !== pixelSize) {
            canvas.width = pixelSize
            canvas.height = pixelSize
            canvas.style.width = cssSize + 'px'
            canvas.style.height = cssSize + 'px'
        }
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)
        ctx.clearRect(0, 0, displaySize, displaySize)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, displaySize, displaySize)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        return { ctx, cellSize: displaySize / size, displaySize }
    },

    // 基本步骤2：绘制一个格子的背景色和数字
    drawCell(ctx, x, y, cellSize, bgColor, text, textColor) {
        ctx.fillStyle = bgColor
        ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1)
        if (text) {
            const fontSize = Math.round(cellSize * 0.45)
            ctx.font = `500 ${fontSize}px -apple-system, sans-serif`
            ctx.fillStyle = textColor
            ctx.fillText(text, x + cellSize / 2, y + cellSize / 2)
        }
    },

    // 基本步骤3：绘制网格线
    drawLines(ctx, size, boxSize, cellSize, displaySize) {
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i <= size; i += boxSize) {
            const p = i * cellSize
            ctx.moveTo(p, 0); ctx.lineTo(p, displaySize)
            ctx.moveTo(0, p); ctx.lineTo(displaySize, p)
        }
        ctx.stroke()
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        for (let i = 1; i < size; i++) {
            if (i % boxSize === 0) continue
            const p = i * cellSize
            ctx.moveTo(p, 0); ctx.lineTo(p, displaySize)
            ctx.moveTo(0, p); ctx.lineTo(displaySize, p)
        }
        ctx.stroke()
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 2.5
        ctx.strokeRect(0.5, 0.5, displaySize - 1, displaySize - 1)
    },

    // 组合方法：由 setupCanvas + drawCell + drawLines 组成
    render(id, board, size, boxSize, sr, sc, zoom = 1.0) {
        const info = Grid.setupCanvas(id, size, zoom)
        if (!info || !board?.length) return
        const { ctx, cellSize, displaySize } = info
        const boxR = sr != null ? Math.floor(sr / boxSize) : -1
        const boxC = sc != null ? Math.floor(sc / boxSize) : -1
        
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = board[r][c]
                const x = c * cellSize, y = r * cellSize
                const cr = Math.floor(r / boxSize), cc = Math.floor(c / boxSize)
                
                // 计算背景色
                let bg
                if (cell.conflict) bg = '#fecaca'
                else if (sr === r && sc === c) bg = '#bbf7d0'
                else if (boxR !== -1 && cr === boxR && cc === boxC) bg = '#f0f4f8'
                else bg = (cr + cc) % 2 === 0 ? '#ffffff' : '#fafafa'
                
                // 计算文字颜色
                const textColor = cell.conflict ? '#dc2626' : (cell.editable ? '#475569' : '#1f2937')
                
                Grid.drawCell(ctx, x, y, cellSize, bg, cell.value || '', textColor)
            }
        }
        Grid.drawLines(ctx, size, boxSize, cellSize, displaySize)
    },

    clickPos(e, id, size) {
        const canvas = document.getElementById(id)
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95)
        const scale = rect.width / displaySize
        const x = (e.clientX - rect.left) / scale
        const y = (e.clientY - rect.top) / scale
        const cellSize = displaySize / size
        const r = Math.floor(y / cellSize), c = Math.floor(x / cellSize)
        return (r >= 0 && r < size && c >= 0 && c < size) ? [r, c] : null
    },

    keyDown(e, state, cb) {
        if (!state.started || state.generating || state.complete || state.over) return
        const k = e.key
        if (k >= '1' && k <= '9') { const n = parseInt(k); if (n <= state.SIZE) cb.input(n) }
        else if (k === 'Backspace' || k === 'Delete' || k === '0') cb.clear()
        else if (k === 'ArrowUp' && state.sr != null) { e.preventDefault(); cb.move(Math.max(0, state.sr - 1), state.sc) }
        else if (k === 'ArrowDown' && state.sr != null) { e.preventDefault(); cb.move(Math.min(state.SIZE - 1, state.sr + 1), state.sc) }
        else if (k === 'ArrowLeft' && state.sc != null) { e.preventDefault(); cb.move(state.sr, Math.max(0, state.sc - 1)) }
        else if (k === 'ArrowRight' && state.sc != null) { e.preventDefault(); cb.move(state.sr, Math.min(state.SIZE - 1, state.sc + 1)) }
        else if (k === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? cb.redo() : cb.undo() }
        else if (k === 'y' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); cb.redo() }
    },
}