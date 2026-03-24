/**
 * SchoolGuard - Visitor Management System
 * JavaScript Principal para el Sistema de Registro de Visitas
 */

// ========================================
// Datos Iniciales y Estado de la Aplicación
// ========================================
 
// Datos de ejemplo para el sistema
 

// Personal del colegio para autocompletar (ahora se traen de Supabase)
let visitors = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortColumn = 'created_at';
let sortDirection = 'desc';
let editingId = null;

// ========================================
// Inicialización de la Aplicación
// ========================================

// Esperar a que loader.js termine de insertar todos los componentes en el DOM
document.addEventListener('componentsLoaded', () => {
    initializeApp();
});


function initializeApp() {
    // Cargar datos de visitas desde Supabase
    loadVisitors();

    // Actualizar fecha actual
    updateCurrentDate();

    // Configurar fecha del formulario
    setDefaultDate();

    // Renderizar tabla
    renderTable();

    // Actualizar estadísticas
    updateStats();

    // Configurar navegación
    setupNavigation();

    // Configurar eventos del sidebar
    setupSidebarToggle();

    // Poblar nombre/rol del usuario y ocultar ítems sin permiso
    setupSidebarUI();

    // Conectar WebSocket de mensajería
    if (typeof chatConnect === 'function') chatConnect();

    // Configurar validación de formularios
    setupFormValidation();
}

/**
 * Llena el nombre/rol del usuario logueado en el sidebar footer
 * y oculta los ítems de nav que el rol actual no puede ver.
 * Se ejecuta después de que loader.js haya inyectado sidebar.html en el DOM.
 *
 * Obtiene el perfil UNA sola vez y lo reutiliza para: nombre/rol en sidebar,
 * filtrado de menú, y carga de config/logo del colegio.
 */
async function setupSidebarUI() {
    // 1. Obtener el perfil UNA sola vez (con caché en auth.js)
    let profile = null;
    if (typeof getUserProfile === 'function') {
        try {
            profile = await getUserProfile();
        } catch (e) {
            console.error('setupSidebarUI: error al obtener perfil', e);
        }
    }

    // 2. Rellenar nombre y rol en el footer del sidebar (sin re-consultar)
    if (typeof initUserInfo === 'function') {
        await initUserInfo(profile);
    }

    // 3. Cargar config/logo pasando el institucionId ya conocido para no re-consultar
    if (typeof ConfigService !== 'undefined') {
        const instId = profile ? profile.institucion_id : null;
        const config = await ConfigService.getConfig(instId);
        ConfigService.applyConfigToUI(config);
    }

    // 4. Filtrar ítems del menú según el rol (datos ya en memoria)
    const rol = profile ? profile.rol : null;
    if (!rol) return;

    document.querySelectorAll('.nav-item[data-roles]').forEach(li => {
        const allowed = li.dataset.roles.split(',');
        if (!allowed.includes(rol)) {
            li.style.display = 'none';
        }
    });
}


// Cargar visitantes desde la API (con fallback a datos iniciales si el backend no responde)
async function loadVisitors() {
    try {
        const { data, error } = await supabaseClient
            .from('visitas')
            .select('*, usuario:usuarios(*)')
            .order('hora_ingreso', { ascending: false });

        if (error) throw error;
        visitors = data;
    } catch (error) {
        console.error("Error cargando visitas:", error);
        visitors = [];
    } finally {
        renderTable();
        updateStats();
    }
}

// Guardar visitantes en localStorage
function saveVisitors() {
    localStorage.setItem('schoolVisitors', JSON.stringify(visitors));
}

// Actualizar fecha actual en el header

function updateCurrentDate() {

    const element = document.getElementById("currentDate");

    if (!element) return; // evita el error

    const now = new Date();

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    element.textContent = now.toLocaleDateString('es-ES', options);

}


// Establecer fecha por defecto en el formulario
function setDefaultDate() {

    const now = new Date();

    const today = now.toISOString().split('T')[0];

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const dateInput = document.getElementById('visitDate');
    const timeInput = document.getElementById('visitTime');

    if (dateInput) {
        dateInput.value = today;
    }

    if (timeInput) {
        timeInput.value = `${hours}:${minutes}`;
    }
}

const now = new Date();
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
if (document.getElementById('visitTime')) {
    document.getElementById('visitTime').value = `${hours}:${minutes}`;
}

// ========================================
// Navegación
// ========================================

function setupNavigation() {
    // La navegación real (fetch de HTML) la hace router.js al escuchar 'hashchange'.
    // Aquí solo sincronizamos la UI (clase active en el sidebar, título, etc.)
    window.addEventListener('hashchange', () => {
        const page = location.hash.replace("#", "") || "dashboard";
        updateNavUI(page);
    });

    // Estado inicial
    const initialPage = location.hash.replace("#", "") || "dashboard";
    updateNavUI(initialPage);
}

function updateNavUI(page) {
    // Actualizar clase 'active' en el sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Actualizar título en el header
    const pageTitles = {
        'dashboard':    'Dashboard',
        'visits':       'Historial de Visitas',
        'registro':     'Registrar Visita',
        'visitantes':   'Visitantes',
        'alumnos':      'Alumnos',
        'personal':     'Personal',
        'asistencia':   'Registro Diario',
        'reports':      'Reportes',
        'mensajes':     'Mensajes',
        'usuarios':     'Usuarios',
        'configuracion': 'Configuración',
    };
    const label = pageTitles[page] || page;
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = label;

    // Actualizar título en el topbar mobile
    const mobileTitleEl = document.getElementById('mobilePageTitle');
    if (mobileTitleEl) mobileTitleEl.textContent = label;

    // Cerrar sidebar drawer en mobile al navegar
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();

    // Datos por página
    if (page === 'dashboard' || page === 'visits') {
        if (page === 'dashboard' && typeof ConfigService !== 'undefined') {
            ConfigService.getConfig().then(c => {
                const titleEl = document.getElementById('pageTitle');
                if (titleEl) titleEl.textContent = c.nombre_colegio || 'Dashboard';
            });
        }
        if (typeof renderTable === 'function') {
            renderTable();
        }
        if (typeof updateStats === 'function') {
            updateStats();
        }
    }
}

// Para navegación programática desde JS
function navigateTo(page) {
    location.hash = page;
}

// Toggle del sidebar — colapsar en desktop
function setupSidebarToggle() {
    // Restaurar estado guardado al cargar
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        setTimeout(() => {
            document.querySelector('.sidebar')?.classList.add('collapsed');
            document.querySelector('.main-content')?.classList.add('sidebar-collapsed');
        }, 50);
    }

    document.body.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#sidebarToggle');
        if (toggleBtn) {
            e.stopPropagation();
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');

            if (sidebar) sidebar.classList.toggle('collapsed');
            if (mainContent) mainContent.classList.toggle('sidebar-collapsed');

            localStorage.setItem('sidebarCollapsed', sidebar?.classList.contains('collapsed'));
        }
    });
}

// Toggle del sidebar en mobile — drawer deslizante
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active', isOpen);
}

// Cerrar sidebar mobile al navegar
function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
}


// ========================================
// Tabla de Visitas
// ========================================
//aqui emp



async function renderTable() {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const enDashboard = (location.hash === '' || location.hash === '#dashboard');

    let filteredVisitors = visitors.filter(v => {
        const status = v.estado_registro || '';
        const nombre = (v.nombre_visitante || '').toLowerCase();
        const documento = (v.dni_visitante || '').toLowerCase();
        const persona = (v.usuario?.nombre || '').toLowerCase();
        const motivo = (v.motivo || '').toLowerCase();

        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        const matchesSearch = nombre.includes(searchTerm) || documento.includes(searchTerm) || 
                             persona.includes(searchTerm) || motivo.includes(searchTerm);
        const matchesDate = enDashboard ? (v.hora_ingreso || '').startsWith(todayStr) : true;

        return matchesStatus && matchesSearch && matchesDate;
    });

    const recordsCountEl = document.getElementById('recordsCount');
    if (recordsCountEl) {
        recordsCountEl.textContent = `${filteredVisitors.length} ${enDashboard ? 'hoy' : 'registros'}`;
    }

    if (filteredVisitors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay registros</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredVisitors.map(v => `
        <tr>
            <td>${v.id}</td>
            <td>${v.nombre_visitante}</td>
            <td>${v.dni_visitante}</td>
            <td>${v.motivo || ''}</td>
            <td>${v.usuario?.nombre || '—'}</td>
            <td>${v.hora_ingreso ? new Date(v.hora_ingreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</td>
            <td><span class="status-badge ${v.estado_registro === 'REGISTRADO' ? 'active' : 'finished'}">${v.estado_registro}</span></td>
            <td>
                <div class="action-buttons">
                    ${v.estado_registro === 'REGISTRADO' ? `
                        <button class="btn-action checkout" onclick="checkoutVisitor('${v.id}')" title="Check-out">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action edit" onclick="editVisitor('${v.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action view" onclick="viewVisitor('${v.id}')" title="Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

//aqui term

function renderPagination(totalPages, totalItems) {
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Botón anterior
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Números de página
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 8px;">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 8px;">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Botón siguiente
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
}

// Ordenar tabla
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    renderTable();
}

// Buscar visitantes
function searchVisitors() {
    currentPage = 1;
    renderTable();
}

// Filtrar por estado
function filterByStatus(status) {
    if (document.getElementById('filterStatus')) {
        document.getElementById('filterStatus').value = status;


    }
    currentPage = 1;
    renderTable();

    filteredVisitors = visitors.filter(v => {
        console.log(v.estadoRegistro);
        return v.estadoRegistro === status;
    });
}

// ========================================
// Registro de Visitas
// ========================================

function registerVisit(event) {
    event.preventDefault();

    const form = document.getElementById('registerForm');

    // Validar formulario
    if (!validateForm(form)) {
        showToast('Por favor, complete todos los campos requeridos', 'error');
        return;
    }

    // Crear objeto del visitante
    const visitor = {
        id: generateId(),
        nombre: document.getElementById('visitorName').value.trim(),
        documentType: document.getElementById('documentType').value,
        documento: document.getElementById('documentNumber').value.trim(),
        fecha: document.getElementById('visitDate').value,
        hora_entrada: document.getElementById('visitTime').value,
        motivo: document.getElementById('visitReason').value,
        persona_visitada: document.getElementById('personVisited').value.trim(),
        department: document.getElementById('department').value,
        notes: document.getElementById('additionalNotes').value.trim(),
        timeOut: '',
        status: 'active'
    };

    // Agregar visitante
    visitors.unshift(visitor);
    saveVisitors();

    // Mostrar toast de éxito
    showToast(`¡${visitor.name} ha sido registrado exitosamente!`, 'success');

    // Resetear formulario
    resetForm();

    // Ir al dashboard
    navigateTo('dashboard');
    renderTable();
    updateStats();
}

// Registro rápido desde modal
async function quickRegister(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('quickName').value.trim();
    const documento = document.getElementById('quickDocument').value.trim();
    const motivo = document.getElementById('quickReason').value;
    const persona = document.getElementById('quickPerson').value.trim();
    const usuarioId = document.getElementById('usuarioId').value;

    if (!nombre || !documento || !motivo || !persona || !usuarioId) {
        showToast('Complete todos los campos', 'warning');
        return;
    }

    const now = new Date().toISOString();
    const visitData = {
        dni_visitante: documento,
        nombre_visitante: nombre,
        motivo: motivo,
        hora_ingreso: now,
        usuario_id: usuarioId,
        estado_registro: "REGISTRADO"
    };

    let profile = null;
    if (typeof getUserProfile === 'function') profile = await getUserProfile();
    if (profile && profile.institucion_id) visitData.institucion_id = profile.institucion_id;

    try {
        const { error } = await supabaseClient.from('visitas').insert([visitData]);
        if (error) throw error;

        closeRegisterModal();
        showToast(`${nombre} registrado`, 'success');
        loadVisitors();
    } catch (error) {
        console.error("Error:", error);
        showToast('Error al registrar', 'error');
    }
}

// Resetear formulario
function resetForm() {
    const form = document.getElementById('registerForm');
    form.reset();
    setDefaultDate();

    // Limpiar mensajes de error
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error');
    });
}

// Editar visitante
function editVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;

    // Almacenar el objeto completo para que registro.js pueda pre-llenar todos los campos
    sessionStorage.setItem('editVisitorData', JSON.stringify(visitor));

    // Ir a sección de registro
    navigateTo('registro');
}

// Ver detalles del visitante
function viewVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;

    const nombre = visitor.nombreVisitante || visitor.nombre || visitor.name;
    const documento = visitor.dniVisitante || visitor.documento || visitor.document;
    const fecha = visitor.fecha || visitor.date;
    const ingreso = visitor.horaIngreso || visitor.hora_entrada || visitor.timeIn;
    const salida = visitor.horaSalida || visitor.hora_salida || visitor.timeOut;
    const motivo = visitor.motivo || visitor.reason;
    const persona = (visitor.usuario ? visitor.usuario.nombre : visitor.persona_visitada) || visitor.person;
    const estado = visitor.estadoRegistro || visitor.status || visitor.estado;

    const message = `
        <div style="text-align: left; line-height: 1.8;">
            <p><strong>ID:</strong> ${visitor.id}</p>
            <p><strong>Nombre:</strong> ${escapeHtml(nombre || '')}</p>
            <p><strong>Documento:</strong> ${visitor.documentType || 'DNI'}: ${escapeHtml(documento || '')}</p>
            <p><strong>Fecha:</strong> ${fecha ? formatDate(fecha) : ''}</p>
            <p><strong>Entrada:</strong> ${ingreso || ''}</p>
            <p><strong>Salida:</strong> ${salida || 'En curso'}</p>
            <p><strong>Motivo:</strong> ${escapeHtml(motivo || '')}</p>
            <p><strong>Persona visitada:</strong> ${escapeHtml(persona || '')}</p>
            <p><strong>Departamento:</strong> ${visitor.department || 'N/A'}</p>
            <p><strong>Vehicle:</strong> ${visitor.vehiclePlate || 'N/A'}</p>
            <p><strong>Notas:</strong> ${visitor.notes || 'Sin notas'}</p>
            <p><strong>Estado:</strong> ${estado === 'active' || estado === '1' ? 'Activo' : estado}</p>
        </div>
    `;

    showConfirmModal('Detalles del Visitante', message, 'Cerrar', null, false);
}

// Check-out de visitante
async function checkoutVisitor(id) {
    const visitor = visitors.find(v => v.id == id);
    if (!visitor) return;

    if (!confirm(`¿Registrar salida de ${visitor.nombre_visitante}?`)) return;

    const now = new Date().toISOString();
    try {
        const { error } = await supabaseClient
            .from('visitas')
            .update({ 
                hora_salida: now, 
                estado_registro: 'FINALIZADO' 
            })
            .eq('id', id);

        if (error) throw error;
        showToast("Salida registrada", "success");
        loadVisitors();
    } catch (error) {
        showToast("Error", "error");
    }
}

// ========================================
// Modales
// ========================================

// showRegisterModal definido más abajo junto al autocomplete de usuarios



function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('active');
    document.getElementById('quickRegisterForm').reset();
}

function showConfirmModal(title, message, cancelText, confirmAction, showConfirm = true) {
    const modal = document.getElementById('confirmModal');

    document.querySelector('#confirmModal .modal-header h3').innerHTML =
        `<i class="fas fa-question-circle"></i> ${title}`;
    document.getElementById('confirmMessage').innerHTML = message;

    const cancelBtn = modal.querySelector('.btn-cancel');
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.getElementById('confirmBtn');
    if (showConfirm && confirmAction) {
        confirmBtn.style.display = 'block';
        confirmBtn.onclick = () => {
            confirmAction();
            closeConfirmModal();
        };
    } else {
        confirmBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// ========================================
// Estadísticas
// ========================================

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = visitors.filter(v => (v.hora_ingreso || '').startsWith(today));

    const activeCount = todayVisitors.filter(v => v.estado_registro === 'REGISTRADO').length;
    const finishedCount = todayVisitors.filter(v => v.estado_registro === 'FINALIZADO').length;

    if (document.getElementById("activeVisitors")) document.getElementById("activeVisitors").textContent = activeCount;
    if (document.getElementById('todayVisits')) document.getElementById('todayVisits').textContent = todayVisitors.length;
    if (document.getElementById('checkedOut')) document.getElementById('checkedOut').textContent = finishedCount;
}

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }
    return days;
}

// ========================================
// Reportes
// ========================================

function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let filteredVisitors = [...visitors];

    if (startDate) {
        filteredVisitors = filteredVisitors.filter(v => v.date >= startDate);
    }

    if (endDate) {
        filteredVisitors = filteredVisitors.filter(v => v.date <= endDate);
    }

    // Actualizar resumen
    document.getElementById('totalVisitsReport').textContent = filteredVisitors.length;
    document.getElementById('activeVisitsReport').textContent =
        filteredVisitors.filter(v => v.estadoRegistro === 'REGISTRADO').length;

    // Motivo más común
    const reasonCounts = {};
    filteredVisitors.forEach(v => {
        reasonCounts[v.reason] = (reasonCounts[v.reason] || 0) + 1;
    });

    const topReason = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])[0];

    document.getElementById('topReason').textContent = topReason ? topReason[0] : 'N/A';

    showToast('Reporte generado exitosamente', 'success');
}

function exportReport(format) {
    showToast(`Exportando reporte en formato ${format.toUpperCase()}...`, 'info');
    // Aquí se implementaría la lógica real de exportación
}

function printReport() {
    window.print();
    showToast('Preparando impresión...', 'info');
}

// ========================================
// Utilidades
// ========================================

function generateId() {
    const maxId = visitors.length > 0 ? Math.max(...visitors.map(v => v.id)) : 0;
    return maxId + 1;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function validateForm(form) {
    let isValid = true;

    form.querySelectorAll('[required]').forEach(field => {
        const formGroup = field.closest('.form-group');

        if (!field.value.trim()) {
            formGroup.classList.add('error');
            isValid = false;
        } else {
            formGroup.classList.remove('error');
        }
    });

    return isValid;
}

function setupFormValidation() {
    // Validación en tiempo real
    document.querySelectorAll('.visit-form input[required], .visit-form select[required]').forEach(field => {
        field.addEventListener('blur', () => {
            const formGroup = field.closest('.form-group');

            if (!field.value.trim()) {
                formGroup.classList.add('error');
            } else {
                formGroup.classList.remove('error');
            }
        });

        field.addEventListener('input', () => {
            const formGroup = field.closest('.form-group');
            if (field.value.trim()) {
                formGroup.classList.remove('error');
            }
        });
    });
}

// Autocompletar para persona visitada
const personInput = document.getElementById('personVisited');
if (personInput) {
    personInput.addEventListener('input', function () {
        // Aquí se podría implementar autocompletado más sofisticado
    });
}

// Inicializar fechas en reportes
const today = new Date().toISOString().split('T')[0];
const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
const lastWeekStr = lastWeek.toISOString().split('T')[0];

if (document.getElementById('startDate')) {
    document.getElementById('startDate').value = lastWeekStr;
}
if (document.getElementById('endDate')) {
    document.getElementById('endDate').value = today;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N para nueva visita
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showRegisterModal();
    }

    // Escape para cerrar modales
    if (e.key === 'Escape') {
        closeRegisterModal();
        closeConfirmModal();
    }
});

// Buscar usuarios — el elemento vive dentro del modal (cargado async), por eso se inicializa con un delay
function setupUsuarioAutocomplete() {
    const inputUsuario = document.getElementById("quickPerson");
    const suggestionsBox = document.getElementById("suggestions");
    const usuarioIdInput = document.getElementById("usuarioId");

    if (!inputUsuario || !suggestionsBox) return;

    inputUsuario.addEventListener("input", async function () {
        const texto = inputUsuario.value.trim();
        if (texto.length < 2) {
            suggestionsBox.innerHTML = "";
            return;
        }

        try {
            const { data: usuarios, error } = await supabaseClient
                .from('usuarios')
                .select('id, nombre')
                .ilike('nombre', `%${texto}%`)
                .limit(5);

            if (error) throw error;

            suggestionsBox.innerHTML = "";
            usuarios.forEach(u => {
                const div = document.createElement("div");
                div.className = "suggestion-item";
                div.textContent = u.nombre;
                div.onclick = () => {
                    inputUsuario.value = u.nombre;
                    if (usuarioIdInput) usuarioIdInput.value = u.id;
                    suggestionsBox.innerHTML = "";
                };
                suggestionsBox.appendChild(div);
            });
        } catch (error) {
            console.error("Error:", error);
        }
    });
}

// Se llama al abrir el modal (cuando el DOM del modal ya existe)
function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (!modal) return;
    modal.classList.add('active');
    setupUsuarioAutocomplete(); // inicializar autocomplete aquí, no en el arranque
    const quickName = document.getElementById('quickName');
    if (quickName) quickName.focus();
}

// Console log para debugging
console.log('SchoolGuard Visitor Management System initialized');
console.log(`Total visitors: ${visitors.length}`);
console.log('Press Ctrl+N for quick registration');
