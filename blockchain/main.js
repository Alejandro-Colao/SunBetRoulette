'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");

// Definicion de puertos y peers iniciales
var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

// Esta es la estructura del bloque que se va a generar
class Bloque {
    constructor(index, anteriorHash, tiempo, datos, hash) {
        this.index = index;
        this.anteriorHash = anteriorHash.toString();
        this.tiempo = tiempo;
        this.datos = datos; // Añadido campo datos
        this.hash = hash.toString();
    }
}

// Generamos el bloque de Genesis, el bloque 0
var getGenesisBloque = () => {
    return new Bloque(0, "0", 1465154705, "Mi bloque de Genesis", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
}

// Almacenamos los bloques
var blockchain = [getGenesisBloque()];

// Mensajes de control
var sockets = [];
var MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

// Servidor Web con las peticiones correspondientes
var initHttpServer = () => {
    var app = express();
    app.use(bodyParser.json());

    // Habilitar CORS para permitir peticiones desde el front
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));

    // Endpoint para minar eventos de juego (ruleta) y otros tipos
    app.post('/mineBlock', (req, res) => {
        try {
            // Construir objeto de datos
            var blockType = req.body.type || "roulette"; // Permitir tipos personalizados (e.g. 'transaction', 'profile_update')

            var blockData = {
                type: blockType,
                userId: req.body.userId,
                rouletteResult: req.body.rouletteResult || "GENERIC_EVENT",
                totalBet: parseFloat(req.body.totalBet) || 0,
                winnings: parseFloat(req.body.winnings) || 0,
                betDetails: req.body.betDetails || {},
                // Campos adicionales para otros tipos
                avatarId: req.body.avatarId,
                timestamp: new Date().toISOString()
            };

            var nuevoBloque = generarSiguienteBloque(blockData);
            addBloque(nuevoBloque);
            broadcast(responseLatestMsg());
            console.log(`Bloque ${blockType} añadido: ` + JSON.stringify(nuevoBloque));

            res.json({ success: true, block: nuevoBloque });
        } catch (error) {
            console.error("Error mining block:", error);
            res.status(400).json({ success: false, error: error.message });
        }
    });

    // Endpoint para registrar usuarios
    app.post('/user', (req, res) => {
        try {
            if (!req.body.user || !req.body.email || !req.body.password) {
                throw new Error("Faltan datos de usuario");
            }

            var userData = {
                type: "user_registration",
                userId: 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: req.body.user,
                email: req.body.email,
                password: req.body.password, // Nota: En prod esto debe ser hash
                initialBalance: 1000,
                timestamp: new Date().toISOString()
            };

            var nuevoBloque = generarSiguienteBloque(userData);
            addBloque(nuevoBloque);
            broadcast(responseLatestMsg());
            console.log('Bloque User añadido: ' + JSON.stringify(nuevoBloque));

            res.json({ success: true, block: nuevoBloque });
        } catch (error) {
            console.error("Error mining user block:", error);
            res.status(400).json({ success: false, error: error.message });
        }
    });

    app.get('/peers', (req, res) => {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/addPeer', (req, res) => {
        connectToPeers([req.body.peer]);
        res.send();
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};

var initP2PServer = () => {
    var server = new WebSocket.Server({ port: p2p_port });
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket p2p port on: ' + p2p_port);
};

// Conexion
var initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};

// Mensajes durente la conexion
var initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var message = JSON.parse(data);
        console.log('Received message' + JSON.stringify(message));
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
        }
    });
};

var initErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

// Generamos el bloque siguiente
var generarSiguienteBloque = (BloqueDatos) => {
    var anteriorBloque = getUltimoBloque();
    var siguienteIndex = anteriorBloque.index + 1;
    var siguienteTiempo = new Date().getTime() / 1000;
    var siguienteHash = calcularHash(siguienteIndex, anteriorBloque.hash, siguienteTiempo, BloqueDatos);
    return new Bloque(siguienteIndex, anteriorBloque.hash, siguienteTiempo, BloqueDatos, siguienteHash);
};

// Calculamos el hash del bloque
var calcularHashForBloque = (bloque) => {
    return calcularHash(bloque.index, bloque.anteriorHash, bloque.tiempo, bloque.datos);
};

var calcularHash = (index, anteriorHash, tiempo, datos) => {
    // Convertir datos a string ordenado para consistencia en hash
    const datosString = typeof datos === 'string' ? datos : JSON.stringify(datos);
    return CryptoJS.SHA256(index + anteriorHash + tiempo + datosString).toString();
};

// anadir un bloque
var addBloque = (nuevoBloque) => {
    if (esValidoNuevoBloque(nuevoBloque, getUltimoBloque())) {
        blockchain.push(nuevoBloque);
    }
};

// Validando la integridad de los datos
var esValidoNuevoBloque = (nuevoBloque, anteriorBloque) => {
    if (anteriorBloque.index + 1 !== nuevoBloque.index) {
        console.log("Indice invalido");
        return false;
    } else if (anteriorBloque.hash !== nuevoBloque.anteriorHash) {
        console.log("Hash anterior invalido");
        return false;
    } else if (calcularHashForBloque(nuevoBloque) != nuevoBloque.hash) {
        console.log(typeof (nuevoBloque.hash) + ' ' + typeof calcularHashForBloque(nuevoBloque));
        console.log("Hash invalido" + calcularHashForBloque(nuevoBloque) + ' ' + nuevoBloque.hash);
        return false;
    }
    return true;
};

// conectamos los demas nodos
var connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};

var handleBlockchainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = getUltimoBloque();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('El bloque de detras es:' + latestBlockHeld.index + ' Peer consiguio: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log("Podemos agregar el bloque recibido a nuestra cadena");
            blockchain.push(latestBlockReceived);
            //broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.log("Tenemos que consultar la cadena de nuestro par");
            broadcast(queryAllMsg());
        } else {
            console.log("La cadena de bloques recibida es más larga que la cadena de bloques actual");
            reenplazarChain(receivedBlocks);
        }
    } else {
        console.log('recibido blockchain no es más largo que blockchain actual. No se va a hacer ninguna operacion');
    }
};

// Cadenas mas largas
var reenplazarChain = (nuevosBloques) => {
    if (esChainValido(nuevosBloques) && nuevosBloques.length > blockchain.length) {
        console.log('La cadena de bloques recibida es valida, se sustituye');
        blockchain = nuevosBloques;
        //broadcast(resposeLatestMsg());
    } else {
        console.log("Cadena de bloques invalida");
    }
};

// Comprobamos si el chain es valido
var esChainValido = (blockchainToValidate) => {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBloque())) {
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (esValidoNuevoBloque(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};

var getUltimoBloque = () => blockchain[blockchain.length - 1];
var queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });
var queryAllMsg = () => ({ 'type': MessageType.QUERY_ALL });
var responseChainMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)
});
var responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([getUltimoBloque()])
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket, message));

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();