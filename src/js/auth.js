// ================================================================
// auth.js — Gestión de sesión Supabase para SchoolGuard
// ================================================================

// ─── Caché en memoria del perfil ──────────────────────────────
// Evita múltiples round-trips a Supabase durante la misma sesión.
let _profileCache = null;

/**
 * Limpia el caché del perfil (llamar al cerrar sesión).
 */
function clearProfileCache() {
    _profileCache = null;
}

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
 * Obtiene el perfil del usuario desde la tabla 'usuarios'.
 * Usa caché en memoria para no repetir la consulta en la misma sesión.
 */
async function getUserProfile() {
    // Retornar desde caché si ya fue cargado
    if (_profileCache) return _profileCache;

    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) return null;

    _profileCache = data;
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
    clearProfileCache();
    if (typeof chatDisconnect === 'function') chatDisconnect();
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
}

// ─── Permisos por rol ─────────────────────────────────────────
const PAGINAS_POR_ROL = {
    visitantes:    ["ADMINISTRADOR", "SECRETARIA"],
    alumnos:       ["ADMINISTRADOR", "SECRETARIA"],
    personal:      ["ADMINISTRADOR", "SECRETARIA", "PORTERO"],
    registro:      ["ADMINISTRADOR", "PORTERO", "SECRETARIA"],
    reports:       ["ADMINISTRADOR", "SECRETARIA", "DIRECTOR", "PORTERO", "PROFESOR"],
    usuarios:      ["ADMINISTRADOR"],
    configuracion: ["ADMINISTRADOR"],
    asistencia:    ["ADMINISTRADOR", "SECRETARIA", "PORTERO", "PROFESOR"]
};

async function hasPermission(page) {
    const profile = await getUserProfile();
    if (!profile) return false;
    
    const allowed = PAGINAS_POR_ROL[page];
    if (!allowed) return true;
    return allowed.includes(profile.rol);
}

// ─── Init: exponer datos del usuario en el sidebar ────────────
/**
 * @param {object|null} preloadedProfile - Perfil ya obtenido para evitar re-consulta.
 */
async function initUserInfo(preloadedProfile = null) {
    const profile = preloadedProfile || await getUserProfile();
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
