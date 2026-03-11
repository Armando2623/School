# SchoolGuard - Sistema de Registro de Visitas Escolares (Frontend)

¡Bienvenido al repositorio frontend de **SchoolGuard**! Este proyecto es la interfaz de usuario web diseñada para gestionar el registro y control de visitas a instituciones educativas. Está construido de manera ligera y rápida utilizando tecnologías web estándar.

##  Características Principales

El frontend está estructurado en diferentes módulos para administrar integralmente la seguridad y acceso en la escuela:

- **Dashboard**: Panel principal con resumen de la actividad.
- **Registro de Visitas**: Interfaz para registrar entradas y salidas de visitantes en el plantel de forma rápida (`registro.html` / `visits.html`).
- **Gestión de Visitantes**: Módulo para listar, agregar y administrar a los visitantes recurrentes (`visitantes.html`).
- **Gestión de Alumnos**: Panel para el control e información de los estudiantes de la institución (`alumnos.html`).
- **Gestión de Usuarios**: Módulo administrativo para que el personal gestione los accesos al sistema (`usuarios.html`).
- **Reportes**: Interfaz para auditar registros e historial de visitas (`reports.html`).
- **Mensajería**: Interfaz web de chat/mensajes integrada en el sistema (`mensajes.html`).

## 🛠️ Tecnologías Utilizadas

Este proyecto web está desarrollado sin frameworks pesados, enfocado en rendimiento y simplicidad:

- **HTML5**: Estructuración semántica de las páginas.
- **CSS3**: Estilos personalizados, diseño responsivo y sistema de modales (ubicado en `src/css`).
- **JavaScript (Vanilla)**: Lógica de cliente, enrutamiento ligero (`router.js`), autenticación (`auth.js`), e interacciones DOM en cada página de forma modularizada (`src/js/`).
- **Node.js (NPM)**: Herramienta empleada exclusivamente para scripts de desarrollo y empaquetado.

## 📁 Estructura del Proyecto

```text
📦 school-visit-registration
 ┣ 📂 src
 ┃  ┣ 📂 components   (Componentes de interfaz reusables - Navbar, Sidebar)
 ┃  ┣ 📂 css          (Hojas de estilo - styles.css)
 ┃  ┣ 📂 js           (Lógica principal y controladores por página)
 ┃  ┣ 📂 modals       (Plantillas de ventanas emergentes)
 ┃  ┣ 📂 pages        (Vistas principales: alumnos, visitantes, dashboard, etc.)
 ┃  ┗ 📜 index.html   (Punto de entrada principal)
 ┣ 📜 login.html      (Página de autenticación)
 ┣ 📜 package.json    (Dependencias y scripts NPM)
 ┗ 📜 README.md       (Este archivo)
```

##  Guía de Instalación y Uso Local

Para levantar este proyecto en tu entorno de desarrollo local, sigue estos pasos:

### 1. Requisitos Previos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) en tu máquina, ya que se utiliza `npx` para servir los archivos locales.

### 2. Instalación y Ejecución
1. Abre tu terminal y navega directamente a la carpeta del proyecto:
   ```bash
   cd school-visit-registration
   ```
2. Ejecuta el servidor de desarrollo utilizando el script predeterminado:
   ```bash
   npm run dev
   ```
   *(Este comando ejecuta internamente `npx serve src`)*

3. Abre tu navegador e ingresa a `http://localhost:3000` (o el puerto que te indique la terminal) para ver la aplicación corriendo.

### 3. Generar Build para Producción
Si necesitas copiar los archivos para despliegue:
```bash
npm run build
```

---

## Autor

Proyecto mantenido por **SchoolGuard** (Armando2623 / [Armando Ortiz Vegas]).

## Licencia

Este proyecto está distribuido bajo la licencia [MIT](https://choosealicense.com/licenses/mit/).
