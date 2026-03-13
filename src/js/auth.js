// ================================================================
// auth.js — Gestión de sesión Supabase para SchoolGuard
// ================================================================

// ─── Getters de Sesión ────────────────────────────────────────
/**
 * Obtiene la sesión actual de Supabase.
 */
async function getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) return null;
    return data.session;
}

/**
 * Obtiene el perfil del usuario desde la tabla 'usuarios' vinculada al auth.
 */
async function getUserProfile() {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (error) return null;
    return data;
}

// ─── Verificar sesión ─────────────────────────────────────────
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.replace("login.html");
    }
}

// ─── Cerrar sesión ────────────────────────────────────────────
async function logout() {
    if (typeof chatDisconnect === 'function') chatDisconnect();
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
}

// ─── Permisos por rol ─────────────────────────────────────────
const PAGINAS_POR_ROL = {
    visitantes: ["ADMINISTRADOR", "SECRETARIA"],
    alumnos: ["ADMINISTRADOR", "SECRETARIA"],
    registro: ["ADMINISTRADOR", "PORTERO", "SECRETARIA"],
    reports: ["ADMINISTRADOR", "SECRETARIA", "DIRECTOR"],
    usuarios: ["ADMINISTRADOR"],
};

async function hasPermission(page) {
    const profile = await getUserProfile();
    if (!profile) return false;
    
    const allowed = PAGINAS_POR_ROL[page];
    if (!allowed) return true;
    return allowed.includes(profile.rol);
}

// ─── Init: exponer datos del usuario en el sidebar ────────────
async function initUserInfo() {
    const profile = await getUserProfile();
    if (!profile) return;

    const rolLabels = {
        ADMINISTRADOR: "Administrador",
        PORTERO: "Portero",
        SECRETARIA: "Secretaria",
        DIRECTOR: "Director",
        PROFESOR: "Profesor"
    };

    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    if (nameEl) nameEl.textContent = profile.nombre;
    if (roleEl) roleEl.textContent = rolLabels[profile.rol] || profile.rol;
}
