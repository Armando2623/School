/**
 * Servicio para cargar y guardar la configuración del colegio u organización.
 */

const ConfigService = {
    // Almacenamiento en memoria para no hacer múltiples llamadas a la DB
    currentConfig: null,

    /**
     * Obtiene la configuración desde Supabase.
     */
    async getConfig() {
        if (this.currentConfig) {
            return this.currentConfig;
        }

        try {
            const { data, error } = await supabaseClient
                .from('configuracion')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                // Si la tabla no existe o no hay datos, devolvemos un objeto por defecto
                console.warn("Configuracion no encontrada, usando defaults:", error);
                return this.getDefaultConfig();
            }

            this.currentConfig = data;
            return data;
        } catch (error) {
            console.error("Error al cargar configuración", error);
            return this.getDefaultConfig();
        }
    },

    /**
     * Actualiza la configuración en Supabase.
     */
    async updateConfig(newConfigData) {
        try {
            const { data, error } = await supabaseClient
                .from('configuracion')
                .upsert({ id: 1, ...newConfigData })
                .select()
                .single();

            if (error) throw error;
            
            this.currentConfig = data;
            
            // Refrescar UI inmediatamente después de guardar
            this.applyConfigToUI(this.currentConfig);
            return { success: true, data };
        } catch (error) {
            console.error("Error al actualizar configuración:", error);
            return { success: false, error };
        }
    },

    /**
     * Aplica la configuración a la interfaz (header, sidebar, login).
     */
    applyConfigToUI(config) {
        if (!config) return;

        // Actualizar nombres
        document.querySelectorAll('.app-school-name, .logo-text, .login-school-name').forEach(el => {
            el.textContent = config.nombre_colegio;
        });

        // Actualizar título de la página HTML
        if (config.nombre_colegio) {
            document.title = `${config.nombre_colegio} - Registro de Visitas`;
        }

        // Actualizar logos (si hay URL)
        if (config.logo_url) {
            document.querySelectorAll('.app-school-logo, .login-logo img').forEach(img => {
                if (img.tagName === 'IMG') {
                    img.src = config.logo_url;
                } else if (img.tagName === 'I') {
                    // Si el logo es un icono de FontAwesome, podemos reemplazarlo por una imagen
                    const parent = img.parentElement;
                    if (parent) {
                        const newImg = document.createElement('img');
                        newImg.src = config.logo_url;
                        newImg.className = 'app-school-logo';
                        newImg.style.width = '30px'; // Tamaño ajustado para la sidebar / header
                        newImg.style.height = '30px';
                        newImg.style.objectFit = 'contain';
                        newImg.style.marginRight = '10px';
                        newImg.style.borderRadius = '4px';
                        
                        // Si es en el sidebar footer o login
                        if (parent.classList.contains('login-logo')) {
                            newImg.style.width = '80px';
                            newImg.style.height = '80px';
                            newImg.style.margin = '0 auto 10px';
                        }
                        
                        parent.replaceChild(newImg, img);
                    }
                }
            });
            
            // También revisar imgs que ya fueron reemplazadas
            document.querySelectorAll('img.app-school-logo').forEach(img => {
                img.src = config.logo_url;
            });
        }
    },

    /**
     * Configuración por defecto por si falla la BD
     */
    getDefaultConfig() {
        return {
            id: 1,
            nombre_colegio: 'SchoolGuard',
            logo_url: '', // Se usa icono FontAwesome por defecto
            niveles: 'Inicial, Primaria, Secundaria',
            informacion_adicional: 'Sistema de registro de visitas escolares'
        };
    }
};

// Exponer globalmente
window.ConfigService = ConfigService;
