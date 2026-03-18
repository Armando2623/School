-- Script para crear la tabla de configuración en Supabase

CREATE TABLE public.configuracion (
    id smallint PRIMARY KEY DEFAULT 1,
    nombre_colegio text NOT NULL DEFAULT 'SchoolGuard',
    logo_url text,
    niveles text,
    informacion_adicional text,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insertar el registro inicial por defecto
INSERT INTO public.configuracion (id, nombre_colegio, logo_url, niveles, informacion_adicional)
VALUES (
    1, 
    'SchoolGuard', 
    'https://cdn-icons-png.flaticon.com/512/3062/3062256.png', 
    'Inicial, Primaria, Secundaria', 
    'Sistema de registro de visitas escolares'
) ON CONFLICT (id) DO NOTHING;

-- Configuracion de políticas de seguridad (RLS)
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a cualquier usuario autenticado (e incluso anónimo para el login)
CREATE POLICY "Permitir lectura publica" ON public.configuracion
    FOR SELECT USING (true);

-- Permitir actualización solo a administradores o usuarios autenticados
CREATE POLICY "Permitir actualizacion a usuarios autenticados" ON public.configuracion
    FOR UPDATE USING (auth.role() = 'authenticated');
