class Dashboard {
    constructor() {
        this.userData = null;
        this.initialize();
    }

    async initialize() {
        await this.checkAuth();
        this.setupEventListeners();
        this.loadUserData();
        this.setupWebSocket();
        this.loadRecentResults(); // Sidebar
        this.loadUserHistory(); // Full History & Stats
    }

    async loadUserHistory() {
        try {
            console.log('Loading user history...');
            const response = await fetch('http://localhost:3001/blocks');
            const blocks = await response.json();
            console.log(`Fetched ${blocks.length} total blocks.`);

            // Filter blocks for current user
            const userBlocks = blocks.filter(block => {
                try {
                    const data = typeof block.datos === 'string' ? JSON.parse(block.datos) : block.datos;
                    return data.userId === this.userData.userId;
                } catch (e) {
                    console.error('Error parsing block data:', e, block);
                    return false;
                }
            });
            console.log(`Found ${userBlocks.length} blocks for current user.`);

            // Calculate Stats before filtering out profile updates for history
            this.calculateStats(userBlocks);

            // Filter for History Table (exclude profile updates)
            const historyBlocks = userBlocks.filter(block => {
                const data = typeof block.datos === 'string' ? JSON.parse(block.datos) : block.datos;
                return data.type === 'roulette' || data.type === 'transaction';
            });
            console.log(`Found ${historyBlocks.length} history blocks to render.`);

            // Clear existing history
            document.getElementById('historyTableBody').innerHTML = '';

            // Populate History (Newest first)
            historyBlocks.reverse().forEach(block => {
                const data = typeof block.datos === 'string' ? JSON.parse(block.datos) : block.datos;
                this.addToHistory(data);
            });

        } catch (error) {
            console.error('Error loading user history:', error);
        }
    }

    calculateStats(userBlocks) {
        let totalBet = 0;
        let totalWon = 0;
        let wonBets = 0;
        let totalGames = 0;

        userBlocks.forEach(block => {
            const data = typeof block.datos === 'string' ? JSON.parse(block.datos) : block.datos;

            if (data.type === 'roulette') {
                totalGames++;
                totalBet += parseFloat(data.totalBet || 0);

                // data.winnings includes stake returned on win
                // Net profit = winnings - totalBet. 
                // But "Total Ganado" usually means payouts. Let's send raw winnings.
                totalWon += parseFloat(data.winnings || 0);

                if (parseFloat(data.winnings) > 0) {
                    wonBets++;
                }
            }
        });

        const winRate = totalGames > 0 ? ((wonBets / totalGames) * 100).toFixed(1) : 0;

        document.getElementById('totalBetStat').textContent = totalBet.toLocaleString() + ' €';
        document.getElementById('totalWonStat').textContent = totalWon.toLocaleString() + ' €';
        document.getElementById('wonBetsStat').textContent = wonBets;
        document.getElementById('successRateStat').textContent = winRate + '%';

        // Bonus: Update Charts if they exist (simple implementation)
        // This is a placeholder for real Chart.js implementation
    }


    async checkAuth() {
        const token = localStorage.getItem('solbet_token');
        if (!token) {
            window.location.href = '../auth-web/index.html';
            return;
        }

        try {
            // Verificar token con servidor (simulado)
            this.userData = JSON.parse(localStorage.getItem('solbet_user'));
            this.updateUI();
        } catch (error) {
            localStorage.clear();
            window.location.href = '../auth-web/index.html';
        }
    }

    updateUI() {
        document.getElementById('userName').textContent = this.userData.name;
        document.getElementById('userBalance').textContent = this.userData.balance + ' €';
        document.getElementById('profileName').textContent = this.userData.name;

        // Avatar
        const avatars = document.querySelectorAll('.avatar, .avatar-large');
        avatars.forEach(avatar => {
            if (this.userData.avatar) {
                avatar.textContent = this.userData.avatar;
                avatar.style.background = '#f0f0f0'; // Fondo neutro para emoji
                avatar.style.fontSize = avatar.classList.contains('avatar-large') ? '3rem' : '1.5rem';
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
            } else {
                avatar.style.background = this.getAvatarColor(this.userData.name);
                avatar.textContent = this.userData.name.charAt(0).toUpperCase();
                avatar.style.fontSize = '';
            }
        });
    }

    getAvatarColor(name) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const index = name.length % colors.length;
        return colors[index];
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../auth-web/index.html';
        });

        // Botones de perfil
        document.getElementById('depositBtn').addEventListener('click', () => this.showDepositModal());
        document.getElementById('withdrawBtn').addEventListener('click', () => this.showWithdrawModal());

        // Avatar Modal
        this.setupAvatarModal();
    }

    setupAvatarModal() {
        const modal = document.getElementById('avatarModal');
        const btn = document.getElementById('changeAvatarBtn');
        const span = document.getElementsByClassName('close-modal')[0];
        const grid = document.querySelector('.avatar-grid');

        btn.onclick = () => {
            modal.style.display = 'block';
            this.generateAvatarGrid(grid);
        }

        span.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }

    generateAvatarGrid(container) {
        container.innerHTML = '';
        const avatars = [
            '👨', '👩', '🧑', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲',
            '🧔', '👱‍♂️', '👱‍♀️', '👲', '👳‍♂️', '🧕', '👮‍♂️', '👮‍♀️', '👷‍♂️', '👷‍♀️',
            '🕵️‍♂️', '🕵️‍♀️', '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🧟‍♂️', '🧟‍♀️', '🤖', '👾', '👽'
        ];

        avatars.forEach(avatar => {
            const div = document.createElement('div');
            div.className = 'avatar-option';
            div.textContent = avatar;
            div.onclick = () => this.selectAvatar(avatar);
            container.appendChild(div);
        });
    }

    async selectAvatar(avatar) {
        this.userData.avatar = avatar;
        localStorage.setItem('solbet_user', JSON.stringify(this.userData));
        this.updateUI();
        document.getElementById('avatarModal').style.display = 'none';

        // Persistir en blockchain
        try {
            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'profile_update',
                    userId: this.userData.userId,
                    avatarId: avatar
                })
            });
            console.log('Avatar update mined');
        } catch (error) {
            console.error('Error mining avatar update:', error);
        }
    }

    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Quitar active de todos los links
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Mostrar sección seleccionada
        document.getElementById(sectionId + 'Section').classList.add('active');
        document.querySelector(`nav a[data-section="${sectionId}"]`).classList.add('active');
    }

    setupWebSocket() {
        const ws = new WebSocket('ws://localhost:6001');

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 2) { // RESPONSE_BLOCKCHAIN
                const blocks = JSON.parse(message.data);
                const latestBlock = blocks[0];

                // Verificar si es una transacción de ruleta o propia
                try {
                    const blockData = JSON.parse(latestBlock.datos);

                    if (blockData.userId === this.userData.userId) {
                        // FIX: No actualizar balance por WS para mis propias acciones (ya actualizadas localmente)

                        // Manejo por tipo de bloque
                        if (blockData.type === 'roulette') {
                            this.addToHistory(blockData);
                            this.updateRecentResults(blockData);
                        } else if (blockData.type === 'transaction') {
                            this.addToHistory(blockData);
                            // No agregamos transacciones a la barra visual de resultados de ruleta
                        } else if (blockData.type === 'profile_update') {
                            // Si llega un update de perfil (quizás de otra pestaña), actualizamos
                            if (blockData.avatarId) {
                                this.userData.avatar = blockData.avatarId;
                                this.updateUI();
                            }
                        }
                    } else {
                        // Si es de OTRO usuario, solo actualizamos la barra de resultados si es ruleta
                        if (blockData.type === 'roulette') {
                            this.updateRecentResults(blockData);
                        }
                    }
                } catch (e) {
                    // No es JSON válido
                }
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    async loadRecentResults() {
        try {
            const response = await fetch('http://localhost:3001/blocks');
            const blocks = await response.json();

            // Filtrar solo bloques de ruleta y mostrar los últimos 10
            const rouletteBlocks = blocks.filter(block => {
                try {
                    const data = JSON.parse(block.datos);
                    return data.type === 'roulette';
                } catch {
                    return false;
                }
            }).slice(-10);

            this.displayRecentResults(rouletteBlocks);
        } catch (error) {
            console.error('Error loading blocks:', error);
        }
    }

    displayRecentResults(blocks) {
        const container = document.getElementById('recentResults');
        container.innerHTML = '';

        blocks.reverse().forEach(block => {
            try {
                const data = JSON.parse(block.datos);
                const resultElement = document.createElement('div');
                resultElement.className = 'result-item';
                resultElement.innerHTML = `
                    <div class="result-number">${data.rouletteResult.split(' ')[0]}</div>
                    <div class="result-color ${data.rouletteResult.includes('rojo') ? 'red' :
                        data.rouletteResult.includes('negro') ? 'black' : 'green'}"></div>
                    <div class="result-time">${new Date(block.tiempo * 1000).toLocaleTimeString()}</div>
                `;
                container.appendChild(resultElement);
            } catch (e) {
                console.error('Error parsing block data:', e);
            }
        });
    }

    updateUserBalance(change) {
        this.userData.balance += change;
        localStorage.setItem('solbet_user', JSON.stringify(this.userData));
        this.updateUI();
    }

    addToHistory(blockData) {
        const tableBody = document.getElementById('historyTableBody');
        const row = document.createElement('tr');

        const date = new Date(blockData.timestamp || Date.now()).toLocaleString();

        let typeStr, resultStr, amountStr, winStr, statusStr, statusClass;

        if (blockData.type === 'transaction') {
            const subtype = blockData.betDetails?.subtype || 'transaction';
            typeStr = subtype === 'deposit' ? 'Depósito' : 'Retiro';
            resultStr = '-';
            amountStr = blockData.betDetails?.amount + ' €';
            winStr = '-';
            statusClass = 'win'; // Green for transactions usually
            statusStr = 'Completado';
        } else {
            // Roulette (default)
            typeStr = blockData.betDetails?.type || 'Ruleta';
            resultStr = blockData.rouletteResult;
            amountStr = blockData.totalBet + ' €';
            winStr = blockData.winnings + ' €';
            statusClass = blockData.winnings > blockData.totalBet ? 'win' : 'lose';
            statusStr = statusClass === 'win' ? 'Ganada' : 'Perdida';
        }

        row.innerHTML = `
            <td>${date}</td>
            <td>${typeStr}</td>
            <td>${resultStr}</td>
            <td>${amountStr}</td>
            <td class="${statusClass}">${winStr}</td>
            <td><span class="status-badge ${statusClass}">${statusStr}</span></td>
        `;

        tableBody.insertBefore(row, tableBody.firstChild);
    }

    updateRecentResults(blockData) {
        // Agregar resultado reciente
        const container = document.getElementById('recentResults');
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';

        const number = blockData.rouletteResult.split(' ')[0];
        const color = blockData.rouletteResult.includes('rojo') ? 'red' :
            blockData.rouletteResult.includes('negro') ? 'black' : 'green';

        resultElement.innerHTML = `
            <div class="result-number">${number}</div>
            <div class="result-color ${color}"></div>
            <div class="result-time">${new Date().toLocaleTimeString()}</div>
        `;

        container.insertBefore(resultElement, container.firstChild);

        // Limitar a 10 resultados
        if (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }

    showDepositModal() {
        const amount = prompt('Ingresa el monto a depositar:');
        if (amount && !isNaN(amount) && amount > 0) {
            const floatAmount = parseFloat(amount);
            this.userData.balance += floatAmount;
            localStorage.setItem('solbet_user', JSON.stringify(this.userData));
            this.updateUI();

            // Persistir en blockchain
            this.mineTransaction('deposit', floatAmount);

            alert(`Depositado ${amount} € exitosamente. Nuevo balance: ${this.userData.balance} €`);
            this.syncBalanceToIframe();
        }
    }

    showWithdrawModal() {
        const amount = prompt('Ingresa el monto a retirar:');
        if (amount && !isNaN(amount) && amount > 0) {
            const floatAmount = parseFloat(amount);
            if (floatAmount <= this.userData.balance) {
                this.userData.balance -= floatAmount;
                localStorage.setItem('solbet_user', JSON.stringify(this.userData));
                this.updateUI();

                // Persistir en blockchain
                this.mineTransaction('withdraw', floatAmount);

                alert(`Retirado ${amount} € exitosamente. Nuevo balance: ${this.userData.balance} €`);
                this.syncBalanceToIframe();
            } else {
                alert('Fondos insuficientes');
            }
        }
    }

    // Función para que la ruleta pueda actualizar el balance
    updateBalance(change) {
        this.updateUserBalance(change);
    }

    syncBalanceToIframe() {
        const iframe = document.getElementById('ruletaIframe');
        if (iframe && iframe.contentWindow) {
            console.log('Main: Sincronizando balance con iframe:', this.userData.balance);
            iframe.contentWindow.postMessage({
                tipo: "ActualizarSaldo",
                saldo: this.userData.balance
            }, "*");
        }
    }

    async mineTransaction(type, amount) {
        try {
            const transactionData = {
                userId: this.userData.userId,
                rouletteResult: "TRANSACTION", // Campo requerido por endpoint actual, aunque sea dummy
                totalBet: type === 'withdraw' ? amount : 0, // Si retiro, "gasto"
                winnings: type === 'deposit' ? amount : 0, // Si deposito, "gano"
                betDetails: {
                    type: 'transaction',
                    subtype: type,
                    amount: amount
                }
            };

            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });
            console.log(`Transaction ${type} mined successfully`);
        } catch (error) {
            console.error('Error mining transaction:', error);
        }
    }
}

// Inicializar dashboard cuando se carga la página
let dashboard;
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
    window.userData = dashboard.userData;
    window.updateBalance = (change) => dashboard.updateBalance(change);
});



// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    const iframe = document.getElementById('ruletaIframe');

    // 1. Enviar saldo al iframe cuando cargue
    iframe.addEventListener('load', function () {
        if (dashboard && dashboard.userData) {
            console.log('Main: Enviando saldo inicial al iframe:', dashboard.userData.balance);
            iframe.contentWindow.postMessage({
                tipo: "ActualizarSaldo",
                saldo: dashboard.userData.balance
            }, "*");
        }
    });

    // 2. Recibir saldo actualizado del iframe
    // 2. Recibir mensajes del iframe
    window.addEventListener("message", (event) => {
        // Verificar origen si fuera necesario

        if (event.data.tipo === "SaldoModificado") {
            console.log("Main: Saldo recibido del iframe:", event.data.saldo);

            // Calcular diferencia y actualizar UI/LocalStorage
            if (dashboard && dashboard.userData) {
                const nuevoSaldo = event.data.saldo;
                const saldoActual = dashboard.userData.balance;
                const diferencia = nuevoSaldo - saldoActual;

                if (diferencia !== 0) {
                    console.log(`Main: Actualizando balance local por ${diferencia} €`);
                    dashboard.updateUserBalance(diferencia);
                }
            }
        } else if (event.data.tipo === "GameFinished") {
            console.log("Main: Juego finalizado:", event.data);
            if (dashboard) {
                dashboard.mineGameResult(event.data);
            }
        }
    });
});

// Agregar método mineGameResult a Dashboard (monkey-patching o asegurando que esté en la clase)
// Agregar método mineGameResult a Dashboard (monkey-patching o asegurando que esté en la clase)
Dashboard.prototype.mineGameResult = async function (gameData) {
    try {
        // Corrección de bug: winnings debe ser el Payout TOTAL (Ganancia + Apuesta devuelta)
        // si se gana. Si se pierde es 0.
        // gameData.winValue viene de app.js como solo la ganancia neta (odds * bet).
        const totalPayout = gameData.winValue > 0 ? (gameData.winValue + gameData.betTotal) : 0;

        const blockData = {
            userId: this.userData.userId,
            rouletteResult: gameData.result + (gameData.winValue > 0 ? " (WIN)" : " (LOSE)"),
            totalBet: gameData.betTotal,
            winnings: totalPayout,
            betDetails: {
                numbers: gameData.numbers,
                type: 'roulette_game'
            }
        };

        await fetch('http://localhost:3001/mineBlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blockData)
        });
        console.log('Game result mined successfully');
    } catch (error) {
        console.error('Error mining game result:', error);
    }
};
