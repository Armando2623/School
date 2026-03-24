// ============================================================
// personal.js — Gestión de Personal del Colegio
// Solo trabajadores/empleados: no crea cuentas de sistema.
// ============================================================

let todoElPersonal = [];
let editingPersonalId = null;

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarPersonal() {
    const tbody = document.getElementById("personalTableBody");
    const countEl = document.getElementById("personalCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const adminProfile = await getUserProfile();
        if (!adminProfile || !adminProfile.institucion_id) {
            console.error("No se encontró la institución del administrador");
            tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Error al cargar la institución.</td></tr>`;
            return;
        }

        const { data, error } = await supabaseClient
            .from('personal')
            .select('*')
            .eq('institucion_id', adminProfile.institucion_id)
            .order('nombre', { ascending: true });

        if (error) throw error;
        todoElPersonal = data;
    } catch (err) {
        console.error("Error cargando personal:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar el personal", "error");
        todoElPersonal = [];
    }

    renderPersonalTable(todoElPersonal);
    if (countEl) countEl.textContent = `${todoElPersonal.length} trabajadores`;
}

// ─── RENDER TABLA ──────────────────────────────────────────
function renderPersonalTable(lista) {
    const tbody = document.getElementById("personalTableBody");
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-inbox"></i> No hay personal registrado</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => `
        <tr>
            <td><strong>${escapeHtmlPersonal(p.nombre)}</strong></td>
            <td>${escapeHtmlPersonal(p.cargo)}</td>
            <td>${p.dni || '<span class="text-muted">—</span>'}</td>
            <td>${p.telefono || '<span class="text-muted">—</span>'}</td>
            <td>${p.email || '<span class="text-muted">—</span>'}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="btn-action edit" onclick="editarPersonal('${p.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="confirmarEliminarPersonal('${p.id}', '${escapeHtmlPersonal(p.nombre)}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ─── BÚSQUEDA / FILTRO ─────────────────────────────────────
function filtrarPersonal() {
    const q = document.getElementById("personalSearch").value.toLowerCase();
    const filtrados = todoElPersonal.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.cargo || '').toLowerCase().includes(q) ||
        (p.dni || '').includes(q)
    );
    renderPersonalTable(filtrados);
    document.getElementById("personalCount").textContent = `${filtrados.length} trabajadores`;
}

// ─── FORMULARIO ────────────────────────────────────────────
function showAddPersonalForm() {
    editingPersonalId = null;
    document.getElementById("personalFormTitle").innerHTML = '<i class="fas fa-user-tie"></i> Nuevo Personal';
    document.getElementById("btnSubmitPersonal").innerHTML = '<i class="fas fa-save"></i> Guardar';
    document.getElementById("personalForm").reset();
    document.getElementById("personalFormCard").style.display = "block";
}

function hidePersonalForm() {
    editingPersonalId = null;
    document.getElementById("personalFormCard").style.display = "none";
}

// ─── GUARDAR ───────────────────────────────────────────────
async function submitPersonalForm(event) {
    event.preventDefault();

    const payload = {
        nombre:   document.getElementById("pNombre").value.trim(),
        cargo:    document.getElementById("pCargo").value.trim(),
        dni:      document.getElementById("pDni").value.trim() || null,
        telefono: document.getElementById("pTelefono").value.trim() || null,
        email:    document.getElementById("pEmail").value.trim() || null,
    };

    try {
        if (editingPersonalId) {
            const { error } = await supabaseClient
                .from('personal')
                .update(payload)
                .eq('id', editingPersonalId);
            if (error) throw error;
            if (typeof showToast === 'function') showToast("Personal actualizado", "success");
        } else {
            // Asignar la institución del admin logueado
            const adminProfile = await getUserProfile();
            if (!adminProfile || !adminProfile.institucion_id) throw new Error("No se pudo determinar la institución.");
            payload.institucion_id = adminProfile.institucion_id;

            const { error } = await supabaseClient.from('personal').insert([payload]);
            if (error) throw error;
            if (typeof showToast === 'function') showToast("Personal registrado", "success");
        }
        hidePersonalForm();
        cargarPersonal();
    } catch (err) {
        console.error("Error guardando personal:", err);
        if (typeof showToast === 'function') showToast("Error: " + err.message, "error");
    }
}

// ─── EDITAR ────────────────────────────────────────────────
function editarPersonal(id) {
    const p = todoElPersonal.find(x => x.id === id);
    if (!p) return;

    editingPersonalId = id;
    document.getElementById("pNombre").value   = p.nombre;
    document.getElementById("pCargo").value    = p.cargo;
    document.getElementById("pDni").value      = p.dni || '';
    document.getElementById("pTelefono").value = p.telefono || '';
    document.getElementById("pEmail").value    = p.email || '';

    document.getElementById("personalFormTitle").innerHTML = '<i class="fas fa-user-edit"></i> Editar Personal';
    document.getElementById("btnSubmitPersonal").innerHTML = '<i class="fas fa-save"></i> Actualizar';
    document.getElementById("personalFormCard").style.display = "block";
}

// ─── ELIMINAR ──────────────────────────────────────────────
async function confirmarEliminarPersonal(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre} del registro de personal?`)) return;
    try {
        const { error } = await supabaseClient.from('personal').delete().eq('id', id);
        if (error) throw error;
        if (typeof showToast === 'function') showToast("Personal eliminado", "success");
        cargarPersonal();
    } catch (err) {
        if (typeof showToast === 'function') showToast("Error al eliminar", "error");
    }
}

// ─── HELPER ────────────────────────────────────────────────
function escapeHtmlPersonal(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── INIT ──────────────────────────────────────────────────
cargarPersonal();

// ─── IMPORTACIÓN EXCEL ─────────────────────────────────────
function toggleImportPersonalPanel() {
    const panel = document.getElementById("importPersonalPanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function handlePersonalDrop(event) {
    event.preventDefault();
    document.getElementById("dropZonePersonal").classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    if (file) handlePersonalFile(file);
}

async function handlePersonalFile(file) {
    if (!file) return;

    // Obtener institucion_id del admin (usa caché, no hace round-trip extra)
    let instId = null;
    if (typeof getUserProfile === 'function') {
        const profile = await getUserProfile();
        instId = profile ? profile.institucion_id : null;
    }

    if (!instId) {
        if (typeof showToast === 'function') showToast("No se pudo determinar la institución del administrador", "error");
        return;
    }

    let ok = 0, err = 0;
    const logLines = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        for (const r of rows) {
            const nombre   = String(r.nombre   || "").trim();
            const cargo    = String(r.cargo     || "").trim();
            const dni      = String(r.dni       || "").trim() || null;
            const telefono = String(r.telefono  || "").trim() || null;
            const email    = String(r.email     || "").trim() || null;

            if (!nombre || !cargo) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> Fila incompleta (nombre/cargo requeridos): "${nombre || '?'}"</span>`);
                continue;
            }

            const { error } = await supabaseClient.from('personal').insert([{
                nombre, cargo, dni, telefono, email,
                institucion_id: instId
            }]);

            if (error) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> Error "${nombre}": ${error.message}</span>`);
            } else {
                ok++;
                logLines.push(`<span class="log-ok"><i class="fas fa-check-circle"></i> OK: ${nombre} — ${cargo}</span>`);
            }
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast("Error al leer el archivo: " + e.message, "error");
        return;
    }

    // Mostrar log
    const logDiv  = document.getElementById("importPersonalLog");
    const logBody = document.getElementById("importPersonalLogBody");
    const summary = document.getElementById("importPersonalSummary");
    if (logDiv && logBody) {
        logDiv.style.display = "block";
        logBody.innerHTML = logLines.join('<br>');
        if (summary) summary.textContent = ` — ${ok} exitosos, ${err} fallidos`;
    }

    if (typeof showToast === 'function') showToast(`Importación: ${ok} exitosos, ${err} fallidos`, ok > 0 ? "success" : "error");
    cargarPersonal();
}
