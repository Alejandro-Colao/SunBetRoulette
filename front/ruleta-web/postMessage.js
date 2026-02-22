// Variables globales en el iframe
var saldo = 1000;

// 1. Recibir saldo inicial del parent
// 1. Recibir saldo inicial del parent
window.addEventListener("message", function (event) {
    console.log("Iframe: Mensaje recibido del parent:", event.data);

    if (event.data && event.data.tipo === "ActualizarSaldo") {
        saldo = event.data.saldo;
        console.log('Iframe: Saldo inicial recibido:', saldo);

        // Actualizar el juego si está cargado
        if (window.updateGameBalance) {
            window.updateGameBalance(saldo);
        } else {
            console.warn('window.updateGameBalance no está definido aún');
        }

        actualizarSaldo(); // Mantiene la actualización del display simple si existe
    }
});

// 2. Función para actualizar UI en el iframe
function actualizarSaldo() {
    // Actualizar la interfaz con el saldo
    const saldoElement = document.getElementById('saldoDisplay');
    if (saldoElement) {
        saldoElement.textContent = `$${saldo}`;
    }
    console.log('Iframe: UI actualizada con saldo:', saldo);
}

// 3. Función para enviar saldo modificado al parent
function enviarSaldo(nuevoSaldo) {
    if (nuevoSaldo !== saldo) {
        saldo = nuevoSaldo;
        console.log('Iframe: Enviando nuevo saldo:', saldo);

        // IMPORTANTE: Usar window.parent.postMessage
        window.parent.postMessage({
            tipo: "SaldoModificado",
            saldo: saldo
        }, "*");

        // Opcional: también enviar a todos los frames si hay múltiples
        // window.top.postMessage({ tipo: "SaldoModificado", saldo: saldo }, "*");
    }
}