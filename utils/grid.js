// grid.js - 棋盘纯函数
// 第一层：scan / dup / clone
// 第二层：scanRow / scanCol / scanBox / rowDup / colDup / boxDup / cand
// 第三层：conflict / done / solve / cell / fromPuzzle / toNum / empty
// UI层：render / clickPos / keyDown

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

    render(id, board, size, boxSize, sr, sc, zoom = 1.0) {
        const canvas = document.getElementById(id)
        if (!canvas || !board?.length) return
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        const ds = Math.floor(canvas.parentElement.clientWidth * 0.95)
        const ps = Math.floor(ds * zoom * dpr), cs = Math.floor(ds * zoom)
        if (canvas.width !== ps) { canvas.width = ps; canvas.height = ps; canvas.style.width = cs + 'px'; canvas.style.height = cs + 'px' }
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)
        const cell = ds / size
        ctx.clearRect(0, 0, ds, ds); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ds, ds)
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        const boxR = sr != null ? Math.floor(sr / boxSize) : -1, boxC = sc != null ? Math.floor(sc / boxSize) : -1
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            const cell2 = board[r][c], x = c * cell, y = r * cell
            const cr = Math.floor(r / boxSize), cc2 = Math.floor(c / boxSize)
            ctx.fillStyle = cell2.conflict ? '#fecaca' : (sr === r && sc === c ? '#bbf7d0' : (boxR !== -1 && cr === boxR && cc2 === boxC ? '#f0f4f8' : ((cr + cc2) % 2 === 0 ? '#fff' : '#fafafa')))
            ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
        }
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            const cell2 = board[r][c]; if (!cell2.value) continue
            const x = c * cell, y = r * cell, fs = Math.round(cell * 0.45)
            ctx.font = `500 ${fs}px -apple-system, sans-serif`
            ctx.fillStyle = cell2.conflict ? '#dc2626' : (cell2.editable ? '#475569' : '#1f2937')
            ctx.fillText(cell2.value, x + cell / 2, y + cell / 2)
        }
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.beginPath()
        for (let i = 0; i <= size; i += boxSize) { const p = i * cell; ctx.moveTo(p, 0); ctx.lineTo(p, ds); ctx.moveTo(0, p); ctx.lineTo(ds, p) }
        ctx.stroke()
        ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.5; ctx.beginPath()
        for (let i = 1; i < size; i++) { if (i % boxSize === 0) continue; const p = i * cell; ctx.moveTo(p, 0); ctx.lineTo(p, ds); ctx.moveTo(0, p); ctx.lineTo(ds, p) }
        ctx.stroke()
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 2.5; ctx.strokeRect(0.5, 0.5, ds - 1, ds - 1)
    },

    clickPos(e, id, size) {
        const canvas = document.getElementById(id); if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        const ds = Math.floor(canvas.parentElement.clientWidth * 0.95)
        const scale = rect.width / ds
        const x = (e.clientX - rect.left) / scale, y = (e.clientY - rect.top) / scale
        const cell = ds / size
        const r = Math.floor(y / cell), c = Math.floor(x / cell)
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