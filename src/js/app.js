/**
 * SchoolGuard - Visitor Management System
 * JavaScript Principal para el Sistema de Registro de Visitas
 */

// ========================================
// Datos Iniciales y Estado de la Aplicación
// ========================================
async function loadVisits() {
    const res = await fetch("/api/visita");
    const data = await res.json();

    const tbody = document.getElementById("visitsTable");
    tbody.innerHTML = "";

    data.forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td>${v.id}</td>
                <td>${v.nombre}</td>
                <td>${v.documento}</td>
                <td>${v.persona_visitada}</td>
                <td>${v.fecha}</td>
                <td>${v.hora_entrada}</td>
                <td>
                    <button onclick="deleteVisit(${v.id})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
}
// Datos de ejemplo para el sistema
const initialVisitors = [
    {
        id: 1,
        name: "María Elena Rodríguez",
        documentType: "DNI",
        document: "12345678A",
        reason: "Reunión Padres",
        person: "Prof. Juan Martínez",
        department: "Secretaría",
        date: "2026-01-14",
        timeIn: "08:15",
        timeOut: "",
        status: "active",
        vehiclePlate: "ABC-1234",
        notes: "Reunión sobre rendimiento académico"
    },
    {
        id: 2,
        name: "Carlos Alberto López",
        documentType: "DNI",
        document: "87654321B",
        reason: "Proveedor",
        person: "Dept. Mantenimiento",
        department: "Mantenimiento",
        date: "2026-01-14",
        timeIn: "09:30",
        timeOut: "",
        status: "active",
        vehiclePlate: "XYZ-5678",
        notes: "Entrega de materiales de limpieza"
    },
    {
        id: 3,
        name: "Ana María Fernández",
        documentType: "Pasaporte",
        document: "P12345678",
        reason: "Evento Escolar",
        person: "Coordinación",
        department: "Administración",
        date: "2026-01-14",
        timeIn: "10:00",
        timeOut: "12:30",
        status: "checked-out",
        vehiclePlate: "",
        notes: "Charla sobre nutrición infantil"
    },
    {
        id: 4,
        name: "Roberto García Mendoza",
        documentType: "DNI",
        document: "23456789C",
        reason: "Entrevista",
        person: "Dirección",
        department: "Dirección",
        date: "2026-01-13",
        timeIn: "14:00",
        timeOut: "15:30",
        status: "checked-out",
        vehiclePlate: "DEF-9012",
        notes: "Entrevista para puesto de docente"
    },
    {
        id: 5,
        name: "Laura Sánchez Torres",
        documentType: "DNI",
        document: "34567890D",
        reason: "Reunión Padres",
        person: "Prof. María López",
        department: "Aulas",
        date: "2026-01-14",
        timeIn: "11:00",
        timeOut: "",
        status: "active",
        vehiclePlate: "GHI-3456",
        notes: ""
    }
];

// Personal del colegio para autocompletar
const schoolStaff = [
    "Prof. Juan Martínez",
    "Prof. María López",
    "Prof. Carlos García",
    "Prof. Ana Rodríguez",
    "Lic. Pedro Sánchez",
    "Ing. Laura Díaz",
    "Secretaría",
    "Dirección",
    "Administración",
    "Biblioteca",
    "Coordinación",
    "Dept. Mantenimiento",
    "Dept. Cocina"
];

// Estado global de la aplicación
let visitors = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortColumn = 'id';
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
    // Cargar datos desde localStorage o usar datos iniciales
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

    // Configurar validación de formularios
    setupFormValidation();
}

// Cargar visitantes desde la API (con fallback a datos iniciales si el backend no responde)
async function loadVisitors() {
    try {
        const response = await fetch("http://localhost:8080/api/visitas");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        visitors = await response.json();
    } catch (error) {
        console.warn("Backend no disponible, usando datos de ejemplo:", error.message);
        visitors = [...initialVisitors];
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
    const titles = {
        'dashboard': 'Dashboard',
        'visits': 'Historial de Visitas',
        'registro': 'Registrar Visita',
        'reports': 'Reportes'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[page] || page;
    }

    // Datos por página
    if (page === 'dashboard' || page === 'visits') {
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
        // Necesitamos un pequeño timeout porque el sidebar entra via fetch async
        setTimeout(() => {
            document.querySelector('.sidebar')?.classList.add('collapsed');
            document.querySelector('.main-content')?.classList.add('sidebar-collapsed');
        }, 50); // Tiempo razonable para que el DOM se asigne
    }

    // Delegación de eventos: Escuchamos clics en el body para detectar el sidebarToggle
    // sin importar cuándo fue inyectado el HTML del sidebar
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




// ========================================
// Tabla de Visitas
// ========================================
//aqui emp



async function renderTable() {
    try {
        const response = await fetch("http://localhost:8080/api/visitas");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        visitors = await response.json();
    } catch (error) {
        console.warn("Backend no disponible, usando datos de ejemplo:", error.message);
        visitors = [...initialVisitors];
    }

    updateStats();

    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    // Evitar error si filtros no existen
    const filterStatusElement = document.getElementById('filterStatus');
    const searchInputElement = document.getElementById('searchInput');

    const filterStatus = filterStatusElement ? filterStatusElement.value : 'all';
    const searchTerm = searchInputElement
        ? searchInputElement.value.toLowerCase()
        : '';

    if (!Array.isArray(visitors)) return;

    // ===== FILTRAR VISITAS =====
    let filteredVisitors = visitors.filter(v => {

        const status = (v.estadoRegistro || '');
        const nombre = (v.nombre || '').toLowerCase();
        const documento = (v.documento || '').toLowerCase();
        const persona_visitada = (v.persona_visitada || '').toLowerCase();
        const motivo = (v.motivo || '').toLowerCase();

        const matchesStatus =
            filterStatus === 'all' ||
            status === filterStatus;

        const matchesSearch =
            nombre.includes(searchTerm) ||
            documento.includes(searchTerm) ||
            persona_visitada.includes(searchTerm) ||
            motivo.includes(searchTerm);

        return matchesStatus && matchesSearch;
    });

    // ===== TABLA VACÍA =====
    if (filteredVisitors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    No hay registros
                </td>
            </tr>
        `;
        return;
    }

    // ===== RENDERIZAR TABLA =====
    tbody.innerHTML = filteredVisitors.map(v => `
        <tr>
            <td>${v.id ?? ''}</td>
            <td>${v.nombreVisitante ?? ''}</td>
            <td>${v.dniVisitante ?? ''}</td>
            <td>${v.motivo ?? ''}</td>
            <td>${v.usuario?.nombre ?? ''}</td>
            <td>${v.horaIngreso ?? ''}</td>
            <td>${v.horaSalida ?? '--:--'}</td>

             <td>${v.estadoRegistro ?? ''}</td>
             <td>
                                <div class="action-buttons">
                                    ${v.estado === '1' ? `
                                        <button class="btn-action checkout" onclick="checkoutVisitor(${v.id})" title="Check-out">
                                            <i class="fas fa-sign-out-alt"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn-action edit" onclick="editVisitor(${v.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-action view" onclick="viewVisitor(${v.id})" title="Ver detalles">
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
        vehiclePlate: document.getElementById('vehiclePlate').value.trim(),
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
    const persona_visitada = document.getElementById('quickPerson').value.trim();
    const usuarioId = document.getElementById('usuarioId').value; // Del input oculto que ya configuramos en app.js

    if (!nombre || !documento || !motivo || !persona_visitada || !usuarioId) {
        showToast('Por favor, complete todos los campos y seleccione un usuario de la lista', 'error');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const hours = String(new Date().getHours()).padStart(2, '0');
    const minutes = String(new Date().getMinutes()).padStart(2, '0');
    const fechaHoraIngreso = `${today}T${hours}:${minutes}:00`;

    const visitData = {
        dniVisitante: documento,
        nombreVisitante: nombre,
        motivo: motivo,
        horaIngreso: fechaHoraIngreso,
        usuario_id: parseInt(usuarioId, 10),
        estadoRegistro: "REGISTRADO"
    };

    try {
        const response = await fetch("http://localhost:8080/api/visitas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(visitData)
        });

        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

        await response.json();

        closeRegisterModal();
        showToast(`${nombre} ha sido registrado exitosamente`, 'success');

        // Refrescar tabla en background
        renderTable();

        // Limpiar inputs
        document.getElementById('quickName').value = '';
        document.getElementById('quickDocument').value = '';
        document.getElementById('quickReason').value = '';
        document.getElementById('quickPerson').value = '';
        document.getElementById('usuarioId').value = '';

    } catch (error) {
        console.error("Error en registro rápido:", error);
        showToast('Error al conectar con el backend', 'error');
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

    // Almacenar el ID temporalmente para que la vista de "registro" lo lea al cargar
    sessionStorage.setItem('editVisitorId', id);

    // Ir a sección de registro (el enrutador cargará HTML async)
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
function checkoutVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;

    const nombre = visitor.nombreVisitante || visitor.nombre || visitor.name || 'Visitante';

    const message = `¿Realizar check-out de <strong>${escapeHtml(nombre)}</strong>?<br>
                     Hora de salida: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

    showConfirmModal('Confirmar Salida', message, 'Cancelar', () => {
        const hours = String(new Date().getHours()).padStart(2, '0');
        const minutes = String(new Date().getMinutes()).padStart(2, '0');

        visitor.horaSalida = `${hours}:${minutes}`;
        visitor.timeOut = visitor.horaSalida;
        visitor.estadoRegistro = 'Finalizado';
        visitor.estado = '0';
        visitor.status = 'checked-out';

        saveVisitors();
        renderTable();
        updateStats();
        showToast(`${visitor.name} ha registrado su salida`, 'success');
    });
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
    const todayVisitors = visitors.filter(v => v.horaIngreso && v.horaIngreso.startsWith(today));

    // Visitas activas
    const activeVisitors = todayVisitors.filter(
        v => v.estadoRegistro === "REGISTRADO"
    ).length;

    const el = document.getElementById("activeVisitors");

    if (el !== null) {
        el.textContent = activeVisitors;
    }

    // Visitas de hoy
    const todayVisitsEl = document.getElementById('todayVisits');
    if (todayVisitsEl) todayVisitsEl.textContent = todayVisitors.length;

    // Salidas de hoy
    const checkedOut = todayVisitors.filter(v => v.status === 'checked-out').length;
    const checkedOutEl = document.getElementById('checkedOut');
    if (checkedOutEl) checkedOutEl.textContent = checkedOut;

    // Calcular promedio semanal
    const last7Days = getLast7Days();
    let totalLast7Days = 0;
    last7Days.forEach(day => {
        totalLast7Days += visitors.filter(v => v.date === day).length;
    });
    const weeklyAvg = Math.round(totalLast7Days / 7);
    const weeklyAvgEl = document.getElementById('weeklyAvg');
    if (weeklyAvgEl) weeklyAvgEl.textContent = weeklyAvg;
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

    if (!inputUsuario || !suggestionsBox) return; // el modal aún no está en el DOM

    inputUsuario.addEventListener("input", async function () {
        const texto = inputUsuario.value.trim();

        if (texto.length < 2) {
            suggestionsBox.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/api/visitas/usuarios?search=${texto}`
            );
            const usuarios = await response.json();

            suggestionsBox.innerHTML = "";
            usuarios.forEach(usuario => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = usuario.nombre;
                div.onclick = () => {
                    inputUsuario.value = usuario.nombre;
                    if (usuarioIdInput) usuarioIdInput.value = usuario.id;
                    suggestionsBox.innerHTML = "";
                };
                suggestionsBox.appendChild(div);
            });
        } catch (error) {
            console.error("Error buscando usuarios:", error);
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
