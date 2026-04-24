// ============================================================
// registro.js — Lógica del módulo de Registro de Visitas
// ============================================================

let editingVisitaId = null;

/** Registra o actualiza una visita en Supabase */
async function registerVisit(event) {
    event.preventDefault();

    const fechaInput = document.getElementById("visitDate").value;
    const horaInput = document.getElementById("visitTime").value;
    const fechaHoraIngreso = `${fechaInput}T${horaInput}:00`;

    const visitData = {
        dni_visitante: document.getElementById("documentNumber").value.trim(),
        nombre_visitante: document.getElementById("visitorName").value.trim(),
        motivo: document.getElementById("visitReason").value,
        hora_ingreso: fechaHoraIngreso,
        usuario_id: document.getElementById("usuarioId").value, // UUID del usuario
        estado_registro: "REGISTRADO"
    };

    try {
        let result;
        if (editingVisitaId) {
            result = await supabaseClient.from('visitas').update(visitData).eq('id', editingVisitaId);
        } else {
            let profile = null;
            if (typeof getUserProfile === 'function') profile = await getUserProfile();
            if (profile && profile.institucion_id) visitData.institucion_id = profile.institucion_id;

            result = await supabaseClient.from('visitas').insert([visitData]);
        }

        if (result.error) throw result.error;

        const msg = editingVisitaId ? "Visita actualizada" : "Visita registrada";
        if (typeof showToast === 'function') showToast(msg, "success");

        editingVisitaId = null;
        resetForm();
        if (typeof navigateTo === 'function') navigateTo("dashboard");

    } catch (error) {
        console.error("Error registrando visita:", error);
        if (typeof showToast === 'function') showToast("Error al guardar la visita", "error");
    }
}

function resetForm() {
    const form = document.getElementById("registerForm");
    if (form) form.reset();
    const banner = document.getElementById("visitorFound");
    if (banner) banner.style.display = "none";
    setDniStatus("", "");
}

// ─── DNI LOOKUP ────────────────────────────────────────────────────────────────
const DNI_DEBOUNCE_MS = 500;
let dniDebounceTimer = null;

function setDniStatus(icon, cssClass) {
    const statusEl = document.getElementById("dniStatus");
    if (!statusEl) return;
    statusEl.className = "dni-status " + cssClass;
    statusEl.innerHTML = icon ? `<i class="${icon}"></i>` : "";
}

function autofillFromVisitor(v) {
    const nameInput = document.getElementById("visitorName");
    if (nameInput) nameInput.value = v.nombre_visitante;

    // Indicador visual en el campo nombre
    const nameStatus = document.getElementById("nameAutofillStatus");
    if (nameStatus) {
        nameStatus.className = "dni-status found";
        nameStatus.innerHTML = `<i class="fas fa-user-check"></i>`;
        nameStatus.title = "Nombre completado automáticamente";
    }

    const banner = document.getElementById("visitorFound");
    const bannerMsg = document.getElementById("visitorFoundMsg");
    if (banner) {
        bannerMsg.textContent = `Visitante encontrado: ${v.nombre_visitante}`;
        banner.style.display = "flex";
    }
    setDniStatus("fas fa-check-circle", "found");
}

async function lookupVisitorByDNI(dni) {
    try {
        const { data, error } = await supabaseClient
            .from('visitantes')
            .select('*')
            .eq('dni_visitante', dni)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        return data;
    } catch (err) {
        console.error("Error buscando visitante:", err);
        return null;
    }
}

function setupDniLookup() {
    const dniInput = document.getElementById("documentNumber");
    if (!dniInput) return;

    dniInput.addEventListener("input", () => {
        const dni = dniInput.value.trim();
        const banner = document.getElementById("visitorFound");
        if (banner) banner.style.display = "none";
        setDniStatus("", "");

        // Limpiar el indicador del nombre
        const nameStatus = document.getElementById("nameAutofillStatus");
        if (nameStatus) { nameStatus.className = "dni-status"; nameStatus.innerHTML = ""; }

        clearTimeout(dniDebounceTimer);
        if (dni.length < 6) return;

        setDniStatus("fas fa-spinner", "searching");

        dniDebounceTimer = setTimeout(async () => {
            const visitor = await lookupVisitorByDNI(dni);
            if (visitor) {
                autofillFromVisitor(visitor);
            } else {
                setDniStatus("fas fa-user-plus", "not-found");
            }
        }, DNI_DEBOUNCE_MS);
    });
}

// ─── AUTOCOMPLETE "PERSONA A VISITAR" ──────────────────────────────────────────
function setupRegistroAutocomplete() {
    const inputUsuario = document.getElementById("personVisited");
    const suggestionsBox = document.getElementById("suggestions");
    const usuarioIdInput = document.getElementById("usuarioId");

    if (!inputUsuario || !suggestionsBox || !usuarioIdInput) return;

    inputUsuario.addEventListener("input", async function () {
        const texto = inputUsuario.value.trim();

        if (texto.length < 2) {
            suggestionsBox.innerHTML = "";
            return;
        }

        try {
            const { data: usuarios, error } = await supabaseClient
                .from('usuarios')
                .select('id, nombre')
                .ilike('nombre', `%${texto}%`)
                .limit(5);

            if (error) throw error;

            suggestionsBox.innerHTML = "";
            if (usuarios.length === 0) {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = "No encontrado";
                suggestionsBox.appendChild(div);
                return;
            }

            usuarios.forEach(usuario => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = usuario.nombre;
                div.onclick = () => {
                    inputUsuario.value = usuario.nombre;
                    usuarioIdInput.value = usuario.id;
                    suggestionsBox.innerHTML = "";
                };
                suggestionsBox.appendChild(div);
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

// ─── MODO EDICIÓN ──────────────────────────────────────────────────────────────
function loadVisitorForEditing() {
    const editData = sessionStorage.getItem('editVisitorData');
    if (!editData) return;

    try {
        const visitor = JSON.parse(editData);
        editingVisitaId = visitor.id;

        document.getElementById("visitorName").value = visitor.nombre_visitante;
        document.getElementById("documentNumber").value = visitor.dni_visitante;
        document.getElementById("visitReason").value = visitor.motivo;
        document.getElementById("personVisited").value = visitor.usuario?.nombre || "";
        document.getElementById("usuarioId").value = visitor.usuario?.id || "";

        if (visitor.hora_ingreso) {
            const dt = visitor.hora_ingreso.split("T");
            document.getElementById("visitDate").value = dt[0];
            document.getElementById("visitTime").value = (dt[1] || "").substring(0, 5);
        }

        const btnSubmit = document.querySelector('.btn-submit');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Visita';

    } catch (e) {
        console.error("Error cargando edición:", e);
    }
    sessionStorage.removeItem('editVisitorData');
}

// ─── INICIALIZACIÓN ───────────────────────────────────────────

/** Establece la fecha de HOY y la HORA ACTUAL en los campos del formulario */
function initRegistroForm() {
    const now = new Date();

    // Fecha de hoy
    const dateInput = document.getElementById('visitDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = now.toISOString().split('T')[0];
    }

    // Hora actual (formato HH:MM)
    const timeInput = document.getElementById('visitTime');
    if (timeInput) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hh}:${mm}`;

        // Actualizar el reloj cada minuto mientras el campo no sea editado manualmente
        let userEditedTime = false;
        timeInput.addEventListener('change', () => { userEditedTime = true; });
        setInterval(() => {
            if (userEditedTime) return;
            const n = new Date();
            timeInput.value = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
        }, 60000);
    }
}

setupDniLookup();
setupRegistroAutocomplete();
initRegistroForm();
setTimeout(loadVisitorForEditing, 50);