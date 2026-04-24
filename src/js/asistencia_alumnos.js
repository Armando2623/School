// ============================================================
// asistencia_alumnos.js — Módulo de Asistencia de Alumnos por QR
// IIFE para evitar conflictos al re-cargar mediante router.js
// ============================================================
(function () {

    // ── Estado interno ──────────────────────────────────────
    let asistData        = [];   // Array combinado: alumno + registro del día
    let institucionCtx   = null;
    let scannerActivo    = false;
    let videoStream      = null;
    let rafId            = null;
    let ultimoQRProcesado = null;
    let cooldownQR       = false;

    // ── INIT ────────────────────────────────────────────────
    async function initAsistenciaAlumnos() {
        // Fecha de hoy por defecto
        const dateInput = document.getElementById('asistAlumnosFecha');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        // Obtener institución del usuario
        if (typeof getUserProfile === 'function') {
            const profile = await getUserProfile();
            if (profile) institucionCtx = profile.institucion_id;
        }

        actualizarLabelFecha();
        cargarAsistenciaAlumnos();
    }

    // ── CARGAR DATOS ────────────────────────────────────────
    async function cargarAsistenciaAlumnos() {
        const tbody    = document.getElementById("asistAlumnosTableBody");
        const fecha    = document.getElementById("asistAlumnosFecha")?.value;
        const grado    = document.getElementById("filtroGradoAsist")?.value;
        const seccion  = document.getElementById("filtroSeccionAsist")?.value;

        if (!tbody || !fecha) return;

        if (!institucionCtx) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px;">
                <i class="fas fa-exclamation-triangle" style="color:#f59e0b; font-size:24px;"></i><br>
                No se detectó la institución. Recarga la sesión.</td></tr>`;
            return;
        }

        tbody.innerHTML = `<tr><td colspan="5" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

        try {
            // 1. Alumnos filtrados por grado/sección
            let query = supabaseClient.from('alumnos').select('*')
                .eq('institucion_id', institucionCtx)
                .order('nombre', { ascending: true });

            if (grado)   query = query.eq('grado',   grado);
            if (seccion) query = query.eq('seccion',  seccion);

            const { data: alumnos, error: errAlumnos } = await query;
            if (errAlumnos) throw errAlumnos;

            // 2. Registros de asistencia de ese día
            const { data: registros, error: errReg } = await supabaseClient
                .from('asistencia_alumnos')
                .select('*')
                .eq('institucion_id', institucionCtx)
                .eq('fecha', fecha);
            if (errReg) throw errReg;

            // 3. Cruce alumno ↔ registro
            asistData = alumnos.map(a => {
                const reg = registros.find(r => r.alumno_id === a.id);
                return {
                    ...a,
                    registro_id: reg ? reg.id : null,
                    hora_entrada: reg ? reg.hora_entrada : null,
                    estado: reg ? reg.estado : 'SIN_MARCAR',
                    observaciones: reg ? reg.observaciones : null
                };
            });

            renderTablaAsistenciaAlumnos(asistData);
            actualizarEstadisticas();
            actualizarLabelFecha();

        } catch (e) {
            console.error("Error asistencia alumnos:", e);
            if (typeof showToast === 'function') showToast("Error al cargar asistencia", "error");
        }
    }

    // ── RENDER TABLA ────────────────────────────────────────
    function renderTablaAsistenciaAlumnos(lista) {
        const tbody = document.getElementById("asistAlumnosTableBody");
        if (!tbody) return;

        const countEl = document.getElementById("asistAlumnosCount");

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-row">
                <i class="fas fa-inbox"></i> No hay alumnos para los filtros seleccionados.</td></tr>`;
            if (countEl) countEl.textContent = '0 alumnos';
            return;
        }

        if (countEl) countEl.textContent = `${lista.length} alumnos`;

        tbody.innerHTML = lista.map(item => {
            const badge = getBadgeEstado(item.estado);
            const hora  = item.hora_entrada ? item.hora_entrada.substring(0, 5) : '—';

            return `
            <tr id="fila-alumno-${item.id}" class="${item.estado === 'SIN_MARCAR' ? '' : ''}">
                <td>
                    <strong style="color:var(--text-primary);">${escAH(item.nombre)}</strong>
                </td>
                <td>
                    <span class="badge-seccion">${item.grado}</span>
                    <span style="margin-left:4px; font-size:12px; color:var(--text-secondary);">Sec. ${item.seccion}</span>
                </td>
                <td>${badge}</td>
                <td style="font-weight:600; color:#4f46e5;">${hora}</td>
                <td>
                    <div class="action-buttons" style="gap:5px; flex-wrap:wrap;">
                        <button class="btn-action edit" title="Presente"
                            onclick="marcarEstadoAlumno(${item.id}, '${item.registro_id}', 'PRESENTE')"
                            style="background:#10b981; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;"
                            ${item.estado === 'PRESENTE' ? 'disabled style="opacity:.45;"' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-action" title="Tardanza"
                            onclick="marcarEstadoAlumno(${item.id}, '${item.registro_id}', 'TARDANZA')"
                            style="background:#f59e0b; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;"
                            ${item.estado === 'TARDANZA' ? 'disabled style="opacity:.45;"' : ''}>
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="btn-action" title="Falta"
                            onclick="marcarEstadoAlumno(${item.id}, '${item.registro_id}', 'FALTA')"
                            style="background:#ef4444; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;"
                            ${item.estado === 'FALTA' ? 'disabled style="opacity:.45;"' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-action" title="Justificado"
                            onclick="marcarEstadoAlumno(${item.id}, '${item.registro_id}', 'JUSTIFICADO')"
                            style="background:#6366f1; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;"
                            ${item.estado === 'JUSTIFICADO' ? 'disabled style="opacity:.45;"' : ''}>
                            <i class="fas fa-file-medical"></i>
                        </button>
                        ${item.registro_id ? `
                        <button class="btn-action" title="Anular registro"
                            onclick="anularRegistroAlumno('${item.registro_id}')"
                            style="background:#6c757d; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;">
                            <i class="fas fa-undo"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ── FILTRAR (buscador en tiempo real) ───────────────────
    function filtrarTablaAsistencia() {
        const q = (document.getElementById('buscarAlumnoAsist')?.value || '').toLowerCase();
        const filtrados = asistData.filter(a => a.nombre.toLowerCase().includes(q));
        renderTablaAsistenciaAlumnos(filtrados);
    }

    // ── ESTADÍSTICAS ────────────────────────────────────────
    function actualizarEstadisticas() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('asAlumnosTotal',       asistData.length);
        set('asAlumnosPresentes',   asistData.filter(a => a.estado === 'PRESENTE').length);
        set('asAlumnosTardanzas',   asistData.filter(a => a.estado === 'TARDANZA').length);
        set('asAlumnosFaltas',      asistData.filter(a => a.estado === 'FALTA').length);
        set('asAlumnosJustificados',asistData.filter(a => a.estado === 'JUSTIFICADO').length);
    }

    // ── MARCAR ESTADO MANUAL ────────────────────────────────
    async function marcarEstadoAlumno(alumnoId, registroId, estado) {
        const fecha   = document.getElementById("asistAlumnosFecha")?.value;
        const nowTime = new Date().toTimeString().split(' ')[0];

        try {
            if (registroId && registroId !== 'null') {
                // Actualizar registro existente
                const { error } = await supabaseClient
                    .from('asistencia_alumnos')
                    .update({ estado, hora_entrada: nowTime })
                    .eq('id', registroId);
                if (error) throw error;
            } else {
                // Insertar nuevo registro
                const { error } = await supabaseClient
                    .from('asistencia_alumnos')
                    .insert([{
                        alumno_id:      alumnoId,
                        institucion_id: institucionCtx,
                        fecha:          fecha,
                        hora_entrada:   nowTime,
                        estado:         estado
                    }]);
                if (error) throw error;
            }

            if (typeof showToast === 'function') showToast(`${estado.charAt(0) + estado.slice(1).toLowerCase()} registrado`, "success");
            await cargarAsistenciaAlumnos();

        } catch (e) {
            console.error("Error marcando asistencia:", e);
            if (typeof showToast === 'function') showToast("Error al registrar", "error");
        }
    }

    // ── ANULAR REGISTRO ─────────────────────────────────────
    async function anularRegistroAlumno(registroId) {
        if (!confirm("¿Anular el registro de asistencia de este alumno?")) return;
        try {
            const { error } = await supabaseClient
                .from('asistencia_alumnos').delete().eq('id', registroId);
            if (error) throw error;
            if (typeof showToast === 'function') showToast("Registro anulado", "success");
            await cargarAsistenciaAlumnos();
        } catch (e) {
            console.error(e);
            if (typeof showToast === 'function') showToast("No se pudo anular", "error");
        }
    }

    // ── MARCAR TODOS PRESENTES ──────────────────────────────
    async function marcarTodosPresentes() {
        if (!confirm(`¿Marcar a TODOS los ${asistData.length} alumnos como PRESENTES?`)) return;
        const fecha   = document.getElementById("asistAlumnosFecha")?.value;
        const nowTime = new Date().toTimeString().split(' ')[0];

        const sinReg = asistData.filter(a => !a.registro_id);
        const conReg = asistData.filter(a =>  a.registro_id && a.estado !== 'PRESENTE');

        try {
            if (sinReg.length > 0) {
                const rows = sinReg.map(a => ({
                    alumno_id:      a.id,
                    institucion_id: institucionCtx,
                    fecha,
                    hora_entrada:   nowTime,
                    estado:         'PRESENTE'
                }));
                const { error } = await supabaseClient.from('asistencia_alumnos').insert(rows);
                if (error) throw error;
            }
            for (const a of conReg) {
                await supabaseClient.from('asistencia_alumnos')
                    .update({ estado: 'PRESENTE', hora_entrada: nowTime })
                    .eq('id', a.registro_id);
            }
            if (typeof showToast === 'function') showToast("Todos marcados como Presentes", "success");
            await cargarAsistenciaAlumnos();
        } catch (e) {
            console.error(e);
            if (typeof showToast === 'function') showToast("Error al marcar todos", "error");
        }
    }

    // ══════════════════════════════════════════════════════
    //  ESCÁNER QR — jsQR vía cámara
    // ══════════════════════════════════════════════════════

    function cargarLibreriaJsQR() {
        return new Promise((resolve, reject) => {
            if (window.jsQR) { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function toggleEscaner() {
        if (scannerActivo) {
            detenerEscaner();
        } else {
            await iniciarEscaner();
        }
    }

    async function iniciarEscaner() {
        const panel = document.getElementById('panelEscaner');
        const btn   = document.getElementById('btnEscaner');

        if (panel) panel.style.display = 'block';
        if (btn)   { btn.innerHTML = '<i class="fas fa-stop-circle"></i> <span>Detener Escáner</span>'; btn.classList.add('danger'); }

        // Cargar jsQR
        try { await cargarLibreriaJsQR(); }
        catch(e) { showToast && showToast("No se pudo cargar jsQR. Verifica conexión.", "error"); return; }

        // Solicitar acceso a cámara
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
        } catch (e) {
            showToast && showToast("No se pudo acceder a la cámara: " + (e.message || e), "error");
            detenerEscaner();
            return;
        }

        const video = document.getElementById('qrVideo');
        if (!video) return;
        video.srcObject = videoStream;
        await video.play().catch(() => {});

        scannerActivo = true;
        ultimoQRProcesado = null;
        setEstadoEscaner('Apunta la cámara al código QR del alumno...', '#4f46e5', 'fa-circle-notch fa-spin');
        tickScan();
    }

    function detenerEscaner() {
        scannerActivo = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }

        const video = document.getElementById('qrVideo');
        if (video) { video.srcObject = null; }

        const panel = document.getElementById('panelEscaner');
        const btn   = document.getElementById('btnEscaner');
        if (panel) panel.style.display = 'none';
        if (btn)   { btn.innerHTML = '<i class="fas fa-camera"></i> <span>Activar Escáner</span>'; btn.classList.remove('danger'); }
    }

    function tickScan() {
        if (!scannerActivo) return;

        const video  = document.getElementById('qrVideo');
        const canvas = document.getElementById('qrVideoCanvas');
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
            rafId = requestAnimationFrame(tickScan);
            return;
        }

        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width  = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });

        if (code && code.data) {
            const texto = code.data.trim();
            if (!cooldownQR && texto !== ultimoQRProcesado) {
                ultimoQRProcesado = texto;
                procesarQR(texto);
            }
        }
        rafId = requestAnimationFrame(tickScan);
    }

    async function procesarQR(texto) {
        // El QR contiene el ID numérico del alumno
        const alumnoId = parseInt(texto, 10);
        if (isNaN(alumnoId)) {
            setEstadoEscaner('QR no reconocido — no corresponde a ningún alumno.', '#ef4444', 'fa-times-circle');
            return;
        }

        // Buscar en datos locales (ya cargados)
        let alumno = asistData.find(a => a.id === alumnoId);

        if (!alumno) {
            // Puede ser un alumno de otro grado no cargado aún — lo buscamos en BD
            try {
                const { data } = await supabaseClient.from('alumnos').select('*')
                    .eq('id', alumnoId).eq('institucion_id', institucionCtx).single();
                if (data) alumno = { ...data, registro_id: null, estado: 'SIN_MARCAR' };
            } catch (_) {}
        }

        if (!alumno) {
            setEstadoEscaner(`ID ${alumnoId} no corresponde a ningún alumno.`, '#ef4444', 'fa-user-times');
            return;
        }

        // Obtener estado seleccionado en el panel
        const estadoRadio = document.querySelector('input[name="estadoEscaner"]:checked');
        const estado = estadoRadio ? estadoRadio.value : 'PRESENTE';

        // Si ya tiene ese estado, skip
        if (alumno.estado === estado) {
            setEstadoEscaner(`${alumno.nombre} ya tiene estado: ${estado}`, '#f59e0b', 'fa-info-circle');
            mostrarUltimoDetectado(alumno, estado);
            iniciarCooldown();
            return;
        }

        setEstadoEscaner(`Registrando ${estado} para ${alumno.nombre}...`, '#4f46e5', 'fa-spinner fa-spin');

        await marcarEstadoAlumno(alumno.id, alumno.registro_id, estado);

        setEstadoEscaner(`✓ ${alumno.nombre} — ${estado}`, '#10b981', 'fa-check-circle');
        mostrarUltimoDetectado(alumno, estado);
        iniciarCooldown();
    }

    function iniciarCooldown(ms = 2500) {
        cooldownQR = true;
        setTimeout(() => {
            cooldownQR = false;
            ultimoQRProcesado = null;
        }, ms);
    }

    function setEstadoEscaner(msg, color, icon) {
        const el = document.getElementById('escanerStatus');
        if (!el) return;
        el.innerHTML = `<i class="fas ${icon}" style="color:${color}; font-size:20px;"></i> <span style="color:var(--text-primary);">${msg}</span>`;
        el.style.borderLeftColor = color;
    }

    function mostrarUltimoDetectado(alumno, estado) {
        const det = document.getElementById('ultimoDetectado');
        if (!det) return;
        det.style.display = 'block';
        document.getElementById('detNombre').textContent = alumno.nombre;
        document.getElementById('detGrado').textContent  = `${alumno.grado} — Sección ${alumno.seccion}`;
        document.getElementById('detHora').textContent   = `${estado} · ${new Date().toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })}`;
    }

    // ── HELPERS ─────────────────────────────────────────────
    function getBadgeEstado(estado) {
        const map = {
            'PRESENTE'    : ['#10b981', 'Presente'],
            'TARDANZA'    : ['#f59e0b', 'Tardanza'],
            'FALTA'       : ['#ef4444', 'Falta'],
            'JUSTIFICADO' : ['#6366f1', 'Justificado'],
            'SIN_MARCAR'  : ['#6c757d', 'Sin marcar'],
        };
        const [color, label] = map[estado] || ['#6c757d', estado];
        return `<span class="status-badge" style="background:${color}; color:#fff; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">${label}</span>`;
    }

    function actualizarLabelFecha() {
        const el = document.getElementById('asistenciaFechaLabel');
        if (!el) return;
        const fecha = document.getElementById("asistAlumnosFecha")?.value;
        if (fecha) {
            const d = new Date(fecha + 'T00:00:00');
            el.textContent = '— ' + d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }

    function escAH(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── EXPONER AL SCOPE GLOBAL (onclick del HTML) ──────────
    window.cargarAsistenciaAlumnos  = cargarAsistenciaAlumnos;
    window.filtrarTablaAsistencia   = filtrarTablaAsistencia;
    window.marcarEstadoAlumno       = marcarEstadoAlumno;
    window.anularRegistroAlumno     = anularRegistroAlumno;
    window.marcarTodosPresentes     = marcarTodosPresentes;
    window.toggleEscaner            = toggleEscaner;

    // ── ARRANCAR ────────────────────────────────────────────
    initAsistenciaAlumnos();

    // Al salir de la página, apagar la cámara
    window._stopAsistAlumnosScanner = detenerEscaner;

})(); // fin IIFE
