// ============================================================
// alumnos.js — Módulo de gestión de alumnos del colegio
// ============================================================

let todosLosAlumnos = [];
let editingAlumnoId = null;

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarAlumnos() {
    const tbody = document.getElementById("alumnosTableBody");
    const countEl = document.getElementById("alumnosCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from('alumnos')
            .select('*, apoderado:visitantes(*)'); // Usamos alias 'apoderado' si es posible, o simplemente traemos visitantes

        if (error) throw error;
        todosLosAlumnos = data;
    } catch (err) {
        console.error("Error cargando alumnos:", err);
        if (typeof showToast === 'function') showToast("No se pudo cargar la lista", "error");
        todosLosAlumnos = [];
    }

    renderAlumnosTable(todosLosAlumnos);
    if (countEl) countEl.textContent = `${todosLosAlumnos.length} alumnos`;
}

// ─── RENDER TABLA ──────────────────────────────────────────
function renderAlumnosTable(lista) {
    const tbody = document.getElementById("alumnosTableBody");
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><i class="fas fa-inbox"></i> No hay alumnos</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => `
        <tr>
            <td>${a.id}</td>
            <td><strong>${escapeHtmlA(a.nombre)}</strong></td>
            <td>${a.grado}</td>
            <td><span class="badge-seccion">${a.seccion}</span></td>
            <td>${a.apoderado
            ? `<span class="apoderado-tag"><i class="fas fa-user-tie"></i> ${escapeHtmlA(a.apoderado.nombre_visitante)}</span>`
            : '<span class="text-muted">Sin apoderado</span>'
        }</td>
            <td class="actions-cell">
                <button class="btn-action edit" onclick="editarAlumno(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// ─── FILTRAR ───────────────────────────────────────────────
function filtrarAlumnos() {
    const q = document.getElementById("alumnoSearch").value.toLowerCase();
    const filtrados = todosLosAlumnos.filter(a =>
        a.nombre.toLowerCase().includes(q) ||
        (a.grado && a.grado.toLowerCase().includes(q)) ||
        (a.seccion && a.seccion.toLowerCase().includes(q))
    );
    renderAlumnosTable(filtrados);
    document.getElementById("alumnosCount").textContent = `${filtrados.length} alumnos`;
}

// ─── FORMULARIO ────────────────────────────────────────────
function showAddAlumnoForm() {
    editingAlumnoId = null;
    document.getElementById("alumnoFormCard").style.display = "block";
    document.getElementById("alumnoFormTitle").innerHTML = '<i class="fas fa-user-plus"></i> Registrar Alumno';
    document.getElementById("alumnoForm").reset();
    document.getElementById("aApoderadoId").value = '';
    document.getElementById("apoderadoFound").style.display = "none";
}

function hideAlumnoForm() {
    editingAlumnoId = null;
    document.getElementById("alumnoFormCard").style.display = "none";
}

// ─── BUSCADOR DNI DEL APODERADO ────────────────────────────
async function lookupApoderado(dni) {
    if (dni.length < 6) return;
    try {
        const { data, error } = await supabaseClient
            .from('visitantes')
            .select('*')
            .eq('dni_visitante', dni)
            .single();
        
        if (error) throw error;

        document.getElementById("aApoderadoId").value = data.id;
        document.getElementById("apoderadoFoundName").textContent = data.nombre_visitante;
        document.getElementById("apoderadoFound").style.display = "flex";
    } catch (e) {
        console.warn("Apoderado no encontrado");
    }
}

// ─── GUARDAR ───────────────────────────────────────────────
async function submitAlumnoForm(event) {
    event.preventDefault();

    const data = {
        nombre: document.getElementById("aNombre").value.trim(),
        grado: document.getElementById("aGrado").value,
        seccion: document.getElementById("aSeccion").value,
        visitante_id: document.getElementById("aApoderadoId").value || null
    };

    try {
        let result;
        if (editingAlumnoId) {
            result = await supabaseClient.from('alumnos').update(data).eq('id', editingAlumnoId);
        } else {
            let profile = null;
            if (typeof getUserProfile === 'function') profile = await getUserProfile();
            if (profile && profile.institucion_id) data.institucion_id = profile.institucion_id;

            result = await supabaseClient.from('alumnos').insert([data]);
        }

        if (result.error) throw result.error;

        showToast("Alumno guardado", "success");
        hideAlumnoForm();
        cargarAlumnos();
    } catch (err) {
        console.error("Error:", err);
        showToast("Error al guardar", "error");
    }
}

// ─── EDITAR ────────────────────────────────────────────────
function editarAlumno(id) {
    const a = todosLosAlumnos.find(x => x.id === id);
    if (!a) return;

    editingAlumnoId = a.id;
    document.getElementById("aNombre").value = a.nombre;
    document.getElementById("aGrado").value = a.grado;
    document.getElementById("aSeccion").value = a.seccion;

    if (a.apoderado) {
        document.getElementById("aApoderadoDni").value = a.apoderado.dni_visitante;
        document.getElementById("aApoderadoId").value = a.apoderado.id;
        document.getElementById("apoderadoFoundName").textContent = a.apoderado.nombre_visitante;
        document.getElementById("apoderadoFound").style.display = "flex";
    }

    document.getElementById("alumnoFormCard").style.display = "block";
}

// ─── HELPER ────────────────────────────────────────────────
function escapeHtmlA(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── INIT ──────────────────────────────────────────────────
cargarAlumnos();

