-- ==============================================================================
-- 🚀 MIGRACIÓN A MULTI-TENANT (SaaS MULTI-COLEGIO) 🚀
-- Este script transforma tu base de datos actual para soportar múltiples
-- instituciones de forma segura. Aislará los datos para que un colegio no
-- pueda ver la información del otro.
-- ==============================================================================

-- 1️⃣ CREAR LA NUEVA TABLA MAESTRA DE INSTITUCIONES
CREATE TABLE IF NOT EXISTS public.instituciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    logo_url text,
    niveles text,
    informacion_adicional text,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en instituciones
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;

-- Por ahora, cualquier usuario logeado puede leer información de instituciones
-- (Necesario para que el perfil de usuario sepa el nombre del colegio)
CREATE POLICY "Lectura publica instituciones" ON public.instituciones
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2️⃣ MIGRAR LOS DATOS DE LA VIEJA TABLA 'configuracion'
-- Insertamos una institución por defecto (ViraSchool) para no romper el sistema
INSERT INTO public.instituciones (nombre, logo_url, niveles, informacion_adicional)
VALUES ('ViraSchool', 'https://cdn-icons-png.flaticon.com/512/3062/3062256.png', 'Inicial, Primaria, Secundaria', 'Sistema Multi-Colegio ViraSchool')
ON CONFLICT DO NOTHING;

-- Si había una configuración vieja customizada, intentamos copiarla
INSERT INTO public.instituciones (nombre, logo_url, niveles, informacion_adicional)
SELECT nombre_colegio, logo_url, niveles, informacion_adicional FROM public.configuracion
WHERE id = 1 AND nombre_colegio != 'SchoolGuard'
ON CONFLICT DO NOTHING;

-- A partir de ahora, la vieja tabla 'configuracion' ya NO se usa, pero la dejamos por si acaso.

-- 3️⃣ ASIGNAR INSTITUCIÓN A TODAS LAS TABLAS EXISTENTES
-- Como esto altera tablas en vivo, primero obtenemos el ID de la primera institución creada arriba
DO $$ 
DECLARE
  default_inst_id uuid;
BEGIN
  SELECT id INTO default_inst_id FROM public.instituciones LIMIT 1;

  -- 3.1: USUARIOS
  -- A los usuarios existentes los metemos al colegio "Defecto"
  ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS institucion_id uuid REFERENCES public.instituciones(id);
  UPDATE public.usuarios SET institucion_id = default_inst_id WHERE institucion_id IS NULL;
  ALTER TABLE public.usuarios ALTER COLUMN institucion_id SET NOT NULL;

  -- 3.2: VISITANTES
  ALTER TABLE public.visitantes ADD COLUMN IF NOT EXISTS institucion_id uuid REFERENCES public.instituciones(id);
  UPDATE public.visitantes SET institucion_id = default_inst_id WHERE institucion_id IS NULL;
  ALTER TABLE public.visitantes ALTER COLUMN institucion_id SET NOT NULL;

  -- 3.3: ALUMNOS
  ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS institucion_id uuid REFERENCES public.instituciones(id);
  UPDATE public.alumnos SET institucion_id = default_inst_id WHERE institucion_id IS NULL;
  ALTER TABLE public.alumnos ALTER COLUMN institucion_id SET NOT NULL;

  -- 3.4: VISITAS
  ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS institucion_id uuid REFERENCES public.instituciones(id);
  UPDATE public.visitas SET institucion_id = default_inst_id WHERE institucion_id IS NULL;
  ALTER TABLE public.visitas ALTER COLUMN institucion_id SET NOT NULL;
END $$;


-- 4️⃣ RE-ESCRIBIR LAS POLÍTICAS RLS (ROW LEVEL SECURITY)
-- Aquí es donde ocurre la magia: forzamos a nivel de Base de Datos que 
-- un usuario solo pueda leer o modificar filas que coincidan con su institucion_id.

-- Función auxiliar para obtener rápidamente la institucion del usuario actual (muy optimizada)
CREATE OR REPLACE FUNCTION public.get_user_institucion() 
RETURNS uuid AS $$
  SELECT institucion_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- 🛡️ POLÍTICAS PARA USUARIOS
DROP POLICY IF EXISTS "Los admin ven todos, resto solo a si mismo" ON public.usuarios;
CREATE POLICY "Acceso a usuarios de mi misma institucion"
ON public.usuarios
FOR SELECT USING (
  institucion_id = public.get_user_institucion()
);

DROP POLICY IF EXISTS "Solo administradores pueden crear/modificar" ON public.usuarios;
CREATE POLICY "Admins pueden modificar usuarios de su institucion"
ON public.usuarios
FOR ALL USING (
  institucion_id = public.get_user_institucion() 
  AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'ADMINISTRADOR'
);

-- 🛡️ POLÍTICAS PARA VISITANTES
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.visitantes;
CREATE POLICY "Lectura visitantes de mi institucion"
ON public.visitantes
FOR SELECT USING (institucion_id = public.get_user_institucion());

DROP POLICY IF EXISTS "Permitir inserción/edición a operativos" ON public.visitantes;
CREATE POLICY "Edicion visitantes de mi institucion"
ON public.visitantes
FOR ALL USING (institucion_id = public.get_user_institucion());

-- 🛡️ POLÍTICAS PARA ALUMNOS
DROP POLICY IF EXISTS "Lectura de alumnos" ON public.alumnos;
CREATE POLICY "Lectura alumnos de mi institucion"
ON public.alumnos
FOR SELECT USING (institucion_id = public.get_user_institucion());

DROP POLICY IF EXISTS "Edicion de alumnos" ON public.alumnos;
CREATE POLICY "Edicion alumnos de mi institucion"
ON public.alumnos
FOR ALL USING (institucion_id = public.get_user_institucion());

-- 🛡️ POLÍTICAS PARA VISITAS
DROP POLICY IF EXISTS "Lectura de visitas" ON public.visitas;
CREATE POLICY "Lectura visitas de mi institucion"
ON public.visitas
FOR SELECT USING (institucion_id = public.get_user_institucion());

DROP POLICY IF EXISTS "Insercion/Edicion de visitas" ON public.visitas;
CREATE POLICY "Edicion visitas de mi institucion"
ON public.visitas
FOR ALL USING (institucion_id = public.get_user_institucion());


-- 5️⃣ POLÍTICAS DE EDICIÓN DE INSTITUCIÓN (CONFIGURACIÓN)
-- Solo los ADMINISTRADORES pueden cambiar el logo y nombre de SU propia institución
CREATE POLICY "Admins editan su institucion" ON public.instituciones
    FOR UPDATE USING (
        id = public.get_user_institucion()
        AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'ADMINISTRADOR'
    );
