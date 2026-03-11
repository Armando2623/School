// ================================================================
// mensajes.js — Lógica del módulo de mensajería interna
// Envuelto en IIFE para evitar conflictos de redeclaración al
// re-inyectar el script (el router usa ALWAYS_RELOAD para mensajes)
// ================================================================
(function () {

    const CHAT_API = "http://localhost:8080";

    let chatDestinatario = null;   // username del interlocutor activo
    let todosLosUsuarios = [];     // lista completa de usuarios del sistema

    // ── Inicialización ────────────────────────────────────────────
    async function initMensajes() {
        await cargarUsuariosChat();

        // Registrar callback global: cuando llegue un mensaje vía WS
        window.onMensajeRecibido = (mensaje) => {
            const yo = getUsuario();

            // Solo renderizar si el mensaje es del OTRO usuario
            // (los propios ya se muestran de forma optimista al enviar)
            if (mensaje.remitente !== yo && mensaje.remitente === chatDestinatario) {
                agregarBurbuja(mensaje);
                scrollToBottom();
            }

            // Si viene de alguien cuyo chat no está abierto, mostrar badge
            if (mensaje.remitente !== yo && mensaje.remitente !== chatDestinatario) {
                incrementarBadgeUsuario(mensaje.remitente);
            }

            actualizarBadgeChat();
        };
    }

    // ── Cargar lista de usuarios ──────────────────────────────────
    async function cargarUsuariosChat() {
        const lista = document.getElementById("chatUsersList");
        if (!lista) return;

        try {
            const res = await authFetch(`${CHAT_API}/api/usuarios`);
            if (!res.ok) throw new Error();
            const todos = await res.json();
            const yo = getUsuario();

            todosLosUsuarios = todos.filter(u => u.usuario !== yo);
            renderizarListaUsuarios(todosLosUsuarios);
        } catch {
            lista.innerHTML = `<li class="chat-user-loading" style="color:var(--error-color);">
            <i class="fas fa-exclamation-triangle"></i> Error al cargar usuarios</li>`;
        }
    }

    function renderizarListaUsuarios(usuarios) {
        const lista = document.getElementById("chatUsersList");
        if (!lista) return;

        if (usuarios.length === 0) {
            lista.innerHTML = `<li class="chat-user-loading">Sin otros usuarios.</li>`;
            return;
        }

        const rolLabels = {
            ADMINISTRADOR: "Administrador",
            SECRETARIA: "Secretaria",
            DIRECTOR: "Director",
            PORTERO: "Portero",
            PROFESOR: "Profesor",
        };

        lista.innerHTML = usuarios.map(u => `
        <li class="chat-user-item" id="chatUser_${u.usuario}"
            onclick="window._chatAbrirConv('${u.usuario}', '${u.nombre}', '${rolLabels[u.rol] || u.rol}')">
            <div class="chat-user-avatar">${u.nombre.charAt(0).toUpperCase()}</div>
            <div class="chat-user-info">
                <div class="chat-user-name">${u.nombre}</div>
                <div class="chat-user-rol">${rolLabels[u.rol] || u.rol}</div>
            </div>
            <span class="chat-unread-badge" id="badge_${u.usuario}"></span>
        </li>
    `).join('');
    }

    window.filtrarUsuariosChat = function () {
        const q = document.getElementById("chatUserSearch")?.value.toLowerCase() || "";
        const filtrados = todosLosUsuarios.filter(u =>
            u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q)
        );
        renderizarListaUsuarios(filtrados);
    };

    // ── Abrir conversación ────────────────────────────────────────
    async function abrirConversacion(username, nombre, rol) {
        chatDestinatario = username;

        document.querySelectorAll(".chat-user-item").forEach(el => el.classList.remove("active"));
        document.getElementById(`chatUser_${username}`)?.classList.add("active");

        document.getElementById("chatConvName").textContent = nombre;
        document.getElementById("chatConvRole").textContent = rol;

        const avatar = document.querySelector(".chat-conv-avatar");
        if (avatar) {
            avatar.innerHTML = `<span style="color:#fff;background:var(--primary-color);
            width:100%;height:100%;border-radius:50%;display:flex;
            align-items:center;justify-content:center;font-size:16px;font-weight:700;">
            ${nombre.charAt(0).toUpperCase()}</span>`;
        }

        const input = document.getElementById("chatInput");
        const sendBtn = document.getElementById("chatSendBtn");
        if (input) { input.disabled = false; input.placeholder = `Mensaje para ${nombre}...`; }
        if (sendBtn) sendBtn.disabled = false;

        const badge = document.getElementById(`badge_${username}`);
        if (badge) badge.style.display = "none";

        await cargarHistorialChat(username);
        scrollToBottom();
        input?.focus();
    }

    // Exponer para uso desde onclick en el HTML dinámico
    window._chatAbrirConv = abrirConversacion;

    async function cargarHistorialChat(con) {
        const area = document.getElementById("chatMessages");
        if (!area) return;

        area.innerHTML = `<div class="chat-empty-state">
        <i class="fas fa-spinner fa-spin"></i><p>Cargando mensajes...</p></div>`;

        try {
            const res = await authFetch(`${CHAT_API}/api/mensajes/historial?con=${con}`);
            if (!res.ok) throw new Error();
            const mensajes = await res.json();

            if (mensajes.length === 0) {
                area.innerHTML = `<div class="chat-empty-state">
                <i class="fas fa-comment-slash"></i>
                <p>Aún no hay mensajes. ¡Sé el primero en escribir!</p></div>`;
                return;
            }

            area.innerHTML = "";
            mensajes.forEach(m => agregarBurbuja(m));
            actualizarBadgeChat();
        } catch {
            area.innerHTML = `<div class="chat-empty-state" style="color:var(--error-color);">
            <i class="fas fa-exclamation-triangle"></i>
            <p>No se pudo cargar el historial.</p></div>`;
        }
    }

    // ── Renderizar burbuja ────────────────────────────────────────
    function agregarBurbuja(mensaje) {
        const area = document.getElementById("chatMessages");
        if (!area) return;

        const emptyState = area.querySelector(".chat-empty-state");
        if (emptyState) emptyState.remove();

        const yo = getUsuario();
        const esMio = mensaje.remitente === yo;
        const hora = mensaje.timestamp
            ? new Date(mensaje.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
            : "";

        const wrap = document.createElement("div");
        wrap.className = `chat-bubble-wrap ${esMio ? "mine" : "theirs"}`;
        wrap.innerHTML = `
        <div class="chat-bubble">${escapeHtml(mensaje.contenido)}</div>
        <div class="chat-bubble-meta">${hora}</div>
    `;
        area.appendChild(wrap);
    }

    function escapeHtml(text) {
        const d = document.createElement("div");
        d.appendChild(document.createTextNode(text));
        return d.innerHTML;
    }

    function scrollToBottom() {
        const area = document.getElementById("chatMessages");
        if (area) area.scrollTop = area.scrollHeight;
    }

    // ── Enviar mensaje ────────────────────────────────────────────
    window.enviarMensajeChat = function (event) {
        event.preventDefault();
        const input = document.getElementById("chatInput");
        const texto = input?.value.trim();
        if (!texto || !chatDestinatario) return;

        // UI optimista: mostrar la burbuja inmediatamente sin esperar el echo del servidor
        agregarBurbuja({
            remitente: getUsuario(),
            destinatario: chatDestinatario,
            contenido: texto,
            timestamp: new Date().toISOString()
        });
        scrollToBottom();

        // Enviar por WebSocket al servidor
        chatSend(chatDestinatario, texto);

        input.value = "";
        input.focus();
    };

    // ── Badge de usuario en la lista ──────────────────────────────
    function incrementarBadgeUsuario(username) {
        const badge = document.getElementById(`badge_${username}`);
        if (!badge) return;
        const actual = parseInt(badge.textContent) || 0;
        badge.textContent = actual + 1;
        badge.style.display = "inline-flex";
    }

    // ── Init ──────────────────────────────────────────────────────
    initMensajes();

})(); // fin IIFE
