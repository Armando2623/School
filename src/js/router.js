async function loadPage(page) {
    // Verificar permisos (auth.js debe estar cargado antes)
    if (typeof hasPermission === 'function') {
        try {
            const allowed = await hasPermission(page);
            if (!allowed) {
                const app = document.getElementById("app");
                app.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                                min-height:300px;text-align:center;color:var(--text-secondary);">
                        <i class="fas fa-lock" style="font-size:48px;margin-bottom:16px;color:var(--error-color);"></i>
                        <h2 style="color:var(--text-primary);margin-bottom:8px;">Acceso restringido</h2>
                        <p>Tu rol no tiene permisos para acceder a esta sección.</p>
                    </div>`;
                return;
            }
        } catch (e) {
            console.error("Error al verificar permisos:", e);
        }
    }

    fetch(`pages/${page}.html`)
        .then(r => r.text())
        .then(html => {
            const app = document.getElementById("app");
            app.innerHTML = html;

            // Páginas que re-ejecutan su JS en cada visita (necesitan re-init)
            const ALWAYS_RELOAD = ["mensajes", "asistencia", "asistencia_alumnos", "registro", "visitantes"];

            const scriptId = `script-${page}`;
            const existing = document.getElementById(scriptId);

            // Para páginas en ALWAYS_RELOAD, eliminar el script anterior
            // para que el IIFE de init se ejecute de nuevo
            if (existing && ALWAYS_RELOAD.includes(page)) {
                // Detener cámara si hay escáner activo
                if (typeof window._stopAsistAlumnosScanner === 'function') {
                    window._stopAsistAlumnosScanner();
                    window._stopAsistAlumnosScanner = null;
                }
                existing.remove();
            }

            if (!document.getElementById(scriptId)) {
                const script = document.createElement("script");
                script.id = scriptId;
                script.src = `js/${page}.js`;
                document.body.appendChild(script);
            }
        });
}

window.addEventListener("hashchange", () => {
    const page = location.hash.replace("#", "") || "dashboard";
    loadPage(page);
});

loadPage("dashboard");