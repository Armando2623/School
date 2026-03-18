-- ==============================================================================
-- 🛠️ PARCHE RLS (ROW LEVEL SECURITY) - INFINITE RECURSION FIX 🛠️
-- Este script soluciona el error 500 provocado por un bucle infinito
-- en las verificaciones de seguridad de Supabase.
-- ==============================================================================

-- 1️⃣ FUNCIONES SEGURAS (SECURITY DEFINER)
-- Al usar plpgsql y SECURITY DEFINER, le decimos a Postgres que ejecute estas
-- sub-consultas con permisos de administrador, evadiendo las reglas RLS
-- temporalmente solo para saber quién es el usuario y a qué colegio pertenece.

CREATE OR REPLACE FUNCTION public.get_user_institucion() 
RETURNS uuid AS $$
DECLARE
  inst_id uuid;
BEGIN
  SELECT institucion_id INTO inst_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
  RETURN inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_rol() 
RETURNS text AS $$
DECLARE
  u_rol text;
BEGIN
  SELECT rol INTO u_rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
  RETURN u_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2️⃣ ACTUALIZAR POLÍTICAS DE USUARIOS
DROP POLICY IF EXISTS "Acceso a usuarios de mi misma institucion" ON public.usuarios;
DROP POLICY IF EXISTS "Admins pueden modificar usuarios de su institucion" ON public.usuarios;
DROP POLICY IF EXISTS "Los admin ven todos, resto solo a si mismo" ON public.usuarios;
DROP POLICY IF EXISTS "Solo administradores pueden crear/modificar" ON public.usuarios;


CREATE POLICY "Acceso a usuarios de mi misma institucion"
ON public.usuarios
FOR SELECT USING (
  -- Puede verse a sí mismo SIEMPRE, o puede ver a los de su colegio
  id = auth.uid() OR institucion_id = public.get_user_institucion()
);

CREATE POLICY "Admins pueden modificar usuarios de su institucion"
ON public.usuarios
FOR ALL USING (
  institucion_id = public.get_user_institucion() 
  AND public.get_user_rol() = 'ADMINISTRADOR'
);

-- 3️⃣ ACTUALIZAR POLÍTICAS DE INSTITUCIONES
DROP POLICY IF EXISTS "Admins editan su institucion" ON public.instituciones;
CREATE POLICY "Admins editan su institucion" ON public.instituciones
FOR UPDATE USING (
    id = public.get_user_institucion()
    AND public.get_user_rol() = 'ADMINISTRADOR'
);
