// ============================================================
// supabase-config.js — Configuración de Supabase
// ============================================================

// TODO: Reemplaza estas con tus credenciales de Supabase
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';

// Inicializar el cliente globalmente
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar/Exponer para el resto de scripts
window.supabaseClient = _supabase;
