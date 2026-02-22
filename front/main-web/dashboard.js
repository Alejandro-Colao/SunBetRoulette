/* =========================================================
   SunBet Dashboard – dashboard.js
   ========================================================= */

class Dashboard {
    constructor() {
        this.userData = null;
        this.allHistory = [];   // raw roulette/transaction blocks for current user
        this.profitChart = null;
        this.betTypeChart = null;
        this.pollInterval = null;
        this.initialize();
    }

    /* --------------------------------------------------------
       INIT
    -------------------------------------------------------- */
    async initialize() {
        await this.checkAuth();
        this.setupNavigation();
        this.setupProfileButtons();
        this.setupAvatarModal();
        this.setupHistorialFilters();
        this.setupIframeMessaging();
        this.setupWebSocket();

        await this.loadAll();

        // Poll blockchain every 30s for live updates
        this.pollInterval = setInterval(() => this.loadAll(), 30000);
    }

    /* --------------------------------------------------------
       AUTH
    -------------------------------------------------------- */
    async checkAuth() {
        const token = localStorage.getItem('sunbet_token');
        if (!token) { window.location.href = '../auth-web/index.html'; return; }

        try {
            this.userData = JSON.parse(localStorage.getItem('sunbet_user'));
            this.renderUserUI();
        } catch {
            localStorage.clear();
            window.location.href = '../auth-web/index.html';
        }
    }

    /* --------------------------------------------------------
       UI HELPERS
    -------------------------------------------------------- */
    renderUserUI() {
        if (!this.userData) return;
        document.getElementById('userName').textContent = this.userData.name;
        document.getElementById('userBalance').textContent = this._fmt(this.userData.balance);
        document.getElementById('profileName').textContent = this.userData.name;

        const profileBal = document.getElementById('profileBalance');
        if (profileBal) profileBal.textContent = this._fmt(this.userData.balance);

        const joined = this.userData.createdAt
            ? new Date(this.userData.createdAt).toLocaleDateString('es-ES')
            : 'N/A';
        const el = document.getElementById('memberSince');
        if (el) el.textContent = joined;

        document.querySelectorAll('.avatar, .avatar-large').forEach(av => {
            if (this.userData.avatar) {
                av.textContent = this.userData.avatar;
                av.style.background = '#1e1e2e';
                av.style.fontSize = av.classList.contains('avatar-large') ? '3rem' : '1.5rem';
                av.style.display = 'flex';
                av.style.alignItems = 'center';
                av.style.justifyContent = 'center';
            } else {
                av.style.background = this._avatarColor(this.userData.name);
                av.textContent = this.userData.name.charAt(0).toUpperCase();
                av.style.fontSize = '';
            }
        });
    }

    _avatarColor(name) {
        const colors = ['#7c3aed', '#059669', '#dc2626', '#2563eb', '#d97706'];
        return colors[name.length % colors.length];
    }

    _fmt(n) {
        return parseFloat(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';
    }

    /* --------------------------------------------------------
       NAVIGATION
    -------------------------------------------------------- */
    setupNavigation() {
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const sec = link.dataset.section;
                this.showSection(sec);
                if (sec === 'estadisticas') this._refreshCharts();
                if (sec === 'ranking') this.loadAll();
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            clearInterval(this.pollInterval);
            localStorage.clear();
            window.location.href = '../auth-web/index.html';
        });
    }

    showSection(id) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        document.getElementById(id + 'Section').classList.add('active');
        document.querySelector(`nav a[data-section="${id}"]`).classList.add('active');
    }

    /* --------------------------------------------------------
       BLOCKCHAIN LOAD
    -------------------------------------------------------- */
    async loadAll() {
        try {
            const res = await fetch('http://localhost:3001/blocks');
            const blocks = await res.json();
            this._processBlocks(blocks);
        } catch (err) {
            console.warn('Blockchain not reachable:', err.message);
            this._showEmptyStates();
        }
    }

    _parseData(block) {
        try { return typeof block.datos === 'string' ? JSON.parse(block.datos) : block.datos; }
        catch { return null; }
    }

    _processBlocks(blocks) {
        // All roulette blocks (all users) for recent-results strip
        const allRoulette = blocks.filter(b => {
            const d = this._parseData(b);
            return d && d.type === 'roulette';
        });

        this._renderRecentResults(allRoulette.slice(-10));

        // Update results count badge
        const countEl = document.getElementById('resultsCount');
        if (countEl) countEl.textContent = allRoulette.length + ' tiradas';

        // Current-user blocks only
        const userBlocks = blocks.filter(b => {
            const d = this._parseData(b);
            return d && d.userId === this.userData?.userId;
        });

        // Build history list (roulette + transactions)
        this.allHistory = userBlocks
            .filter(b => { const d = this._parseData(b); return d && (d.type === 'roulette' || d.type === 'transaction'); })
            .map(b => ({ ...this._parseData(b), _blockTime: b.tiempo }))
            .sort((a, b) => b._blockTime - a._blockTime); // newest first

        this._applyHistorialFilters();
        this._calcStats(userBlocks);

        // Build ranking from ALL blocks
        this._buildRanking(blocks);
    }

    /* --------------------------------------------------------
       RANKING
    -------------------------------------------------------- */
    _buildRanking(blocks) {
        // Group all roulette blocks by userId
        const players = {};

        blocks.forEach(b => {
            const d = this._parseData(b);
            if (!d || !d.userId) return;

            if (!players[d.userId]) {
                players[d.userId] = {
                    userId: d.userId,
                    name: d.userId,        // fallback; overwritten by registration block
                    avatar: null,
                    games: 0,
                    won: 0,
                    totalBet: 0,
                    totalPaid: 0,
                };
            }

            // Grab name from registration blocks
            if (d.type === 'user_registration' && d.name) {
                players[d.userId].name = d.name;
            }
            // Grab avatar from profile_update blocks
            if (d.type === 'profile_update' && d.avatarId) {
                players[d.userId].avatar = d.avatarId;
            }

            // Stats from roulette blocks only
            if (d.type === 'roulette') {
                const bet = parseFloat(d.totalBet || 0);
                const paid = parseFloat(d.winnings || 0);
                players[d.userId].games++;
                players[d.userId].totalBet += bet;
                players[d.userId].totalPaid += paid;
                if (paid > bet) players[d.userId].won++;
            }
        });

        // Also try to grab the current user's name from localStorage
        if (this.userData && players[this.userData.userId]) {
            players[this.userData.userId].name = this.userData.name || players[this.userData.userId].name;
            players[this.userData.userId].avatar = this.userData.avatar || players[this.userData.userId].avatar;
        }

        // Sort by net profit descending
        const ranked = Object.values(players)
            .filter(p => p.games > 0)                               // only players who actually played
            .map(p => ({ ...p, netProfit: p.totalPaid - p.totalBet }))
            .sort((a, b) => b.netProfit - a.netProfit);

        this._renderPodium(ranked.slice(0, 3));
        this._renderRankingTable(ranked);
    }

    _renderPodium(top) {
        const container = document.getElementById('rankingPodium');
        if (!container) return;

        if (!top.length) {
            container.innerHTML = '<div class="podium-loading">Aún no hay partidas registradas en la blockchain.</div>';
            return;
        }

        // Order: 2nd, 1st, 3rd for visual podium layout
        const order = [top[1], top[0], top[2]].filter(Boolean);
        const ranks = top[1] ? [2, 1, 3] : [1];
        const rankLabels = ['🥈', '🥇', '🥉'];

        container.innerHTML = '';

        order.forEach((player, i) => {
            const rank = top[1] ? [2, 1, 3][i] : 1;
            const medal = ['🥈', '🥇', '🥉'][i];
            const isYou = player.userId === this.userData?.userId;

            const avatarContent = player.avatar
                ? player.avatar
                : player.name.charAt(0).toUpperCase();

            const slot = document.createElement('div');
            slot.className = `podium-slot rank-${rank}`;
            slot.innerHTML = `
                <div class="podium-avatar" style="background: ${player.avatar ? '#1e1e2e' : this._avatarColor(player.name)}">
                    ${rank === 1 ? '<div class="podium-crown">👑</div>' : ''}
                    ${avatarContent}
                </div>
                <div class="podium-name">${player.name}${isYou ? ' <span style="font-size:10px;color:var(--accent2);">(tú)</span>' : ''}</div>
                <div class="podium-profit ${player.netProfit >= 0 ? '' : 'profit-negative'}">${(player.netProfit >= 0 ? '+' : '') + this._fmt(player.netProfit)}</div>
                <div class="podium-games">${player.games} partidas · ${player.won} ganadas</div>
                <div class="podium-base">${medal}</div>
            `;
            container.appendChild(slot);
        });
    }

    _renderRankingTable(ranked) {
        const tbody = document.getElementById('rankingTableBody');
        const countEl = document.getElementById('playersCount');
        if (!tbody) return;
        if (countEl) countEl.textContent = ranked.length + ' jugadores';

        if (!ranked.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No hay partidas registradas todavía.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        ranked.forEach((p, i) => {
            const rank = i + 1;
            const isYou = p.userId === this.userData?.userId;
            const winRate = p.games > 0 ? ((p.won / p.games) * 100).toFixed(0) : 0;
            const netClass = p.netProfit >= 0 ? 'profit-positive' : 'profit-negative';
            const netStr = (p.netProfit >= 0 ? '+' : '') + this._fmt(p.netProfit);

            const badgeClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'normal';
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

            const avatarContent = p.avatar ? p.avatar : p.name.charAt(0).toUpperCase();
            const avatarBg = p.avatar ? '#1e1e2e' : this._avatarColor(p.name);

            const tr = document.createElement('tr');
            if (isYou) tr.style.background = 'rgba(124,58,237,0.07)';

            tr.innerHTML = `
                <td><span class="rank-badge ${badgeClass}">${medal}</span></td>
                <td>
                    <div class="player-cell">
                        <div class="player-avatar-sm" style="background:${avatarBg}">${avatarContent}</div>
                        <span class="player-name-sm">${p.name}${isYou ? '<span class="you-badge">tú</span>' : ''}</span>
                    </div>
                </td>
                <td>${p.games}</td>
                <td>${p.won}</td>
                <td>${this._fmt(p.totalBet)}</td>
                <td>${this._fmt(p.totalPaid)}</td>
                <td class="${netClass}">${netStr}</td>
                <td>
                    <div class="success-bar">
                        <div class="bar-track"><div class="bar-fill" style="width:${winRate}%"></div></div>
                        <span class="bar-label">${winRate}%</span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    /* --------------------------------------------------------
       RECENT RESULTS STRIP (Ruleta tab)
    -------------------------------------------------------- */
    _renderRecentResults(blocks) {
        const container = document.getElementById('recentResults');
        if (!container) return;
        container.innerHTML = '';

        if (!blocks.length) {
            container.innerHTML = '<p class="empty-state">Sin resultados aún...</p>';
            return;
        }

        [...blocks].reverse().forEach(block => {
            const data = this._parseData(block);
            if (!data) return;

            const raw = (data.rouletteResult || '').split(' ')[0];
            const num = isNaN(parseInt(raw)) ? '?' : parseInt(raw);
            const color = data.rouletteResult?.toLowerCase().includes('rojo') ? 'red'
                : data.rouletteResult?.toLowerCase().includes('negro') ? 'black' : 'green';

            const el = document.createElement('div');
            el.className = 'result-item';
            el.innerHTML = `
                <div class="result-number ${color}-num">${num}</div>
                <div class="result-color ${color}"></div>
                <div class="result-time">${new Date(block.tiempo * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            container.appendChild(el);
        });
    }

    /* --------------------------------------------------------
       HISTORIAL TABLE
    -------------------------------------------------------- */
    setupHistorialFilters() {
        const typeFilter = document.getElementById('filterType');
        const dateFilter = document.getElementById('filterDate');
        if (typeFilter) typeFilter.addEventListener('change', () => this._applyHistorialFilters());
        if (dateFilter) dateFilter.addEventListener('change', () => this._applyHistorialFilters());
    }

    _applyHistorialFilters() {
        const typeVal = document.getElementById('filterType')?.value || 'all';
        const dateVal = document.getElementById('filterDate')?.value || '';

        let filtered = [...this.allHistory];

        if (typeVal === 'win') {
            filtered = filtered.filter(d => d.type === 'roulette' && parseFloat(d.winnings) > parseFloat(d.totalBet));
        } else if (typeVal === 'lose') {
            filtered = filtered.filter(d => d.type === 'roulette' && parseFloat(d.winnings) <= parseFloat(d.totalBet));
        } else if (typeVal === 'roulette') {
            filtered = filtered.filter(d => d.type === 'roulette');
        } else if (typeVal === 'transaction') {
            filtered = filtered.filter(d => d.type === 'transaction');
        }

        if (dateVal) {
            filtered = filtered.filter(d => {
                const ts = d.timestamp || (d._blockTime * 1000);
                const day = new Date(ts).toISOString().slice(0, 10);
                return day === dateVal;
            });
        }

        this._renderHistorialTable(filtered);
    }

    _renderHistorialTable(rows) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No hay registros con estos filtros.</td></tr>`;
            return;
        }

        rows.forEach(d => {
            const row = document.createElement('tr');
            row.className = 'history-row';

            const ts = d.timestamp || (d._blockTime * 1000);
            const date = new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            let typeStr, resultStr, amountStr, winStr, statusClass, statusStr;

            if (d.type === 'transaction') {
                const sub = d.betDetails?.subtype || 'deposit';
                typeStr = sub === 'deposit' ? '💰 Depósito' : '💸 Retiro';
                resultStr = '—';
                amountStr = this._fmt(d.betDetails?.amount || 0);
                winStr = '—';
                statusClass = 'win';
                statusStr = 'Completado';
            } else {
                const won = parseFloat(d.winnings || 0) > parseFloat(d.totalBet || 0);
                typeStr = '🎡 Ruleta';
                resultStr = d.rouletteResult || '?';
                amountStr = this._fmt(d.totalBet);
                const net = (parseFloat(d.winnings) - parseFloat(d.totalBet));
                winStr = (net >= 0 ? '+' : '') + this._fmt(net);
                statusClass = won ? 'win' : 'lose';
                statusStr = won ? 'Ganada ✅' : 'Perdida ❌';
            }

            row.innerHTML = `
                <td>${date}</td>
                <td>${typeStr}</td>
                <td class="result-cell">${resultStr}</td>
                <td>${amountStr}</td>
                <td class="${statusClass}-text">${winStr}</td>
                <td><span class="status-badge ${statusClass}">${statusStr}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    /* --------------------------------------------------------
       STATISTICS
    -------------------------------------------------------- */
    _calcStats(userBlocks) {
        const roulette = userBlocks
            .map(b => this._parseData(b))
            .filter(d => d && d.type === 'roulette');

        const totalGames = roulette.length;
        let totalBet = 0, totalWon = 0, wins = 0;
        let streak = 0, maxStreak = 0, currentStreak = 0;
        const profitOverTime = [];
        let cumulative = 0;

        roulette.forEach(d => {
            const bet = parseFloat(d.totalBet || 0);
            const win = parseFloat(d.winnings || 0);
            const net = win - bet;
            totalBet += bet;
            totalWon += win;
            if (net > 0) { wins++; currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
            else { currentStreak = 0; }
            cumulative += net;
            profitOverTime.push({ time: d.timestamp || Date.now(), profit: cumulative });
        });

        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
        const netProfit = totalWon - totalBet;

        // Update stat cards
        this._setStat('totalBetStat', this._fmt(totalBet));
        this._setStat('totalWonStat', this._fmt(totalWon));
        this._setStat('wonBetsStat', `${wins} / ${totalGames}`);
        this._setStat('successRateStat', `${winRate}%`);
        this._setStat('netProfitStat', (netProfit >= 0 ? '+' : '') + this._fmt(netProfit));
        this._setStat('maxStreakStat', `${maxStreak} 🔥`);

        // Color net profit
        const netEl = document.getElementById('netProfitStat');
        if (netEl) netEl.style.color = netProfit >= 0 ? '#10b981' : '#ef4444';

        // Bet-type distribution
        const betTypeCounts = {};
        roulette.forEach(d => {
            const t = d.betDetails?.type || d.betDetails?.numbers?.join(',') || 'otro';
            betTypeCounts[t] = (betTypeCounts[t] || 0) + 1;
        });

        this._buildCharts(profitOverTime, betTypeCounts);
    }

    _setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    /* --------------------------------------------------------
       CHARTS (Chart.js)
    -------------------------------------------------------- */
    _buildCharts(profitOverTime, betTypeCounts) {
        this._buildProfitChart(profitOverTime);
        this._buildBetTypeChart(betTypeCounts);
    }

    _buildProfitChart(data) {
        const canvas = document.getElementById('profitChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.profitChart) { this.profitChart.destroy(); }

        const labels = data.map((p, i) => `#${i + 1}`);
        const profits = data.map(p => p.profit.toFixed(2));

        const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

        this.profitChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Beneficio Acumulado (€)',
                    data: profits,
                    borderColor: '#7c3aed',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: profits.map(v => v >= 0 ? '#10b981' : '#ef4444'),
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ' + parseFloat(ctx.raw).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8', callback: v => v + ' €' }, grid: { color: 'rgba(255,255,255,0.08)' } }
                }
            }
        });
    }

    _buildBetTypeChart(counts) {
        const canvas = document.getElementById('betTypeChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.betTypeChart) { this.betTypeChart.destroy(); }

        const labels = Object.keys(counts);
        const values = Object.values(counts);

        if (!labels.length) return;

        this.betTypeChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
                    ],
                    borderColor: '#1e1e2e',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#e2e8f0', padding: 16 }
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Tipos de Apuesta',
                        color: '#e2e8f0',
                        font: { size: 14 }
                    }
                }
            }
        });
    }

    _refreshCharts() {
        // Recreate charts when tab becomes visible (fixes canvas sizing)
        if (this.profitChart) { this.profitChart.resize(); }
        if (this.betTypeChart) { this.betTypeChart.resize(); }
    }

    /* --------------------------------------------------------
       AVATAR MODAL
    -------------------------------------------------------- */
    setupAvatarModal() {
        const modal = document.getElementById('avatarModal');
        const btn = document.getElementById('changeAvatarBtn');
        const close = document.querySelector('.close-modal');
        const grid = document.querySelector('.avatar-grid');

        if (!btn) return;

        btn.onclick = () => {
            modal.style.display = 'flex';
            this._generateAvatarGrid(grid);
        };
        close.onclick = () => modal.style.display = 'none';
        window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
    }

    _generateAvatarGrid(container) {
        const avatars = [
            '👨', '👩', '🧑', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲',
            '🧔', '👱‍♂️', '👱‍♀️', '👲', '👳‍♂️', '🧕', '👮‍♂️', '👮‍♀️', '👷‍♂️', '👷‍♀️',
            '🕵️‍♂️', '🕵️‍♀️', '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🤖', '👾', '👽', '🦸', '🦹'
        ];
        container.innerHTML = '';
        avatars.forEach(a => {
            const div = document.createElement('div');
            div.className = 'avatar-option';
            div.textContent = a;
            div.onclick = () => this._selectAvatar(a);
            container.appendChild(div);
        });
    }

    async _selectAvatar(avatar) {
        this.userData.avatar = avatar;
        localStorage.setItem('sunbet_user', JSON.stringify(this.userData));
        this.renderUserUI();
        document.getElementById('avatarModal').style.display = 'none';

        try {
            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'profile_update', userId: this.userData.userId, avatarId: avatar })
            });
        } catch (e) { console.warn('Avatar blockchain persist failed:', e.message); }
    }

    /* --------------------------------------------------------
       PROFILE BUTTONS
    -------------------------------------------------------- */
    setupProfileButtons() {
        const depositBtn = document.getElementById('depositBtn');
        const withdrawBtn = document.getElementById('withdrawBtn');
        const pwBtn = document.getElementById('changePasswordBtn');
        if (depositBtn) depositBtn.addEventListener('click', () => this._showDepositModal());
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this._showWithdrawModal());
        if (pwBtn) pwBtn.addEventListener('click', () => alert('Función de cambio de contraseña próximamente.'));
    }

    _showDepositModal() {
        const amount = prompt('💰 Ingresa el monto a depositar (€):');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
            const v = parseFloat(amount);
            this.userData.balance += v;
            localStorage.setItem('sunbet_user', JSON.stringify(this.userData));
            this.renderUserUI();
            this._mineTransaction('deposit', v);
            this._syncBalanceToIframe();
            alert(`✅ Depositado ${this._fmt(v)} correctamente.`);
        }
    }

    _showWithdrawModal() {
        const amount = prompt('💸 Ingresa el monto a retirar (€):');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
            const v = parseFloat(amount);
            if (v > this.userData.balance) { alert('❌ Fondos insuficientes.'); return; }
            this.userData.balance -= v;
            localStorage.setItem('sunbet_user', JSON.stringify(this.userData));
            this.renderUserUI();
            this._mineTransaction('withdraw', v);
            this._syncBalanceToIframe();
            alert(`✅ Retirado ${this._fmt(v)} correctamente.`);
        }
    }

    async _mineTransaction(type, amount) {
        try {
            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'transaction',
                    userId: this.userData.userId,
                    rouletteResult: 'TRANSACTION',
                    totalBet: type === 'withdraw' ? amount : 0,
                    winnings: type === 'deposit' ? amount : 0,
                    betDetails: { type: 'transaction', subtype: type, amount }
                })
            });
            // Refresh data
            setTimeout(() => this.loadAll(), 1000);
        } catch (e) { console.warn('Transaction mine failed:', e.message); }
    }

    /* --------------------------------------------------------
       IFRAME MESSAGING (Roulette ↔ Dashboard)
    -------------------------------------------------------- */
    setupIframeMessaging() {
        const iframe = document.getElementById('ruletaIframe');

        if (iframe) {
            iframe.addEventListener('load', () => {
                if (this.userData) {
                    iframe.contentWindow.postMessage({ tipo: 'ActualizarSaldo', saldo: this.userData.balance }, '*');
                }
            });
        }

        window.addEventListener('message', async event => {
            if (!event.data) return;

            if (event.data.tipo === 'SaldoModificado') {
                if (this.userData) {
                    const diff = event.data.saldo - this.userData.balance;
                    if (diff !== 0) {
                        this.userData.balance = event.data.saldo;
                        localStorage.setItem('sunbet_user', JSON.stringify(this.userData));
                        this.renderUserUI();
                    }
                }
            } else if (event.data.tipo === 'GameFinished') {
                await this._mineGameResult(event.data);
                // Reload history after a moment
                setTimeout(() => this.loadAll(), 1500);
            }
        });
    }

    _syncBalanceToIframe() {
        const iframe = document.getElementById('ruletaIframe');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ tipo: 'ActualizarSaldo', saldo: this.userData.balance }, '*');
        }
    }

    async _mineGameResult(gameData) {
        try {
            const totalPayout = gameData.winValue > 0 ? (gameData.winValue + gameData.betTotal) : 0;
            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userData.userId,
                    rouletteResult: gameData.result + (gameData.winValue > 0 ? ' (WIN)' : ' (LOSE)'),
                    totalBet: gameData.betTotal,
                    winnings: totalPayout,
                    betDetails: { numbers: gameData.numbers, type: 'roulette_game' }
                })
            });
            console.log('Game mined ✅');
        } catch (e) { console.warn('Game mine failed:', e.message); }
    }

    /* --------------------------------------------------------
       WEBSOCKET (live updates from other nodes)
    -------------------------------------------------------- */
    setupWebSocket() {
        try {
            const ws = new WebSocket('ws://localhost:6001');
            ws.onmessage = event => {
                const msg = JSON.parse(event.data);
                if (msg.type === 2) this.loadAll(); // Refresh on any new block
            };
            ws.onerror = () => { }; // Silent – backend may not be running
        } catch { }
    }

    /* --------------------------------------------------------
       EMPTY STATES
    -------------------------------------------------------- */
    _showEmptyStates() {
        const tbody = document.getElementById('historyTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">⚠️ No se puede conectar al blockchain (localhost:3001).</td></tr>`;
        const rtbody = document.getElementById('rankingTableBody');
        if (rtbody) rtbody.innerHTML = `<tr><td colspan="8" class="empty-state">⚠️ No se puede conectar al blockchain (localhost:3001).</td></tr>`;
        const podium = document.getElementById('rankingPodium');
        if (podium) podium.innerHTML = '<div class="podium-loading">⚠️ Blockchain desconectado.</div>';
    }

    /* --------------------------------------------------------
       BALANCE UPDATE (called externally)
    -------------------------------------------------------- */
    updateBalance(change) {
        if (!this.userData) return;
        this.userData.balance += change;
        localStorage.setItem('sunbet_user', JSON.stringify(this.userData));
        this.renderUserUI();
    }
}

/* ========================================================= */
let dashboard;
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
    window.updateBalance = change => dashboard.updateBalance(change);
});
