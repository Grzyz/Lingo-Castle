// --- INITIAL STATE ---
let stage = parseInt(localStorage.getItem('userStage')) || 1;
let totalXP = parseInt(localStorage.getItem('totalXP')) || 0;
let mistakeBank = JSON.parse(localStorage.getItem('mistakeBank')) || [];
let historyBank = JSON.parse(localStorage.getItem('historyBank')) || [];
let vocabData = [];
let currentQuestion = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDatabase();
    updateUI();
});

async function loadDatabase() {
    try {
        const response = await fetch('data/vocab_a.json');
        vocabData = await response.json();
        if(vocabData.length > 0) renderQuestion();
    } catch (e) { console.error("Database Error"); }
}

function getRank(xp) {
    if (xp >= 8000) return { name: "Sang Penakluk Kamus", code: "C2" };
    if (xp >= 5000) return { name: "Kaisar Oxford", code: "C1" };
    if (xp >= 2500) return { name: "Panglima Bahasa", code: "B2" };
    if (xp >= 1000) return { name: "Pangeran Kosakata", code: "B1" };
    if (xp >= 300) return { name: "Perintis Makna", code: "A2" };
    return { name: "Pengembara Kata", code: "A1" };
}

// --- CORE NAVIGATION (HANYA SATU FUNGSI) ---
function showPage(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Reset status navigasi
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Tampilkan halaman target
    const target = document.getElementById(`${pageId}-page`);
    if(target) target.classList.remove('hidden');
    
    // Aktifkan menu navigasi
    const nav = document.getElementById(`nav-${pageId}`);
    if(nav) nav.classList.add('active');
    
    // Inisialisasi ulang konten halaman
    if(pageId === 'game') renderQuestion();
    if(pageId === 'review') { exitReviewMode(); renderHistory(); }
    if(pageId === 'replay') exitReplay();
    
    updateUI();
}

// --- MAIN GAME LOGIC ---
function renderQuestion() {
    currentQuestion = vocabData.find(q => q.id === stage);
    if (!currentQuestion) return;
    
    document.getElementById('question-text').innerText = currentQuestion.w;
    const container = document.getElementById('options-container');
    container.innerHTML = "";
    
    currentQuestion.o.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            if(opt === currentQuestion.c) {
                btn.classList.add('correct');
                totalXP += 10; stage++;
                saveProgress();
                setTimeout(() => { renderQuestion(); updateUI(); }, 600);
            } else {
                btn.classList.add('wrong');
                if(!mistakeBank.find(x => x.id === currentQuestion.id)) mistakeBank.push(currentQuestion);
                saveProgress(); updateUI();
            }
        };
        container.appendChild(btn);
    });
}

function handleDontKnow() {
    if(!mistakeBank.find(x => x.id === currentQuestion.id)) mistakeBank.push(currentQuestion);
    stage++;
    saveProgress();
    renderQuestion();
    updateUI();
}

// --- REPLAY MARATHON LOGIC ---
function startMarathonReplay() {
    const from = parseInt(document.getElementById('replay-from').value);
    const to = parseInt(document.getElementById('replay-to').value);

    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
        return alert("Masukkan rentang level yang benar!");
    }

    let queue = vocabData.filter(q => q.id >= from && q.id <= to);
    if (queue.length === 0) return alert("Data tidak ditemukan.");

    document.getElementById('replay-setup').classList.add('hidden');
    document.getElementById('replay-quiz-area').classList.remove('hidden');
    runReplay(queue, 0);
}

function runReplay(queue, index) {
    if (index >= queue.length) { alert("Maraton Selesai! 🎉"); return exitReplay(); }
    
    const q = queue[index];
    document.getElementById('replay-progress-text').innerText = `Level ${q.id} (${index+1}/${queue.length})`;
    document.getElementById('replay-question-text').innerText = q.w;
    
    const container = document.getElementById('replay-options-container');
    container.innerHTML = "";
    
    q.o.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            if(opt === q.c) {
                btn.classList.add('correct');
                setTimeout(() => runReplay(queue, index+1), 500);
            } else btn.classList.add('wrong');
        };
        container.appendChild(btn);
    });
}

function exitReplay() {
    document.getElementById('replay-setup').classList.remove('hidden');
    document.getElementById('replay-quiz-area').classList.add('hidden');
}

// --- REVIEW LOGIC ---
function startReview() {
    if (mistakeBank.length === 0) return;
    document.getElementById('review-intro').classList.add('hidden');
    document.getElementById('review-quiz-container').classList.remove('hidden');
    document.getElementById('main-nav').classList.add('hidden');
    renderReviewQuestion();
}

function exitReviewMode() {
    document.getElementById('review-intro').classList.remove('hidden');
    document.getElementById('review-quiz-container').classList.add('hidden');
    document.getElementById('main-nav').classList.remove('hidden');
}

function renderReviewQuestion() {
    const container = document.getElementById('review-options-container');
    const questionText = document.getElementById('review-question-text');

    if (mistakeBank.length === 0) {
        questionText.innerText = "Semua Teratasi! 🎉";
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; font-weight: 700;">Hebat! Kamu sudah memperbaiki semua kata.</p>`;
        setTimeout(exitReviewMode, 1500);
        return;
    }

    const q = mistakeBank[0];
    questionText.innerText = q.w;
    container.innerHTML = "";
    
    q.o.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            if(opt === q.c) {
                btn.classList.add('correct');
                historyBank.unshift({ id: Date.now(), w: q.w, c: q.c });
                mistakeBank.shift();
                saveProgress();
                setTimeout(renderReviewQuestion, 600);
            } else btn.classList.add('wrong');
        };
        container.appendChild(btn);
    });
}

// --- UTILS & DATA PERSISTENCE ---
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = historyBank.map(item => `
        <div class="history-card" style="margin-bottom:10px">
            <div><b>${item.w}</b> <span>➔ ${item.c}</span></div>
            <button onclick="deleteHistoryItem(${item.id})" style="background:none; border:none; cursor:pointer;">🗑️</button>
        </div>
    `).join('');
}

function deleteHistoryItem(id) {
    historyBank = historyBank.filter(i => i.id !== id);
    saveProgress(); renderHistory();
}

function clearAllHistory() {
    if(confirm("Hapus semua riwayat?")) { historyBank = []; saveProgress(); renderHistory(); }
}

function saveProgress() {
    localStorage.setItem('userStage', stage);
    localStorage.setItem('totalXP', totalXP);
    localStorage.setItem('mistakeBank', JSON.stringify(mistakeBank));
    localStorage.setItem('historyBank', JSON.stringify(historyBank));
}

function updateUI() {
    const rank = getRank(totalXP);
    const lv = Math.floor(totalXP / 100) + 1;
    const xpCurrent = totalXP % 100;
    const savedName = localStorage.getItem('userName');

    if (savedName) {
        const nameInput = document.getElementById('username-input');
        if(nameInput) nameInput.value = savedName;
    }

    document.getElementById('display-xp').innerText = totalXP;
    document.getElementById('display-rank-name').innerText = rank.name;
    document.getElementById('display-lv').innerText = lv;
    document.getElementById('display-stage').innerText = "Stage " + stage;
    document.getElementById('mistake-count').innerText = mistakeBank.length;

    if(document.getElementById('game-lv-text')) {
        document.getElementById('game-lv-text').innerText = lv;
        document.getElementById('game-stage-text').innerText = "Stg " + stage;
        document.getElementById('game-xp-info').innerText = `${xpCurrent}/100 XP`;
        document.getElementById('xp-bar').style.width = xpCurrent + "%";
    }
}

function saveUsername() {
    const nameInput = document.getElementById('username-input');
    const newName = nameInput.value;
    const oldName = localStorage.getItem('userName');

    if (newName !== oldName) {
        if (confirm("Ganti username akan RESET semua progres. Yakin?")) {
            localStorage.setItem('userName', newName);
            stage = 1; totalXP = 0; mistakeBank = []; historyBank = [];
            saveProgress();
            updateUI();
            alert("Progres direset.");
        } else {
            nameInput.value = oldName || "";
        }
    }
}

function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const resultContainer = document.getElementById('search-results');
    if (query.length < 2) { resultContainer.innerHTML = ""; return; }

    const filtered = vocabData.filter(item => 
        item.w.toLowerCase().includes(query) || item.c.toLowerCase().includes(query)
    ).slice(0, 10);

    resultContainer.innerHTML = filtered.map(item => `
        <div class="search-item" style="padding:10px; border-bottom:1px solid #eee;">
            <b>${item.w}</b>: <span>${item.c}</span>
        </div>
    `).join('');
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if(!list) return;
    
    if (historyBank.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:13px; margin-top:20px;">Belum ada riwayat perbaikan.</p>`;
        return;
    }

    list.innerHTML = historyBank.map(item => `
        <div class="history-item-card">
            <div class="history-text">
                <b>${item.w}</b> <span>➔ ${item.c}</span>
            </div>
            <button onclick="deleteHistoryItem(${item.id})" style="background:none; border:none; cursor:pointer; font-size:16px;">🗑️</button>
        </div>
    `).join('');
}