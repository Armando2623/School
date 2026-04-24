// ============================================================
// visitantes.js — Gestión de visitantes / apoderados
// ============================================================

let todosLosVisitantes = [];
let editingVisitanteId = null;

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarVisitantes() {
    const tbody = document.getElementById("visitantesTableBody");
    const countEl = document.getElementById("visitantesCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        // Obtener la institución del usuario activo para filtrar solo sus visitantes
        let institucionId = null;
        if (typeof getUserProfile === 'function') {
            const profile = await getUserProfile();
            if (profile) institucionId = profile.institucion_id;
        }

        let query = supabaseClient
            .from('visitantes')
            .select('*, alumnos(*)')
            .order('nombre_visitante', { ascending: true });

        // Filtrar por institución si está disponible
        if (institucionId) query = query.eq('institucion_id', institucionId);

        const { data, error } = await query;
        if (error) throw error;
        todosLosVisitantes = data;
    } catch (err) {
        console.error("Error cargando visitantes:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar la lista", "error");
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
            <td><strong>${v.dni_visitante}</strong></td>
            <td>${escapeHtml(v.nombre_visitante)}</td>
            <td>${v.telefono || '<span class="text-muted">—</span>'}</td>
            <td>${v.email || '<span class="text-muted">—</span>'}</td>
            <td>
                ${(v.alumnos && v.alumnos.length > 0)
            ? v.alumnos.map(a => `<span class="badge-alumno"><i class="fas fa-user-graduate"></i> ${escapeHtml(a.nombre)} — ${a.grado}${a.seccion}</span>`).join('')
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
        v.nombre_visitante.toLowerCase().includes(q) ||
        v.dni_visitante.includes(q)
    );
    renderVisitantesTable(filtrados);
    document.getElementById("visitantesCount").textContent = `${filtrados.length} visitantes`;
}

// ─── FORMULARIO ────────────────────────────────────────────
function showAddVisitanteForm() {
    editingVisitanteId = null;
    document.getElementById("visitanteFormCard").style.display = "block";
    document.getElementById("visitanteFormTitle").innerHTML = '<i class="fas fa-user-plus"></i> Registrar Visitante';
    document.getElementById("visitanteForm").reset();
}

function hideVisitanteForm() {
    editingVisitanteId = null;
    document.getElementById("visitanteFormCard").style.display = "none";
}

// ─── GUARDAR ───────────────────────────────────────────────
async function submitVisitanteForm(event) {
    event.preventDefault();

    const data = {
        dni_visitante: document.getElementById("vDni").value.trim(),
        nombre_visitante: document.getElementById("vNombre").value.trim(),
        telefono: document.getElementById("vTelefono").value.trim(),
        email: document.getElementById("vEmail").value.trim()
    };

    try {
        let result;
        if (editingVisitanteId) {
            result = await supabaseClient.from('visitantes').update(data).eq('id', editingVisitanteId);
        } else {
            let profile = null;
            if (typeof getUserProfile === 'function') profile = await getUserProfile();
            if (profile && profile.institucion_id) data.institucion_id = profile.institucion_id;

            result = await supabaseClient.from('visitantes').insert([data]).select();
        }

        if (result.error) throw result.error;

        if (typeof showToast === 'function') showToast("Visitante guardado", "success");
        hideVisitanteForm();
        cargarVisitantes();
    } catch (err) {
        console.error("Error guardando visitante:", err);
        if (typeof showToast === 'function') showToast("Error al guardar", "error");
    }
}

// ─── VER DETALLE ───────────────────────────────────────────
function verVisitante(id) {
    const v = todosLosVisitantes.find(x => x.id === id);
    if (!v) return;

    const hijos = (v.alumnos && v.alumnos.length > 0)
        ? v.alumnos.map(a => `<li><i class="fas fa-user-graduate"></i> ${escapeHtml(a.nombre)} — ${a.grado}${a.seccion}</li>`).join('')
        : '<li>Sin alumnos vinculados</li>';

    const msg = `
        <div style="text-align:left; line-height:1.9;">
            <p><strong>DNI:</strong> ${v.dni_visitante}</p>
            <p><strong>Nombre:</strong> ${escapeHtml(v.nombre_visitante)}</p>
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

// ─── EDITAR ────────────────────────────────────────────────
function editarVisitante(id) {
    const v = todosLosVisitantes.find(x => x.id === id);
    if (!v) return;

    editingVisitanteId = v.id;
    document.getElementById("vDni").value = v.dni_visitante;
    document.getElementById("vNombre").value = v.nombre_visitante;
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

// ─── IMPORTACIÓN EXCEL ─────────────────────────────────────
function toggleImportVisitantesPanel() {
    const panel = document.getElementById("importVisitantesPanel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function handleVisitantesFile(file) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    
    let profile = null;
    if (typeof getUserProfile === 'function') profile = await getUserProfile();
    let institucionId = profile ? profile.institucion_id : null;
    
    let ok = 0, err = 0;
    for (const r of rows) {
        const dni = String(r.dni_visitante || "");
        const nom = String(r.nombre_visitante || "");
        if (!dni || !nom) { err++; continue; }

        const payload = {
            dni_visitante: dni,
            nombre_visitante: nom,
            telefono: r.telefono || null,
            email: r.email || null
        };
        if (institucionId) payload.institucion_id = institucionId;

        const { error } = await supabaseClient.from('visitantes').insert([payload]);
        if (error) err++; else ok++;
    }
    showToast(`Importación: ${ok} exitosos, ${err} fallidos`, "info");
    cargarVisitantes();
}
