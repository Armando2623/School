/**
 * SchoolGuard — Módulo de Reportes
 * Exportación profesional a PDF y Excel para institución educativa
 *
 * NOTA: Las funciones se asignan a window.* para garantizar que
 * sobreescriban las versiones stub de app.js, independientemente
 * del orden de carga de scripts.
 */

(function () {
    'use strict';

    // ─── Estado local del módulo ──────────────────────────────────
    let _reportData = []; // visitas filtradas del último reporte

    // ─── Inicialización inmediata (sin depender de eventos) ───────
    // El router carga este script DESPUÉS de insertar el HTML en #app,
    // así que el DOM del módulo ya existe cuando este código se ejecuta.
    _initReportDates();
    _loadSchoolName();

    function _initReportDates() {
        const today = new Date().toISOString().split('T')[0];
        const d30   = new Date();
        d30.setDate(d30.getDate() - 30);
        const d30str = d30.toISOString().split('T')[0];
        _setVal('startDate', d30str);
        _setVal('endDate',   today);
    }

    async function _loadSchoolName() {
        try {
            if (typeof ConfigService !== 'undefined') {
                const cfg = await ConfigService.getConfig();
                const el  = document.getElementById('reportSchoolName');
                if (el && cfg.nombre_colegio) el.textContent = cfg.nombre_colegio;
            }
        } catch (_) { /* no bloquear */ }
    }

    // ─── Utilidades ───────────────────────────────────────────────
    function _setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function _setTxt(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function _fmtDateTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function _getDays(start, end) {
        if (!start || !end) return 1;
        return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1);
    }

    function _toast(msg, type) {
        if (typeof showToast === 'function') showToast(msg, type);
    }

    // ─── GENERAR REPORTE ──────────────────────────────────────────
    window.generateReport = async function () {
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate   = document.getElementById('endDate')?.value   || '';
        const statusF   = document.getElementById('filterReportStatus')?.value || 'all';
        const motivoF   = document.getElementById('filterReportMotivo')?.value || 'all';

        // Asegurar datos cargados
        const src = (typeof visitors !== 'undefined' && visitors.length > 0)
            ? visitors
            : [];

        if (src.length === 0 && typeof loadVisitors === 'function') {
            await loadVisitors();
        }

        const allVisits = (typeof visitors !== 'undefined') ? visitors : [];

        _reportData = allVisits.filter(v => {
            const fecha = (v.hora_ingreso || '').slice(0, 10);
            if (startDate && fecha < startDate) return false;
            if (endDate   && fecha > endDate)   return false;
            if (statusF !== 'all' && v.estado_registro !== statusF) return false;
            if (motivoF !== 'all') {
                if (!(v.motivo || '').toLowerCase().includes(motivoF)) return false;
            }
            return true;
        });

        // Estadísticas
        const total       = _reportData.length;
        const activos     = _reportData.filter(v => v.estado_registro === 'REGISTRADO').length;
        const finalizados = _reportData.filter(v => v.estado_registro === 'FINALIZADO').length;
        const avg         = total > 0 ? (total / _getDays(startDate, endDate)).toFixed(1) : '0';

        const rCounts = {};
        _reportData.forEach(v => {
            const r = v.motivo || 'Sin motivo';
            rCounts[r] = (rCounts[r] || 0) + 1;
        });
        const top = Object.entries(rCounts).sort((a, b) => b[1] - a[1])[0];

        _setTxt('totalVisitsReport',    total);
        _setTxt('activeVisitsReport',   activos);
        _setTxt('finishedVisitsReport', finalizados);
        _setTxt('topReason',            top ? top[0] : 'N/A');
        _setTxt('avgVisitsReport',      avg);

        // Renderizar tabla de vista previa
        _renderTable(_reportData);

        // Mostrar secciones
        const emptyState = document.getElementById('reportEmptyState');
        const preview    = document.getElementById('reportPreviewContainer');
        const exportBar  = document.getElementById('exportActionsBar');
        if (emptyState) emptyState.style.display = 'none';
        if (preview)    preview.style.display    = 'block';
        if (exportBar)  exportBar.style.display  = 'flex';

        const rangeLabel = document.getElementById('previewRangeLabel');
        if (rangeLabel) rangeLabel.textContent = `${startDate || '—'} al ${endDate || '—'}`;

        const cnt = document.getElementById('exportRecordCount');
        if (cnt) cnt.textContent = `${total} registro${total !== 1 ? 's' : ''}`;

        _toast(`Reporte generado: ${total} visita${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`, 'success');
    };

    function _renderTable(data) {
        const tbody = document.getElementById('reportPreviewBody');
        if (!tbody) return;
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="report-empty-msg">No se encontraron visitas con los filtros seleccionados.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map((v, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${v.nombre_visitante || '—'}</td>
                <td>${v.dni_visitante    || '—'}</td>
                <td>${v.motivo           || '—'}</td>
                <td>${v.usuario?.nombre  || '—'}</td>
                <td>${_fmtDateTime(v.hora_ingreso)}</td>
                <td>${_fmtDateTime(v.hora_salida)}</td>
                <td>${v.estado_registro === 'REGISTRADO'
                    ? '<span class="badge-registrado">En curso</span>'
                    : '<span class="badge-finalizado">Finalizado</span>'}</td>
            </tr>`).join('');
    }

    // ─── LIMPIAR FILTROS ──────────────────────────────────────────
    window.clearReportFilters = function () {
        _initReportDates();
        _setVal('filterReportStatus', 'all');
        _setVal('filterReportMotivo', 'all');
        const emptyState = document.getElementById('reportEmptyState');
        const preview    = document.getElementById('reportPreviewContainer');
        const exportBar  = document.getElementById('exportActionsBar');
        if (emptyState) emptyState.style.display = 'flex';
        if (preview)    preview.style.display    = 'none';
        if (exportBar)  exportBar.style.display  = 'none';
        _reportData = [];
    };

    // ─── EXPORTAR ────────────────────────────────────────────────
    window.exportReport = async function (format) {
        if (!_reportData || _reportData.length === 0) {
            _toast('Primero genera el reporte antes de exportar.', 'warning');
            return;
        }
        if (format === 'pdf')   await _exportPDF();
        if (format === 'excel') _exportExcel();
    };

    // ─── PDF ─────────────────────────────────────────────────────
    async function _exportPDF() {
        // Verificar que jsPDF esté disponible
        if (!window.jspdf || !window.jspdf.jsPDF) {
            _toast('La librería jsPDF no está disponible. Revisa tu conexión a internet.', 'error');
            console.error('jsPDF no encontrado en window.jspdf.jsPDF');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // Obtener nombre del colegio
            let schoolName = document.getElementById('reportSchoolName')?.textContent || 'Institución Educativa';
            let logoUrl    = null;
            try {
                if (typeof ConfigService !== 'undefined') {
                    const cfg = await ConfigService.getConfig();
                    if (cfg.nombre_colegio) schoolName = cfg.nombre_colegio;
                    if (cfg.logo_url)       logoUrl    = cfg.logo_url;
                }
            } catch (_) { /* continuar sin logo */ }

            const startDate = document.getElementById('startDate')?.value || '—';
            const endDate   = document.getElementById('endDate')?.value   || '—';
            const pageW     = doc.internal.pageSize.getWidth();
            const pageH     = doc.internal.pageSize.getHeight();

            // ── Encabezado institucional ──────────────────────
            doc.setFillColor(15, 52, 96);
            doc.rect(0, 0, pageW, 38, 'F');

            let textX = 12;
            if (logoUrl) {
                try {
                    const imgData = await _toBase64(logoUrl);
                    doc.addImage(imgData, 'PNG', 10, 5, 26, 26);
                    textX = 42;
                } catch (_) { textX = 12; }
            }

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.text(schoolName.toUpperCase(), textX, 16);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('REPORTE OFICIAL DE VISITAS INSTITUCIONALES', textX, 24);

            doc.setFontSize(8);
            doc.text(`Período: ${startDate}  al  ${endDate}`, textX, 32);

            const now = new Date().toLocaleString('es-ES');
            doc.text(`Generado: ${now}`, pageW - 12, 16, { align: 'right' });
            doc.text(`Total registros: ${_reportData.length}`, pageW - 12, 24, { align: 'right' });

            // Línea dorada decorativa
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(1.2);
            doc.line(0, 38, pageW, 38);

            // ── Banda de resumen ──────────────────────────────
            doc.setFillColor(240, 245, 252);
            doc.rect(0, 39, pageW, 14, 'F');
            doc.setTextColor(15, 52, 96);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);

            const act = _reportData.filter(v => v.estado_registro === 'REGISTRADO').length;
            const fin = _reportData.filter(v => v.estado_registro === 'FINALIZADO').length;
            const rC  = {};
            _reportData.forEach(v => { const r = v.motivo || 'N/A'; rC[r] = (rC[r]||0)+1; });
            const topR = Object.entries(rC).sort((a,b) => b[1]-a[1])[0];

            doc.text(`Total: ${_reportData.length}`, 14, 48);
            doc.text(`|  En curso: ${act}`, 50, 48);
            doc.text(`|  Finalizados: ${fin}`, 90, 48);
            doc.text(`|  Motivo principal: ${topR ? topR[0] : 'N/A'}`, 140, 48);

            // ── Tabla de datos ────────────────────────────────
            const body = _reportData.map((v, i) => [
                i + 1,
                v.nombre_visitante || '—',
                v.dni_visitante    || '—',
                v.motivo           || '—',
                v.usuario?.nombre  || '—',
                _fmtDateTime(v.hora_ingreso),
                _fmtDateTime(v.hora_salida),
                v.estado_registro === 'REGISTRADO' ? 'En curso' : 'Finalizado'
            ]);

            doc.autoTable({
                startY: 54,
                head: [['#', 'Nombre del Visitante', 'Documento', 'Motivo', 'Persona Visitada', 'Hora Ingreso', 'Hora Salida', 'Estado']],
                body,
                theme: 'grid',
                headStyles: {
                    fillColor: [15, 52, 96],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5,
                    halign: 'center',
                    cellPadding: 3
                },
                bodyStyles: { fontSize: 8, textColor: [40, 40, 40], cellPadding: 2.5 },
                alternateRowStyles: { fillColor: [240, 245, 255] },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    5: { halign: 'center', cellWidth: 32 },
                    6: { halign: 'center', cellWidth: 32 },
                    7: { halign: 'center', cellWidth: 22 }
                },
                didParseCell(data) {
                    if (data.column.index === 7 && data.section === 'body') {
                        data.cell.styles.fontStyle = 'bold';
                        if (data.cell.raw === 'En curso') {
                            data.cell.styles.textColor = [21, 128, 61];
                        } else {
                            data.cell.styles.textColor = [100, 100, 100];
                        }
                    }
                },
                didDrawPage() {
                    const pN = doc.internal.getCurrentPageInfo().pageNumber;
                    const pT = doc.internal.getNumberOfPages();
                    doc.setFontSize(7);
                    doc.setTextColor(140, 140, 140);
                    doc.setFont('helvetica', 'normal');
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.4);
                    doc.line(10, pageH - 10, pageW - 10, pageH - 10);
                    doc.text(schoolName, 12, pageH - 5);
                    doc.text(`Reporte de Visitas | ${startDate} — ${endDate}`, pageW / 2, pageH - 5, { align: 'center' });
                    doc.text(`Pág. ${pN} / ${pT}`, pageW - 12, pageH - 5, { align: 'right' });
                },
                margin: { top: 54, left: 10, right: 10, bottom: 15 }
            });

            doc.save(`Reporte_Visitas_${startDate}_al_${endDate}.pdf`);
            _toast('PDF exportado correctamente ✓', 'success');
        } catch (err) {
            console.error('Error al exportar PDF:', err);
            _toast('Error al generar el PDF: ' + err.message, 'error');
        }
    }

    // ─── EXCEL ───────────────────────────────────────────────────
    function _exportExcel() {
        if (!window.XLSX) {
            _toast('La librería SheetJS no está disponible.', 'error');
            console.error('XLSX no encontrado en window.XLSX');
            return;
        }

        try {
            const XLSX       = window.XLSX;
            const startDate  = document.getElementById('startDate')?.value || '';
            const endDate    = document.getElementById('endDate')?.value   || '';
            const schoolName = document.getElementById('reportSchoolName')?.textContent || 'Institución Educativa';

            // Hoja 1 — Datos completos
            const header = ['N°', 'Nombre del Visitante', 'Documento', 'Motivo',
                            'Persona Visitada', 'Hora Ingreso', 'Hora Salida', 'Estado'];
            const rows = _reportData.map((v, i) => [
                i + 1,
                v.nombre_visitante || '',
                v.dni_visitante    || '',
                v.motivo           || '',
                v.usuario?.nombre  || '',
                _fmtDateTime(v.hora_ingreso),
                _fmtDateTime(v.hora_salida),
                v.estado_registro === 'REGISTRADO' ? 'En curso' : 'Finalizado'
            ]);

            const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
            ws1['!cols'] = [
                {wch:5}, {wch:30}, {wch:15}, {wch:25},
                {wch:25}, {wch:20}, {wch:20}, {wch:14}
            ];

            // Hoja 2 — Resumen estadístico
            const act   = _reportData.filter(v => v.estado_registro === 'REGISTRADO').length;
            const fin   = _reportData.filter(v => v.estado_registro === 'FINALIZADO').length;
            const days  = _getDays(startDate, endDate);
            const avg   = _reportData.length > 0 ? (_reportData.length / days).toFixed(2) : '0.00';
            const rC    = {};
            _reportData.forEach(v => {
                const r = v.motivo || 'Sin especificar';
                rC[r] = (rC[r] || 0) + 1;
            });
            const motiRows = Object.entries(rC).sort((a,b) => b[1]-a[1]).map(([m,c]) => [m, c]);

            const ws2 = XLSX.utils.aoa_to_sheet([
                ['REPORTE DE VISITAS — RESUMEN ESTADÍSTICO'],
                [schoolName],
                [`Período: ${startDate} al ${endDate}`],
                [`Generado: ${new Date().toLocaleString('es-ES')}`],
                [],
                ['ESTADÍSTICA', 'VALOR'],
                ['Total de Visitas',    _reportData.length],
                ['Visitas En Curso',    act],
                ['Visitas Finalizadas', fin],
                ['Promedio Diario',     avg],
                [],
                ['MOTIVO', 'CANTIDAD'],
                ...motiRows
            ]);
            ws2['!cols'] = [{wch:35}, {wch:20}];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws1, 'Reporte de Visitas');
            XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

            const fileName = `Reporte_Visitas_${startDate || 'inicio'}_al_${endDate || 'fin'}.xlsx`;
            XLSX.writeFile(wb, fileName);
            _toast('Excel exportado correctamente ✓', 'success');
        } catch (err) {
            console.error('Error al exportar Excel:', err);
            _toast('Error al generar el Excel: ' + err.message, 'error');
        }
    }

    // ─── IMPRIMIR ────────────────────────────────────────────────
    window.printReport = function () {
        if (!_reportData || _reportData.length === 0) {
            _toast('Primero genera el reporte para imprimir.', 'warning');
            return;
        }
        const startDate  = document.getElementById('startDate')?.value || '—';
        const endDate    = document.getElementById('endDate')?.value   || '—';
        const schoolName = document.getElementById('reportSchoolName')?.textContent || 'Institución Educativa';
        const now        = new Date().toLocaleString('es-ES');
        const act        = _reportData.filter(v => v.estado_registro === 'REGISTRADO').length;
        const fin        = _reportData.filter(v => v.estado_registro === 'FINALIZADO').length;

        const rows = _reportData.map((v, i) => `
            <tr>
                <td>${i+1}</td>
                <td>${v.nombre_visitante || '—'}</td>
                <td>${v.dni_visitante    || '—'}</td>
                <td>${v.motivo           || '—'}</td>
                <td>${v.usuario?.nombre  || '—'}</td>
                <td>${_fmtDateTime(v.hora_ingreso)}</td>
                <td>${_fmtDateTime(v.hora_salida)}</td>
                <td class="${v.estado_registro === 'REGISTRADO' ? 'ec' : 'ef'}">
                    ${v.estado_registro === 'REGISTRADO' ? 'En curso' : 'Finalizado'}
                </td>
            </tr>`).join('');

        const html = `<!DOCTYPE html><html lang="es"><head>
        <meta charset="UTF-8">
        <title>Reporte — ${schoolName}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial,sans-serif;font-size:11px;color:#111}
            .hdr{background:#0f3460;color:#fff;padding:16px 20px}
            .hdr h1{font-size:16px;letter-spacing:1px}
            .hdr p{font-size:9px;margin-top:3px;opacity:.85}
            .gold{height:3px;background:#d4af37}
            .sum{display:flex;gap:24px;padding:10px 20px;background:#f0f5fb;border-bottom:1px solid #d0daea;font-size:10px;color:#0f3460;font-weight:bold}
            table{width:100%;border-collapse:collapse}
            th{background:#0f3460;color:#fff;padding:6px;font-size:9px;text-align:center}
            td{padding:5px 6px;border-bottom:1px solid #e0e8f0;font-size:10px}
            tr:nth-child(even) td{background:#f0f5ff}
            td:first-child{text-align:center}
            .ec{color:#15803d;font-weight:bold;text-align:center}
            .ef{color:#777;text-align:center}
            .ftr{margin-top:10px;padding:6px 20px;border-top:1px solid #ccc;font-size:8px;color:#888;display:flex;justify-content:space-between}
            @media print{@page{margin:12mm}}
        </style></head><body>
        <div class="hdr">
            <h1>${schoolName.toUpperCase()}</h1>
            <p>REPORTE OFICIAL DE VISITAS INSTITUCIONALES &nbsp;|&nbsp; Período: ${startDate} al ${endDate}</p>
        </div>
        <div class="gold"></div>
        <div class="sum">
            <span>Total: ${_reportData.length}</span>
            <span>|&nbsp; En curso: ${act}</span>
            <span>|&nbsp; Finalizados: ${fin}</span>
            <span>|&nbsp; Generado: ${now}</span>
        </div>
        <table>
            <thead><tr>
                <th>#</th><th>Nombre del Visitante</th><th>Documento</th>
                <th>Motivo</th><th>Persona Visitada</th>
                <th>Hora Ingreso</th><th>Hora Salida</th><th>Estado</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="ftr">
            <span>${schoolName}</span>
            <span>Reporte de Visitas | ${startDate} — ${endDate}</span>
            <span>Generado: ${now}</span>
        </div>
        </body></html>`;

        const win = window.open('', '_blank', 'width=1100,height=800');
        if (!win) { _toast('Habilita las ventanas emergentes para imprimir.', 'warning'); return; }
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 600);
    };

    // ─── Helper Base64 ───────────────────────────────────────────
    function _toBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    console.log('✅ Módulo Reportes cargado — generateReport, exportReport, printReport asignados a window');

})(); // IIFE — evita contaminar el scope global con variables internas
