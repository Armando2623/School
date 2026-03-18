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
            // Obtener el ID de institución del usuario si está logeado
            let institucionId = null;
            if (typeof getUserProfile === 'function') {
                try {
                    const profile = await getUserProfile();
                    if (profile && profile.institucion_id) {
                        institucionId = profile.institucion_id;
                    }
                } catch(e) {}
            }

            let query = supabaseClient.from('instituciones').select('*');
            
            if (institucionId) {
                query = query.eq('id', institucionId);
            } else {
                // Si no hay sesión (ej. Login), traemos la primera institución por defecto
                query = query.limit(1);
            }

            const { data, error } = await query.single();

            if (error) {
                console.warn("Institucion no encontrada, usando defaults:", error);
                return this.getDefaultConfig();
            }

            // Mapeamos los campos de 'instituciones' a lo que espera la UI (que usaba 'configuracion')
            const mappedData = {
                id: data.id,
                nombre_colegio: data.nombre,
                logo_url: data.logo_url,
                niveles: data.niveles,
                informacion_adicional: data.informacion_adicional
            };

            this.currentConfig = mappedData;
            return mappedData;
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
            let institucionId = null;
            if (typeof getUserProfile === 'function') {
                const profile = await getUserProfile();
                if (profile && profile.institucion_id) {
                    institucionId = profile.institucion_id;
                }
            }

            if (!institucionId && this.currentConfig && this.currentConfig.id) {
                institucionId = this.currentConfig.id;
            }
            
            if (!institucionId) throw new Error("No se pudo determinar el ID de la institución.");

            const dbData = {
                nombre: newConfigData.nombre_colegio,
                logo_url: newConfigData.logo_url,
                niveles: newConfigData.niveles,
                informacion_adicional: newConfigData.informacion_adicional
            };

            const { data, error } = await supabaseClient
                .from('instituciones')
                .update(dbData)
                .eq('id', institucionId)
                .select()
                .single();

            if (error) throw error;
            
            const mappedData = {
                id: data.id,
                nombre_colegio: data.nombre,
                logo_url: data.logo_url,
                niveles: data.niveles,
                informacion_adicional: data.informacion_adicional
            };

            this.currentConfig = mappedData;
            
            // Refrescar UI inmediatamente después de guardar
            this.applyConfigToUI(this.currentConfig);
            return { success: true, data: mappedData };
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

        // Actualizar nombres (solo en login)
        document.querySelectorAll('.login-school-name').forEach(el => {
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

        // Si estamos en el dashboard u otra página que use #pageTitle, 
        // y el texto actual es "Dashboard" o el hash está vacío / es dashboard
        const pageTitleEl = document.getElementById('pageTitle');
        const hash = location.hash.replace("#", "");
        if (pageTitleEl && (!hash || hash === 'dashboard')) {
            pageTitleEl.textContent = config.nombre_colegio;
        }
    },

    /**
     * Configuración por defecto por si falla la BD
     */
    getDefaultConfig() {
        return {
            id: null,
            nombre_colegio: 'ViraSchool',
            logo_url: '', // Se usa icono FontAwesome por defecto
            niveles: 'Inicial, Primaria, Secundaria',
            informacion_adicional: 'Sistema Multi-Tenant'
        };
    }
};

// Exponer globalmente
window.ConfigService = ConfigService;
