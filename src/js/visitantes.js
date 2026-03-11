// ============================================================
// visitantes.js — Módulo de gestión de visitantes / apoderados
// ============================================================

const API_VISITANTES = "http://localhost:8080/api/visitantes";
let todosLosVisitantes = [];
let editingVisitanteId = null; // ID del visitante en edición (null = creación nueva)

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarVisitantes() {
    const tbody = document.getElementById("visitantesTableBody");
    const countEl = document.getElementById("visitantesCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const res = await authFetch(API_VISITANTES);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        todosLosVisitantes = await res.json();
    } catch (err) {
        console.error("Error cargando visitantes:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar la lista de visitantes", "error");
        todosLosVisitantes = [];
    }

    renderVisitantesTable(todosLosVisitantes);
    if (countEl) countEl.textContent = `${todosLosVisitantes.length} visitantes`;
}

// ─── RENDER TABLA ──────────────────────────────────────────
function renderVisitantesTable(lista) {
    const tbody = document.getElementById("visitantesTableBody");
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-inbox"></i> No hay visitantes registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(v => `
        <tr>
            <td><strong>${v.dniVisitante}</strong></td>
            <td>${escapeHtml(v.nombreVisitante)}</td>
            <td>${v.telefono || '<span class="text-muted">—</span>'}</td>
            <td>${v.email || '<span class="text-muted">—</span>'}</td>
            <td>
                ${(v.hijos && v.hijos.length > 0)
            ? v.hijos.map(a => `<span class="badge-alumno"><i class="fas fa-user-graduate"></i> ${escapeHtml(a.nombre)} — ${a.grado}${a.seccion}</span>`).join('')
            : '<span class="text-muted">Sin alumnos</span>'
        }
            </td>
            <td class="actions-cell">
                <button class="btn-action view"   onclick="verVisitante(${v.id})"   title="Ver detalle"><i class="fas fa-eye"></i></button>
                <button class="btn-action edit"   onclick="editarVisitante(${v.id})" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// ─── BÚSQUEDA / FILTRO ─────────────────────────────────────
function filtrarVisitantes() {
    const q = document.getElementById("visitanteSearch").value.toLowerCase();
    const filtrados = todosLosVisitantes.filter(v =>
        v.nombreVisitante.toLowerCase().includes(q) ||
        v.dniVisitante.includes(q)
    );
    renderVisitantesTable(filtrados);
    document.getElementById("visitantesCount").textContent = `${filtrados.length} visitantes`;
}

// ─── FORMULARIO SHOW/HIDE ──────────────────────────────────
function showAddVisitanteForm() {
    editingVisitanteId = null; // modo creación
    document.getElementById("visitanteFormCard").style.display = "block";
    document.getElementById("visitanteFormTitle").innerHTML = '<i class="fas fa-user-plus"></i> Registrar Visitante';
    document.getElementById("visitanteForm").reset();
}

function hideVisitanteForm() {
    editingVisitanteId = null;
    document.getElementById("visitanteFormCard").style.display = "none";
}

// ─── GUARDAR VISITANTE ─────────────────────────────────────
async function submitVisitanteForm(event) {
    event.preventDefault();

    const data = {
        dniVisitante: document.getElementById("vDni").value.trim(),
        nombreVisitante: document.getElementById("vNombre").value.trim(),
        telefono: document.getElementById("vTelefono").value.trim(),
        email: document.getElementById("vEmail").value.trim()
    };

    // Si estamos editando → PUT /{id}; si creando → POST
    const url = editingVisitanteId ? `${API_VISITANTES}/${editingVisitanteId}` : API_VISITANTES;
    const method = editingVisitanteId ? "PUT" : "POST";

    try {
        const res = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const msg = editingVisitanteId ? "Visitante actualizado correctamente" : "Visitante registrado correctamente";
        if (typeof showToast === 'function') showToast(msg, "success");
        hideVisitanteForm();
        cargarVisitantes();

    } catch (err) {
        console.error("Error guardando visitante:", err);
        if (typeof showToast === 'function') showToast("Error al guardar el visitante", "error");
    }
}

// ─── VER DETALLE ───────────────────────────────────────────
function verVisitante(id) {
    const v = todosLosVisitantes.find(x => x.id === id);
    if (!v) return;

    const hijos = (v.hijos && v.hijos.length > 0)
        ? v.hijos.map(a => `<li><i class="fas fa-user-graduate"></i> ${escapeHtml(a.nombre)} — ${a.grado}${a.seccion}</li>`).join('')
        : '<li>Sin alumnos vinculados</li>';

    const msg = `
        <div style="text-align:left; line-height:1.9;">
            <p><strong>DNI:</strong> ${v.dniVisitante}</p>
            <p><strong>Nombre:</strong> ${escapeHtml(v.nombreVisitante)}</p>
            <p><strong>Teléfono:</strong> ${v.telefono || '—'}</p>
            <p><strong>Email:</strong> ${v.email || '—'}</p>
            <p><strong>Alumnos:</strong></p>
            <ul style="padding-left:18px;">${hijos}</ul>
        </div>
    `;
    if (typeof showConfirmModal === 'function') {
        showConfirmModal("Detalle del Visitante", msg, "Cerrar", null, false);
    }
}

// ─── EDITAR (pre-llenado del formulario) ──────────────────────
function editarVisitante(id) {
    const v = todosLosVisitantes.find(x => x.id === id);
    if (!v) return;

    editingVisitanteId = v.id; // guardar ID → el submit usará PUT
    document.getElementById("vDni").value = v.dniVisitante;
    document.getElementById("vNombre").value = v.nombreVisitante;
    document.getElementById("vTelefono").value = v.telefono || '';
    document.getElementById("vEmail").value = v.email || '';

    document.getElementById("visitanteFormTitle").innerHTML = '<i class="fas fa-edit"></i> Editar Visitante';
    document.getElementById("visitanteFormCard").style.display = "block";
}

// ─── HELPER ────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── INIT ──────────────────────────────────────────────────
cargarVisitantes();

// =============================================================
// IMPORTACIÓN DESDE EXCEL
// =============================================================

function toggleImportVisitantesPanel() {
    const panel = document.getElementById("importVisitantesPanel");
    const isVisible = panel.style.display !== "none";
    panel.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
        document.getElementById("importVisitantesLog").style.display = "none";
        document.getElementById("importVisitantesLogBody").innerHTML = "";
        document.getElementById("excelVisitantesInput").value = "";
        document.getElementById("dropZoneVisitantes").classList.remove("drag-over");
    }
}

function handleVisitantesDrop(event) {
    event.preventDefault();
    document.getElementById("dropZoneVisitantes").classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (file) handleVisitantesFile(file);
}

async function handleVisitantesFile(file) {
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = "." + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        if (typeof showToast === 'function') showToast("Formato no válido. Use .xlsx, .xls o .csv", "error");
        return;
    }
    if (typeof XLSX === "undefined") {
        if (typeof showToast === 'function') showToast("La biblioteca de Excel no está lista. Recarga la página.", "error");
        return;
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    if (filas.length === 0) {
        if (typeof showToast === 'function') showToast("El archivo está vacío o no tiene datos válidos", "error");
        return;
    }

    await importarVisitantesDesdeExcel(filas);
}

async function importarVisitantesDesdeExcel(filas) {
    const logEl = document.getElementById("importVisitantesLog");
    const logBody = document.getElementById("importVisitantesLogBody");
    const summaryEl = document.getElementById("importVisitantesSummary");

    logEl.style.display = "block";
    logBody.innerHTML = "";
    summaryEl.textContent = `Procesando ${filas.length} filas...`;

    let exitosos = 0, fallidos = 0;

    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const dni = String(fila["dni_visitante"] || "").trim();
        const nombre = String(fila["nombre_visitante"] || "").trim();
        const telefono = String(fila["telefono"] || "").trim();
        const email = String(fila["email"] || "").trim();

        if (!dni || !nombre) {
            agregarLogFilaV(logBody, i + 1, nombre || "—", "⚠️ Fila incompleta (falta DNI o nombre)", "log-warn");
            fallidos++;
            continue;
        }

        try {
            const res = await authFetch(API_VISITANTES, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dniVisitante: dni,
                    nombreVisitante: nombre,
                    telefono: telefono || null,
                    email: email || null
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            agregarLogFilaV(logBody, i + 1, nombre, "✅ Registrado correctamente", "log-ok");
            exitosos++;

        } catch (err) {
            agregarLogFilaV(logBody, i + 1, nombre, `❌ Error: ${err.message}`, "log-error");
            fallidos++;
        }
    }

    summaryEl.innerHTML = `
        <span class="log-ok">✅ ${exitosos} exitosos</span>
        ${fallidos > 0 ? `<span class="log-error"> &nbsp;❌ ${fallidos} con errores</span>` : ""}
    `;
    if (typeof showToast === 'function') {
        showToast(`Importación completa: ${exitosos} registrados, ${fallidos} errores`, fallidos > 0 ? "warning" : "success");
    }
    cargarVisitantes();
}

function agregarLogFilaV(container, fila, nombre, mensaje, cssClass) {
    const div = document.createElement("div");
    div.className = `log-row ${cssClass}`;
    div.innerHTML = `<span class="log-num">Fila ${fila}</span> <strong>${escapeHtml(nombre)}</strong> — ${mensaje}`;
    container.appendChild(div);
}
