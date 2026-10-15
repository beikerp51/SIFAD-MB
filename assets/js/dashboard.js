/**
 * SIFAD-MB - Controlador del Tablero de Datos (Light Theme)
 * Filtra los expedientes de IndexedDB y renderiza la tabla.
 * Controla el cajón deslizable derecho (Details Drawer) al hacer clic en las filas.
 */

let documentList = []; // Lista cacheada en memoria
let activeUserPermissions = {};

/**
 * Consulta la base de datos IndexedDB para obtener todos los expedientes
 * y actualizar la tabla en pantalla.
 */
async function loadDocumentsFromDB() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session) return;
    activeUserPermissions = session.permisos || {};

    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['documentos'], 'readonly');
        const store = transaction.objectStore('documentos');
        const request = store.getAll();

        request.onsuccess = (event) => {
            documentList = event.target.result || [];
            
            // Cargar estado de visibilidad del panel de gráficos
            const isVisible = localStorage.getItem('charts_panel_visible') !== 'false';
            const panel = document.getElementById('charts-panel');
            if (panel) {
                if (isVisible) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            }

            // Actualizar filtro de años fiscales disponibles
            updateYearFilterDropdown(documentList);
            
            // Aplicar filtros actuales
            applyFilters();
            
            // Comprobar préstamos vencidos
            checkOverdueLoans();
        };

        request.onerror = () => {
            showToast("Error de consulta en el inventario local.", "error");
        };

    } catch (e) {
        console.error(e);
    }
}

/**
 * Extrae los años fiscales de los documentos y actualiza el combobox de filtro.
 */
function updateYearFilterDropdown(docs) {
    const select = document.getElementById('filter-year');
    if (!select) return;

    const years = [...new Set(docs.map(d => d.ano_fiscal))].sort((a, b) => b - a);
    const currentValue = select.value;

    select.innerHTML = '<option value="">AÑO FISCAL (TODOS)</option>';
    years.forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = yr;
        select.appendChild(opt);
    });

    select.value = currentValue;
}

/**
 * Filtra el arreglo local en memoria y actualiza la UI.
 */
function applyFilters() {
    const searchInput = document.getElementById('search-input')?.value.toLowerCase() || '';
    const filterYear = document.getElementById('filter-year')?.value || '';
    const filterType = document.getElementById('filter-type')?.value || '';
    const filterStatus = document.getElementById('filter-status')?.value || '';

    const filteredDocs = documentList.filter(doc => {
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

    renderDocumentTableRows(filteredDocs);
    updateSummaryStatistics(documentList);
    renderSVGCharts(filteredDocs);
}

/**
 * Renderiza los registros filtrados en la tabla HTML.
 */
function renderDocumentTableRows(docs) {
    const tbody = document.getElementById('document-table-body');
    if (!tbody) return;

    if (docs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12 text-slate-400 font-medium text-xs">
                    No se encontraron expedientes con los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    docs.forEach(doc => {
        const montoVES = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(doc.monto);

        // Clases de color del estatus (Tema Claro)
        let badgeClass = 'status-badge-disponible';
        if (doc.estado === 'Pendiente por Archivar') {
            badgeClass = 'status-badge-archivar';
        } else if (doc.estado === 'Prestado') {
            badgeClass = 'status-badge-prestado';
        } else if (doc.estado === 'Incompleto') {
            badgeClass = 'status-badge-incompleto';
        }

        const userSession = JSON.parse(localStorage.getItem('session'));
        const isAdmin = userSession?.rol === 'admin';
        const canDelete = isAdmin || activeUserPermissions.eliminar;

        const actionButtons = `
            <div class="flex items-center justify-center gap-1.5 no-print">
                <!-- Ver digitalización -->
                ${doc.ruta_archivo ? `
                    <button onclick="event.stopPropagation(); openDetailsDrawer(${doc.id}, 'upload')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver archivo digital">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                ` : `
                    <button onclick="event.stopPropagation(); openDetailsDrawer(${doc.id}, 'upload')" class="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Sin archivo (Subir)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    </button>
                `}
                
                <!-- Préstamos / Devoluciones -->
                ${doc.estado === 'Prestado' ? `
                    <button onclick="event.stopPropagation(); openDetailsDrawer(${doc.id}, 'loans')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm transition-colors">
                        Retorno
                    </button>
                ` : (doc.estado === 'Incompleto' ? `
                    <button class="px-2.5 py-1 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-wider cursor-not-allowed" disabled title="Bloqueado: Expediente incompleto">
                        Bloqueado
                    </button>
                ` : `
                    <button onclick="event.stopPropagation(); openDetailsDrawer(${doc.id}, 'loans')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm transition-colors">
                        Prestar
                    </button>
                `)}

                <!-- Bitácora -->
                <button onclick="event.stopPropagation(); openDetailsDrawer(${doc.id}, 'timeline')" class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Ver bitácora">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
                
                <!-- Eliminar -->
                ${canDelete ? `
                    <button onclick="event.stopPropagation(); confirmDeleteDoc(${doc.id}, '${doc.codigo}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                ` : ''}
            </div>
        `;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 border-b border-slate-200 transition-colors";
        tr.setAttribute('onclick', `openDetailsDrawer(${doc.id}, 'details')`);
        tr.innerHTML = `
            <td class="px-3 py-3 font-semibold text-slate-700">${doc.codigo}</td>
            <td class="px-3 py-3 text-slate-500 font-medium">${doc.tipo}</td>
            <td class="px-3 py-3 text-slate-900 font-semibold max-w-xs truncate" title="${doc.titulo}">${doc.titulo}</td>
            <td class="px-3 py-3 text-slate-900 font-bold">${montoVES}</td>
            <td class="px-3 py-3 text-slate-600 max-w-xs truncate font-medium" title="${doc.beneficiario}">${doc.beneficiario}</td>
            <td class="px-3 py-3 text-slate-500 font-semibold">${doc.ano_fiscal} (${doc.origen_fondo})</td>
            <td class="px-3 py-3 text-slate-600 font-medium">${doc.ubicacion}</td>
            <td class="px-3 py-3 text-center">
                <span class="inline-block px-3 py-1 text-[10px] uppercase font-bold rounded-full ${badgeClass}">
                    ${doc.estado}
                </span>
            </td>
            <td class="px-3 py-3 text-center">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Actualiza las estadísticas de las tarjetas superiores en base al inventario total.
 */
function updateSummaryStatistics(docs) {
    const total = docs.length;
    const disponibles = docs.filter(d => d.estado === 'Disponible').length;
    const prestados = docs.filter(d => d.estado === 'Prestado').length;
    const incompletos = docs.filter(d => d.estado === 'Incompleto').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-disponibles').textContent = disponibles;
    document.getElementById('stat-prestados').textContent = prestados;
    document.getElementById('stat-incompletos').textContent = incompletos;
}

/**
 * Genera automáticamente el código secuencial correlativo.
 */
function generateDocumentCode(tipo, ano) {
    const prefijos = {
        'Orden de Pago': 'OP-ADM',
        'Proyecto': 'PR-ADM',
        'Obra': 'OB-ADM',
        'Contrato': 'CO-ADM',
        'Factura': 'FA-ADM'
    };

    const prefijoBase = prefijos[tipo] || 'DOC-ADM';
    const patron = `${prefijoBase}-${ano}-`;

    const docsMismoAnoYTipo = documentList.filter(d => d.codigo.startsWith(patron));
    let maxCorrelativo = 0;

    docsMismoAnoYTipo.forEach(doc => {
        const partes = doc.codigo.split('-');
        const num = parseInt(partes[partes.length - 1], 10);
        if (num > maxCorrelativo) {
            maxCorrelativo = num;
        }
    });

    const siguienteNum = maxCorrelativo + 1;
    return `${patron}${siguienteNum.toString().padStart(3, '0')}`;
}

// ==============================================================================
// GESTIÓN DEL CAJÓN DESLIZABLE DE DETALLES (DRAWER)
// ==============================================================================

/**
 * Abre el cajón deslizable para registrar un nuevo expediente.
 */
function openCreateDocModal() {
    console.log("Iniciando openCreateDocModal()...");
    try {
        // Limpiar formulario para nuevo documento
        document.getElementById('doc-id').value = '';
        document.getElementById('doc-tipo').value = 'Orden de Pago';
        document.getElementById('doc-beneficiario').value = '';
        document.getElementById('doc-titulo').value = '';
        document.getElementById('doc-monto').value = '';
        document.getElementById('doc-ano_fiscal').value = new Date().getFullYear();
        document.getElementById('doc-origen_fondo').value = 'FCI';
        document.getElementById('doc-ubicacion').value = '';
        document.getElementById('doc-firmado').checked = false;
        document.getElementById('doc-sellado').checked = false;
        
        console.log("Campos de formulario limpiados. Abriendo cajón de detalles...");
        // Mostrar cajón de detalles en modo registro
        openDetailsDrawer(null, 'details');
    } catch (e) {
        console.error("Falla crítica en openCreateDocModal:", e);
        showToast("Error al abrir formulario de registro: " + e.message, "error");
    }
}

/**
 * Abre el cajón deslizable derecho y carga la información del expediente.
 */
async function openDetailsDrawer(id, tabName = 'details') {
    console.log(`openDetailsDrawer convocado con id=${id}, tabName=${tabName}`);
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        const isAdmin = session?.rol === 'admin';

        // Manejar registro de nuevo expediente (id es null o indefinido)
        if (id === null || id === undefined || id === '') {
            console.log("Cargando vista para expediente NUEVO...");
            document.getElementById('drawer-doc-code').textContent = 'NUEVO';
            document.getElementById('drawer-doc-title').textContent = 'Registrar Nuevo Expediente';

            // Ocultar pestañas dependientes (no existe documento aún)
            document.getElementById('tab-btn-upload').classList.add('hidden');
            document.getElementById('tab-btn-loans').classList.add('hidden');
            document.getElementById('tab-btn-timeline').classList.add('hidden');

            document.getElementById('doc-id').value = '';
            document.getElementById('doc-ubicacion').value = '';
            update2DRackMap();

            const canRegister = isAdmin || session?.permisos?.registrar;
            const detailsActions = document.getElementById('drawer-details-actions');
            if (detailsActions) {
                if (canRegister) {
                    detailsActions.classList.remove('hidden');
                } else {
                    detailsActions.classList.add('hidden');
                }
            }

            switchDrawerTab('details');

            const drawer = document.getElementById('details-drawer');
            const overlay = document.getElementById('details-drawer-overlay');
            if (drawer) {
                drawer.classList.remove('translate-x-full');
                drawer.classList.add('translate-x-0');
            }
            if (overlay) {
                overlay.classList.remove('hidden');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    overlay.classList.add('opacity-100');
                }, 10);
            }
            console.log("Cajón abierto con éxito.");
            return;
        }

    const doc = documentList.find(d => d.id == id);
    if (!doc) return;

    // 1. Cabecera
    document.getElementById('drawer-doc-code').textContent = doc.codigo;
    document.getElementById('drawer-doc-title').textContent = doc.titulo;

    // Habilitar pestañas dependientes
    document.getElementById('tab-btn-upload').classList.remove('hidden');
    document.getElementById('tab-btn-loans').classList.remove('hidden');
    document.getElementById('tab-btn-timeline').classList.remove('hidden');

    // 2. Cargar datos en pestaña Detalles
    document.getElementById('doc-id').value = doc.id;
    document.getElementById('doc-tipo').value = doc.tipo;
    document.getElementById('doc-beneficiario').value = doc.beneficiario;
    document.getElementById('doc-titulo').value = doc.titulo;
    document.getElementById('doc-monto').value = doc.monto;
    document.getElementById('doc-ano_fiscal').value = doc.ano_fiscal;
    document.getElementById('doc-origen_fondo').value = doc.origen_fondo;
    document.getElementById('doc-ubicacion').value = doc.ubicacion;
    document.getElementById('doc-firmado').checked = doc.firmado == 1;
    document.getElementById('doc-sellado').checked = doc.sellado == 1;
    update2DRackMap();

    // Ajustar ACL para botones de guardar
    const canEdit = isAdmin || session?.permisos?.editar;
    const detailsActions = document.getElementById('drawer-details-actions');
    if (canEdit) {
        detailsActions.classList.remove('hidden');
    } else {
        detailsActions.classList.add('hidden');
    }

    // 3. Cargar datos en pestaña Digitalización
    document.getElementById('upload-doc-id').value = doc.id;
    const uploadFormContainer = document.getElementById('drawer-upload-form-container');
    const canUpload = isAdmin || session?.permisos?.registrar;
    if (canUpload) {
        uploadFormContainer.classList.remove('hidden');
    } else {
        uploadFormContainer.classList.add('hidden');
    }

    const viewerContainer = document.getElementById('viewer-content-container');
    if (doc.ruta_archivo) {
        viewerContainer.innerHTML = `
            <div class="text-center py-6 text-slate-500 font-semibold">Cargando escaneo digital diferido (Lazy Loading)...</div>
        `;
        // Disparar carga diferida
        setTimeout(async () => {
            try {
                const db = await initIndexedDB();
                const transaction = db.transaction(['documentos'], 'readonly');
                const store = transaction.objectStore('documentos');
                const req = store.get(doc.id);
                req.onsuccess = (e) => {
                    const actualDoc = e.target.result;
                    if (actualDoc && actualDoc.ruta_archivo) {
                        const base64Data = actualDoc.ruta_archivo;
                        const mimeType = base64Data.split(';')[0].split(':')[1] || '';

                        if (mimeType.includes('pdf')) {
                            viewerContainer.innerHTML = `
                                <embed src="${base64Data}" type="application/pdf" width="100%" height="450px" class="rounded border border-slate-200">
                            `;
                        } else if (mimeType.includes('image')) {
                            viewerContainer.innerHTML = `
                                <div class="overflow-auto max-h-[450px] flex justify-center bg-slate-50 p-2 rounded w-full">
                                    <img src="${base64Data}" class="max-w-full h-auto object-contain">
                                </div>
                            `;
                        } else {
                            viewerContainer.innerHTML = `
                                <div class="text-center py-8">
                                    <a href="${base64Data}" download="DOC_${actualDoc.codigo}.${mimeType.split('/')[1]}" class="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-xs uppercase tracking-wider">Descargar Archivo</a>
                                </div>
                            `;
                        }
                    }
                };
            } catch (err) {
                viewerContainer.innerHTML = '<div class="text-red-500 font-bold text-center">Error al previsualizar.</div>';
            }
        }, 300);
    } else {
        viewerContainer.innerHTML = `
            <span class="text-slate-400 text-xs italic font-medium">Sin digitalización cargada en IndexedDB</span>
        `;
    }

    // 4. Cargar datos en pestaña Préstamos
    document.getElementById('loan-doc-id').value = doc.id;
    const loanStatusBadge = document.getElementById('drawer-loan-status-badge');
    const loanActiveActions = document.getElementById('drawer-loan-active-actions');
    const loanFormContainer = document.getElementById('drawer-loan-form-container');
    const returnFormContainer = document.getElementById('drawer-return-form-container');

    loanFormContainer.classList.add('hidden');
    returnFormContainer.classList.add('hidden');
    loanActiveActions.innerHTML = '';

    // Clases del estatus
    let statusClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (doc.estado === 'Pendiente por Archivar') {
        statusClass = 'bg-amber-100 text-amber-800 border border-amber-200';
    } else if (doc.estado === 'Prestado') {
        statusClass = 'bg-blue-100 text-blue-800 border border-blue-200';
    } else if (doc.estado === 'Incompleto') {
        statusClass = 'bg-slate-100 text-slate-500 border border-slate-200';
    }

    loanStatusBadge.className = `px-3 py-1 text-xs font-bold rounded-full inline-block mt-1 ${statusClass}`;
    loanStatusBadge.textContent = doc.estado;

    const canLend = isAdmin || session?.permisos?.prestar;

    if (doc.estado === 'Prestado') {
        // Buscar el préstamo activo
        try {
            const db = await initIndexedDB();
            const transaction = db.transaction(['prestamos'], 'readonly');
            const store = transaction.objectStore('prestamos');
            const index = store.index('idx_doc_id');
            const request = index.getAll(doc.id);

            request.onsuccess = (event) => {
                const loans = event.target.result || [];
                const activeLoan = loans.find(l => l.fecha_real_devolucion === null);

                if (activeLoan) {
                    if (canLend) {
                        returnFormContainer.classList.remove('hidden');
                        document.getElementById('return-loan-id').value = activeLoan.id;
                        document.getElementById('return-funcionario-info').textContent = `Prestado a: ${activeLoan.funcionario} (${activeLoan.departamento}) el ${activeLoan.fecha_salida}`;
                    }

                    // Botón para reimprimir boleta
                    loanActiveActions.innerHTML = `
                        <button onclick="printLoanTicket(${activeLoan.id})" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            Reimprimir Boleta
                        </button>
                    `;
                }
            };
        } catch (e) {
            console.error(e);
        }
    } else if (doc.estado === 'Incompleto') {
        loanActiveActions.innerHTML = `
            <span class="text-xs text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                EXPEDIENTE INCOMPLETO
            </span>
        `;
    } else {
        // Disponible / Pendiente por Archivar
        if (canLend) {
            loanFormContainer.classList.remove('hidden');
            const tresDias = new Date();
            tresDias.setDate(tresDias.getDate() + 3);
            document.getElementById('loan-fecha_estimada').value = tresDias.toISOString().split('T')[0];
        }
    }

    // 5. Cargar línea de tiempo (Bitácora)
    const list = document.getElementById('timeline-list');
    list.innerHTML = '<li class="text-center text-slate-400 py-4 font-semibold">Cargando historial de auditoría...</li>';
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['timeline'], 'readonly');
        const store = transaction.objectStore('timeline');
        const index = store.index('idx_doc_id');
        const request = index.getAll(doc.id);

        request.onsuccess = (event) => {
            const logs = event.target.result || [];
            logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            list.innerHTML = '';
            if (logs.length === 0) {
                list.innerHTML = '<li class="text-center text-slate-400 py-4 font-medium">Sin movimientos registrados.</li>';
                return;
            }

            logs.forEach(log => {
                const li = document.createElement('li');
                li.className = "border-l-2 border-indigo-500 pl-4 py-2 relative";
                li.innerHTML = `
                    <div class="absolute -left-[6px] top-[14px] w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white"></div>
                    <span class="text-[10px] text-slate-400 font-semibold block">${log.fecha}</span>
                    <p class="text-xs text-slate-700 font-semibold">${log.accion}</p>
                    <span class="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">
                        Responsable: ${log.usuario_nombre}
                    </span>
                `;
                list.appendChild(li);
            });
        };
    } catch (e) {
        list.innerHTML = '<li class="text-red-500 py-4">Error al consultar bitácora.</li>';
    }

    // Cambiar pestaña activa
    switchDrawerTab(tabName);

    // Deslizar el cajón abriéndolo
    const drawer = document.getElementById('details-drawer');
    const overlay = document.getElementById('details-drawer-overlay');
    if (drawer) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
    }
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
        }, 10);
    }
    } catch (err) {
        console.error("Falla en openDetailsDrawer:", err);
        showToast("Error al abrir detalles: " + err.message, "error");
    }
}

/**
 * Cierra el cajón deslizable derecho.
 */
function closeDetailsDrawer() {
    const drawer = document.getElementById('details-drawer');
    const overlay = document.getElementById('details-drawer-overlay');
    if (drawer) {
        drawer.classList.remove('translate-x-0');
        drawer.classList.add('translate-x-full');
    }
    if (overlay) {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

/**
 * Cambia la pestaña activa dentro del cajón de detalles.
 */
function switchDrawerTab(tabName) {
    const tabs = ['details', 'upload', 'loans', 'timeline'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const pane = document.getElementById(`drawer-tab-${t}`);
        
        if (t === tabName) {
            btn.classList.add('active');
            pane.classList.remove('hidden');
        } else {
            btn.classList.remove('active');
            pane.classList.add('hidden');
        }
    });
}

/**
 * Alterna la visibilidad del panel de gráficos.
 */
function toggleChartsPanel() {
    const panel = document.getElementById('charts-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        localStorage.setItem('charts_panel_visible', !panel.classList.contains('hidden'));
    }
}

/**
 * Renderiza los tres gráficos SVG de estadísticas basados en la lista filtrada.
 */
function renderSVGCharts(docs) {
    const total = docs.length;
    const chartStatus = document.getElementById('chart-status-svg');
    const chartFunds = document.getElementById('chart-funds-svg');
    const chartTypes = document.getElementById('chart-types-svg');
    
    if (!chartStatus || !chartFunds || !chartTypes) return;
    
    if (total === 0) {
        const noDataSvg = `<svg width="180" height="180" viewBox="0 0 180 180"><text x="90" y="90" text-anchor="middle" font-size="12" fill="#94a3b8" font-weight="semibold">Sin Datos Disponibles</text></svg>`;
        chartStatus.innerHTML = noDataSvg;
        chartFunds.innerHTML = noDataSvg;
        chartTypes.innerHTML = noDataSvg;
        return;
    }
    
    // 1. Dona de Estatus
    const countsStatus = {
        'Disponible': docs.filter(d => d.estado === 'Disponible').length,
        'Pendiente por Archivar': docs.filter(d => d.estado === 'Pendiente por Archivar').length,
        'Prestado': docs.filter(d => d.estado === 'Prestado').length,
        'Incompleto': docs.filter(d => d.estado === 'Incompleto').length
    };
    
    let statusSvg = `<svg width="180" height="180" viewBox="0 0 180 180">
        <g transform="rotate(-90 90 90)">`;
    const r = 55;
    const cx = 90;
    const cy = 90;
    const circumference = 2 * Math.PI * r;
    let accumulatedPercent = 0;
    const colorsStatus = {
        'Disponible': '#00c875',
        'Pendiente por Archivar': '#ffad00',
        'Prestado': '#0086f0',
        'Incompleto': '#e44b44'
    };
    
    Object.keys(countsStatus).forEach(key => {
        const count = countsStatus[key];
        if (count === 0) return;
        const percent = count / total;
        const strokeLength = percent * circumference;
        const strokeOffset = circumference - (accumulatedPercent * circumference);
        statusSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="${colorsStatus[key]}" stroke-width="14" stroke-dasharray="${strokeLength} ${circumference - strokeLength}" stroke-dashoffset="${strokeOffset}" stroke-linecap="round"/>`;
        accumulatedPercent += percent;
    });
    
    statusSvg += `</g>
        <circle cx="${cx}" cy="${cy}" r="45" fill="#ffffff" />
        <text x="90" y="88" text-anchor="middle" font-size="22" font-weight="900" fill="#1e293b">${total}</text>
        <text x="90" y="105" text-anchor="middle" font-size="8" font-weight="800" fill="#94a3b8" letter-spacing="1.5">TOTAL</text>
    </svg>`;
    chartStatus.innerHTML = statusSvg;
    
    // 2. Origen de Fondos (Barras Horizontales)
    const funds = ['FCI', 'Ingresos Propios', 'Situado Constitucional', 'Aporte Especial'];
    const countsFunds = {};
    funds.forEach(f => {
        countsFunds[f] = docs.filter(d => d.origen_fondo === f).length;
    });
    const maxFundCount = Math.max(...Object.values(countsFunds), 1);
    
    let fundsSvg = `<svg width="240" height="160" viewBox="0 0 240 160">`;
    let yFunds = 12;
    const colorsFunds = {
        'FCI': '#4f46e5',
        'Ingresos Propios': '#06b6d4',
        'Situado Constitucional': '#10b981',
        'Aporte Especial': '#f59e0b'
    };
    funds.forEach(f => {
        const count = countsFunds[f];
        const pct = count / total;
        const barWidth = (count / maxFundCount) * 140;
        fundsSvg += `
            <text x="5" y="${yFunds + 10}" font-size="9" font-weight="800" fill="#64748b">${f.toUpperCase()}</text>
            <rect x="5" y="${yFunds + 16}" width="140" height="8" rx="4" fill="#f1f5f9"/>
            <rect x="5" y="${yFunds + 16}" width="${barWidth}" height="8" rx="4" fill="${colorsFunds[f]}" />
            <text x="152" y="${yFunds + 24}" font-size="10" font-weight="800" fill="#1e293b">${count} <tspan font-size="8" font-weight="600" fill="#94a3b8">(${Math.round(pct * 100)}%)</tspan></text>
        `;
        yFunds += 36;
    });
    fundsSvg += `</svg>`;
    chartFunds.innerHTML = fundsSvg;
    
    // 3. Tipos de Expediente (Barras Horizontales)
    const types = ['Orden de Pago', 'Proyecto', 'Obra', 'Contrato', 'Factura'];
    const countsTypes = {};
    types.forEach(t => {
        countsTypes[t] = docs.filter(d => d.tipo === t).length;
    });
    const maxTypeCount = Math.max(...Object.values(countsTypes), 1);
    
    let typesSvg = `<svg width="240" height="180" viewBox="0 0 240 180">`;
    let yTypes = 8;
    const colorTypes = '#6366f1';
    types.forEach(t => {
        const count = countsTypes[t];
        const pct = count / total;
        const barWidth = (count / maxTypeCount) * 140;
        typesSvg += `
            <text x="5" y="${yTypes + 10}" font-size="9" font-weight="800" fill="#64748b">${t.toUpperCase()}</text>
            <rect x="5" y="${yTypes + 16}" width="140" height="8" rx="4" fill="#f1f5f9"/>
            <rect x="5" y="${yTypes + 16}" width="${barWidth}" height="8" rx="4" fill="${colorTypes}" />
            <text x="152" y="${yTypes + 24}" font-size="10" font-weight="800" fill="#1e293b">${count} <tspan font-size="8" font-weight="600" fill="#94a3b8">(${Math.round(pct * 100)}%)</tspan></text>
        `;
        yTypes += 34;
    });
    typesSvg += `</svg>`;
    chartTypes.innerHTML = typesSvg;
}

/**
 * Comprueba si hay préstamos vencidos en IndexedDB y actualiza la campana de notificación.
 */
async function checkOverdueLoans() {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['prestamos', 'documentos'], 'readonly');
        const loanStore = transaction.objectStore('prestamos');
        const docStore = transaction.objectStore('documentos');
        
        const loansReq = loanStore.getAll();
        loansReq.onsuccess = (e) => {
            const allLoans = e.target.result || [];
            const activeLoans = allLoans.filter(l => l.fecha_real_devolucion === null);
            
            const docsReq = docStore.getAll();
            docsReq.onsuccess = (event) => {
                const allDocs = event.target.result || [];
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                
                const overdue = [];
                activeLoans.forEach(loan => {
                    const fechaEst = new Date(loan.fecha_estimada + 'T00:00:00');
                    if (fechaEst < hoy) {
                        const doc = allDocs.find(d => d.id === loan.documento_id);
                        overdue.push({ loan, doc });
                    }
                });
                
                const countBadge = document.getElementById('notification-count');
                const listContainer = document.getElementById('notifications-list');
                
                if (!countBadge || !listContainer) return;
                
                if (overdue.length > 0) {
                    countBadge.textContent = overdue.length;
                    countBadge.classList.remove('hidden');
                    
                    listContainer.innerHTML = '';
                    overdue.forEach(({ loan, doc }) => {
                        const div = document.createElement('div');
                        div.className = 'p-3 hover:bg-slate-50 transition-colors text-xs flex flex-col gap-1.5';
                        div.innerHTML = `
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-red-600">${doc ? doc.codigo : 'N/A'}</span>
                                <span class="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-extrabold">VENCIDO</span>
                            </div>
                            <p class="text-slate-800 font-semibold leading-tight">${doc ? doc.titulo : 'Sin título'}</p>
                            <div class="text-[10px] text-slate-500 space-y-0.5">
                                <p><strong class="text-slate-700">Solicitante:</strong> ${loan.funcionario} (${loan.departamento})</p>
                                <p><strong class="text-slate-700">Venció el:</strong> ${new Date(loan.fecha_estimada + 'T00:00:00').toLocaleDateString('es-VE')}</p>
                            </div>
                            <div class="flex justify-end mt-1">
                                <button onclick="generateMemorandum(${loan.id})" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold uppercase rounded-lg tracking-wider shadow-sm flex items-center gap-1 transition-colors">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    Generar Memo
                                </button>
                            </div>
                        `;
                        listContainer.appendChild(div);
                    });
                } else {
                    countBadge.classList.add('hidden');
                    countBadge.textContent = '0';
                    listContainer.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs italic font-medium">No hay préstamos vencidos hoy</p>`;
                }
            };
        };
    } catch (error) {
        console.error("Error comprobando préstamos vencidos:", error);
    }
}

/**
 * Alterna la visibilidad del dropdown de notificaciones.
 */
function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Escuchador de clics globales para cerrar el dropdown si se hace clic fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notifications-dropdown');
    const button = document.querySelector('button[onclick*="toggleNotificationsDropdown"]');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && (!button || !button.contains(e.target))) {
            dropdown.classList.add('hidden');
        }
    }
});

/**
 * Genera un memorando en formato PDF listo para imprimir para un préstamo vencido.
 */
async function generateMemorandum(loanId) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['prestamos'], 'readonly');
        const loanStore = transaction.objectStore('prestamos');
        const loanReq = loanStore.get(parseInt(loanId));
        
        loanReq.onsuccess = async (e) => {
            const prestamo = e.target.result;
            if (!prestamo) {
                showToast("Préstamo no encontrado.", "error");
                return;
            }
            
            const docTransaction = db.transaction(['documentos'], 'readonly');
            const docStore = docTransaction.objectStore('documentos');
            const docReq = docStore.get(prestamo.documento_id);
            
            docReq.onsuccess = (event) => {
                const doc = event.target.result;
                
                // Abrir ventana de impresión con estilo formal de memorando de la alcaldía
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    showToast("Error al abrir ventana de impresión. Habilite las ventanas emergentes.", "error");
                    return;
                }
                
                const fechaHoy = new Date().toLocaleDateString('es-VE');
                const fechaSalida = new Date(prestamo.fecha_salida).toLocaleDateString('es-VE');
                const fechaEstimada = new Date(prestamo.fecha_estimada + 'T00:00:00').toLocaleDateString('es-VE');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <title>Memorando de Requerimiento - SIFAD-MB</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #000; padding: 40px; margin: 0; }
                            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
                            .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; font-weight: bold; }
                            .header h2 { font-size: 12px; margin: 5px 0 0 0; text-transform: uppercase; font-weight: normal; }
                            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
                            .meta-table td { padding: 4px 8px; border: 1px solid #000; }
                            .meta-table td.label { font-weight: bold; width: 15%; background-color: #f2f2f2; }
                            .title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; text-decoration: underline; }
                            .body-text { font-size: 12px; text-align: justify; margin-bottom: 30px; }
                            .doc-details { border: 1px solid #000; padding: 12px; margin-bottom: 30px; font-size: 11px; background-color: #fafafa; }
                            .doc-details p { margin: 4px 0; }
                            .footer { margin-top: 60px; text-align: center; font-size: 12px; }
                            .footer-line { border-top: 1px solid #000; width: 40%; margin: 40px auto 5px auto; }
                            @media print {
                                body { padding: 20px; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Alcaldía Bolivariana de Maracaibo</h1>
                            <h2>Dirección General de Administración y Finanzas</h2>
                            <h2>Departamento de Archivo General de Expedientes (SIFAD-MB)</h2>
                        </div>
                        
                        <div class="title">MEMORANDO DE REQUERIMIENTO DE EXPEDIENTE</div>
                        
                        <table class="meta-table">
                            <tr>
                                <td class="label">PARA:</td>
                                <td><strong>${prestamo.funcionario.toUpperCase()}</strong> - Oficina de ${prestamo.departamento.toUpperCase()}</td>
                            </tr>
                            <tr>
                                <td class="label">DE:</td>
                                <td><strong>DEPARTAMENTO DE ARCHIVO GENERAL DE EXPEDIENTES</strong></td>
                            </tr>
                            <tr>
                                <td class="label">FECHA:</td>
                                <td>${fechaHoy}</td>
                            </tr>
                            <tr>
                                <td class="label">ASUNTO:</td>
                                <td><strong>REQUERIMIENTO URGENTE DE DEVOLUCIÓN DE EXPEDIENTE FÍSICO</strong></td>
                            </tr>
                        </table>
                        
                        <div class="body-text">
                            Por medio del presente memorando se le hace un requerimiento formal y de carácter urgente para la devolución del expediente físico que le fue facilitado en calidad de préstamo temporal. El plazo establecido para su retorno ha expirado, encontrándose actualmente en mora con este departamento de control documental.
                        </div>
                        
                        <div class="doc-details">
                            <h3 style="margin-top: 0; font-size: 12px; border-bottom: 1px solid #000; padding-bottom: 4px; text-transform: uppercase;">Detalles del Expediente en Préstamo</h3>
                            <p><strong>Código Correlativo:</strong> ${doc ? doc.codigo : 'N/A'}</p>
                            <p><strong>Tipo de Expediente:</strong> ${doc ? doc.tipo : 'N/A'}</p>
                            <p><strong>Concepto / Obra:</strong> ${doc ? doc.titulo : 'N/A'}</p>
                            <p><strong>Monto:</strong> ${doc ? new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(doc.monto) : 'N/A'}</p>
                            <p><strong>Ubicación en Archivo:</strong> ${doc ? doc.ubicacion : 'N/A'}</p>
                            <p><strong>Fecha de Retiro:</strong> ${fechaSalida}</p>
                            <p><strong>Fecha Vencimiento de Préstamo:</strong> ${fechaEstimada}</p>
                        </div>
                        
                        <div class="body-text">
                            Se le agradece realizar la devolución formal del documento en un lapso no mayor a <strong>veinticuatro (24) horas</strong> a partir de la recepción de esta comunicación. Le recordamos que la custodia de este expediente es de exclusiva responsabilidad del solicitante firmante, debiendo retornar con la totalidad de sus folios, firmas y sellos intactos, según el reglamento interno de control de resguardo de la institución.
                        </div>
                        
                        <div class="footer">
                            Atentamente,
                            <div class="footer-line"></div>
                            <strong>Firma y Sello de Archivo Autorizado</strong><br/>
                            Responsable del Sistema: ${prestamo.creado_por}<br/>
                            <span style="font-size: 9px; color: #555; margin-top: 10px; display: block;">SIFAD-MB | Control de Trazabilidad Documental</span>
                        </div>
                        
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            };
        };
    } catch (e) {
        console.error("Error al generar el memorando:", e);
        showToast("Error al generar la boleta de memorando.", "error");
    }
}

/**
 * Actualiza el mapa interactivo de estanterías físicas (2D) en base a las coordenadas ingresadas.
 */
function update2DRackMap() {
    const locationInput = document.getElementById('doc-ubicacion');
    const container = document.getElementById('rack-map-container');
    if (!container) return;
    
    const value = locationInput ? locationInput.value : '';
    
    // Parsear el estante (A, B, C, D)
    const match = value.match(/Estante\s+([A-D])/i);
    const activeShelf = match ? match[1].toUpperCase() : null;
    
    // Renderizar las estanterías (A, B, C, D)
    const shelves = ['A', 'B', 'C', 'D'];
    container.innerHTML = '';
    
    shelves.forEach(s => {
        const shelfDiv = document.createElement('div');
        shelfDiv.className = `rack-shelf ${activeShelf === s ? 'active' : ''}`;
        shelfDiv.innerHTML = `
            <div class="flex justify-center mb-1">
                <svg class="w-5 h-5 ${activeShelf === s ? 'text-white' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
            </div>
            <div style="font-weight: 800; font-size: 11px;">ESTANTE ${s}</div>
            <div style="font-size: 8px; margin-top: 4px; font-weight: 700; letter-spacing: 0.05em; opacity: 0.85;">${activeShelf === s ? 'ASIGNADO' : 'DISPONIBLE'}</div>
        `;
        container.appendChild(shelfDiv);
    });
}

/**
 * Abre el modal consolidado de configuración y ajusta la visibilidad de pestañas según permisos.
 */
function openConfigModal() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session) return;
    
    const btnTabAssistants = document.getElementById('config-tab-btn-assistants');
    const btnTabBackups = document.getElementById('config-tab-btn-backups');
    
    // 1. Validar accesos según rol y permisos
    if (session.rol === 'admin') {
        if (btnTabAssistants) btnTabAssistants.classList.remove('hidden');
        if (btnTabBackups) btnTabBackups.classList.remove('hidden');
    } else {
        if (btnTabAssistants) btnTabAssistants.classList.add('hidden');
        
        if (session.permisos?.respaldar) {
            if (btnTabBackups) btnTabBackups.classList.remove('hidden');
        } else {
            if (btnTabBackups) btnTabBackups.classList.add('hidden');
        }
    }
    
    // 2. Por defecto cargar pestaña de Perfil
    loadConfigTab('profile');
    
    // 3. Mostrar modal
    openModal('config-modal');
}

/**
 * Controla el cambio de pestañas del modal de configuración.
 * @param {string} tabName Nombre de la pestaña a cargar ('profile', 'assistants', 'backups').
 */
function loadConfigTab(tabName) {
    const tabs = ['profile', 'assistants', 'backups'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`config-tab-btn-${t}`);
        const panel = document.getElementById(`config-panel-${t}`);
        
        if (t === tabName) {
            if (btn) btn.classList.add('active', 'border-indigo-600', 'text-indigo-600');
            if (btn) btn.classList.remove('border-transparent', 'text-slate-500');
            if (panel) panel.classList.remove('hidden');
        } else {
            if (btn) btn.classList.remove('active', 'border-indigo-600', 'text-indigo-600');
            if (btn) btn.classList.add('border-transparent', 'text-slate-500');
            if (panel) panel.classList.add('hidden');
        }
    });
    
    // Carga de datos dinámicos según pestaña activa
    if (tabName === 'profile') {
        const session = JSON.parse(localStorage.getItem('session'));
        if (session) {
            document.getElementById('profile-nombre').value = session.nombre_completo || '';
            document.getElementById('profile-usuario').value = session.usuario || '';
            document.getElementById('profile-clave').value = '';
        }
    } else if (tabName === 'assistants') {
        if (typeof renderAssistantsList === 'function') {
            renderAssistantsList();
        }
    } else if (tabName === 'backups') {
        if (typeof updateBackupMetaInModal === 'function') {
            updateBackupMetaInModal();
        }
    }
}

/**
 * Carga los expedientes de la base de datos IndexedDB y repuebla el tablero de estatus Kanban.
 */
let workflowDocumentList = [];

async function loadWorkflowDataFromDB() {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['documentos'], 'readonly');
        const store = transaction.objectStore('documentos');
        const req = store.getAll();
        
        req.onsuccess = (e) => {
            workflowDocumentList = e.target.result || [];
            renderWorkflowBoard(workflowDocumentList);
        };
    } catch (err) {
        console.error("Error al cargar datos del tablero workflow:", err);
    }
}

/**
 * Renderiza las tarjetas del tablero Kanban filtrando por término de búsqueda.
 */
function renderWorkflowBoard(documents = null) {
    if (documents === null) {
        documents = workflowDocumentList;
    }
    const searchInput = document.getElementById('workflow-search');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const colPendientes = document.getElementById('col-pendientes');
    const colDisponibles = document.getElementById('col-disponibles');
    const colPrestados = document.getElementById('col-prestados');
    const colIncompletos = document.getElementById('col-incompletos');
    
    if (!colPendientes || !colDisponibles || !colPrestados || !colIncompletos) return;
    
    colPendientes.innerHTML = '';
    colDisponibles.innerHTML = '';
    colPrestados.innerHTML = '';
    colIncompletos.innerHTML = '';
    
    let countPendientes = 0;
    let countDisponibles = 0;
    let countPrestados = 0;
    let countIncompletos = 0;
    
    documents.forEach(doc => {
        if (term) {
            const matchCode = doc.codigo.toLowerCase().includes(term);
            const matchTitle = doc.titulo.toLowerCase().includes(term);
            const matchBeneficiario = doc.beneficiario ? doc.beneficiario.toLowerCase().includes(term) : false;
            if (!matchCode && !matchTitle && !matchBeneficiario) {
                return;
            }
        }
        
        const card = document.createElement('div');
        card.id = 'wf-card-' + doc.id;
        card.draggable = true;
        card.setAttribute('ondragstart', 'drag(event)');
        card.className = "bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition-all cursor-grab active:cursor-grabbing relative group select-none";
        
        var cardHTML = '';
        cardHTML += '<button onclick="openDetailsDrawer(' + doc.id + ', \'details\')" class="absolute top-2.5 right-2.5 text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">';
        cardHTML += 'VER EXPEDIENTE</button>';
        cardHTML += '<span class="text-[9px] font-mono font-bold text-slate-400 block mb-1">#' + doc.codigo + '</span>';
        cardHTML += '<h4 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2 pr-12">' + doc.titulo + '</h4>';
        cardHTML += '<div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-semibold">';
        cardHTML += '<span class="truncate max-w-[100px]">' + (doc.beneficiario || '') + '</span>';
        cardHTML += '<span class="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">' + doc.ano_fiscal + '</span>';
        cardHTML += '</div>';
        card.innerHTML = cardHTML;
        
        if (doc.estado === 'Pendiente por Archivar') {
            colPendientes.appendChild(card);
            countPendientes++;
        } else if (doc.estado === 'Disponible') {
            colDisponibles.appendChild(card);
            countDisponibles++;
        } else if (doc.estado === 'Prestado') {
            colPrestados.appendChild(card);
            countPrestados++;
        } else if (doc.estado === 'Incompleto') {
            colIncompletos.appendChild(card);
            countIncompletos++;
        }
    });
    
    document.getElementById('count-col-pendientes').textContent = countPendientes;
    document.getElementById('count-col-disponibles').textContent = countDisponibles;
    document.getElementById('count-col-prestados').textContent = countPrestados;
    document.getElementById('count-col-incompletos').textContent = countIncompletos;
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

async function drop(ev, nuevoEstado) {
    ev.preventDefault();
    const cardId = ev.dataTransfer.getData("text");
    if (!cardId) return;
    const docId = parseInt(cardId.replace("wf-card-", ""));
    if (isNaN(docId)) return;
    
    await updateDocumentStatusInDB(docId, nuevoEstado);
}

async function updateDocumentStatusInDB(docId, nuevoEstado) {
    const session = JSON.parse(localStorage.getItem('session'));
    const isAdmin = session?.rol === 'admin';
    const canEdit = isAdmin || session?.permisos?.editar;
    
    if (!canEdit) {
        showToast("No tiene permisos para editar expedientes.", "error");
        return;
    }
    
    if (nuevoEstado === 'Prestado') {
        showToast("Para prestar un expediente debe llenar el registro formal de préstamos.", "warning");
        openDetailsDrawer(docId, 'loans');
        return;
    }
    
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction(['documentos'], 'readwrite');
        const store = transaction.objectStore('documentos');
        
        const request = store.get(docId);
        request.onsuccess = (e) => {
            const doc = e.target.result;
            if (doc) {
                const estadoAnterior = doc.estado;
                if (estadoAnterior === 'Prestado') {
                    showToast("No se puede cambiar el estatus si está prestado. Registre la devolución primero.", "warning");
                    openDetailsDrawer(docId, 'loans');
                    return;
                }
                
                if (estadoAnterior === nuevoEstado) return;
                
                doc.estado = nuevoEstado;
                const updateReq = store.put(doc);
                updateReq.onsuccess = () => {
                    showToast("Expediente " + doc.codigo + " cambiado a " + nuevoEstado + ".", "success");
                    addTimelineEntry(docId, 'Cambio Estatus', 'Estatus del expediente cambiado de "' + estadoAnterior + '" a "' + nuevoEstado + '" desde el Tablero Kanban.');
                    loadWorkflowDataFromDB();
                };
            }
        };
    } catch (err) {
        console.error("Error al actualizar estatus en Kanban:", err);
    }
}

async function addTimelineEntry(docId, accion, detalle) {
    try {
        const session = JSON.parse(localStorage.getItem('session')) || { nombre_completo: 'Sistema' };
        const db = await initIndexedDB();
        const tx = db.transaction(['timeline'], 'readwrite');
        const store = tx.objectStore('timeline');
        
        const log = {
            documento_id: docId,
            fecha: new Date().toLocaleString('es-VE'),
            accion: accion + ': ' + detalle,
            usuario_nombre: session.nombre_completo
        };
        
        store.add(log);
    } catch (err) {
        console.error("Error al registrar entrada en timeline:", err);
    }
}


// Cargar expedientes automáticamente al cargar el script si ya hay sesión activa
if (localStorage.getItem('session') && typeof loadDocumentsFromDB === 'function') {
    loadDocumentsFromDB();
}
