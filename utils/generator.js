// generator.js - 数独生成器（纯函数 + Worker）

const WORKER_CODE = `function gS(B,S){for(let a=0;a<(S<=9?10:50);a++){const g=Array.from({length:S},()=>Array(S).fill(0));fd(g,B,S);if(sl(g,B,S)&&vl(g,B,S))return g}const g=Array.from({length:S},()=>Array(S).fill(0));for(let b=0;b<S;b+=B+1){const sr=Math.floor(b/B)*B,sc=(b%B)*B;let n=1;for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++)g[r][c]=n++}if(sl(g,B,S)&&vl(g,B,S))return g;return Array.from({length:S},()=>Array(S).fill(0))}
function cP(s,b){const p=s.map(r=>[...r]);const S=p.length,B=Math.sqrt(S);b=Math.max(S,Math.min(S*S-1,b||S));const rm=new Set();for(let i=0;i<S;i++){const sr=Math.floor(i/B)*B,sc=(i%B)*B;const pos=[];for(let r=sr;r<sr+B;r++)for(let c=sc;c<sc+B;c++)pos.push({r,c});sh(pos);p[pos[0].r][pos[0].c]=0;rm.add(pos[0].r+','+pos[0].c)}if(b>S){const rp=[];for(let r=0;r<S;r++)for(let c=0;c<S;c++)if(!rm.has(r+','+c))rp.push({r,c});sh(rp);const t=Math.min(b-S,rp.length);for(let i=0;i<t;i++)p[rp[i].r][rp[i].c]=0}return p}
self.onmessage=function(e){try{const{B,S,b}=e.data;const s=gS(B,S);const p=cP(s,b);self.postMessage({ok:true,puzzle:p})}catch(error){self.postMessage({ok:false,error:error.message})}};`

let _worker = null
function getWorker() {
    if (!_worker) {
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        _worker = new Worker(url)
        URL.revokeObjectURL(url)
    }
    return _worker
}
function killWorker() { if (_worker) { _worker.terminate(); _worker = null } }

export const Generator = {
    generate(B, S, blanks) {
        return new Promise(resolve => {
            killWorker()
            const w = getWorker()
            const t = setTimeout(() => { w.terminate(); _worker = null; resolve(Generator.sync(B, S, blanks)) }, 30000)
            w.onmessage = e => { clearTimeout(t); resolve(e.data.ok ? e.data.puzzle : Generator.sync(B, S, blanks)) }
            w.onerror = () => { clearTimeout(t); resolve(Generator.sync(B, S, blanks)) }
            w.postMessage({ B, S, b: blanks })
        })
    },

    sync(B, S, blanks) {
        const grid = Array.from({ length: S }, () => Array(S).fill(0))
        for (let b = 0; b < S; b += B + 1) {
            const sr = Math.floor(b / B) * B, sc = (b % B) * B
            const nums = Array.from({ length: S }, (_, i) => i + 1)
            for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]] }
            let idx = 0
            for (let r = sr; r < sr + B; r++) for (let c = sc; c < sc + B; c++) grid[r][c] = nums[idx++]
        }
        // 内联求解
        ;(function sl(g, B2, S2) {
            let min = S2 + 1, br = -1, bc = -1, bcand = []
            for (let r = 0; r < S2; r++) for (let c = 0; c < S2; c++) {
                if (g[r][c] !== 0) continue
                const cand = []
                for (let n = 1; n <= S2; n++) {
                    let ok = true
                    for (let i = 0; i < S2 && ok; i++) if (g[r][i] === n || g[i][c] === n) ok = false
                    const sr2 = Math.floor(r / B2) * B2, sc2 = Math.floor(c / B2) * B2
                    for (let i = sr2; i < sr2 + B2 && ok; i++) for (let j = sc2; j < sc2 + B2; j++) if (g[i][j] === n) ok = false
                    if (ok) cand.push(n)
                }
                if (cand.length === 0) return false
                if (cand.length < min) { min = cand.length; br = r; bc = c; bcand = cand; if (min === 1) break }
            }
            if (br === -1) return true
            for (let i = bcand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bcand[i], bcand[j]] = [bcand[j], bcand[i]] }
            for (const n of bcand) { g[br][bc] = n; if (sl(g, B2, S2)) return true; g[br][bc] = 0 }
            return false
        })(grid, B, S)

        const puzzle = grid.map(r => [...r])
        const b2 = Math.max(S, Math.min(S * S - 1, blanks || S))
        const rm = new Set()
        for (let i = 0; i < S; i++) {
            const sr = Math.floor(i / B) * B, sc = (i % B) * B
            const pos = []
            for (let r = sr; r < sr + B; r++) for (let c = sc; c < sc + B; c++) pos.push({ r, c })
            for (let i2 = pos.length - 1; i2 > 0; i2--) { const j = Math.floor(Math.random() * (i2 + 1)); [pos[i2], pos[j]] = [pos[j], pos[i2]] }
            puzzle[pos[0].r][pos[0].c] = 0; rm.add(pos[0].r + ',' + pos[0].c)
        }
        if (b2 > S) {
            const rp = []
            for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) if (!rm.has(r + ',' + c)) rp.push({ r, c })
            for (let i2 = rp.length - 1; i2 > 0; i2--) { const j = Math.floor(Math.random() * (i2 + 1)); [rp[i2], rp[j]] = [rp[j], rp[i2]] }
            const tr = Math.min(b2 - S, rp.length)
            for (let i = 0; i < tr; i++) puzzle[rp[i].r][rp[i].c] = 0
        }
        return puzzle
    },

    abort() { killWorker() },
}