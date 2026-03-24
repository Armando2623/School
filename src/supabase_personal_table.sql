-- ============================================================
-- Tabla: personal
-- Trabajadores/empleados del colegio (NO son usuarios del sistema).
-- Ejecutar este script en el SQL Editor de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personal (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text NOT NULL,
    cargo       text NOT NULL,
    dni         text,
    telefono    text,
    email       text,
    institucion_id uuid NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
    created_at  timestamp with time zone DEFAULT now()
);

-- Índice para acelerar búsquedas por institución
CREATE INDEX IF NOT EXISTS idx_personal_institucion ON public.personal(institucion_id);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

-- Solo los usuarios de la misma institución pueden ver el personal
CREATE POLICY "Lectura personal de mi institucion"
ON public.personal
FOR SELECT USING (
    institucion_id = public.get_user_institucion()
);

-- Solo ADMINISTRADOR y SECRETARIA pueden crear/editar/eliminar
CREATE POLICY "Gestion personal de mi institucion"
ON public.personal
FOR ALL USING (
    institucion_id = public.get_user_institucion()
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid())
        IN ('ADMINISTRADOR', 'SECRETARIA')
);
