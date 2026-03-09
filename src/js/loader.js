/**
 * loader.js
 * Carga componentes HTML de forma asíncrona.
 * Despacha el evento global "componentsLoaded" cuando todos terminan,
 * para que app.js pueda inicializarse de forma segura.
 */

function loadComponent(id, file) {
  return fetch(file)
    .then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${file}: ${r.status}`);
      return r.text();
    })
    .then(html => {
      const container = document.getElementById(id);
      if (container) container.innerHTML = html;
    })
    .catch(err => console.error(err));
}

// Cargar todos los componentes en paralelo y avisar cuando estén listos
Promise.all([
  loadComponent("sidebar", "components/sidebar.html"),
  loadComponent("header", "components/header.html"),
  loadComponent("registerModalContainer", "modals/registerModal.html"),
  loadComponent("confirmModalContainer", "modals/confirmModal.html"),
  loadComponent("toastContainerWrapper", "modals/toast.html"),
]).then(() => {
  // Todos los componentes están en el DOM → inicializar la app
  document.dispatchEvent(new Event("componentsLoaded"));
});
