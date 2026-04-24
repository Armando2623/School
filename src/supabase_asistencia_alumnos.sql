-- ==============================================================================
-- 🎓 ASISTENCIA DE ALUMNOS — Tabla y políticas RLS
-- Registra la asistencia diaria de los alumnos (separada de 'asistencias' del personal).
-- El código QR de cada alumno codifica su ID numérico.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.asistencia_alumnos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id   integer  NOT NULL REFERENCES public.alumnos(id)      ON DELETE CASCADE,
    institucion_id uuid  NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
    fecha       date     NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada time,
    estado      text     NOT NULL DEFAULT 'PRESENTE',
    -- Estados: PRESENTE | FALTA | TARDANZA | JUSTIFICADO
    observaciones text,
    registrado_por uuid REFERENCES public.usuarios(id),
    created_at  timestamptz DEFAULT now(),

    -- Un alumno solo puede tener un registro por día
    UNIQUE (alumno_id, fecha)
);

-- Habilitar RLS
ALTER TABLE public.asistencia_alumnos ENABLE ROW LEVEL SECURITY;

-- Política de lectura: solo la institución del usuario
CREATE POLICY "asist_alumnos_select"
ON public.asistencia_alumnos
FOR SELECT
USING (institucion_id = public.get_user_institucion());

-- Política de escritura/edición: solo la institución del usuario
CREATE POLICY "asist_alumnos_all"
ON public.asistencia_alumnos
FOR ALL
USING (institucion_id = public.get_user_institucion());
