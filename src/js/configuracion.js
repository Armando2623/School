/**
 * Gestor de la página de Configuración
 */
const ConfiguracionManager = {
    async init() {
        console.log("Inicializando módulo de configuración...");
        
        // Verificar permisos (solo ADMIN)
        const rol = typeof getRol === 'function' ? getRol() : null;
        if (rol !== 'ADMINISTRADOR') {
            showToast("No tienes permisos para acceder a esta configuración.", "error");
            navigateTo("dashboard");
            return;
        }

        this.setupEventListeners();
        await this.loadConfig();
    },

    setupEventListeners() {
        const form = document.getElementById('configForm');
        if (form) {
            form.addEventListener('submit', (e) => this.saveConfig(e));
        }
    },

    async loadConfig() {
        if (typeof ConfigService === 'undefined') {
            console.error("ConfigService no está disponible.");
            return;
        }

        try {
            // Mostrar estado de carga en el botón
            const btn = document.getElementById('btnSaveConfig');
            if (btn) btn.disabled = true;

            // Obtener configuración
            const config = await ConfigService.getConfig();

            // Poblar formulario
            const nombreInput = document.getElementById('configNombre');
            const logoInput = document.getElementById('configLogo');
            const nivelesInput = document.getElementById('configNiveles');
            const infoInput = document.getElementById('configInfo');

            if (nombreInput) nombreInput.value = config.nombre_colegio || '';
            if (logoInput) logoInput.value = config.logo_url || '';
            if (nivelesInput) nivelesInput.value = config.niveles || '';
            if (infoInput) infoInput.value = config.informacion_adicional || '';

        } catch (error) {
            console.error("Error al cargar la configuración en el formulario:", error);
            showToast("Error al cargar la configuración", "error");
        } finally {
            const btn = document.getElementById('btnSaveConfig');
            if (btn) btn.disabled = false;
        }
    },

    async saveConfig(e) {
        e.preventDefault();

        if (typeof ConfigService === 'undefined') {
            showToast("El servicio de configuración no está disponible", "error");
            return;
        }

        const btn = document.getElementById('btnSaveConfig');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const newConfig = {
                nombre_colegio: document.getElementById('configNombre').value.trim(),
                logo_url: document.getElementById('configLogo').value.trim(),
                niveles: document.getElementById('configNiveles').value.trim(),
                informacion_adicional: document.getElementById('configInfo').value.trim()
            };

            const result = await ConfigService.updateConfig(newConfig);

            if (result.success) {
                showToast("Configuración guardada correctamente", "success");
                
                // Forzar la actualización en la UI de inmediato
                if (typeof ConfigService.applyConfigToUI === 'function') {
                    ConfigService.applyConfigToUI(result.data);
                }
            } else {
                throw result.error;
            }

        } catch (error) {
            console.error("Error guardando la configuración:", error);
            showToast("Error al guardar la configuración", "error");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// Auto-inicializar cuando el script se carga por el router
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => ConfiguracionManager.init(), 100);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => ConfiguracionManager.init(), 100);
    });
}
