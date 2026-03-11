// ============================================================
// alumnos.js — Módulo de gestión de alumnos del colegio
// ============================================================

const API_ALUMNOS = "http://localhost:8080/api/alumnos";
const API_VISITANTES_BUSCAR = "http://localhost:8080/api/visitantes/buscar";

let todosLosAlumnos = [];
let editingAlumnoId = null; // ID del alumno en edición (null = creación nueva)

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarAlumnos() {
    const tbody = document.getElementById("alumnosTableBody");
    const countEl = document.getElementById("alumnosCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const res = await authFetch(API_ALUMNOS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        todosLosAlumnos = await res.json();
    } catch (err) {
        console.error("Error cargando alumnos:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar la lista de alumnos", "error");
        todosLosAlumnos = [];
    }

    renderAlumnosTable(todosLosAlumnos);
    if (countEl) countEl.textContent = `${todosLosAlumnos.length} alumnos`;
}

// ─── RENDER TABLA ──────────────────────────────────────────
function renderAlumnosTable(lista) {
    const tbody = document.getElementById("alumnosTableBody");
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-inbox"></i> No hay alumnos registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => `
        <tr>
            <td>${a.id}</td>
            <td><strong>${escapeHtmlA(a.nombre)}</strong></td>
            <td>${a.grado}</td>
            <td><span class="badge-seccion">${a.seccion}</span></td>
            <td>${a.apoderado
            ? `<span class="apoderado-tag"><i class="fas fa-user-tie"></i> ${escapeHtmlA(a.apoderado.nombreVisitante)}</span>`
            : '<span class="text-muted">Sin apoderado</span>'
        }</td>
            <td class="actions-cell">
                <button class="btn-action edit" onclick="editarAlumno(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// ─── BÚSQUEDA / FILTRO ─────────────────────────────────────
function filtrarAlumnos() {
    const q = document.getElementById("alumnoSearch").value.toLowerCase();
    const filtrados = todosLosAlumnos.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        (a.grado && a.grado.toLowerCase().includes(q)) ||
        (a.seccion && a.seccion.toLowerCase().includes(q))
    );
    renderAlumnosTable(filtrados);
    document.getElementById("alumnosCount").textContent = `${filtrados.length} alumnos`;
}

// ─── FORMULARIO SHOW/HIDE ──────────────────────────────────
function showAddAlumnoForm() {
    editingAlumnoId = null; // modo creación
    document.getElementById("alumnoFormCard").style.display = "block";
    document.getElementById("alumnoFormTitle").innerHTML = '<i class="fas fa-user-plus"></i> Registrar Alumno';
    document.getElementById("alumnoForm").reset();
    document.getElementById("aApoderadoId").value = '';
    document.getElementById("apoderadoFound").style.display = "none";
    setApoderadoStatus("", "");
}

function hideAlumnoForm() {
    editingAlumnoId = null;
    document.getElementById("alumnoFormCard").style.display = "none";
}

// ─── BUSCADOR DNI DEL APODERADO (en el formulario de alumno) ──
let apoderadoDebounceTimer = null;

(function setupApoderadoLookup() {
    // Se llama al cargarse este script; el input se monta con el HTML
    setTimeout(() => {
        const input = document.getElementById("aApoderadoDni");
        if (!input) return;

        input.addEventListener("input", () => {
            const dni = input.value.trim();
            clearTimeout(apoderadoDebounceTimer);
            document.getElementById("apoderadoFound").style.display = "none";
            document.getElementById("aApoderadoId").value = '';
            setApoderadoStatus("", "");

            if (dni.length < 6) return;

            setApoderadoStatus("fas fa-spinner", "searching");
            apoderadoDebounceTimer = setTimeout(async () => {
                try {
                    const res = await authFetch(`${API_VISITANTES_BUSCAR}?dni=${encodeURIComponent(dni)}`);
                    if (res.status === 404) {
                        setApoderadoStatus("fas fa-times-circle", "not-found");
                        return;
                    }
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const v = await res.json();

                    // Apoderado encontrado
                    document.getElementById("aApoderadoId").value = v.id;
                    document.getElementById("apoderadoFoundName").textContent = v.nombreVisitante;
                    document.getElementById("apoderadoFound").style.display = "flex";
                    setApoderadoStatus("fas fa-check-circle", "found");
                } catch (err) {
                    console.error("Error buscando apoderado:", err);
                    setApoderadoStatus("fas fa-exclamation-circle", "not-found");
                }
            }, 500);
        });
    }, 100);
})();

function setApoderadoStatus(icon, cssClass) {
    const el = document.getElementById("apoderadoStatus");
    if (!el) return;
    el.className = "dni-status " + cssClass;
    el.innerHTML = icon ? `<i class="${icon}"></i>` : "";
}

// ─── GUARDAR ALUMNO ────────────────────────────────────────
async function submitAlumnoForm(event) {
    event.preventDefault();

    const apoderadoId = document.getElementById("aApoderadoId").value;

    const data = {
        nombre: document.getElementById("aNombre").value.trim(),
        grado: document.getElementById("aGrado").value,
        seccion: document.getElementById("aSeccion").value,
        visitanteId: apoderadoId ? parseInt(apoderadoId, 10) : null
    };

    // Si estamos editando → PUT /{id}; si creando → POST
    const url = editingAlumnoId ? `${API_ALUMNOS}/${editingAlumnoId}` : API_ALUMNOS;
    const method = editingAlumnoId ? "PUT" : "POST";

    try {
        const res = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const msg = editingAlumnoId ? "Alumno actualizado correctamente" : "Alumno guardado correctamente";
        if (typeof showToast === 'function') showToast(msg, "success");
        hideAlumnoForm();
        cargarAlumnos();

    } catch (err) {
        console.error("Error guardando alumno:", err);
        if (typeof showToast === 'function') showToast("Error al guardar el alumno", "error");
    }
}

// ─── EDITAR (pre-llenado) ──────────────────────────────────
function editarAlumno(id) {
    const a = todosLosAlumnos.find(x => x.id === id);
    if (!a) return;

    editingAlumnoId = a.id; // guardar ID → el submit usará PUT
    document.getElementById("aNombre").value = a.nombre || '';
    document.getElementById("aGrado").value = a.grado || '';
    document.getElementById("aSeccion").value = a.seccion || '';

    if (a.apoderado) {
        document.getElementById("aApoderadoDni").value = a.apoderado.dniVisitante || '';
        document.getElementById("aApoderadoId").value = a.apoderado.id;
        document.getElementById("apoderadoFoundName").textContent = a.apoderado.nombreVisitante;
        document.getElementById("apoderadoFound").style.display = "flex";
        setApoderadoStatus("fas fa-check-circle", "found");
    }

    document.getElementById("alumnoFormTitle").innerHTML = '<i class="fas fa-edit"></i> Editar Alumno';
    document.getElementById("alumnoFormCard").style.display = "block";
}

// ─── HELPER ────────────────────────────────────────────────
function escapeHtmlA(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── INIT ──────────────────────────────────────────────────
cargarAlumnos();

// =============================================================
// IMPORTACIÓN DESDE EXCEL
// =============================================================

const API_VISITANTES_POST = "http://localhost:8080/api/visitantes";

// Mostrar/ocultar el panel de importación
function toggleImportPanel() {
    const panel = document.getElementById("importPanel");
    const isVisible = panel.style.display !== "none";
    panel.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
        // Resetear log al abrir
        document.getElementById("importLog").style.display = "none";
        document.getElementById("importLogBody").innerHTML = "";
        document.getElementById("excelInput").value = "";
        document.getElementById("dropZone").classList.remove("drag-over");
    }
}

// Manejo del drop de archivo
function handleExcelDrop(event) {
    event.preventDefault();
    document.getElementById("dropZone").classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (file) handleExcelFile(file);
}

// Manejo del archivo seleccionado / soltado
async function handleExcelFile(file) {
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

    await importarDesdeExcel(filas);
}

// Lógica principal: procesar cada fila del Excel
async function importarDesdeExcel(filas) {
    const logEl = document.getElementById("importLog");
    const logBody = document.getElementById("importLogBody");
    const summaryEl = document.getElementById("importSummary");

    logEl.style.display = "block";
    logBody.innerHTML = "";
    summaryEl.textContent = `Procesando ${filas.length} filas...`;

    let exitosos = 0, fallidos = 0;

    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const nombre = String(fila["nombre_alumno"] || "").trim();
        const grado = String(fila["grado"] || "").trim();
        const seccion = String(fila["seccion"] || "").trim();
        const dniApo = String(fila["dni_apoderado"] || "").trim();
        const nomApo = String(fila["nombre_apoderado"] || "").trim();
        const telefono = String(fila["telefono"] || "").trim();

        // Validación básica
        if (!nombre || !grado || !seccion) {
            agregarLogFila(logBody, i + 1, nombre || "—", "⚠️ Fila incompleta (falta nombre, grado o sección)", "log-warn");
            fallidos++;
            continue;
        }

        try {
            // Paso 1: registrar o recuperar apoderado (si se proporcionó DNI y nombre)
            let visitanteId = null;
            if (dniApo && nomApo) {
                const resApo = await authFetch(API_VISITANTES_POST, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dniVisitante: dniApo,
                        nombreVisitante: nomApo,
                        telefono: telefono || null,
                        email: null
                    })
                });
                if (!resApo.ok) throw new Error(`Apoderado: HTTP ${resApo.status}`);
                const apoData = await resApo.json();
                visitanteId = apoData.id;
            }

            // Paso 2: registrar el alumno
            const resAlumno = await authFetch(API_ALUMNOS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, grado, seccion, visitanteId })
            });
            if (!resAlumno.ok) throw new Error(`Alumno: HTTP ${resAlumno.status}`);

            agregarLogFila(logBody, i + 1, nombre, `✅ Registrado${visitanteId ? " — apoderado: " + nomApo : ""}`, "log-ok");
            exitosos++;

        } catch (err) {
            agregarLogFila(logBody, i + 1, nombre, `❌ Error: ${err.message}`, "log-error");
            fallidos++;
        }
    }

    // Resumen final
    summaryEl.innerHTML = `
        <span class="log-ok">✅ ${exitosos} exitosos</span>
        ${fallidos > 0 ? `<span class="log-error"> &nbsp;❌ ${fallidos} con errores</span>` : ""}
    `;
    if (typeof showToast === 'function') {
        showToast(`Importación completa: ${exitosos} registrados, ${fallidos} errores`, fallidos > 0 ? "warning" : "success");
    }
    cargarAlumnos(); // refrescar tabla
}

// Helper para agregar una línea al log de importación
function agregarLogFila(container, fila, nombre, mensaje, cssClass) {
    const div = document.createElement("div");
    div.className = `log-row ${cssClass}`;
    div.innerHTML = `<span class="log-num">Fila ${fila}</span> <strong>${escapeHtmlA(nombre)}</strong> — ${mensaje}`;
    container.appendChild(div);
}

