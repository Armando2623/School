// ================================================================
// auth.js — Gestión de sesión JWT para SchoolGuard
// ================================================================

const AUTH_BASE = "http://localhost:8080";

// ─── Claves de localStorage ────────────────────────────────────
const SK_TOKEN = "sg_token";
const SK_NOMBRE = "sg_nombre";
const SK_USUARIO = "sg_usuario";
const SK_ROL = "sg_rol";
const SK_ID = "sg_id";

// ─── Getters ───────────────────────────────────────────────────
function getToken() { return localStorage.getItem(SK_TOKEN); }
function getNombre() { return localStorage.getItem(SK_NOMBRE); }
function getUsuario() { return localStorage.getItem(SK_USUARIO); }
function getRol() { return localStorage.getItem(SK_ROL); }
function getUserId() { return localStorage.getItem(SK_ID); }

// ─── Verificar sesión ─────────────────────────────────────────
/**
 * Si no hay token, redirige a login.html.
 * Debe llamarse al inicio de index.html.
 */
function requireAuth() {
    if (!getToken()) {
        window.location.replace("login.html");
    }
}

// ─── Cerrar sesión ────────────────────────────────────────────
function logout() {
    if (typeof chatDisconnect === 'function') chatDisconnect();
    [SK_TOKEN, SK_NOMBRE, SK_USUARIO, SK_ROL, SK_ID].forEach(k => localStorage.removeItem(k));
    window.location.replace("login.html");
}

// ─── Fetch autenticado ────────────────────────────────────────
/**
 * Igual que fetch() pero agrega Authorization: Bearer <token>.
 * Si el servidor responde 401/403, cierra sesión automáticamente.
 */
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Sesión expirada o sin permisos.");
    }

    return response;
}

// ─── Permisos por rol ─────────────────────────────────────────
/**
 * Devuelve true si el usuario actual puede acceder a la página indicada.
 * Las páginas no listadas están accesibles para todos los roles.
 */
const PAGINAS_POR_ROL = {
    visitantes: ["ADMINISTRADOR", "SECRETARIA"],
    alumnos: ["ADMINISTRADOR", "SECRETARIA"],
    registro: ["ADMINISTRADOR", "PORTERO", "SECRETARIA"],
    reports: ["ADMINISTRADOR", "SECRETARIA", "DIRECTOR"],
    usuarios: ["ADMINISTRADOR"],
    // dashboard y visits → todos los roles
};

function hasPermission(page) {
    const allowed = PAGINAS_POR_ROL[page];
    if (!allowed) return true; // sin restricción
    return allowed.includes(getRol());
}

// ─── Init: exponer datos del usuario en el sidebar ────────────
function initUserInfo() {
    const nombre = getNombre() || "Usuario";
    const rolStr = getRol() || "";

    const rolLabels = {
        ADMINISTRADOR: "Administrador",
        PORTERO: "Portero",
        SECRETARIA: "Secretaria",
        DIRECTOR: "Director",
        PROFESOR: "Profesor"
    };

    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    if (nameEl) nameEl.textContent = nombre;
    if (roleEl) roleEl.textContent = rolLabels[rolStr] || rolStr;
}
