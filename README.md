# 🎰 SunBet

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

Proyecto académico desarrollado en el ciclo de **Grado Superior en Desarrollo de Aplicaciones Web (DAW)**.

SunBet es una aplicación web de ruleta europea que integra una **blockchain simplificada desarrollada en Node.js** para registrar apuestas, balances y transacciones de forma estructurada e inmutable.

---

## 📌 Descripción General

La aplicación permite:

- Registro e inicio de sesión de usuarios
- Gestión de balance individual
- Realización de apuestas en ruleta europea
- Generación automática de resultados
- Registro de apuestas en una blockchain propia
- Visualización del historial de transacciones

El objetivo del proyecto es combinar desarrollo web tradicional con principios fundamentales de tecnología blockchain.

---

## 🏗 Arquitectura del Sistema

El proyecto está estructurado en dos grandes bloques:

### 🔹 1. Frontend
Desarrollado en:
- HTML5
- CSS3 (Flexbox, Grid, Animaciones)
- JavaScript ES6

Responsabilidades:
- Interfaz de usuario
- Animaciones de ruleta
- Interacción con el backend mediante API REST
- Renderizado dinámico de saldo e historial

### 🔹 2. Backend / Blockchain
Desarrollado en:
- Node.js
- Express

Responsabilidades:
- Gestión de usuarios
- Gestión de balances
- Creación y validación de bloques
- Encadenamiento criptográfico mediante hash
- Exposición de endpoints REST

---

## ⚙️ Tecnologías Utilizadas

- HTML5  
- CSS3  
- JavaScript (ES6)  
- Node.js  
- Express  
- Hashing criptográfico (SHA)  
- Arquitectura cliente-servidor  

---

## 🚀 Instalación y Ejecución

### 1️⃣ Clonar el repositorio

git clone https://github.com/Alejandro-Colao/SunBetRoulette.git

### 2️⃣ Instalar dependencias del backend

cd blockchain
npm install

### 3️⃣ Iniciar el servidor

node main.js

### 4️⃣ Abrir el frontend

Abrir el archivo correspondiente dentro de /front en el navegador.

---

## 🔐 Funcionamiento de la Blockchain

Cada apuesta genera un bloque que contiene:

- Usuario
- Cantidad apostada
- Tipo de apuesta
- Resultado
- Timestamp
- Hash del bloque anterior
- Hash actual

La cadena garantiza integridad mediante encadenamiento criptográfico.

---

## 🎯 Objetivos Académicos

- Aplicación de metodología Scrum con múltiples sprints
- Diseño de arquitectura modular
- Implementación de persistencia basada en blockchain
- Simulación de entorno descentralizado
- Separación clara entre frontend y backend

---

## 🔮 Líneas Futuras de Mejora

- Integración con red blockchain real (Ethereum / Polygon)
- Smart contract en Solidity
- Autenticación segura con JWT
- Auditoría de seguridad
- Migración a arquitectura MVC completa
- Refactorización hacia framework moderno (React / Vue)

---

## 👤 Autor

Alejandro Colao Gómez
Proyecto académico – DAW

---

## 📜 Licencia

Uso académico y educativo.
