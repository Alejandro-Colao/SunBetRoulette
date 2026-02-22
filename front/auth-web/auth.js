class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.initialize();
    }

    initialize() {
        this.setupTabSwitching();
        this.setupFormSubmissions();
        this.checkExistingSession();
    }

    setupTabSwitching() {
        // New design: tabs are handled inline in index.html.
        // Sync currentTab when the tab buttons are clicked.
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        if (loginTab) loginTab.addEventListener('click', () => { this.currentTab = 'login'; });
        if (registerTab) registerTab.addEventListener('click', () => { this.currentTab = 'register'; });
    }

    switchTab(tab) {
        this.currentTab = tab;
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (tab === 'register') {
            registerTab?.classList.add('active');
            loginTab?.classList.remove('active');
            registerForm?.classList.add('active');
            loginForm?.classList.remove('active');
        } else {
            loginTab?.classList.add('active');
            registerTab?.classList.remove('active');
            loginForm?.classList.add('active');
            registerForm?.classList.remove('active');
        }

        this.currentTab = tab;
    }

    setupFormSubmissions() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Social login (simulado)
        document.querySelectorAll('.google-login').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialLogin('google');
            });
        });

        document.querySelectorAll('.github-login').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialLogin('github');
            });
        });

        document.querySelectorAll('.facebook-login').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialLogin('facebook');
            });
        });

        document.querySelectorAll('.twitter-login').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialLogin('twitter');
            });
        });
    }

    checkExistingSession() {
        const token = localStorage.getItem('sunbet_token');
        if (token) {
            // Redirigir al dashboard si ya hay sesión
            window.location.href = '../main-web/index.html';
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Validación simple
        if (!email || !password) {
            this.showError('Por favor, completa todos los campos');
            return;
        }

        // Simular autenticación con API
        try {
            // En un caso real, aquí harías una petición a tu backend
            const user = await this.authenticateUser(email, password);

            if (user) {
                this.createSession(user);
                window.location.href = '../main-web/index.html';
            } else {
                this.showError('Credenciales incorrectas');
            }
        } catch (error) {
            this.showError('Error de conexión');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        // Validaciones
        if (!name || !email || !password || !confirmPassword) {
            this.showError('Por favor, completa todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            this.showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        // Simular registro
        try {
            const user = await this.registerUser(name, email, password);
            this.createSession(user);
            window.location.href = '../main-web/index.html';
        } catch (error) {
            this.showError('Error al crear la cuenta');
        }
    }

    async authenticateUser(email, password) {
        try {
            const response = await fetch('http://localhost:3001/blocks');
            if (!response.ok) throw new Error('Error al conectar con blockchain');

            const blocks = await response.json();

            console.log(`[Auth] Blocks fetched: ${blocks.length}`);

            // 1. Buscar usuario
            // Recorremos los bloques buscando el registro del usuario
            let userFound = null;

            // Buscamos desde el principio (excepto génesis)
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                // block.datos puede venir como string o como objeto dependiendo de la implementación previa
                let data = block.datos;
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch (e) { }
                }

                if (data && data.type === 'user_registration' && data.email === email && data.password === password) {
                    console.log('[Auth] User found in block ' + i);
                    userFound = { ...data }; // Clonamos datos iniciales
                    userFound.balance = userFound.initialBalance || 1000;
                    break;
                }

                // Compatibilidad con formato antiguo
                if (data && data.email === email && data.password === password && !data.type) {
                    console.log('[Auth] Legacy user found in block ' + i);
                    userFound = {
                        userId: 'LEGACY_' + i,
                        name: data.user,
                        email: data.email,
                        balance: 1000
                    };
                    break;
                }
            }

            if (!userFound) {
                console.log('[Auth] User not found');
                return null;
            }

            // 2. Calcular balance actual y Avatar
            // Recorremos TODOS los bloques para sumar/restar transacciones de este usuario
            let currentBalance = userFound.balance;

            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                let data = block.datos;
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch (e) { }
                }

                // Si es un bloque de juego de este usuario
                if (data && data.userId === userFound.userId) {
                    // console.log(`[Auth] Processing block ${i} for user: ${data.type}`);
                    if (data.type === 'roulette') {
                        const change = data.winnings - data.totalBet;
                        currentBalance += change;
                    } else if (data.type === 'transaction') {
                        const change = data.winnings - data.totalBet;
                        currentBalance += change;
                    } else if (data.type === 'profile_update') {
                        console.log('[Auth] Avatar update found:', data.avatarId);
                        // Actualizar avatar con el más reciente
                        if (data.avatarId) {
                            userFound.avatar = data.avatarId;
                        }
                    }
                }
            }

            userFound.balance = currentBalance;
            return userFound;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async registerUser(name, email, password) {
        try {
            const response = await fetch('http://localhost:3001/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: name, email, password })
            });

            if (!response.ok) throw new Error('Error en el servicio de registro');

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Falló el registro');

            // El bloque devuelto contiene los datos
            const blockData = result.block.datos;
            return {
                userId: blockData.userId,
                name: blockData.name,
                email: blockData.email,
                balance: blockData.initialBalance,
                createdAt: blockData.timestamp
            };
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    }

    handleSocialLogin(provider) {
        // Simular login social
        const user = {
            userId: `${provider.toUpperCase()}_${Date.now()}`,
            name: `Usuario ${provider}`,
            email: `user@${provider}.com`,
            balance: 1000,
            createdAt: new Date().toISOString()
        };

        this.createSession(user);
        window.location.href = '../main-web/index.html';
    }

    createSession(user) {
        // Crear token simulado
        const token = btoa(JSON.stringify({
            userId: user.userId,
            exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 días
        }));

        localStorage.setItem('sunbet_token', token);
        localStorage.setItem('sunbet_user', JSON.stringify(user));

        // También registrar en blockchain el login (opcional)
        this.logLoginToBlockchain(user);
    }

    async logLoginToBlockchain(user) {
        try {
            const data = {
                userId: user.userId,
                action: 'login',
                timestamp: new Date().toISOString()
            };

            await fetch('http://localhost:3001/mineBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: JSON.stringify(data),
                    type: 'auth'
                })
            });
        } catch (error) {
            console.error('Error logging login to blockchain:', error);
        }
    }

    showError(message, type = 'error') {
        const isLogin = this.currentTab === 'login';
        // Show in the correct alert div
        const errEl = document.getElementById(isLogin ? 'loginError' : 'registerError');
        if (errEl) {
            errEl.textContent = message;
            errEl.style.display = 'block';
            setTimeout(() => { errEl.style.display = 'none'; }, 4000);
            return;
        }
        // Fallback: inject a .error-message div (legacy)
        const existingError = document.querySelector('.error-message');
        if (existingError) existingError.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message alert alert-error';
        errorDiv.textContent = message;
        const activeForm = isLogin
            ? document.getElementById('loginForm')
            : document.getElementById('registerForm');
        activeForm?.insertBefore(errorDiv, activeForm.firstChild);
        setTimeout(() => { errorDiv.remove(); }, 4000);
    }

    showSuccess(message) {
        const el = document.getElementById('registerSuccess');
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            setTimeout(() => { el.style.display = 'none'; }, 4000);
        }
    }
}

// Inicializar cuando se carga la página
window.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});