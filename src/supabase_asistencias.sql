-- ==============================================================================
-- ⌚ MÓDULO DE ASISTENCIA DIARIA (REGISTRO DIARIO) ⌚
-- Este script crea la tabla para registrar la entrada y salida del personal,
-- con soporte multi-tenant (aislado por institución).
-- ==============================================================================

CREATE TABLE public.asistencias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    institucion_id uuid NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada time without time zone,
    hora_salida time without time zone,
    estado text NOT NULL DEFAULT 'PRESENTE', -- PRESENTE, TARDANZA, FALTA, PERMISO
    notas text,
    created_at timestamp with time zone DEFAULT now(),
    -- Restricción para asegurar que un usuario solo tenga un registro de asistencia por día
    UNIQUE (usuario_id, fecha)
);

-- Habilitar RLS
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- 🛡️ POLÍTICAS RLS (Usando la función get_user_institucion() segura que creamos antes)
-- Lectura: Solo pueden ver asistencias de su propia institución
CREATE POLICY "Lectura asistencias de mi institucion"
ON public.asistencias
FOR SELECT USING (institucion_id = public.get_user_institucion());

-- Inserción/Edición: Solo pueden modificar personal de su institución
CREATE POLICY "Edicion asistencias de mi institucion"
ON public.asistencias
FOR ALL USING (institucion_id = public.get_user_institucion());
