/**
 * SIFAD-MB - Sistema de Reportes y Cierres Semanales
 * Genera reportes, estadísticas y documentos de cierre.
 */

/**
 * Genera y descarga un reporte de cierre semanal.
 */
async function generateWeeklyReport() {
    try {
        showToast("Generando reporte semanal...", "info");
        
        const fechaInicio = document.getElementById('rep-inicio').value;
        const fechaFin = document.getElementById('rep-fin').value;
        
        if (!fechaInicio || !fechaFin) {
            showToast("Seleccione fechas de inicio y fin.", "error");
            return;
        }
        
        if (new Date(fechaFin) < new Date(fechaInicio)) {
            showToast("La fecha fin debe ser posterior a la fecha inicio.", "error");
            return;
        }
        
        const db = await initIndexedDB();
        const documentos = await getAllFromStore(db, 'documentos');
        const prestamos = await getAllFromStore(db, 'prestamos');
        const timeline = await getAllFromStore(db, 'timeline');
        
        // Filtrar por rango de fechas usando comparación de cadenas YYYY-MM-DD
        // Documentos creados en el período
        const docsCreados = documentos.filter(doc => {
            const docDateStr = (doc.creado_en || doc.actualizado_en || '').split('T')[0];
            return docDateStr >= fechaInicio && docDateStr <= fechaFin;
        });
        
        // Préstamos realizados en el período
        const prestamosRealizados = prestamos.filter(prestamo => {
            const loanDateStr = (prestamo.fecha_salida || '').split('T')[0];
            return loanDateStr >= fechaInicio && loanDateStr <= fechaFin;
        });
        
        // Devoluciones en el período
        const devoluciones = prestamos.filter(prestamo => {
            if (!prestamo.fecha_real_devolucion) return false;
            const returnDateStr = prestamo.fecha_real_devolucion.split('T')[0];
            return returnDateStr >= fechaInicio && returnDateStr <= fechaFin;
        });
        
        // Generar contenido del reporte
        const reportContent = generateReportContent(
            fechaInicio, fechaFin,
            documentos, docsCreados,
            prestamos, prestamosRealizados, devoluciones,
            timeline
        );
        
        // Crear y descargar archivo
        downloadReport(reportContent, fechaInicio, fechaFin);
        
    } catch (error) {
        console.error("Error generando reporte:", error);
        showToast("Error al generar el reporte.", "error");
    }
}

/**
 * Genera el contenido del reporte.
 */
function generateReportContent(fechaInicio, fechaFin, todosDocs, docsCreados, todosPrestamos, prestamosRealizados, devoluciones, timeline) {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    const fechaGeneracion = new Date().toLocaleString('es-VE');
    
    // Estadísticas
    const totalDocs = todosDocs.length;
    const totalPrestamos = todosPrestamos.filter(p => !p.fecha_real_devolucion).length;
    const montoTotal = todosDocs.reduce((sum, doc) => sum + (doc.monto || 0), 0);
    
    // Documentos por tipo
    const docsPorTipo = {};
    todosDocs.forEach(doc => {
        docsPorTipo[doc.tipo] = (docsPorTipo[doc.tipo] || 0) + 1;
    });
    
    // Generar HTML del reporte
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Semanal SIFAD-MB</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e293b;
            margin: 0;
            font-size: 24px;
        }
        .header h2 {
            color: #4f46e5;
            margin: 5px 0;
            font-size: 18px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f3f4f6;
            color: #1e293b;
            padding: 10px 15px;
            font-weight: bold;
            border-left: 4px solid #4f46e5;
            margin-bottom: 15px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border: 1px solid #e1e4e8;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #4f46e5;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 12px;
        }
        th {
            background-color: #f9fafb;
            color: #374151;
            font-weight: bold;
            text-align: left;
            padding: 10px;
            border-bottom: 2px solid #e5e7eb;
            text-transform: uppercase;
            font-size: 11px;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
            background-color: #f9fafb;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-success { background-color: #00c875; color: white; }
        .badge-warning { background-color: #ffad00; color: white; }
        .badge-info { background-color: #0086f0; color: white; }
        .badge-danger { background-color: #e44b44; color: white; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sistema de Información Financiera y Archivo Documental (SIFAD-MB)</h1>
        <h2>Reporte de Cierre Semanal</h2>
        <p><strong>Período:</strong> ${fechaInicio} al ${fechaFin}</p>
        <p><strong>Generado por:</strong> ${session.nombre_completo || 'Usuario'} | <strong>Fecha:</strong> ${fechaGeneracion}</p>
    </div>
    
    <div class="section">
        <div class="section-title">1. Resumen Ejecutivo</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Expedientes</div>
                <div class="stat-value">${totalDocs}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Nuevos en Período</div>
                <div class="stat-value">${docsCreados.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Préstamos Activos</div>
                <div class="stat-value">${totalPrestamos}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Monto Total (VES)</div>
                <div class="stat-value">${new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(montoTotal)}</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">2. Distribución por Tipo de Documento</div>
        <table>
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(docsPorTipo).map(([tipo, cantidad]) => `
                <tr>
                    <td>${tipo}</td>
                    <td>${cantidad}</td>
                    <td>${((cantidad / totalDocs) * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">3. Actividad en el Período</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Préstamos Realizados</div>
                <div class="stat-value">${prestamosRealizados.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Devoluciones</div>
                <div class="stat-value">${devoluciones.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Digitalizaciones</div>
                <div class="stat-value">${timeline.filter(t => {
                    if (t.accion !== 'Digitalización') return false;
                    const tDateStr = (t.fecha || '').split('T')[0];
                    return tDateStr >= fechaInicio && tDateStr <= fechaFin;
                }).length}</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">4. Nuevos Expedientes Registrados</div>
        ${docsCreados.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Beneficiario</th>
                    <th>Monto (VES)</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${docsCreados.slice(0, 10).map(doc => `
                <tr>
                    <td>${doc.codigo}</td>
                    <td>${doc.tipo}</td>
                    <td>${doc.beneficiario}</td>
                    <td>${new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(doc.monto || 0)}</td>
                    <td>${doc.ubicacion}</td>
                    <td><span class="badge ${getBadgeClass(doc.estado)}">${doc.estado}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ${docsCreados.length > 10 ? `<p class="text-center"><em>... y ${docsCreados.length - 10} expedientes más</em></p>` : ''}
        ` : '<p class="text-center"><em>No se registraron nuevos expedientes en este período.</em></p>'}
    </div>
    
    <div class="section">
        <div class="section-title">5. Recomendaciones y Observaciones</div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0;">
            <p><strong>Observaciones:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Verificar estado de expedientes incompletos: ${todosDocs.filter(d => d.estado === 'Incompleto').length}</li>
                <li>Préstamos pendientes por devolver: ${totalPrestamos}</li>
                <li>Último respaldo: ${(() => {
                    const r = localStorage.getItem('ultimo_respaldo') || 'Nunca';
                    return r !== 'Nunca' ? new Date(r + 'T00:00:00').toLocaleDateString('es-VE') : 'Nunca';
                })()}</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>SIFAD-MB - Sistema de Información Financiera y Archivo Documental</p>
        <p>Dirección General de Administración y Finanzas | Alcaldía Bolivariana de Maracaibo</p>
        <p>Reporte generado automáticamente el ${fechaGeneracion}</p>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 24px; background-color: #1e293b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
            Imprimir Reporte Oficial
        </button>
    </div>
    
    <script>
        function getBadgeClass(estado) {
            const clases = {
                'Disponible': 'badge-success',
                'Pendiente por Archivar': 'badge-warning',
                'Prestado': 'badge-info',
                'Incompleto': 'badge-danger'
            };
            return clases[estado] || 'badge-info';
        }
    </script>
</body>
</html>`;
}

/**
 * Obtiene la clase CSS para el badge según el estado.
 */
function getBadgeClass(estado) {
    const clases = {
        'Disponible': 'badge-success',
        'Pendiente por Archivar': 'badge-warning', 
        'Prestado': 'badge-info',
        'Incompleto': 'badge-danger'
    };
    return clases[estado] || 'badge-info';
}

/**
 * Descarga el reporte generado.
 */
function downloadReport(content, fechaInicio, fechaFin) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `Reporte-SIARAD-${fechaInicio}-a-${fechaFin}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast("Reporte generado y descargado exitosamente.", "success");
}

/**
 * Exporta la lista actual filtrada de expedientes a formato Excel (CSV).
 */
function exportToExcel() {
    if (!documentList || documentList.length === 0) {
        showToast("No hay datos para exportar.", "warning");
        return;
    }
    
    showToast("Generando archivo Excel del inventario actual...", "info");
    
    try {
        let csvContent = "\uFEFF"; // BOM para acentos
        csvContent += "Inventario de Expedientes - SIFAD-MB\n";
        csvContent += `Fecha de Generación:;${new Date().toLocaleString('es-VE')}\n\n`;
        csvContent += "Código;Tipo;Asunto o Proyecto;Monto (VES);Contratista/Beneficiario;Año Fiscal;Origen Fondo;Ubicación Física;Estatus\n";
        
        // Obtener los documentos actualmente filtrados
        const searchInput = document.getElementById('search-input')?.value.toLowerCase() || '';
        const filterYear = document.getElementById('filter-year')?.value || '';
        const filterType = document.getElementById('filter-type')?.value || '';
        const filterStatus = document.getElementById('filter-status')?.value || '';

        const docsToExport = documentList.filter(doc => {
            const matchSearch = !searchInput || 
                doc.codigo.toLowerCase().includes(searchInput) ||
                doc.titulo.toLowerCase().includes(searchInput) ||
                doc.beneficiario.toLowerCase().includes(searchInput) ||
                doc.origen_fondo.toLowerCase().includes(searchInput) ||
                doc.ubicacion.toLowerCase().includes(searchInput);

            const matchYear = !filterYear || doc.ano_fiscal.toString() === filterYear;
            const matchType = !filterType || doc.tipo === filterType;
            const matchStatus = !filterStatus || doc.estado === filterStatus;

            return matchSearch && matchYear && matchType && matchStatus;
        });

        if (docsToExport.length === 0) {
            showToast("No hay registros que coincidan con los filtros actuales.", "warning");
            return;
        }

        docsToExport.forEach(doc => {
            const tituloEscapado = doc.titulo.replace(/;/g, ',');
            const beneficiarioEscapado = doc.beneficiario.replace(/;/g, ',');
            const montoFormateado = doc.monto.toString().replace('.', ',');
            csvContent += `${doc.codigo};${doc.tipo};${tituloEscapado};${montoFormateado};${beneficiarioEscapado};${doc.ano_fiscal};${doc.origen_fondo};${doc.ubicacion};${doc.estado}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SIARAD-INVENTARIO-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exportados ${docsToExport.length} expedientes a Excel.`, "success");
    } catch (error) {
        console.error("Error al exportar a Excel:", error);
        showToast("Error al generar el archivo Excel.", "error");
    }
}

/**
 * Genera reporte de préstamos vencidos.
 */
async function generateOverdueLoansReport() {
    try {
        const db = await initIndexedDB();
        const prestamos = await getAllFromStore(db, 'prestamos');
        const hoy = new Date();
        
        const prestamosVencidos = prestamos.filter(prestamo => {
            if (prestamo.fecha_real_devolucion) return false;
            const fechaEstimada = new Date(prestamo.fecha_estimada);
            return fechaEstimada < hoy;
        });
        
        if (prestamosVencidos.length === 0) {
            showToast("No hay préstamos vencidos.", "info");
            return;
        }
        
        // Obtener información de documentos
        const documentos = await getAllFromStore(db, 'documentos');
        
        let reportContent = "REPORTE INSTITUCIONAL DE PRÉSTAMOS VENCIDOS\n";
        reportContent += "====================================\n\n";
        
        prestamosVencidos.forEach(prestamo => {
            const documento = documentos.find(d => d.id === prestamo.documento_id);
            const diasVencido = Math.floor((hoy - new Date(prestamo.fecha_estimada)) / (1000 * 60 * 60 * 24));
            
            reportContent += `Código: ${documento?.codigo || 'N/A'}\n`;
            reportContent += `Documento: ${documento?.titulo || 'N/A'}\n`;
            reportContent += `Prestado a: ${prestamo.funcionario} (${prestamo.departamento})\n`;
            reportContent += `Fecha salida: ${new Date(prestamo.fecha_salida).toLocaleDateString('es-VE')}\n`;
            reportContent += `Fecha estimada: ${new Date(prestamo.fecha_estimada).toLocaleDateString('es-VE')}\n`;
            reportContent += `Días vencido: ${diasVencido}\n`;
            reportContent += "------------------------------------\n";
        });
        
        // Descargar como archivo de texto
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `Prestamos-Vencidos-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showToast(`Reporte de ${prestamosVencidos.length} préstamos vencidos generado.`, "success");
        
    } catch (error) {
        console.error("Error generando reporte de préstamos vencidos:", error);
        showToast("Error al generar el reporte.", "error");
    }
}

let cachedTimelineLogs = []; // Cache en memoria para filtrado instantáneo

/**
 * Carga y renderiza el historial de auditoría global en el modal.
 */
async function renderGlobalAuditLog() {
    const list = document.getElementById('global-audit-list');
    if (!list) return;
    
    list.innerHTML = '<li class="text-center text-slate-400 py-4 font-semibold">Cargando historial de auditoría global...</li>';
    
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['timeline', 'documentos'], 'readonly');
        const timelineStore = transaction.objectStore('timeline');
        const docStore = transaction.objectStore('documentos');
        
        const timelineReq = timelineStore.getAll();
        
        timelineReq.onsuccess = (e) => {
            const logs = e.target.result || [];
            // Ordenar de más nuevo a más viejo
            logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            const docsReq = docStore.getAll();
            docsReq.onsuccess = (event) => {
                const docs = event.target.result || [];
                
                // Mapear con código de documento
                cachedTimelineLogs = logs.map(log => {
                    const doc = docs.find(d => d.id === log.documento_id);
                    return {
                        ...log,
                        doc_codigo: doc ? doc.codigo : 'N/A',
                        doc_titulo: doc ? doc.titulo : 'N/A'
                    };
                });
                
                // Renderizar los logs filtrados
                applyAuditFiltering(cachedTimelineLogs);
            };
        };
    } catch (error) {
        console.error("Error cargando auditoría global:", error);
        list.innerHTML = '<li class="text-red-500 py-4 font-bold text-center">Error al cargar la bitácora de auditoría.</li>';
    }
}

/**
 * Filtra la lista de auditoría en memoria según el campo de búsqueda.
 */
function filterGlobalAuditLog() {
    const input = document.getElementById('audit-search-input')?.value.toLowerCase() || '';
    
    const filtered = cachedTimelineLogs.filter(log => {
        return log.accion.toLowerCase().includes(input) ||
               log.descripcion.toLowerCase().includes(input) ||
               log.usuario_nombre.toLowerCase().includes(input) ||
               log.doc_codigo.toLowerCase().includes(input) ||
               log.doc_titulo.toLowerCase().includes(input);
    });
    
    applyAuditFiltering(filtered);
}

/**
 * Dibuja las filas de la bitácora en el modal.
 */
function applyAuditFiltering(logs) {
    const list = document.getElementById('global-audit-list');
    if (!list) return;
    
    list.innerHTML = '';
    if (logs.length === 0) {
        list.innerHTML = '<li class="text-center text-slate-400 py-4 font-medium">No se encontraron movimientos registrados en la bitácora.</li>';
        return;
    }
    
    logs.forEach(log => {
        const li = document.createElement('li');
        li.className = "border-l-2 border-indigo-500 pl-4 py-2 relative";
        
        let badgeColor = 'bg-indigo-50 text-indigo-700';
        if (log.accion === 'Creación') badgeColor = 'bg-green-50 text-green-700';
        else if (log.accion === 'Eliminación') badgeColor = 'bg-red-50 text-red-700';
        else if (log.accion === 'Préstamo') badgeColor = 'bg-amber-50 text-amber-700';
        else if (log.accion === 'Devolución') badgeColor = 'bg-blue-50 text-blue-700';
        
        const fechaFormateada = new Date(log.fecha).toLocaleString('es-VE');
        
        li.innerHTML = `
            <div class="absolute -left-[6px] top-[14px] w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white"></div>
            <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[10px] text-slate-400 font-semibold block">${fechaFormateada}</span>
                <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${badgeColor}">${log.accion}</span>
                <span class="text-[9px] font-bold text-slate-500">Expediente: ${log.doc_codigo}</span>
            </div>
            <p class="text-xs text-slate-700 font-semibold">${log.descripcion}</p>
            <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">
                Responsable: ${log.usuario_nombre}
            </span>
        `;
        list.appendChild(li);
    });
}