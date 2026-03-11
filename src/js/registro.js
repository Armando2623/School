// ============================================================
// registro.js — Lógica del módulo de Registro de Visitas
// ============================================================

const API_VISITAS = "http://localhost:8080/api/visitas";
let editingVisitaId = null; // ID de la visita a editar (null = nueva)

/** Construye el payload para el DTO Java DatosRegistroVisita */
async function registerVisit(event) {
    event.preventDefault();

    const fechaInput = document.getElementById("visitDate").value;
    const horaInput = document.getElementById("visitTime").value;
    const fechaHoraIngreso = `${fechaInput}T${horaInput}:00`;

    const visitData = {
        dniVisitante: document.getElementById("documentNumber").value.trim(),
        nombreVisitante: document.getElementById("visitorName").value.trim(),
        motivo: document.getElementById("visitReason").value,
        horaIngreso: fechaHoraIngreso,
        usuario_id: parseInt(document.getElementById("usuarioId").value, 10),
        estadoRegistro: "REGISTRADO"
    };

    // Si estamos en modo edición → PUT /{id}; si nuevo → POST
    const url = editingVisitaId ? `${API_VISITAS}/${editingVisitaId}` : API_VISITAS;
    const method = editingVisitaId ? "PUT" : "POST";

    try {
        const response = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(visitData)
        });

        if (!response.ok) throw new Error(`Error en el servidor: ${response.status}`);

        await response.json();

        const msg = editingVisitaId ? "Visita actualizada correctamente" : "Visita registrada correctamente";
        if (typeof showToast === 'function') {
            showToast(msg, "success");
        } else {
            alert(msg);
        }

        editingVisitaId = null;
        resetForm();

        if (typeof navigateTo === 'function') {
            navigateTo("dashboard");
        }

    } catch (error) {
        console.error("Error al registrar la visita:", error);
        if (typeof showToast === 'function') {
            showToast("Error al conectar con el servidor", "error");
        } else {
            alert("Error al conectar con el servidor backend");
        }
    }
}

/** Limpia todos los campos del formulario */
function resetForm() {
    const form = document.getElementById("registerForm");
    if (form) form.reset();
    // Ocultar el banner de "visitante encontrado"
    const banner = document.getElementById("visitorFound");
    if (banner) banner.style.display = "none";
    // Limpiar el estado del DNI
    setDniStatus("", "");
}

// ─── DNI LOOKUP ────────────────────────────────────────────────────────────────
// Tiempo de espera (ms) antes de hacer la petición después de dejar de escribir
const DNI_DEBOUNCE_MS = 500;
let dniDebounceTimer = null;

/** Actualiza el ícono/estado junto al campo DNI */
function setDniStatus(icon, cssClass) {
    const statusEl = document.getElementById("dniStatus");
    if (!statusEl) return;
    statusEl.className = "dni-status " + cssClass;
    statusEl.innerHTML = icon ? `<i class="${icon}"></i>` : "";
}

/**
 * Rellena automáticamente los campos del formulario con los datos del visitante
 * encontrado. Solo sobrescribe el nombre, el resto el usuario puede cambiarlo libremente.
 */
function autofillFromVisitor(v) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null && val !== "") el.value = val;
    };

    set("visitorName", v.nombreVisitante || v.nombre || v.name || "");

    // Mostrar banner de confirmación
    const banner = document.getElementById("visitorFound");
    const bannerMsg = document.getElementById("visitorFoundMsg");
    if (banner) {
        bannerMsg.textContent = `Visitante encontrado: ${v.nombreVisitante || v.nombre || v.name} — datos autocompletados.`;
        banner.style.display = "flex";
    }

    setDniStatus("fas fa-check-circle", "found");
}

/**
 * Busca en el backend si ya existe un visitante con ese DNI.
 * Endpoint: GET /api/visitantes/buscar?dni={dni}
 * Devuelve el visitante (con sus hijos) o null si no existe.
 */
async function lookupVisitorByDNI(dni) {
    try {
        const response = await authFetch(
            `http://localhost:8080/api/visitantes/buscar?dni=${encodeURIComponent(dni)}`
        );
        if (response.status === 404) return null;  // visitante nuevo
        if (!response.ok) throw new Error(`Error ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error("Error buscando visitante por DNI:", err);
        return null;
    }
}

/** Inicializa el buscador de visitante por DNI con debounce */
function setupDniLookup() {
    const dniInput = document.getElementById("documentNumber");
    if (!dniInput) return;

    dniInput.addEventListener("input", () => {
        const dni = dniInput.value.trim();

        // Ocultar banner y limpiar estado al borrar
        const banner = document.getElementById("visitorFound");
        if (banner) banner.style.display = "none";
        setDniStatus("", "");

        clearTimeout(dniDebounceTimer);

        // Solo buscar si tiene al menos 6 caracteres (DNIs peruanos tienen 8)
        if (dni.length < 6) return;

        // Mostrar spinner mientras espera
        setDniStatus("fas fa-spinner", "searching");

        dniDebounceTimer = setTimeout(async () => {
            const visitor = await lookupVisitorByDNI(dni);

            if (visitor) {
                autofillFromVisitor(visitor);
            } else {
                // Visitante nuevo — indicar visualmente pero no bloquear el registro
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
            const response = await authFetch(
                `http://localhost:8080/api/visitas/usuarios?search=${encodeURIComponent(texto)}`
            );

            if (!response.ok) throw new Error("Error en la búsqueda");

            const usuarios = await response.json();
            suggestionsBox.innerHTML = "";

            if (usuarios.length === 0) {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = "No se encontraron usuarios";
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

// ─── MODO EDICIÓN (desde tabla) ────────────────────────────────────────────────
function loadVisitorForEditing() {
    const editData = sessionStorage.getItem('editVisitorData');
    if (!editData) return;

    try {
        const visitor = JSON.parse(editData);
        editingVisitaId = visitor.id ?? null; // guardar ID para PUT

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null && val !== "") el.value = val;
        };

        set("visitorName", visitor.nombreVisitante || "");
        set("documentNumber", visitor.dniVisitante || "");
        set("visitReason", visitor.motivo || "");
        set("personVisited", visitor.usuario?.nombre || "");
        if (visitor.usuario?.id) {
            set("usuarioId", visitor.usuario.id);
        }

        // Extraer fecha y hora de horaIngreso (ISO string)
        if (visitor.horaIngreso) {
            const dt = visitor.horaIngreso.split("T");
            set("visitDate", dt[0] || "");
            set("visitTime", (dt[1] || "").substring(0, 5));
        }

        const btnSubmit = document.querySelector('.btn-submit');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Visita';

    } catch (e) {
        console.error("Error cargando datos de edición:", e);
    }

    sessionStorage.removeItem('editVisitorData');
}

// ─── INICIALIZACIÓN ─────────────────────────────────────────────────────────────
setupDniLookup();
setupRegistroAutocomplete();
setTimeout(loadVisitorForEditing, 50);