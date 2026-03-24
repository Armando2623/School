// ============================================================
// usuarios.js — Gestión de usuarios (ADMINISTRADOR)
// ============================================================

let todosLosUsuarios = [];
let editingUserUuid = null;

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarUsuarios() {
    const tbody = document.getElementById("usuariosTableBody");
    const countEl = document.getElementById("usuariosCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        // 1. Obtenemos el perfil del admin logueado
        // (Asumo que getUserProfile() devuelve el campo 'institucion_id')
        const adminProfile = await getUserProfile();

        if (!adminProfile || !adminProfile.institucion_id) {
            console.error("No se encontró la institución del administrador");
            return;
        }

        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('institucion_id', adminProfile.institucion_id) // <-- EL FILTRO MÁGICO
            .order('nombre', { ascending: true });

        if (error) throw error;
        todosLosUsuarios = data;
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar los usuarios", "error");
        todosLosUsuarios = [];
    }

    renderUsuariosTable();
    if (countEl) countEl.textContent = `${todosLosUsuarios.length} usuarios`;
}

// ─── RENDER TABLA ──────────────────────────────────────────
function renderUsuariosTable() {
    const tbody = document.getElementById("usuariosTableBody");
    if (!tbody) return;

    const rolLabels = {
        ADMINISTRADOR: { label: "Administrador", icon: "fas fa-crown", css: "badge-admin" },
        SECRETARIA: { label: "Secretaria", icon: "fas fa-briefcase", css: "badge-secretaria" },
        DIRECTOR: { label: "Director", icon: "fas fa-star", css: "badge-director" },
        PORTERO: { label: "Portero", icon: "fas fa-door-open", css: "badge-portero" },
        PROFESOR: { label: "Profesor", icon: "fas fa-chalkboard-teacher", css: "badge-profesor" },
    };

    if (todosLosUsuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">Sin usuarios registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = todosLosUsuarios.map(u => {
        const rol = rolLabels[u.rol] || { label: u.rol, icon: "fas fa-user", css: "" };
        return `
        <tr>
            <td><strong>${u.usuario}</strong></td>
            <td>${u.nombre}</td>
            <td>
                <span class="status-badge ${rol.css}" style="display:inline-flex;align-items:center;gap:5px;">
                    <i class="${rol.icon}"></i> ${rol.label}
                </span>
            </td>
            <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action edit" onclick="editarUsuario('${u.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="confirmarEliminarUsuario('${u.id}', '${u.nombre}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ─── FILTRAR ───────────────────────────────────────────────
function filtrarUsuarios() {
    const q = document.getElementById("usuarioSearch").value.toLowerCase();
    const filtrados = todosLosUsuarios.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.usuario.toLowerCase().includes(q)
    );
    // Para simplificar, recargamos la tabla con la lista filtrada (usando una variable temporal)
    const originalList = todosLosUsuarios;
    todosLosUsuarios = filtrados;
    renderUsuariosTable();
    todosLosUsuarios = originalList;
    document.getElementById("usuariosCount").textContent = `${filtrados.length} usuarios`;
}

// ─── FORMULARIO ────────────────────────────────────────────
function showAddUsuarioForm() {
    editingUserUuid = null;
    document.getElementById("usuarioFormCard").style.display = "block";
    document.getElementById("usuarioForm").reset();
    document.getElementById("usuarioFormTitle").innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    document.getElementById("btnSubmitUsuario").innerHTML = '<i class="fas fa-save"></i> Guardar Usuario';
}

function hideUsuarioForm() {
    document.getElementById("usuarioFormCard").style.display = "none";
    editingUserUuid = null;
}

// ─── GUARDAR ───────────────────────────────────────────────
async function submitUsuarioForm(event) {
    event.preventDefault();

    const nombre = document.getElementById("uNombre").value.trim();
    const usuario = document.getElementById("uUsuario").value.trim();
    const rol = document.getElementById("uRol").value;
    const pass = document.getElementById("uPassword").value;

    // Obtener institucion_id del admin logueado (usa caché, no hace round-trip extra)
    let instId = null;
    if (typeof getUserProfile === 'function') {
        const adminProfile = await getUserProfile();
        instId = adminProfile ? adminProfile.institucion_id : null;
    }

    try {
        if (editingUserUuid) {
            const { error } = await supabaseClient
                .from('usuarios')
                .update({ nombre, rol })
                .eq('id', editingUserUuid);

            if (error) throw error;
            showToast("Usuario actualizado", "success");
        } else {
            if (!instId) throw new Error("No se pudo determinar la institución del administrador.");

            const { data, error } = await supabaseClient.auth.signUp({
                email: usuario,
                password: pass,
                options: { data: { nombre, rol } }
            });
            if (error) throw error;

            // Insertar perfil en la tabla 'usuarios' con la institución del admin logueado
            const { error: insertError } = await supabaseClient
                .from('usuarios')
                .insert([{ id: data.user.id, nombre, usuario, rol, institucion_id: instId }]);
            if (insertError) throw insertError;

            showToast("Usuario registrado exitosamente", "success");
        }
        hideUsuarioForm();
        cargarUsuarios();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

// ─── EDITAR ────────────────────────────────────────────────
function editarUsuario(id) {
    const u = todosLosUsuarios.find(x => x.id === id);
    if (!u) return;

    editingUserUuid = id;
    document.getElementById("uNombre").value = u.nombre;
    document.getElementById("uUsuario").value = u.usuario;
    document.getElementById("uRol").value = u.rol;

    document.getElementById("usuarioFormTitle").innerHTML = `<i class="fas fa-user-edit"></i> Editar Usuario`;
    document.getElementById("usuarioFormCard").style.display = "block";
}

// ─── ELIMINAR ──────────────────────────────────────────────
async function confirmarEliminarUsuario(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
        const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
        if (error) throw error;
        showToast("Usuario eliminado", "success");
        cargarUsuarios();
    } catch (err) {
        showToast("Error al eliminar", "error");
    }
}

// ─── INIT ──────────────────────────────────────────────────
cargarUsuarios();

// ─── IMPORTACIÓN EXCEL ─────────────────────────────────────
function toggleImportUsuariosPanel() {
    const panel = document.getElementById("importUsuariosPanel");
    if (!panel) return;
    panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function handleUsuariosDrop(event) {
    event.preventDefault();
    document.getElementById("dropZoneUsuarios").classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    if (file) handleUsuariosFile(file);
}

async function handleUsuariosFile(file) {
    if (!file) return;

    // Obtener la institución del admin UNA sola vez (usa caché)
    let instId = null;
    if (typeof getUserProfile === 'function') {
        const profile = await getUserProfile();
        instId = profile ? profile.institucion_id : null;
    }

    if (!instId) {
        showToast("No se pudo determinar la institución del administrador", "error");
        return;
    }

    let ok = 0, err = 0;
    const logLines = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        for (const r of rows) {
            const nombre  = String(r.nombre  || "").trim();
            const usuario = String(r.usuario  || "").trim();
            const rol     = String(r.rol      || "").trim().toUpperCase();
            const pass    = String(r.password || "").trim();

            const rolesValidos = ["ADMINISTRADOR", "SECRETARIA", "DIRECTOR", "PORTERO", "PROFESOR"];

            if (!nombre || !usuario || !rol || !pass) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> Fila incompleta: ${usuario || '(sin usuario)'}</span>`);
                continue;
            }

            if (!rolesValidos.includes(rol)) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> Rol inválido "${rol}" para ${usuario}</span>`);
                continue;
            }

            // 1. Crear cuenta en Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: usuario,
                password: pass,
                options: { data: { nombre, rol } }
            });

            if (authError) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> Auth error "${usuario}": ${authError.message}</span>`);
                continue;
            }

            // 2. Insertar fila en tabla 'usuarios' con la institución del admin
            const { error: insertError } = await supabaseClient
                .from('usuarios')
                .insert([{ id: authData.user.id, nombre, usuario, rol, institucion_id: instId }]);

            if (insertError) {
                err++;
                logLines.push(`<span class="log-error"><i class="fas fa-times-circle"></i> DB error "${usuario}": ${insertError.message}</span>`);
            } else {
                ok++;
                logLines.push(`<span class="log-ok"><i class="fas fa-check-circle"></i> OK: ${nombre} (${rol})</span>`);
            }
        }
    } catch (e) {
        showToast("Error al leer el archivo: " + e.message, "error");
        return;
    }

    // Mostrar log de resultados
    const logDiv  = document.getElementById("importUsuariosLog");
    const logBody = document.getElementById("importUsuariosLogBody");
    const summary = document.getElementById("importUsuariosSummary");
    if (logDiv && logBody) {
        logDiv.style.display = "block";
        logBody.innerHTML = logLines.join('<br>');
        if (summary) summary.textContent = ` — ${ok} exitosos, ${err} fallidos`;
    }

    showToast(`Importación: ${ok} exitosos, ${err} fallidos`, ok > 0 ? "success" : "error");
    cargarUsuarios();
}
