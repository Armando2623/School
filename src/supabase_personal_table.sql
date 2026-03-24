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

-- 1. Lectura: cualquier usuario autenticado de la misma institución puede leer
DROP POLICY IF EXISTS "Lectura personal de mi institucion" ON public.personal;
CREATE POLICY "Lectura personal de mi institucion"
ON public.personal FOR SELECT
USING (institucion_id = public.get_user_institucion());

-- 2. Inserción: verifica la fila NUEVA (WITH CHECK) — evita el bug de FOR ALL
DROP POLICY IF EXISTS "Insertar personal de mi institucion" ON public.personal;
DROP POLICY IF EXISTS "Gestion personal de mi institucion" ON public.personal;
CREATE POLICY "Insertar personal de mi institucion"
ON public.personal FOR INSERT
WITH CHECK (
    institucion_id = public.get_user_institucion()
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid())
        IN ('ADMINISTRADOR', 'SECRETARIA')
);

-- 3. Edición/Eliminación: solo ADMIN y SECRETARIA de la misma institución
CREATE POLICY "Modificar personal de mi institucion"
ON public.personal FOR UPDATE
USING (institucion_id = public.get_user_institucion())
WITH CHECK (
    institucion_id = public.get_user_institucion()
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid())
        IN ('ADMINISTRADOR', 'SECRETARIA')
);

CREATE POLICY "Eliminar personal de mi institucion"
ON public.personal FOR DELETE
USING (
    institucion_id = public.get_user_institucion()
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid())
        IN ('ADMINISTRADOR', 'SECRETARIA')
);
