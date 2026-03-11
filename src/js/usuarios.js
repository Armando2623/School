// ================================================================
// usuarios.js — Gestión de Usuarios del Sistema
// Solo accesible para rol ADMINISTRADOR
// ================================================================

const API_USUARIOS = "http://localhost:8080/api/usuarios";

let todosLosUsuarios = [];
let editingUsuarioId = null; // null = nuevo, number = editar

// ─── Cargar y renderizar tabla ────────────────────────────────
async function cargarUsuarios() {
    const tbody = document.getElementById("usuariosTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const res = await authFetch(API_USUARIOS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        todosLosUsuarios = await res.json();
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--error-color);">
            <i class="fas fa-exclamation-triangle"></i> No se pudo cargar la lista de usuarios.</td></tr>`;
        return;
    }

    renderUsuariosTable();
}

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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">
            Sin usuarios registrados.</td></tr>`;
        return;
    }

    const currentUserId = localStorage.getItem('sg_id');

    tbody.innerHTML = todosLosUsuarios.map(u => {
        const rol = rolLabels[u.rol] || { label: u.rol, icon: "fas fa-user", css: "" };
        const isSelf = String(u.id) === String(currentUserId);
        return `
        <tr>
            <td>${u.id}</td>
            <td><strong>${u.nombre}</strong></td>
            <td><code style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px;">${u.usuario}</code></td>
            <td>
                <span class="status-badge ${rol.css}" style="display:inline-flex;align-items:center;gap:5px;">
                    <i class="${rol.icon}"></i> ${rol.label}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action edit"
                            onclick="editarUsuario(${u.id})"
                            title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete"
                            onclick="confirmarEliminarUsuario(${u.id}, '${u.nombre}')"
                            title="Eliminar"
                            ${isSelf ? 'disabled title="No puede eliminar su propio usuario"' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ─── Formulario Nuevo Usuario ─────────────────────────────────
function showAddUsuarioForm() {
    editingUsuarioId = null;
    document.getElementById("usuarioFormCard").style.display = "block";
    document.getElementById("usuarioForm").reset();
    document.getElementById("uPassword").required = true;
    document.getElementById("uPassword").placeholder = "Mínimo 6 caracteres";
    document.getElementById("usuarioFormTitle").innerHTML =
        '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    document.getElementById("btnSubmitUsuario").innerHTML =
        '<i class="fas fa-save"></i> Guardar Usuario';
    document.getElementById("usuarioFormCard").scrollIntoView({ behavior: "smooth" });
}

function editarUsuario(id) {
    const u = todosLosUsuarios.find(x => x.id === id);
    if (!u) return;

    editingUsuarioId = id;

    document.getElementById("uNombre").value = u.nombre;
    document.getElementById("uUsuario").value = u.usuario;
    document.getElementById("uRol").value = u.rol;
    document.getElementById("uPassword").value = ""; // vacío = no cambiar
    document.getElementById("uPassword").required = false;
    document.getElementById("uPassword").placeholder = "Dejar vacío para no cambiar";

    document.getElementById("usuarioFormTitle").innerHTML =
        `<i class="fas fa-user-edit"></i> Editar Usuario — ${u.nombre}`;
    document.getElementById("btnSubmitUsuario").innerHTML =
        '<i class="fas fa-save"></i> Actualizar Usuario';

    document.getElementById("usuarioFormCard").style.display = "block";
    document.getElementById("usuarioFormCard").scrollIntoView({ behavior: "smooth" });
}

function hideUsuarioForm() {
    document.getElementById("usuarioFormCard").style.display = "none";
    editingUsuarioId = null;
}

async function submitUsuarioForm(event) {
    event.preventDefault();

    const btn = document.getElementById("btnSubmitUsuario");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const data = {
        nombre: document.getElementById("uNombre").value.trim(),
        usuario: document.getElementById("uUsuario").value.trim(),
        contraseña: document.getElementById("uPassword").value,
        rol: document.getElementById("uRol").value
    };

    const url = editingUsuarioId ? `${API_USUARIOS}/${editingUsuarioId}` : API_USUARIOS;
    const method = editingUsuarioId ? "PUT" : "POST";
    const msg = editingUsuarioId ? "Usuario actualizado correctamente" : "Usuario creado correctamente";

    try {
        const res = await authFetch(url, { method, body: JSON.stringify(data) });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Error ${res.status}`);
        }

        editingUsuarioId = null;
        hideUsuarioForm();
        if (typeof showToast === 'function') showToast(msg, "success");
        await cargarUsuarios();

    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, "error");
        else alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Guardar Usuario';
    }
}

// ─── Eliminar ─────────────────────────────────────────────────
async function confirmarEliminarUsuario(id, nombre) {
    if (!confirm(`¿Eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
        const res = await authFetch(`${API_USUARIOS}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Error ${res.status}`);

        if (typeof showToast === 'function') showToast("Usuario eliminado", "success");
        await cargarUsuarios();

    } catch (err) {
        if (typeof showToast === 'function') showToast("Error al eliminar el usuario", "error");
    }
}

// ─── Toggle contraseña ────────────────────────────────────────
function toggleUPwd() {
    const input = document.getElementById("uPassword");
    const icon = document.getElementById("uEyeIcon");
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fas fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fas fa-eye";
    }
}

// ─── Init ─────────────────────────────────────────────────────
cargarUsuarios();
