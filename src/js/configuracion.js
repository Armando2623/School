/**
 * Gestor de la página de Configuración
 */
const ConfiguracionManager = {
    async init() {
        console.log("Inicializando módulo de configuración...");
        
        // Verificar permisos (solo ADMIN)
        let rol = null;
        if (typeof getUserProfile === 'function') {
            try {
                const profile = await getUserProfile();
                rol = profile ? profile.rol : null;
            } catch (e) {
                console.error("Error al obtener perfil", e);
            }
        }
        
        if (rol !== 'ADMINISTRADOR') {
            showToast("No tienes permisos para acceder a esta configuración.", "error");
            if (typeof navigateTo === 'function') navigateTo("dashboard");
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

        const configLogo = document.getElementById('configLogo');
        if (configLogo) {
            configLogo.addEventListener('change', (e) => this.handleLogoChange(e));
        }
    },

    handleLogoChange(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('logoPreview');
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                preview.src = event.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            // Si el usuario cancela la selección, restauramos el logo existente o limpiamos
            if (ConfigService.currentConfig && ConfigService.currentConfig.logo_url) {
                preview.src = ConfigService.currentConfig.logo_url;
                preview.style.display = 'block';
            } else {
                preview.src = '';
                preview.style.display = 'none';
            }
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
            const logoPreview = document.getElementById('logoPreview');
            const nivelesInput = document.getElementById('configNiveles');
            const infoInput = document.getElementById('configInfo');

            if (nombreInput) nombreInput.value = config.nombre_colegio || '';
            if (logoInput) logoInput.value = ''; // Limpiamos el input file por seguridad
            
            if (logoPreview) {
                if (config.logo_url) {
                    logoPreview.src = config.logo_url;
                    logoPreview.style.display = 'block';
                } else {
                    logoPreview.src = '';
                    logoPreview.style.display = 'none';
                }
            }

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

            const logoPreview = document.getElementById('logoPreview');
            let logo_url = logoPreview ? logoPreview.getAttribute('src') : '';
            
            // Asegurarnos de guardar un valor vacío si el src está en blanco o no es válido
            if (!logo_url || typeof logo_url !== 'string' || (!logo_url.startsWith('data:') && !logo_url.startsWith('http'))) {
                logo_url = '';
            }

            const newConfig = {
                nombre_colegio: document.getElementById('configNombre').value.trim(),
                logo_url: logo_url,
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
