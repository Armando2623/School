// ============================================================
// alumnos.js — Módulo de gestión de alumnos + generación QR
// ============================================================

let todosLosAlumnos = [];
let editingAlumnoId = null;

// ─── LIBRERÍA QR (carga dinámica) ──────────────────────────
function cargarLibreriaQR() {
    return new Promise((resolve, reject) => {
        if (window.QRCode) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ─── CARGA INICIAL ─────────────────────────────────────────
async function cargarAlumnos() {
    const tbody = document.getElementById("alumnosTableBody");
    const countEl = document.getElementById("alumnosCount");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from('alumnos')
            .select('*, apoderado:visitantes(*)');

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
        tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><i class="fas fa-inbox"></i> No hay alumnos</td></tr>`;
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
            <td>
                <button class="btn-action view" onclick="mostrarQRAlumno(${a.id})" title="Ver código QR"
                    style="background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; font-size:13px;">
                    <i class="fas fa-qrcode"></i>
                </button>
            </td>
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

            result = await supabaseClient.from('alumnos').insert([data]).select().single();
        }

        if (result.error) throw result.error;

        showToast("Alumno guardado exitosamente", "success");
        hideAlumnoForm();
        await cargarAlumnos();

        // Si fue un INSERT nuevo, mostrar su QR automáticamente
        if (!editingAlumnoId && result.data) {
            setTimeout(() => mostrarQRAlumno(result.data.id), 400);
        }
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
    document.getElementById("alumnoFormTitle").innerHTML = '<i class="fas fa-user-edit"></i> Editar Alumno';
}

// ─── QR: MOSTRAR MODAL ─────────────────────────────────────
async function mostrarQRAlumno(id) {
    // Buscar en el arreglo local (puede ser llamado justo después del insert)
    let alumno = todosLosAlumnos.find(a => a.id === id);

    // Si no está en el array (p.e. acaba de insertarse), lo buscamos en BD
    if (!alumno) {
        try {
            const { data } = await supabaseClient.from('alumnos').select('*').eq('id', id).single();
            alumno = data;
        } catch (e) {
            console.error('No se pudo obtener el alumno para QR:', e);
            return;
        }
    }

    if (!alumno) return;

    // Cargar librería si no está disponible
    await cargarLibreriaQR();

    // Rellenar info
    document.getElementById("qrAlumnoNombre").textContent = alumno.nombre;
    document.getElementById("qrAlumnoGrado").textContent = `${alumno.grado} — Sección ${alumno.seccion}`;
    document.getElementById("qrAlumnoId").textContent = `ID: ${alumno.id}`;

    // Generar QR en canvas
    const canvas = document.getElementById("qrCanvas");
    try {
        await QRCode.toCanvas(canvas, String(alumno.id), {
            width: 200,
            margin: 2,
            color: { dark: '#1e1b4b', light: '#ffffff' }
        });
    } catch (e) {
        console.error('Error generando QR:', e);
    }

    // Mostrar modal
    const modal = document.getElementById("qrModal");
    modal.style.display = "flex";

    // Cerrar al hacer clic fuera del contenido
    modal.onclick = (e) => { if (e.target === modal) cerrarQRModal(); };
}

// ─── QR: CERRAR MODAL ─────────────────────────────────────
function cerrarQRModal() {
    document.getElementById("qrModal").style.display = "none";
}

// ─── QR: IMPRIMIR ─────────────────────────────────────────
function imprimirQR() {
    const nombre = document.getElementById("qrAlumnoNombre").textContent;
    const grado  = document.getElementById("qrAlumnoGrado").textContent;
    const canvas = document.getElementById("qrCanvas");
    const dataUrl = canvas.toDataURL("image/png");

    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR - ${nombre}</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                img  { width: 220px; height: 220px; }
                h2   { margin: 16px 0 4px; font-size: 20px; }
                p    { margin: 0; color: #555; font-size: 14px; }
                .card { display: inline-block; border: 2px solid #4f46e5; border-radius: 16px; padding: 24px; }
            </style>
        </head>
        <body>
            <div class="card">
                <img src="${dataUrl}" alt="QR">
                <h2>${nombre}</h2>
                <p>${grado}</p>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ─── QR: DESCARGAR ────────────────────────────────────────
function descargarQR() {
    const nombre = document.getElementById("qrAlumnoNombre").textContent;
    const canvas = document.getElementById("qrCanvas");
    const link = document.createElement('a');
    link.download = `QR_${nombre.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

// ─── HELPER ────────────────────────────────────────────────
function escapeHtmlA(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── INIT ──────────────────────────────────────────────────
cargarAlumnos();
