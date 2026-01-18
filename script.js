/**
 * AUDIO ENGINE
 */
const AudioEngine = {
    ctx: null,
    isMuted: false,
    bgmLoopId: null,
    distNode: null,
    activeResultTimeouts: [],

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.distNode = this.ctx.createWaveShaper();

            const makeDistortionCurve = (amount) => {
                let k = amount, n_samples = 44100, curve = new Float32Array(n_samples), i = 0, x;
                for (; i < n_samples; ++i) {
                    x = i * 2 / n_samples - 1;
                    curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
                }
                return curve;
            };

            this.distNode.curve = makeDistortionCurve(400);
            this.distNode.oversample = '4x';
            this.distNode.connect(this.ctx.destination);
        } catch (e) {
            console.error("Gagal inisialisasi Audio:", e);
        }
    },

    ensureInit() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + 0.5);
    },

    playSnare(time) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(time);
    },

    playRockNote(freq, time, duration, vol = 0.02) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(this.distNode); osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration);
    },

    playBGM() {
        if (this.isMuted) return;
        this.ensureInit();
        if (!this.ctx) return;
        this.stopBGM();

        let step = 0;
        const bpm = 130;
        const stepTime = 60 / bpm / 2;

        const sequence = () => {
            if (this.isMuted) {
                this.stopBGM();
                return;
            }
            const now = this.ctx.currentTime;
            if (step % 4 === 0) this.playKick(now);
            if (step % 8 === 4) this.playSnare(now);
            const riff = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
            this.playRockNote(riff[step % 8], now, stepTime * 0.8, 0.015);
            step++;
            this.bgmLoopId = setTimeout(sequence, stepTime * 1000);
        };
        sequence();
    },

    stopBGM() {
        if (this.bgmLoopId) {
            clearTimeout(this.bgmLoopId);
            this.bgmLoopId = null;
        }
    },

    stopAll() {
        this.stopBGM();
        this.activeResultTimeouts.forEach(t => clearTimeout(t));
        this.activeResultTimeouts = [];
    },

    // TEMA KEMENANGAN (Melodi Heroik)
    playVictoryTheme() {
        if (this.isMuted) return;
        this.ensureInit();
        const now = this.ctx.currentTime;
        // C major arpeggio ascending triumphant
        const notes = [261, 329, 392, 523, 659, 783, 1046];
        notes.forEach((f, i) => {
            const t = setTimeout(() => {
                this.playRockNote(f, this.ctx.currentTime, 0.8, 0.06);
            }, i * 200);
            this.activeResultTimeouts.push(t);
        });
    },

    // TEMA KEKALAHAN (Suara Somber/Gagal)
    playDefeatTheme() {
        if (this.isMuted) return;
        this.ensureInit();
        const now = this.ctx.currentTime;
        // Descending dissonant low notes
        const notes = [110, 98, 87, 82];
        notes.forEach((f, i) => {
            const t = setTimeout(() => {
                this.playRockNote(f, this.ctx.currentTime, 1.2, 0.1);
            }, i * 400);
            this.activeResultTimeouts.push(t);
        });
    },

    playCorrect() {
        if (this.isMuted) return;
        this.ensureInit();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((f, i) => {
            this.playRockNote(f, now + i * 0.06, 0.4, 0.05);
        });
    },

    playWrong() {
        if (this.isMuted) return;
        this.ensureInit();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.4);
    },

    playClick() {
        if (this.isMuted) return;
        this.ensureInit();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        document.getElementById('audio-icon').textContent = this.isMuted ? '🔇' : '🎸';
        const isGameScreen = !document.getElementById('screen-game').classList.contains('hidden');
        if (!this.isMuted && isGameScreen) {
            this.playBGM();
        } else {
            this.stopAll();
        }
    }
};

/**
 * LOGIKA GAME
 */
const MODES = {
    classic: { id: 'classic', name: 'CLASSIC', desc: 'Ops: + - × ÷', binary: ['+', '-', '*', '/'], unary: [], unaryLimit: 0, hasPower: false, color: 'from-blue-600 to-indigo-500', icon: '🐣' },
    advanced: { id: 'advanced', name: 'ADVANCED', desc: 'Ops: + - × ÷ ^ | Unary: 2', binary: ['+', '-', '*', '/', '^'], unary: ['√', 'x²', '1/x'], unaryLimit: 2, hasPower: false, color: 'from-emerald-600 to-teal-500', icon: '⚡' },
    insane: { id: 'insane', name: 'INSANE', desc: 'Ops: + - × ÷ ^ | Unary: 3', binary: ['+', '-', '*', '/', '^'], unary: ['√', 'x²', '1/x', 'x!', '|x|'], unaryLimit: 3, hasPower: false, color: 'from-orange-600 to-red-500', icon: '💀' },
    mythic: { id: 'mythic', name: 'MYTHIC', desc: 'Semua Ops + Power Card', binary: ['+', '-', '*', '/', '^'], unary: ['√', 'x²', '1/x', 'x!', '|x|'], unaryLimit: 3, hasPower: true, color: 'from-purple-600 to-pink-500', icon: '🤯' }
};

const POWER_CARDS = [
    { id: 'transform', name: '✨ Transform', desc: 'Ubah n jadi n + 1' },
    { id: 'simplify', name: '🧩 Simplify', desc: 'Bulatkan pecahan' },
    { id: 'mirror', name: '🪞 Mirror', desc: 'Tukar posisi angka' }
];

let state = {
    mode: null, winCount: 0, failCount: 0, currentNumbers: [], originalNumbers: [],
    selectedIndices: [], unaryUsedCount: 0, powerCard: null, powerUsed: false,
    hintLevel: 0, currentSolution: null, roundHistory: []
};

const EPSILON = 0.001;

const MathSolver = {
    factorial(n) {
        if (n < 0 || n > 10 || !Number.isInteger(n)) return NaN;
        if (n === 0) return 1;
        let res = 1; for (let i = 1; i <= n; i++) res *= i; return res;
    },
    applyBinary(a, b, op) {
        switch (op) {
            case '+': return a + b; case '-': return a - b; case '*': return a * b;
            case '/': return Math.abs(b) < EPSILON ? NaN : a / b;
            case '^': return (a === 0 && b < 0) || (a < 0 && !Number.isInteger(b)) ? NaN : Math.pow(a, b);
            default: return NaN;
        }
    },
    applyUnary(a, op) {
        switch (op) {
            case '√': return a < 0 ? NaN : Math.sqrt(a); case 'x²': return Math.abs(a) > 1000 ? NaN : a * a;
            case '1/x': return Math.abs(a) < EPSILON ? NaN : 1 / a; case 'x!': return this.factorial(a);
            case '|x|': return Math.abs(a); default: return NaN;
        }
    },
    solve(numbers, modeConfig, unaryLeft) {
        if (numbers.length === 1) return Math.abs(numbers[0].val - 24) < EPSILON ? numbers[0].expr : null;
        if (unaryLeft > 0) {
            for (let i = 0; i < numbers.length; i++) {
                for (let op of modeConfig.unary) {
                    let val = this.applyUnary(numbers[i].val, op);
                    if (!isNaN(val) && isFinite(val)) {
                        let next = [...numbers]; next[i] = { val, expr: `${op}(${numbers[i].expr})` };
                        let sol = this.solve(next, modeConfig, unaryLeft - 1); if (sol) return sol;
                    }
                }
            }
        }
        for (let i = 0; i < numbers.length; i++) {
            for (let j = 0; j < numbers.length; j++) {
                if (i === j) continue;
                for (let op of modeConfig.binary) {
                    let val = this.applyBinary(numbers[i].val, numbers[j].val, op);
                    if (!isNaN(val) && isFinite(val)) {
                        let next = numbers.filter((_, k) => k !== i && k !== j);
                        next.push({ val, expr: `(${numbers[i].expr}${op}${numbers[j].expr})` });
                        let sol = this.solve(next, modeConfig, unaryLeft); if (sol) return sol;
                    }
                }
            }
        }
        return null;
    }
};

function initApp() {
    renderHome();
}

function renderHome() {
    const container = document.getElementById('screen-home');
    container.innerHTML = '';
    Object.values(MODES).forEach(m => {
        const el = document.createElement('div');
        el.className = `mode-card glass-card p-8 rounded-[2rem] cursor-pointer flex flex-col items-center border-b-4 border-transparent`;
        el.innerHTML = `
            <div class="w-20 h-20 rounded-3xl bg-gradient-to-br ${m.color} flex items-center justify-center text-4xl shadow-2xl mb-6">${m.icon}</div>
            <h3 class="text-2xl font-black italic tracking-wider mb-2 uppercase">${m.name}</h3>
            <p class="text-xs text-slate-500 font-bold mb-6 italic">${m.desc}</p>
            <div class="flex flex-wrap justify-center gap-2">${m.binary.map(o => `<span class="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-mono">${o}</span>`).join('')}</div>`;
        el.onclick = () => { AudioEngine.playClick(); startSession(m.id); };
        container.appendChild(el);
    });
    showScreen('home');
}

function startSession(modeId) {
    state.mode = MODES[modeId]; state.winCount = 0; state.failCount = 0;
    document.getElementById('mode-display').textContent = `${state.mode.name} MODE`;
    nextRound();
    showScreen('game');
    AudioEngine.playBGM();
}

function nextRound() {
    state.selectedIndices = []; state.unaryUsedCount = 0; state.powerUsed = false; state.hintLevel = 0; state.roundHistory = [];
    let solvable = false, nums = [], sol = null;
    while (!solvable) {
        nums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 12) + 1);
        sol = MathSolver.solve(nums.map(n => ({ val: n, expr: n.toString() })), state.mode, state.mode.unaryLimit);
        if (sol) solvable = true;
    }
    state.currentSolution = sol; state.originalNumbers = [...nums];
    state.currentNumbers = nums.map((n, i) => ({ value: n, expr: n.toString(), id: Math.random() }));
    if (state.mode.hasPower) state.powerCard = POWER_CARDS[Math.floor(Math.random() * POWER_CARDS.length)];
    updateUI();
}

function resetRound() {
    AudioEngine.playClick(); state.selectedIndices = []; state.unaryUsedCount = 0; state.powerUsed = false; state.roundHistory = [];
    state.currentNumbers = state.originalNumbers.map((n, i) => ({ value: n, expr: n.toString(), id: Math.random() }));
    updateUI(); showToast("RONDE DIRESET");
}

function selectNumber(idx) {
    AudioEngine.playClick(); const p = state.selectedIndices.indexOf(idx);
    if (p > -1) state.selectedIndices.splice(p, 1);
    else { if (state.selectedIndices.length >= 2) state.selectedIndices.shift(); state.selectedIndices.push(idx); }
    updateUI();
}

function formatNum(n) { return Number.isInteger(n) ? n : n.toFixed(1); }

function execBinary(op) {
    if (state.selectedIndices.length !== 2) return showToast("PILIH 2 ANGKA");
    const [i1, i2] = state.selectedIndices; const a = state.currentNumbers[i1], b = state.currentNumbers[i2];
    const val = MathSolver.applyBinary(a.value, b.value, op);
    if (isNaN(val) || !isFinite(val)) return showToast("HASIL TIDAK VALID");
    AudioEngine.playClick();
    state.roundHistory.push(`${formatNum(a.value)} ${op.replace('*', '×').replace('/', '÷')} ${formatNum(b.value)} = ${formatNum(val)}`);
    state.currentNumbers = state.currentNumbers.filter((_, k) => k !== i1 && k !== i2);
    state.currentNumbers.push({ value: val, expr: `(${a.expr}${op}${b.expr})`, id: Math.random() });
    state.selectedIndices = []; updateUI(); checkEnd();
}

function execUnary(op) {
    if (state.selectedIndices.length !== 1) return showToast("PILIH 1 ANGKA");
    if (state.unaryUsedCount >= state.mode.unaryLimit) return showToast("LIMIT UNARY HABIS");
    const idx = state.selectedIndices[0]; const a = state.currentNumbers[idx];
    const val = MathSolver.applyUnary(a.value, op);
    if (isNaN(val) || !isFinite(val)) return showToast("OPERASI ILEGAL");
    AudioEngine.playClick();
    state.roundHistory.push(`${op}(${formatNum(a.value)}) = ${formatNum(val)}`);
    a.value = val; a.expr = `${op}(${a.expr})`; state.unaryUsedCount++; state.selectedIndices = [];
    updateUI(); checkEnd();
}

function usePower() {
    if (!state.powerCard || state.powerUsed) return;
    const sel = state.selectedIndices; let logMsg = "";
    if (state.powerCard.id === 'transform') {
        if (sel.length !== 1) return showToast("PILIH 1 ANGKA");
        const old = state.currentNumbers[sel[0]].value; state.currentNumbers[sel[0]].value += 1;
        state.currentNumbers[sel[0]].expr = `(${state.currentNumbers[sel[0]].expr}+1)`;
        logMsg = `✨ ${old} → ${state.currentNumbers[sel[0]].value}`;
    } else if (state.powerCard.id === 'simplify') {
        if (sel.length !== 1) return showToast("PILIH 1 ANGKA");
        const old = state.currentNumbers[sel[0]].value; state.currentNumbers[sel[0]].value = Math.round(state.currentNumbers[sel[0]].value);
        state.currentNumbers[sel[0]].expr = `round(${state.currentNumbers[sel[0]].expr})`;
        logMsg = `🧩 ${formatNum(old)} → ${state.currentNumbers[sel[0]].value}`;
    } else if (state.powerCard.id === 'mirror') {
        if (state.currentNumbers.length < 2) return showToast("MINIMAL 2 ANGKA");
        const v1 = state.currentNumbers[0].value, v2 = state.currentNumbers[1].value;
        [state.currentNumbers[0].value, state.currentNumbers[1].value] = [v2, v1];
        logMsg = `🪞 Mirrored: ${formatNum(v1)} ⇄ ${formatNum(v2)}`;
    }
    if (logMsg) state.roundHistory.push(logMsg);
    AudioEngine.playClick(); state.powerUsed = true; state.selectedIndices = []; updateUI(); checkEnd();
}

function checkEnd() {
    if (state.currentNumbers.length === 1) {
        const final = state.currentNumbers[0].value;
        if (Math.abs(final - 24) < EPSILON) {
            AudioEngine.playCorrect(); state.winCount++;
            showToast("BENAR! +1 POINT", "indigo");
            if (state.winCount >= 10) endGame(true); else setTimeout(nextRound, 1200);
        } else {
            AudioEngine.playWrong(); state.failCount++;
            showToast(`SALAH! HASIL: ${final.toFixed(1)}`, "red");
            if (state.failCount >= 3) endGame(false); else setTimeout(nextRound, 1200);
        }
    }
}

function updateUI() {
    document.getElementById('win-count').textContent = state.winCount;
    document.getElementById('fail-count').textContent = state.failCount;
    const nCont = document.getElementById('numbers-container'); nCont.innerHTML = '';
    state.currentNumbers.forEach((num, idx) => {
        const card = document.createElement('div'); const isSelected = state.selectedIndices.includes(idx);
        card.className = `number-card glass-card rounded-3xl ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `<div class="flex flex-col items-center"><span class="drop-shadow-lg">${formatNum(num.value)}</span><span class="text-[8px] text-slate-500 font-mono absolute bottom-3 px-2 overflow-hidden w-full text-center whitespace-nowrap opacity-60">${num.expr}</span></div>`;
        card.onclick = () => selectNumber(idx); nCont.appendChild(card);
    });
    const hCont = document.getElementById('history-container'), hList = document.getElementById('history-list');
    if (state.roundHistory.length > 0) {
        hCont.classList.remove('hidden');
        hList.innerHTML = state.roundHistory.map(log => `<span class="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-slate-400 font-mono">${log}</span>`).join('');
        hList.scrollTop = hList.scrollHeight;
    } else hCont.classList.add('hidden');
    const bCont = document.getElementById('binary-ops'); bCont.innerHTML = '';
    state.mode.binary.forEach(op => {
        const btn = document.createElement('button'); btn.className = "w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl operator-btn";
        btn.textContent = op.replace('*', '×').replace('/', '÷'); btn.onclick = () => execBinary(op); bCont.appendChild(btn);
    });
    const uSec = document.getElementById('unary-section');
    if (state.mode.unary.length > 0) {
        uSec.classList.remove('hidden'); document.getElementById('unary-limit-display').textContent = state.mode.unaryLimit - state.unaryUsedCount;
        const uCont = document.getElementById('unary-ops'); uCont.innerHTML = '';
        state.mode.unary.forEach(op => {
            const btn = document.createElement('button'); btn.className = "px-5 py-2 rounded-xl font-bold text-xs operator-btn text-indigo-200 border border-indigo-500/20";
            btn.textContent = op; btn.onclick = () => execUnary(op); uCont.appendChild(btn);
        });
    } else uSec.classList.add('hidden');
    const pSec = document.getElementById('power-section');
    if (state.mode.hasPower && state.powerCard && !state.powerUsed) {
        pSec.classList.remove('hidden');
        document.getElementById('power-cards').innerHTML = `<button onclick="usePower()" class="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-black text-xs shadow-lg hover:scale-105 transition tracking-widest uppercase italic">${state.powerCard.name}</button>`;
    } else pSec.classList.add('hidden');
}

function showScreen(id) {
    ['home', 'game', 'result'].forEach(s => document.getElementById(`screen-${s}`).classList.add('hidden'));
    document.getElementById(`screen-${id}`).classList.remove('hidden');
}

function showToast(m, c = "white") {
    const t = document.getElementById('toast'); t.textContent = m;
    t.style.background = c === "red" ? "#ef4444" : (c === "indigo" ? "#6366f1" : "white");
    t.style.color = c === "white" ? "#0f172a" : "white"; t.style.opacity = "1";
    setTimeout(() => t.style.opacity = "0", 2000);
}

function exitToHome() {
    AudioEngine.playClick();
    AudioEngine.stopAll(); // Hentikan BGM dan Tema Kemenangan/Kekalahan
    state.winCount = 0; state.failCount = 0; state.mode = null;
    renderHome();
    showScreen('home');
}

function showHint() {
    AudioEngine.playClick(); state.hintLevel++;
    const cont = document.getElementById('hint-content');
    cont.innerHTML = `<p><strong>LEVEL 1:</strong> Fokus pada angka 24 (Hasil dari 8×3, 6×4, 12×2, atau 23+1).</p>`;
    if (state.hintLevel >= 2) cont.innerHTML += `<p><strong>LEVEL 2:</strong> Langkah awal: <code class="bg-indigo-500/20 px-2 py-1 rounded text-indigo-300 italic">${state.currentSolution.substring(0, 10)}...</code></p>`;
    if (state.hintLevel >= 3) cont.innerHTML += `<p><strong>LEVEL 3 (SOLUSI):</strong> <br><code class="text-xs text-indigo-400 break-all italic">${state.currentSolution}</code></p>`;
    document.getElementById('hint-modal').classList.remove('hidden');
}

function closeHint() { AudioEngine.playClick(); document.getElementById('hint-modal').classList.add('hidden'); }

function endGame(w) {
    AudioEngine.stopBGM(); // Matikan BGM rock
    showScreen('result');
    const t = document.getElementById('result-title'), d = document.getElementById('result-desc'), i = document.getElementById('result-icon');
    if (w) {
        AudioEngine.playVictoryTheme(); // Mainkan tema menang
        t.textContent = "Victory!"; t.className = "text-5xl font-black mb-4 text-green-400 win-anim uppercase";
        d.textContent = `Luar biasa! 10 soal berhasil kamu taklukkan.`; i.textContent = "🏆";
    } else {
        AudioEngine.playDefeatTheme(); // Mainkan tema kalah
        t.textContent = "Defeat"; t.className = "text-5xl font-black mb-4 text-red-500 uppercase";
        d.textContent = "Jangan menyerah. Matematika butuh latihan terus menerus."; i.textContent = "💀";
    }
}

window.onload = initApp;
