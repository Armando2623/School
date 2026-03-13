/**
 * mensajes.js — Módulo de mensajería (Informativo)
 */
(function () {
    async function initMensajes() {
        const area = document.getElementById("chatMessages");
        if (area) {
            area.innerHTML = `
                <div class="chat-empty-state" style="padding: 40px; text-align: center;">
                    <i class="fas fa-tools" style="font-size: 48px; color: var(--primary-color); margin-bottom: 16px;"></i>
                    <h3>Módulo en Mantenimiento</h3>
                    <p>Estamos migrando el sistema de mensajería a Supabase para ofrecerte mayor estabilidad.</p>
                </div>
            `;
        }
        
        const lista = document.getElementById("chatUsersList");
        if (lista) {
            lista.innerHTML = `<li class="chat-user-loading">Chat no disponible temporalmente.</li>`;
        }
    }

    initMensajes();
})();
