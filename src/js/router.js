function loadPage(page) {
    fetch(`pages/${page}.html`)
        .then(r => r.text())
        .then(html => {
            const app = document.getElementById("app");
            app.innerHTML = html;

            // Cargar JS del módulo (evita inyectar el mismo script varias veces)
            const scriptId = `script-${page}`;
            if (!document.getElementById(scriptId)) {
                const script = document.createElement("script");
                script.id = scriptId;
                script.src = `js/${page}.js`;
                script.defer = true;
                // Si el archivo no existe, no falla la navegación entera, solo se registra en consola.
                document.body.appendChild(script);
            }
        });
}

window.addEventListener("hashchange", () => {
    const page = location.hash.replace("#", "") || "dashboard";
    loadPage(page);
});

loadPage("dashboard");