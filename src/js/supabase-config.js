// Inicializar configuración basada en variables del .env extraídas
const supabaseUrl = (window.ENV && window.ENV.VITE_SUPABASE_URL) || 'URL_NO_CONFIGURADA';
const supabaseKey = (window.ENV && window.ENV.VITE_SUPABASE_KEY) || 'KEY_NO_CONFIGURADA';

const { createClient } = supabase;
window.supabaseClient = createClient(supabaseUrl, supabaseKey);
