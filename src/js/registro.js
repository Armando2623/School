// ============================================================
// registro.js — Lógica del módulo de Registro de Visitas
// Envuelto en IIFE para evitar conflictos en re-cargas del router
// ============================================================
(function () {

    let editingVisitaId = null;

    // ─── REGISTRAR / ACTUALIZAR VISITA ───────────────────────────
    window.registerVisit = async function (event) {
        event.preventDefault();

        const fechaInput = document.getElementById("visitDate")?.value || '';
        const horaInput  = document.getElementById("visitTime")?.value  || '';
        const dniVal     = document.getElementById("documentNumber")?.value.trim() || '';
        const nombreVal  = document.getElementById("visitorName")?.value.trim()    || '';
        const motivoVal  = document.getElementById("visitReason")?.value           || '';
        // usuario_id puede ser vacío si no se escogió de la lista → null (UUID no acepta "")
        const usuarioId  = document.getElementById("usuarioId")?.value.trim() || null;

        // Validación
        if (!dniVal || !nombreVal || !motivoVal || !fechaInput || !horaInput) {
            if (typeof showToast === 'function') showToast("Complete todos los campos obligatorios.", "warning");
            return;
        }

        const visitData = {
            dni_visitante:    dniVal,
            nombre_visitante: nombreVal,
            motivo:           motivoVal,
            hora_ingreso:     `${fechaInput}T${horaInput}:00`,
            usuario_id:       usuarioId,
            estado_registro:  "REGISTRADO"
        };

        try {
            let result;

            if (editingVisitaId) {
                // Actualizar
                result = await supabaseClient
                    .from('visitas')
                    .update(visitData)
                    .eq('id', editingVisitaId);

            } else {
                // Insertar — institucion_id es NOT NULL, hay que obtenerla
                let profile = null;
                if (typeof getUserProfile === 'function') {
                    try { profile = await getUserProfile(); } catch (_) {}
                }

                if (profile?.institucion_id) {
                    visitData.institucion_id = profile.institucion_id;
                } else {
                    // Fallback: leer directamente de Supabase si el perfil no está disponible
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (user) {
                        const { data: perfil } = await supabaseClient
                            .from('usuarios')
                            .select('institucion_id')
                            .eq('id', user.id)
                            .limit(1);
                        if (perfil && perfil.length > 0 && perfil[0].institucion_id) {
                            visitData.institucion_id = perfil[0].institucion_id;
                        }
                    }
                }

                if (!visitData.institucion_id) {
                    if (typeof showToast === 'function') showToast("No se pudo obtener la institución del usuario.", "error");
                    return;
                }

                result = await supabaseClient.from('visitas').insert([visitData]);
            }

            if (result.error) throw result.error;

            const msg = editingVisitaId ? "Visita actualizada ✓" : "Visita registrada ✓";
            if (typeof showToast === 'function') showToast(msg, "success");

            editingVisitaId = null;
            _resetForm();
            if (typeof loadVisitors === 'function') await loadVisitors();
            if (typeof navigateTo  === 'function') navigateTo("dashboard");

        } catch (error) {
            console.error("Error registrando visita:", error);
            const detalle = error?.message || error?.details || error?.hint || JSON.stringify(error);
            if (typeof showToast === 'function') showToast(`Error: ${detalle}`, "error");
        }
    };

    // ─── RESET FORMULARIO ─────────────────────────────────────────
    function _resetForm() {
        const form = document.getElementById("registerForm");
        if (form) form.reset();
        const banner = document.getElementById("visitorFound");
        if (banner) banner.style.display = "none";
        _setDniStatus("", "");
        const ns = document.getElementById("nameAutofillStatus");
        if (ns) { ns.className = "dni-status"; ns.innerHTML = ""; }
    }
    window.resetForm = _resetForm;

    // ─── DNI LOOKUP — usa .limit(1) para evitar 406 ───────────────
    // Nunca usar .single() ni .maybeSingle() en tablas con RLS activo
    // que puede devolver 0 filas → causa 406.
    const DNI_DEBOUNCE_MS = 500;
    let _dniTimer = null;

    function _setDniStatus(icon, cssClass) {
        const el = document.getElementById("dniStatus");
        if (!el) return;
        el.className = "dni-status " + cssClass;
        el.innerHTML = icon ? `<i class="${icon}"></i>` : "";
    }

    function _autofill(v) {
        const nameInput = document.getElementById("visitorName");
        if (nameInput) nameInput.value = v.nombre_visitante;

        const ns = document.getElementById("nameAutofillStatus");
        if (ns) {
            ns.className = "dni-status found";
            ns.innerHTML = `<i class="fas fa-user-check"></i>`;
            ns.title = "Nombre completado automáticamente";
        }

        const banner    = document.getElementById("visitorFound");
        const bannerMsg = document.getElementById("visitorFoundMsg");
        if (banner) {
            if (bannerMsg) bannerMsg.textContent = `Visitante encontrado: ${v.nombre_visitante}`;
            banner.style.display = "flex";
        }
        _setDniStatus("fas fa-check-circle", "found");
    }

    async function _lookupDNI(dni) {
        try {
            // .limit(1) devuelve un array vacío [] si no hay filas — sin 406
            const { data, error } = await supabaseClient
                .from('visitantes')
                .select('nombre_visitante, dni_visitante')
                .eq('dni_visitante', dni)
                .limit(1);

            if (error) {
                console.warn("DNI lookup error:", error.message);
                return null;
            }
            return (data && data.length > 0) ? data[0] : null;
        } catch (err) {
            console.error("Error buscando visitante:", err);
            return null;
        }
    }

    function _setupDniLookup() {
        const dniInput = document.getElementById("documentNumber");
        if (!dniInput) return;

        dniInput.addEventListener("input", () => {
            const dni    = dniInput.value.trim();
            const banner = document.getElementById("visitorFound");
            if (banner) banner.style.display = "none";
            _setDniStatus("", "");
            const ns = document.getElementById("nameAutofillStatus");
            if (ns) { ns.className = "dni-status"; ns.innerHTML = ""; }

            clearTimeout(_dniTimer);
            if (dni.length < 6) return;

            _setDniStatus("fas fa-spinner fa-spin", "searching");

            _dniTimer = setTimeout(async () => {
                const visitor = await _lookupDNI(dni);
                if (visitor) {
                    _autofill(visitor);
                } else {
                    _setDniStatus("fas fa-user-plus", "not-found");
                }
            }, DNI_DEBOUNCE_MS);
        });
    }

    // ─── AUTOCOMPLETE "PERSONA A VISITAR" ─────────────────────────
    function _setupAutocomplete() {
        const inputUsuario   = document.getElementById("personVisited");
        const suggestionsBox = document.getElementById("suggestions");
        const usuarioIdInput = document.getElementById("usuarioId");

        if (!inputUsuario || !suggestionsBox || !usuarioIdInput) return;

        inputUsuario.addEventListener("input", async function () {
            const texto = inputUsuario.value.trim();
            if (texto.length < 2) { suggestionsBox.innerHTML = ""; return; }

            try {
                const { data: usuarios, error } = await supabaseClient
                    .from('usuarios')
                    .select('id, nombre')
                    .ilike('nombre', `%${texto}%`)
                    .limit(5);

                if (error) throw error;
                suggestionsBox.innerHTML = "";

                if (!usuarios || usuarios.length === 0) {
                    const d = document.createElement("div");
                    d.classList.add("suggestion-item");
                    d.textContent = "No encontrado";
                    suggestionsBox.appendChild(d);
                    return;
                }

                usuarios.forEach(u => {
                    const d = document.createElement("div");
                    d.classList.add("suggestion-item");
                    d.textContent = u.nombre;
                    d.onclick = () => {
                        inputUsuario.value   = u.nombre;
                        usuarioIdInput.value = u.id;
                        suggestionsBox.innerHTML = "";
                    };
                    suggestionsBox.appendChild(d);
                });

            } catch (error) {
                console.error("Error buscando usuarios:", error);
            }
        });

        document.addEventListener("click", function (e) {
            if (e.target !== inputUsuario && !suggestionsBox.contains(e.target)) {
                suggestionsBox.innerHTML = "";
            }
        });
    }

    // ─── MODO EDICIÓN ─────────────────────────────────────────────
    function _loadForEditing() {
        const editData = sessionStorage.getItem('editVisitorData');
        if (!editData) return;
        try {
            const visitor = JSON.parse(editData);
            editingVisitaId = visitor.id;

            if (document.getElementById("visitorName"))    document.getElementById("visitorName").value    = visitor.nombre_visitante || "";
            if (document.getElementById("documentNumber")) document.getElementById("documentNumber").value = visitor.dni_visitante    || "";
            if (document.getElementById("visitReason"))    document.getElementById("visitReason").value    = visitor.motivo           || "";
            if (document.getElementById("personVisited"))  document.getElementById("personVisited").value  = visitor.usuario?.nombre  || "";
            if (document.getElementById("usuarioId"))      document.getElementById("usuarioId").value      = visitor.usuario?.id      || "";

            if (visitor.hora_ingreso) {
                const dt = visitor.hora_ingreso.split("T");
                if (document.getElementById("visitDate")) document.getElementById("visitDate").value = dt[0];
                if (document.getElementById("visitTime")) document.getElementById("visitTime").value = (dt[1] || "").substring(0, 5);
            }

            const btnSubmit = document.querySelector('.btn-submit');
            if (btnSubmit) btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Visita';
        } catch (e) {
            console.error("Error cargando edición:", e);
        }
        sessionStorage.removeItem('editVisitorData');
    }

    // ─── INICIALIZACIÓN ───────────────────────────────────────────
    function _initForm() {
        const now = new Date();
        const dateInput = document.getElementById('visitDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = now.toISOString().split('T')[0];
        }
        const timeInput = document.getElementById('visitTime');
        if (timeInput) {
            timeInput.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            let userEdited = false;
            timeInput.addEventListener('change', () => { userEdited = true; });
            setInterval(() => {
                if (userEdited) return;
                const n = new Date();
                timeInput.value = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
            }, 60000);
        }
    }

    _setupDniLookup();
    _setupAutocomplete();
    _initForm();
    setTimeout(_loadForEditing, 50);

    console.log('✅ registro.js (IIFE + .limit(1)) cargado');

})();