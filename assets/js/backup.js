/**
 * SIFAD-MB - Sistema de Respaldos y Exportaciones
 * Maneja la generación de copias de seguridad, bloqueos preventivos y exportaciones.
 */

/**
 * Desencadena la descarga de un respaldo ZIP del sistema.
 */
function triggerBackupDownload() {
    showToast("Generando respaldo del archivo documental...", "info");
    
    setTimeout(async () => {
        try {
            // 1. Obtener todos los datos de IndexedDB
            const db = await initIndexedDB();
            const backupData = {
                fecha: new Date().toISOString(),
                version: '1.0',
                documentos: await getAllFromStore(db, 'documentos'),
                prestamos: await getAllFromStore(db, 'prestamos'),
                timeline: await getAllFromStore(db, 'timeline'),
                configuracion: {
                    ultimo_respaldo: localStorage.getItem('ultimo_respaldo'),
                    usuarios: getRelationalUsers()
                }
            };
            
            // 2. Crear archivo JSON
            const jsonContent = JSON.stringify(backupData, null, 2);
            
            // 3. Crear ZIP usando JSZip
            const zip = new JSZip();
            zip.file('sifad-backup.json', jsonContent);
            
            // 4. Agregar metadatos
            const metadata = {
                sistema: 'SIFAD-MB',
                fecha_generacion: new Date().toISOString(),
                total_documentos: backupData.documentos.length,
                total_prestamos: backupData.prestamos.length,
                usuario_actual: JSON.parse(localStorage.getItem('session') || '{}').nombre_completo || 'Desconocido'
            };
            zip.file('metadata.txt', JSON.stringify(metadata, null, 2));
            
            // 5. Generar y descargar ZIP
            zip.generateAsync({ type: 'blob' })
                .then(content => {
                    // Actualizar fecha de último respaldo
                    const fechaISO = new Date().toISOString().split('T')[0];
                    localStorage.setItem('ultimo_respaldo', fechaISO);
                    
                    // Crear enlace de descarga
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = `SIFAD-BACKUP-${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showToast(`Respaldo generado exitosamente (${backupData.documentos.length} expedientes).`, "success");
                    
                    // Verificar si se debe desbloquear el sistema
                    setTimeout(() => {
                        checkUnlockState();
                    }, 2000);
                })
                .catch(error => {
                    console.error("Error generando ZIP:", error);
                    showToast("Error al generar el respaldo.", "error");
                });
            
        } catch (error) {
            console.error("Error en backup:", error);
            showToast("Error al generar el respaldo.", "error");
        }
    }, 1000);
}

/**
 * Obtiene todos los registros de un almacén de IndexedDB.
 */
function getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            resolve(event.target.result || []);
        };
        
        request.onerror = (event) => {
            reject(new Error(`Error obteniendo ${storeName}: ${event.target.error}`));
        };
    });
}

/**
 * Verifica el estado de desbloqueo después de un respaldo.
 */
function checkUnlockState() {
    if (!isBackupLocked()) {
        showToast("Sistema desbloqueado. Redirigiendo al dashboard...", "success");
        setTimeout(() => {
            routeApplication();
        }, 1500);
    } else {
        showToast("Aún requiere realizar el respaldo.", "warning");
    }
}

/**
 * Actualiza la información de respaldos en el modal.
 */
async function updateBackupMetaInModal() {
    try {
        const db = await initIndexedDB();
        
        // Obtener estadísticas
        const documentos = await getAllFromStore(db, 'documentos');
        const prestamos = await getAllFromStore(db, 'prestamos');
        
        // Actualizar UI si existe el modal
        const statsElement = document.getElementById('backup-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white p-3 rounded-lg border">
                        <span class="text-[9px] font-bold text-slate-500 block">Expedientes</span>
                        <span class="text-lg font-black text-slate-900">${documentos.length}</span>
                    </div>
                    <div class="bg-white p-3 rounded-lg border">
                        <span class="text-[9px] font-bold text-slate-500 block">Préstamos Activos</span>
                        <span class="text-lg font-black text-blue-600">${prestamos.filter(p => !p.fecha_real_devolucion).length}</span>
                    </div>
                </div>
            `;
        }
        
        // Mostrar última fecha de respaldo
        const lastBackupElement = document.getElementById('last-backup-info');
        if (lastBackupElement) {
            const ultimoRespaldo = localStorage.getItem('ultimo_respaldo') || 'Nunca';
            const formatted = ultimoRespaldo !== 'Nunca' ? new Date(ultimoRespaldo + 'T00:00:00').toLocaleDateString('es-VE') : 'Nunca';
            lastBackupElement.textContent = `Último respaldo: ${formatted}`;
        }
        
    } catch (error) {
        console.error("Error actualizando estadísticas de respaldo:", error);
    }
}

/**
 * Exporta un reporte semanal en formato Excel (CSV) o Word (HTML doc).
 */
async function exportWeeklyReport(format) {
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
    
    showToast(`Generando exportación en formato ${format.toUpperCase()}...`, "info");
    
    try {
        const db = await initIndexedDB();
        const documentos = await getAllFromStore(db, 'documentos');
        
        const fechaInicioObj = new Date(fechaInicio);
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setHours(23, 59, 59, 999);
        
        // Filtrar documentos creados/actualizados en el período
        const docsFiltrados = documentos.filter(doc => {
            const fechaDoc = new Date(doc.creado_en || doc.actualizado_en);
            return fechaDoc >= fechaInicioObj && fechaDoc <= fechaFinObj;
        });

        if (docsFiltrados.length === 0) {
            showToast("No se encontraron expedientes en el rango de fechas seleccionado.", "warning");
            return;
        }

        if (format === 'excel') {
            // Generar contenido CSV / Excel Semicolon-Separated
            let csvContent = "\uFEFF"; // BOM para acentos correctos en Excel
            csvContent += "Reporte Semanal SIFAD-MB\n";
            csvContent += `Periodo:;${fechaInicio};al;${fechaFin}\n\n`;
            csvContent += "Código;Tipo;Asunto o Proyecto;Monto (VES);Contratista/Beneficiario;Año Fiscal;Origen Fondo;Ubicación Física;Estatus\n";
            
            docsFiltrados.forEach(doc => {
                const tituloEscapado = doc.titulo.replace(/;/g, ',');
                const beneficiarioEscapado = doc.beneficiario.replace(/;/g, ',');
                const montoFormateado = doc.monto.toString().replace('.', ',');
                csvContent += `${doc.codigo};${doc.tipo};${tituloEscapado};${montoFormateado};${beneficiarioEscapado};${doc.ano_fiscal};${doc.origen_fondo};${doc.ubicacion};${doc.estado}\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte-SIARAD-${fechaInicio}-a-${fechaFin}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Reporte Excel (CSV) exportado exitosamente.", "success");
            closeModal('reports-modal');
        } else if (format === 'word') {
            // Generar contenido HTML simple compatible con MS Word (.doc)
            let wordContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><title>Reporte Semanal SIFAD-MB</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #1e293b; font-size: 18pt; text-align: center; }
                    h2 { color: #4f46e5; font-size: 14pt; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
                    th { background-color: #f3f4f6; font-weight: bold; }
                </style>
                </head>
                <body>
                    <h1>REPORTE SEMANAL - SIFAD-MB</h1>
                    <p style="text-align: center;"><b>Periodo:</b> ${fechaInicio} al ${fechaFin}</p>
                    <p><b>Generado el:</b> ${new Date().toLocaleString('es-VE')}</p>
                    <hr/>
                    <h2>Inventario de Expedientes del Periodo</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Tipo</th>
                                <th>Asunto o Proyecto</th>
                                <th>Monto (VES)</th>
                                <th>Contratista / Beneficiario</th>
                                <th>Año Fiscal</th>
                                <th>Ubicación</th>
                                <th>Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            docsFiltrados.forEach(doc => {
                wordContent += `
                    <tr>
                        <td>${doc.codigo}</td>
                        <td>${doc.tipo}</td>
                        <td>${doc.titulo}</td>
                        <td>${new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(doc.monto)}</td>
                        <td>${doc.beneficiario}</td>
                        <td>${doc.ano_fiscal} (${doc.origen_fondo})</td>
                        <td>${doc.ubicacion}</td>
                        <td>${doc.estado}</td>
                    </tr>
                `;
            });
            
            wordContent += `
                        </tbody>
                    </table>
                    <br/>
                    <p><i>Reporte generado por el Sistema de Información Financiera y Archivo Documental (SIFAD-MB).</i></p>
                </body>
                </html>
            `;
            
            const blob = new Blob([wordContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte-SIARAD-${fechaInicio}-a-${fechaFin}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Reporte en formato Word exportado exitosamente.", "success");
            closeModal('reports-modal');
        }
    } catch (error) {
        console.error("Error al exportar reporte:", error);
        showToast("Error al generar la exportación.", "error");
    }
}

/**
 * Imprime la boleta de préstamo física con la información real de IndexedDB.
 */
async function printLoanTicket(loanId) {
    showToast("Generando boleta de préstamo para impresión...", "info");
    
    try {
        const db = await initIndexedDB();
        
        // 1. Obtener el préstamo
        const loanTransaction = db.transaction(['prestamos'], 'readonly');
        const loanStore = loanTransaction.objectStore('prestamos');
        const loanReq = loanStore.get(parseInt(loanId));
        
        loanReq.onsuccess = async (e) => {
            const prestamo = e.target.result;
            if (!prestamo) {
                showToast("Préstamo no encontrado.", "error");
                return;
            }
            
            // 2. Obtener el documento correspondiente
            const docTransaction = db.transaction(['documentos'], 'readonly');
            const docStore = docTransaction.objectStore('documentos');
            const docReq = docStore.get(prestamo.documento_id);
            
            docReq.onsuccess = (event) => {
                const doc = event.target.result;
                
                // 3. Formatear la boleta de impresión
                const printContainer = document.getElementById('boleta-print-screen');
                if (!printContainer) {
                    showToast("Error: No se encontró el contenedor de impresión.", "error");
                    return;
                }
                
                const fechaSalidaFormateada = new Date(prestamo.fecha_salida).toLocaleString('es-VE');
                const fechaEstimadaFormateada = new Date(prestamo.fecha_estimada + 'T00:00:00').toLocaleDateString('es-VE');
                
                printContainer.innerHTML = `
                    <div style="font-family: 'Inter', sans-serif; padding: 40px; border: 2px solid #000; max-width: 800px; margin: 0 auto; color: #000; background-color: #ffffff;">
                        <!-- Encabezado -->
                        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                            <div style="flex-grow: 1; text-align: center;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase;">Alcaldía Bolivariana de Maracaibo</h2>
                                <h3 style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #4f46e5;">Dirección General de Administración y Finanzas</h3>
                                <h4 style="margin: 3px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase;">Archivo General de Expedientes (SIFAD-MB)</h4>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #000; display: inline-block; padding: 5px 15px;">BOLETA DE CONTROL DE PRÉSTAMO FÍSICO</h1>
                        </div>
                        
                        <!-- Detalles del Préstamo -->
                        <div style="margin-bottom: 30px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; width: 30%; background-color: #f3f4f6;">CÓDIGO DEL EXPEDIENTE:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-family: monospace; font-size: 14px; font-weight: bold;">${doc ? doc.codigo : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">TIPO DE DOCUMENTO:</td>
                                    <td style="padding: 6px; border: 1px solid #000;">${doc ? doc.tipo : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">CONCEPTO / OBRA:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-weight: 500;">${doc ? doc.titulo : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">BENEFICIARIO / CONTRATISTA:</td>
                                    <td style="padding: 6px; border: 1px solid #000;">${doc ? doc.beneficiario : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">MONTO REGISTRADO:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-weight: bold;">${doc ? new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(doc.monto) : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">UBICACIÓN FÍSICA ORIGINAL:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-family: monospace;">${doc ? doc.ubicacion : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">FUNCIONARIO SOLICITANTE:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-weight: bold; text-transform: uppercase;">${prestamo.funcionario}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">OFICINA / DEPARTAMENTO DESTINO:</td>
                                    <td style="padding: 6px; border: 1px solid #000; text-transform: uppercase;">${prestamo.departamento}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">FECHA Y HORA DE SALIDA:</td>
                                    <td style="padding: 6px; border: 1px solid #000;">${fechaSalidaFormateada}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">FECHA ESTIMADA DE RETORNO:</td>
                                    <td style="padding: 6px; border: 1px solid #000; font-weight: bold; color: #b91c1c;">${fechaEstimadaFormateada}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; font-weight: bold; border: 1px solid #000; background-color: #f3f4f6;">AUTORIZADO POR (ARCHIVO):</td>
                                    <td style="padding: 6px; border: 1px solid #000;">${prestamo.creado_por}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="font-size: 10px; margin-bottom: 40px; line-height: 1.5; border: 1px dashed #000; padding: 10px; background-color: #fafafa;">
                            <strong>COMPROMISO DE RETORNO:</strong> El funcionario firmante asume la custodia y responsabilidad legal del expediente físico arriba detallado, comprometiéndose a mantener su integridad (folios, firmas y sellos) y a realizar su devolución formal a este departamento de archivo en la fecha estimada indicada, o antes de ser requerido por auditoría interna. Está prohibido fotocopiar, digitalizar o extraer folios sin autorización previa.
                        </div>
                        
                        <!-- Firmas -->
                        <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 11px;">
                            <div style="width: 45%;">
                                <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;">
                                    <strong>${prestamo.creado_por}</strong><br>
                                    Entregado por (Firma y Sello de Archivo)
                                </div>
                            </div>
                            <div style="width: 45%;">
                                <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px;">
                                    <strong>${prestamo.funcionario}</strong><br>
                                    Recibido Conforme (Firma del Solicitante)
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 40px; text-align: center; font-size: 8px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
                            Sistema SIFAD-MB | Generado por: Beiker Pérez TSU Informática | Impreso el ${new Date().toLocaleString('es-VE')}
                        </div>
                    </div>
                `;
                
                // 4. Invocar la impresión nativa
                setTimeout(() => {
                    window.print();
                    
                    // Limpiar el contenedor de impresión después de imprimir
                    setTimeout(() => {
                        printContainer.innerHTML = '';
                    }, 500);
                }, 500);
            };
        };
    } catch (error) {
        console.error("Error al generar boleta de préstamo:", error);
        showToast("Error al generar boleta de impresión.", "error");
    }
}

/**
 * Abre un modal específico.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Cierra un modal específico.
 */
function closeModal(modalId) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view')) {
        // En modo standalone (pestana independiente), no ocultamos el contenedor principal
        return;
    }
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}



/**
 * Renderiza la lista de asistentes en el modal.
 */
async function renderAssistantsList() {
    try {
        const usuarios = getRelationalUsers();
        const tbody = document.getElementById('assistants-table-body');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const checkIcon = '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></span>';
        const crossIcon = '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">-</span>';

        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-200 hover:bg-slate-50';
            tr.innerHTML = `
                <td class="p-2 font-medium text-slate-800">${user.nombre_completo}</td>
                <td class="p-2 font-mono text-slate-600">${user.usuario}</td>
                <td class="p-2 text-center">${user.permisos?.registrar ? checkIcon : crossIcon}</td>
                <td class="p-2 text-center">${user.permisos?.editar ? checkIcon : crossIcon}</td>
                <td class="p-2 text-center">${user.permisos?.eliminar ? checkIcon : crossIcon}</td>
                <td class="p-2 text-center">${user.permisos?.prestar ? checkIcon : crossIcon}</td>
                <td class="p-2 text-center">${user.permisos?.respaldar ? checkIcon : crossIcon}</td>
                <td class="p-2 text-center">
                    ${user.rol === 'admin' ? 
                        '<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">Admin</span>' : 
                        `<div class="inline-flex items-center gap-1">
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full">Asistente</span>
                            <button onclick="deleteAssistantUser(${user.id})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors inline-flex items-center" title="Eliminar Asistente">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Error renderizando asistentes:", error);
    }
}

/**
 * Restaura el sistema desde un archivo backup .zip.
 */
async function handleRestoreBackup(e) {
    e.preventDefault();
    const fileInput = document.getElementById('restore-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast("Seleccione un archivo de respaldo (.zip).", "error");
        return;
    }
    
    const file = fileInput.files[0];
    showToast("Leyendo copia de seguridad...", "info");
    
    try {
        const zip = await JSZip.loadAsync(file);
        const backupFile = zip.file('sifad-backup.json');
        
        if (!backupFile) {
            showToast("El archivo no parece ser un respaldo válido de SIFAD-MB.", "error");
            return;
        }
        
        const jsonText = await backupFile.async('text');
        const backupData = JSON.parse(jsonText);
        
        if (backupData.version !== '1.0' || !backupData.documentos || !backupData.prestamos) {
            showToast("Estructura de respaldo inválida o incompatible.", "error");
            return;
        }
        
        if (!confirm(`¿Está seguro de restaurar esta copia del ${new Date(backupData.fecha).toLocaleString('es-VE')}?\nSe sobrescribirán todos los datos actuales del inventario.`)) {
            return;
        }
        
        showToast("Restaurando base de datos...", "info");
        
        const db = await initIndexedDB();
        
        // 1. Restaurar documentos
        const docTx = db.transaction(['documentos'], 'readwrite');
        const docStore = docTx.objectStore('documentos');
        await clearStore(docStore);
        for (const doc of backupData.documentos) {
            await addRecordToStore(docStore, doc);
        }
        
        // 2. Restaurar prestamos
        const loanTx = db.transaction(['prestamos'], 'readwrite');
        const loanStore = loanTx.objectStore('prestamos');
        await clearStore(loanStore);
        for (const loan of backupData.prestamos) {
            await addRecordToStore(loanStore, loan);
        }
        
        // 3. Restaurar timeline
        const timelineTx = db.transaction(['timeline'], 'readwrite');
        const timelineStore = timelineTx.objectStore('timeline');
        await clearStore(timelineStore);
        for (const log of (backupData.timeline || [])) {
            await addRecordToStore(timelineStore, log);
        }
        
        // 4. Restaurar LocalStorage
        if (backupData.configuracion) {
            if (backupData.configuracion.ultimo_respaldo) {
                localStorage.setItem('ultimo_respaldo', backupData.configuracion.ultimo_respaldo);
            }
            if (backupData.configuracion.usuarios && backupData.configuracion.usuarios.length > 0) {
                saveRelationalUsers(backupData.configuracion.usuarios);
            }
        }
        
        showToast("Base de datos restaurada con éxito.", "success");
        closeModal('config-modal');
        
        // Limpiar el campo del archivo
        fileInput.value = '';
        
        // Recargar la aplicación para ver los cambios
        setTimeout(() => {
            routeApplication();
        }, 1500);
        
    } catch (error) {
        console.error("Error al restaurar respaldo:", error);
        showToast("Error al restaurar la copia de seguridad. Verifique el archivo.", "error");
    }
}

// Helpers de IndexedDB promesificados para backup
function clearStore(store) {
    return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

function addRecordToStore(store, record) {
    return new Promise((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

// Registrar el escuchador de eventos de carga al iniciar el script
document.addEventListener('DOMContentLoaded', () => {
    const restoreForm = document.getElementById('restore-form');
    if (restoreForm) {
        restoreForm.addEventListener('submit', handleRestoreBackup);
    }
});