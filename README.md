# 🎰 SunBet - Plataforma de Ruleta con Blockchain

## 📌 Descripción del Proyecto
**SunBet** es una plataforma interactiva de casino en línea centrada en el juego de la Ruleta Europea. Su principal innovación didáctica y estructural es la integración de un **sistema de persistencia basado en una blockchain simplificada**, desarrollada completamente a medida en Node.js. Esto garantiza la inmutabilidad de las transacciones, la transparencia en el historial de los usuarios y un registro confiable de cada apuesta y resultado.

---

## 🏗️ Arquitectura del Sistema
El proyecto emplea una arquitectura descentralizada (simulada localmente) dividida en dos capas principales, que se comunican mediante una API REST y WebSockets.

### 1. Frontend (Cliente de Usuario)
Desarrollado puramente con HTML5, CSS3 y JavaScript Vanilla (ES6+). Ha sido diseñado con un enfoque modular y componentes estéticos de alta calidad (como glassmorphism y animaciones fluidas) para ofrecer una experiencia *premium*. Está seccionado en submódulos claros:

- **`/front/auth-web/`** 🔐
  Módulo de autenticación. Gestiona el formulario de registro de nuevos jugadores y el inicio de sesión de cuentas existentes, comunicándose con la blockchain para asentar o validar las credenciales.
  
- **`/front/main-web/`** 📊
  Dashboard principal (Panel de control). Es el centro de operaciones donde el jugador, tras iniciar sesión, puede verificar su balance en tiempo real, observar estadísticas de juego y auditar su historial inmutable de transacciones obtenido directamente de la blockchain.
  
- **`/front/ruleta-web/`** 🎡
  Motor y vista principal del juego. Aquí se cargan la lógica de apuestas de la ruleta europea, el control de las fichas, las animaciones envolventes de la ruleta girando y el envío de las jugadas al servidor para su ejecución y grabado en los bloques.

### 2. Backend (Nodo Blockchain)
Ubicado en el directorio **`/blockchain`**, funciona como el núcleo del sistema, procesando la lógica de negocio y almacenando la información.
- **Tecnologías:** Node.js, Express.js (para la API REST), WebSockets, `crypto-js` (para cálculos criptográficos de hasheo SHA256).
- **Funcionamiento:** Implementa desde cero una cadena de bloques funcional. Cada evento importante (apuestas, creación de cuentas, depósitos o pagos de premios) es encriptado, minado y añadido como un bloque inmutable a la cadena. 

---

## ⚙️ Flujo de Funcionamiento
1. **Acceso:** El usuario carga el portal de Login (`auth-web`), e ingresa sus datos. Si es nuevo, el backend Node genera una "transacción génesis" para su cuenta inicializando su saldo.
2. **Dashboard:** El usuario accede a `main-web`. Mediante peticiones Fetch, JavaScript solicita a la blockchain todo el historial vinculado al cliente y renderiza las gráficas e historial de saldo.
3. **Mecánica de Juego:** El jugador ingresa a `ruleta-web`. Realiza sus apuestas distribuyendo saldo visual. Al girar la ruleta:
   - Se procesa la jugada y se contacta a la API con los datos.
   - El backend evalúa si hay ganancia o pérdida, y crea una transacción oficial.
   - Se encadena un nuevo bloque confirmando la liquidación final.
   - El front se actualiza reflejando el nuevo balance y emitiendo los efectos correspondientes.

---

## 🚀 Guía de Despliegue y Ejecución Local

Para levantar el proyecto en tu entorno local, necesitas tener instalado [Node.js](https://nodejs.org/) (versión 14 o superior recomendada).

### Paso 1: Levantar el Servidor Blockchain
Abre una terminal interactiva (CLI) y ejecuta los siguientes comandos:
```bash
# 1. Navega al directorio del backend
cd blockchain

# 2. Instala las dependencias (Express, Crypto-js, ws, etc.)
npm install

# 3. Arranca el servidor Nodo de la blockchain
npm start
```
*Verás un mensaje en la consola confirmando que la API REST se encuentra operando (generalmente en el puerto 3001) y está lista para firmar transacciones.*

### Paso 2: Ejecutar el Frontend
El frontend de SunBet requiere estar servido bajo un protocolo HTTP puro (en lugar de abrir el archivo suelto mediante protocolo `file://`) debido a su uso intensivo de Cédulas ES6 (Modules) y consumo de API local por CORS.

**Opción A (Recomendada): Usando Live Server en VSCode**
1. Abre el proyecto en Visual Studio Code.
2. Dirígete a `front/auth-web/index.html`.
3. Haz clic derecho y selecciona **"Open with Live Server"**.

**Opción B: Usando HTTP-Server de Node**
En otra ventana de la terminal, desde el directorio raíz del proyecto:
```bash
# Navega al frontend
cd front

# Ejecuta un servidor simple
npx http-server . -p 8080
```
Luego, en tu navegador web entra a:
👉 `http://localhost:8080/auth-web/index.html`

---

## 🔮 Mejoras Planificadas (Roadmap)
- [ ] Transición de lógica de apuestas a un `Smart Contract` real (Solidity) en redes como Ethereum o Polygon.
- [ ] Implementación de persistencia física en base de datos híbrida para asegurar datos en caso de matar el proceso de Node.js.
- [ ] Mejora de eventos multijugador 100% en tiempo real usando los WebSockets existentes.

---
*Desarrollo elaborado con fines académicos para la exploración y entendimiento práctico de la arquitectura dApp y lógica Blockchain conectada a interfaces de usuario (UI/UX) escalables.*
