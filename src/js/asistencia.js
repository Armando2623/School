// ============================================================
// asistencia.js — Lógica para Módulo "Registro Diario"
// Envuelto en IIFE para evitar errores de re-declaración
// cuando el router recarga el script al navegar.
// ============================================================
(function () {

    let asistenciaData = [];
    let institucionCtx = null;

    // Inicializa cargando el perfil del usuario activo para saber su colegio
    async function initAsistencia() {
        // 1. Establecer la fecha de hoy por defecto en el input
        const dateInput = document.getElementById('asistenciaFecha');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // 2. Obtener el colegio del admin
        if (typeof getUserProfile === 'function') {
            const profile = await getUserProfile();
            if (profile) institucionCtx = profile.institucion_id;
        }

        // 3. Cargar la data
        cargarAsistencias();
    }

    /**
     * Carga todos los usuarios de la institución, además hace un cruce con 
     * la tabla "asistencias" para el día seleccionado.
     */
    async function cargarAsistencias() {
        const tbody = document.getElementById("asistenciaTableBody");
        const fechaSelect = document.getElementById("asistenciaFecha").value;

        if (!tbody || !fechaSelect) return;

        if (!institucionCtx) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error: No se determinó su colegio. Refresque la sesión.</td></tr>`;
            return;
        }

        tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando personal...</td></tr>`;

        try {
            // Obtenemos a todos los trabajadores/usuarios de este colegio
            const { data: empleados, error: errEmpleados } = await supabaseClient
                .from('personal')
                .select('*')
                .eq('institucion_id', institucionCtx)
                .order('nombre', { ascending: true });

            if (errEmpleados) throw errEmpleados;

            // Obtenemos los registros de asistencia de "hoy" (o el día seleccionado)
            const { data: records, error: errAsistencia } = await supabaseClient
                .from('asistencias')
                .select('*')
                .eq('institucion_id', institucionCtx)
                .eq('fecha', fechaSelect);

            if (errAsistencia) throw errAsistencia;

            // Cruzamos ambas listas
            asistenciaData = empleados.map(emp => {
                const track = records.find(r => r.usuario_id === emp.id);
                return {
                    ...emp, // datos base (nombre, rol, id)
                    registro_id: track ? track.id : null,
                    entrada: track ? track.hora_entrada : null,
                    salida: track ? track.hora_salida : null,
                    estado: track ? track.estado : 'SIN MARCAR'
                };
            });

            renderAsistenciaTable(asistenciaData);
            actualizarEstadisticas();

        } catch (e) {
            console.error("Error al cargar asistencia", e);
            if (typeof showToast === 'function') showToast("Error cargando personal", "error");
        }
    }

    function filtrarAsistencias() {
        const term = document.getElementById("asistenciaSearch").value.toLowerCase();
        const result = asistenciaData.filter(d => d.nombre.toLowerCase().includes(term) || d.rol.toLowerCase().includes(term));
        renderAsistenciaTable(result);
    }

    function renderAsistenciaTable(lista) {
        const tbody = document.getElementById("asistenciaTableBody");
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No hay empleados registrados en este colegio</td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(item => {
            let estadoBadge = '<span class="status-badge" style="background:#6c757d;">Sin marcar</span>';
            if (item.estado === 'PRESENTE') estadoBadge = '<span class="status-badge" style="background:#28a745;">Presente</span>';
            else if (item.estado === 'TARDANZA') estadoBadge = '<span class="status-badge" style="background:#fd7e14;">Tardanza</span>';
            else if (item.estado === 'FALTA') estadoBadge = '<span class="status-badge" style="background:#dc3545;">Falta</span>';

            // Lógica de botones usando estilos estándar de tabla pequeña
            let entradaClass = item.entrada ? "btn-disabled" : "btn-action edit";
            let entradaTitle = item.entrada ? "Entrada Registrada" : "Marcar Entrada";
            let entradaClick = item.entrada ? "" : `onclick="marcarAsistencia('${item.id}', '${item.registro_id}', 'ENTRADA')"`;

            let salidaClass = (item.entrada && !item.salida) ? "btn-action checkout" : "btn-disabled";
            let salidaTitle = item.salida ? "Salida Registrada" : (!item.entrada ? "Debe marcar entrada primero" : "Marcar Salida");
            let salidaClick = (item.entrada && !item.salida) ? `onclick="marcarAsistencia('${item.id}', '${item.registro_id}', 'SALIDA')"` : "";

            return `
            <tr>
                <td><strong>${item.nombre}</strong><br><small class="text-muted">${item.usuario}</small></td>
                <td>${item.rol}</td>
                <td>${estadoBadge}</td>
                <td style="font-weight:bold; color:#28a745;">${item.entrada ? item.entrada.substring(0, 5) : '—'}</td>
                <td style="font-weight:bold; color:#f59e0b;">${item.salida ? item.salida.substring(0, 5) : '—'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="${entradaClass}" ${entradaClick} title="${entradaTitle}">
                            <i class="fas fa-sign-in-alt"></i>
                        </button>
                        <button class="${salidaClass}" ${salidaClick} title="${salidaTitle}">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                         ${item.entrada ? `
                            <button class="btn-action view" onclick="eliminarRegistro('${item.registro_id}')" title="Anular Registro">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    function actualizarEstadisticas() {
        document.getElementById("totalEmpleados").innerText = asistenciaData.length;
        document.getElementById("totalPresentes").innerText = asistenciaData.filter(x => x.entrada).length;
        document.getElementById("totalFaltantes").innerText = asistenciaData.filter(x => !x.entrada).length;
    }

    /**
     * Registra o actualiza la asistencia en BD
     * @param {string} usuarioId UUID del empleado
     * @param {string} registroId UUID de la fila en 'asistencias' (si ya marcó entrada hoy)
     * @param {string} tipo 'ENTRADA' o 'SALIDA'
     */
    async function marcarAsistencia(usuarioId, registroId, tipo) {
        const fecha = document.getElementById("asistenciaFecha").value;
        const isToday = (fecha === new Date().toISOString().split('T')[0]);

        // Si la fecha configurada no es hoy, confirmamos
        if (!isToday) {
            if (!confirm(`Ojo: Estás marcando ${tipo} para una fecha PASADA o FUTURA (${fecha}). ¿Estás seguro?`)) return;
        }

        const nowTime = new Date().toTimeString().split(' ')[0]; // Ej: "08:15:23"

        try {
            if (tipo === 'ENTRADA') {
                // Evaluamos si es tardanza rudimentariamente (pasadas las 8 AM, por ejemplo)
                // Esto luego se podría mejorar poniéndolo en la config de la institución
                const hour = parseInt(nowTime.substring(0, 2));
                const estado = hour >= 8 ? 'TARDANZA' : 'PRESENTE';

                const payload = {
                    usuario_id: usuarioId,
                    institucion_id: institucionCtx,
                    fecha: fecha,
                    hora_entrada: nowTime,
                    estado: estado
                };

                const { error } = await supabaseClient.from('asistencias').insert([payload]);
                if (error) throw error;
                showToast("Entrada Registrada", "success");

            } else if (tipo === 'SALIDA') {
                if (!registroId || registroId === 'null') {
                    showToast("Falla técnica: falto el registro de la entrada", "error");
                    return;
                }
                const { error } = await supabaseClient
                    .from('asistencias')
                    .update({ hora_salida: nowTime })
                    .eq('id', registroId);

                if (error) throw error;
                showToast("Salida Registrada", "success");
            }

            // Recargamos en caliente
            cargarAsistencias();
        } catch (e) {
            console.error("Error marcando asistencia", e);
            showToast("Error en base de datos", "error");
        }
    }

    async function eliminarRegistro(registroId) {
        if (!confirm("¿Seguro que deseas ANULAR este registro de asistencia? Se perderá la entrada y la salida.")) return;
        try {
            const { error } = await supabaseClient.from('asistencias').delete().eq('id', registroId);
            if (error) throw error;
            showToast("Registro anulado", "success");
            cargarAsistencias();
        } catch (e) {
            console.error(e);
            showToast("No se pudo anular", "error");
        }
    }

    // Iniciar
    initAsistencia();

    // ── Exponer al scope global para los onclick del HTML ──
    window.marcarAsistencia    = marcarAsistencia;
    window.eliminarRegistro    = eliminarRegistro;
    window.filtrarAsistencias  = filtrarAsistencias;
    window.cargarAsistencias   = cargarAsistencias;

})(); // fin IIFE
