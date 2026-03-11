// ================================================================
// chat.js — Gestor de la conexión WebSocket STOMP
// Se carga en index.html antes de app.js
// ================================================================

const WS_URL = "http://localhost:8080/ws";
const API_BASE = "http://localhost:8080";

let stompClient = null;
let chatConected = false;

// Callback global que mensajes.js puede sobrescribir para recibir mensajes
window.onMensajeRecibido = null;

/**
 * Conecta al broker STOMP con el JWT del usuario actual.
 * Llama a los callbacks opcionales onConnect / onError.
 */
function chatConnect() {
    const token = getToken();
    if (!token || chatConected) return;

    const socket = new SockJS(WS_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // silencia el log STOMP en consola

    stompClient.connect(
        { Authorization: `Bearer ${token}` },   // JWT en header STOMP CONNECT
        (frame) => {
            chatConected = true;

            // Suscribirse a la cola privada de este usuario
            stompClient.subscribe("/user/queue/chat", (msg) => {
                const mensaje = JSON.parse(msg.body);

                // Notificar a la página de mensajes si está abierta
                if (typeof window.onMensajeRecibido === 'function') {
                    window.onMensajeRecibido(mensaje);
                }

                // Actualizar el badge de mensajes no leídos en el sidebar
                actualizarBadgeChat();
            });

            // Cargar badge inicial
            actualizarBadgeChat();
        },
        (error) => {
            console.warn("WebSocket desconectado:", error);
            chatConected = false;

            // Reintentar conexión tras 5 segundos
            setTimeout(chatConnect, 5000);
        }
    );
}

/**
 * Envía un mensaje privado.
 * @param {string} destinatario - username del destinatario
 * @param {string} contenido    - texto del mensaje
 */
function chatSend(destinatario, contenido) {
    if (!stompClient || !chatConected) {
        console.warn("chatSend: no hay conexión WebSocket activa");
        return;
    }
    stompClient.send("/app/chat.privado", {}, JSON.stringify({ destinatario, contenido }));
}

/**
 * Desconecta el cliente STOMP limpiamente (al hacer logout).
 */
function chatDisconnect() {
    if (stompClient && chatConected) {
        stompClient.disconnect(() => { chatConected = false; });
    }
}

/**
 * Consulta el endpoint REST de no-leídos y actualiza el badge
 * numérico que aparece sobre el ícono de mensajes en el sidebar.
 */
async function actualizarBadgeChat() {
    try {
        const res = await authFetch(`${API_BASE}/api/mensajes/no-leidos`);
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById("chatBadge");
        if (!badge) return;

        if (data.total > 0) {
            badge.textContent = data.total > 99 ? "99+" : data.total;
            badge.style.display = "inline-flex";
        } else {
            badge.style.display = "none";
        }
    } catch (_) {
        // Silenciar errores de red (el usuario puede haber cerrado sesión)
    }
}

// Actualizar badge cada 30 segundos como fallback
setInterval(actualizarBadgeChat, 30_000);
