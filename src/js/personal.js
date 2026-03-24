// ============================================================
// personal.js — Gestión de Personal del Colegio
// ============================================================

let todoElPersonal = [];
let editingPersonalId = null;
// Mapa: email → true (ya tiene cuenta) — se carga en cargarPersonal()
let personalConAcceso = {};

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

        // Cargar qué emails ya tienen cuenta de usuario para mostrar el badge
        if (data.length > 0) {
            const emails = data.map(p => p.email).filter(Boolean);
            personalConAcceso = {};
            if (emails.length > 0) {
                const { data: usrs } = await supabaseClient
                    .from('usuarios')
                    .select('usuario')
                    .eq('institucion_id', adminProfile.institucion_id)
                    .in('usuario', emails);
                (usrs || []).forEach(u => { personalConAcceso[u.usuario] = true; });
            }
        }
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

    tbody.innerHTML = lista.map(p => {
        const tieneAcceso = p.email && personalConAcceso[p.email];
        const accesoCell = tieneAcceso
            ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
                background:rgba(16,185,129,.1);color:#059669;border-radius:20px;
                font-size:11px;font-weight:700;">
                <i class="fas fa-check-circle"></i> Activo
               </span>`
            : `<button class="btn-action" title="Activar como usuario del sistema"
                style="background:rgba(99,102,241,.1);color:#6366f1;"
                onclick="activarComoUsuario('${p.id}')"><i class="fas fa-key"></i></button>`;

        return `
        <tr>
            <td><strong>${escapeHtmlPersonal(p.nombre)}</strong></td>
            <td>${escapeHtmlPersonal(p.cargo)}</td>
            <td>${p.dni || '<span class="text-muted">—</span>'}</td>
            <td>${p.telefono || '<span class="text-muted">—</span>'}</td>
            <td>${p.email || '<span class="text-muted">—</span>'}</td>
            <td>${accesoCell}</td>
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
        </tr>`;
    }).join('');
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

// ─── ACTIVAR COMO USUARIO DEL SISTEMA ─────────────────────
function activarComoUsuario(personalId) {
    const p = todoElPersonal.find(x => x.id === personalId);
    if (!p) return;

    // Pre-rellenar el modal con los datos del trabajador
    document.getElementById('activarPersonalId').value = personalId;
    document.getElementById('activarEmail').value = p.email || '';
    document.getElementById('activarPassword').value = '';
    document.getElementById('activarRol').value = '';
    document.getElementById('activarNombreInfo').innerHTML =
        `<i class="fas fa-user-tie" style="color:var(--primary-color);"></i>
         <strong style="margin-left:6px;">${escapeHtmlPersonal(p.nombre)}</strong>
         <span style="margin-left:8px;color:var(--text-secondary);">— ${escapeHtmlPersonal(p.cargo)}</span>`;

    const overlay = document.getElementById('activarUsuarioOverlay');
    overlay.style.display = 'flex';
}

function cerrarModalActivar() {
    document.getElementById('activarUsuarioOverlay').style.display = 'none';
}

async function submitActivarUsuario(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitActivar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activando...';

    const personalId = document.getElementById('activarPersonalId').value;
    const email      = document.getElementById('activarEmail').value.trim();
    const password   = document.getElementById('activarPassword').value;
    const rol        = document.getElementById('activarRol').value;
    const p          = todoElPersonal.find(x => x.id === personalId);

    try {
        const adminProfile = await getUserProfile();
        if (!adminProfile?.institucion_id) throw new Error('No se pudo determinar la institución.');

        // 1. Verificar que no exista ya una cuenta con ese email
        const { data: existing } = await supabaseClient
            .from('usuarios').select('id').eq('usuario', email).maybeSingle();
        if (existing) throw new Error(`Ya existe un usuario del sistema con el email "${email}".`);

        // 2. Crear cuenta en Supabase Auth
        const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { nombre: p?.nombre || '', rol } }
        });
        if (authErr) throw authErr;

        // 3. Insertar fila en tabla usuarios
        const { error: insertErr } = await supabaseClient.from('usuarios').insert([{
            id:            authData.user.id,
            nombre:        p?.nombre || '',
            usuario:       email,
            rol:           rol,
            institucion_id: adminProfile.institucion_id
        }]);
        if (insertErr) throw insertErr;

        // 4. Actualizar el email en la fila de personal si no lo tenía
        if (!p?.email && p) {
            await supabaseClient.from('personal').update({ email }).eq('id', personalId);
        }

        showToast(`✓ ${p?.nombre || 'Usuario'} ahora tiene acceso al sistema`, 'success');
        cerrarModalActivar();
        cargarPersonal(); // refresca la tabla con el nuevo badge

    } catch (err) {
        console.error('Error activando usuario:', err);
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Activar cuenta';
    }
}

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
