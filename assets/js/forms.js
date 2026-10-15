/**
 * SIFAD-MB - Gestión de Formularios y Validaciones
 * Administra los formularios de creación/edición de documentos, login, préstamos, etc.
 */

/**
 * Maneja el formulario de inicio de sesión.
 */
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            
            if (!username || !password) {
                showToast("Usuario y clave son requeridos.", "error");
                return;
            }
            
            await handleLogin(username, password);
        });
    }
    
    // Formulario de creación/edición de documentos
    const docForm = document.getElementById('doc-form');
    if (docForm) {
        docForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveOrUpdateDocument();
        });
    }
    
    // Formulario de subida de archivos
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadDocumentFile();
        });
    }
    
    // Formulario de préstamos
    const loanForm = document.getElementById('loan-form');
    if (loanForm) {
        loanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createLoan();
        });
    }
    
    // Formulario de devolución
    const returnForm = document.getElementById('return-form');
    if (returnForm) {
        returnForm.addEventListener('submit', function(e) {
            e.preventDefault();
            returnLoan();
        });
    }
    
    // Formulario de nuevos asistentes
    const assistantForm = document.getElementById('new-assistant-form');
    if (assistantForm) {
        assistantForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createAssistantUser();
        });
    }
    
    // Formulario de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', saveUserProfile);
    }
});

/**
 * Procesa el inicio de sesión del usuario.
 */
async function handleLogin(username, password) {
    try {
        showToast("Validando credenciales...", "info");
        
        // Obtener usuarios del motor relacional
        const usuarios = getRelationalUsers();
        const usuarioEncontrado = usuarios.find(u => u.usuario === username);
        
        if (!usuarioEncontrado) {
            showToast("Usuario no registrado en el sistema.", "error");
            return;
        }
        
        // Encriptar la contraseña ingresada para comparar
        const passwordHash = await sha256(password);
        
        if (usuarioEncontrado.clave !== passwordHash) {
            showToast("Clave de seguridad incorrecta.", "error");
            return;
        }
        
        // Crear sesión
        const sessionData = {
            id: usuarioEncontrado.id,
            usuario: usuarioEncontrado.usuario,
            nombre_completo: usuarioEncontrado.nombre_completo,
            rol: usuarioEncontrado.rol,
            permisos: usuarioEncontrado.permisos || {},
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('session', JSON.stringify(sessionData));
        showToast(`Bienvenido, ${usuarioEncontrado.nombre_completo}`, "success");
        
        // Redirigir después de 1 segundo
        setTimeout(() => {
            routeApplication();
        }, 1000);
        
    } catch (error) {
        console.error("Error en login:", error);
        showToast("Error al procesar el inicio de sesión.", "error");
    }
}

/**
 * Guarda o actualiza un documento en IndexedDB.
 */
async function saveOrUpdateDocument() {
    try {
        const docId = document.getElementById('doc-id').value;
        const tipo = document.getElementById('doc-tipo').value;
        const beneficiario = document.getElementById('doc-beneficiario').value.trim();
        const titulo = document.getElementById('doc-titulo').value.trim();
        const monto = parseFloat(document.getElementById('doc-monto').value);
        const anoFiscal = parseInt(document.getElementById('doc-ano_fiscal').value);
        const origenFondo = document.getElementById('doc-origen_fondo').value;
        const ubicacion = document.getElementById('doc-ubicacion').value.trim();
        const firmado = document.getElementById('doc-firmado').checked ? 1 : 0;
        const sellado = document.getElementById('doc-sellado').checked ? 1 : 0;
        
        // Validaciones básicas
        if (!beneficiario || !titulo || !ubicacion) {
            showToast("Todos los campos son requeridos.", "error");
            return;
        }
        
        if (isNaN(monto) || monto <= 0) {
            showToast("Monto debe ser un número positivo.", "error");
            return;
        }
        
        if (isNaN(anoFiscal) || anoFiscal < 2000 || anoFiscal > 2100) {
            showToast("Año fiscal debe ser válido.", "error");
            return;
        }
        
        const session = JSON.parse(localStorage.getItem('session'));
        const db = await initIndexedDB();
        const transaction = db.transaction(['documentos'], 'readwrite');
        const store = transaction.objectStore('documentos');
        
        let documento;
        
        if (docId) {
            // Actualizar documento existente
            const getRequest = store.get(parseInt(docId));
            getRequest.onsuccess = (e) => {
                documento = e.target.result;
                if (documento) {
                    documento.tipo = tipo;
                    documento.beneficiario = beneficiario;
                    documento.titulo = titulo;
                    documento.monto = monto;
                    documento.ano_fiscal = anoFiscal;
                    documento.origen_fondo = origenFondo;
                    documento.ubicacion = ubicacion;
                    documento.firmado = firmado;
                    documento.sellado = sellado;
                    documento.actualizado_en = new Date().toISOString();
                    
                    const updateRequest = store.put(documento);
                    updateRequest.onsuccess = () => {
                        showToast("Expediente actualizado exitosamente.", "success");
                        closeDetailsDrawer();
                        loadDocumentsFromDB();
                        
                        // Registrar en timeline
                        addTimelineEntry(documento.id, 'Edición', 
                            `Expediente ${documento.codigo} editado por ${session.nombre_completo}`);
                    };
                }
            };
        } else {
            // Crear nuevo documento
            const codigo = generateDocumentCode(tipo, anoFiscal);
            documento = {
                codigo: codigo,
                tipo: tipo,
                beneficiario: beneficiario,
                titulo: titulo,
                monto: monto,
                ano_fiscal: anoFiscal,
                origen_fondo: origenFondo,
                ubicacion: ubicacion,
                firmado: firmado,
                sellado: sellado,
                estado: firmado && sellado ? 'Disponible' : 'Incompleto',
                ruta_archivo: null,
                creado_en: new Date().toISOString(),
                actualizado_en: new Date().toISOString()
            };
            
            const addRequest = store.add(documento);
            addRequest.onsuccess = (e) => {
                const newId = e.target.result;
                documento.id = newId;
                showToast(`Expediente ${codigo} creado exitosamente.`, "success");
                closeDetailsDrawer();
                loadDocumentsFromDB();
                
                // Registrar en timeline
                addTimelineEntry(newId, 'Creación', 
                    `Expediente ${codigo} creado por ${session.nombre_completo}`);
            };
        }
        
        transaction.onerror = () => {
            showToast("Error al guardar el expediente.", "error");
        };
        
    } catch (error) {
        console.error("Error al guardar documento:", error);
        showToast("Error al procesar la operación.", "error");
    }
}

/**
 * Sube un archivo digitalizado para un documento.
 */
async function uploadDocumentFile() {
    const fileInput = document.getElementById('upload-file');
    const docId = document.getElementById('upload-doc-id').value;
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Seleccione un archivo para subir.", "error");
        return;
    }
    
    const file = fileInput.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
        showToast("El archivo es demasiado grande (máximo 10MB).", "error");
        return;
    }
    
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        showToast("Tipo de archivo no permitido. Use PDF, PNG o JPG.", "error");
        return;
    }
    
    try {
        showToast("Subiendo archivo...", "info");
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            
            const db = await initIndexedDB();
            const transaction = db.transaction(['documentos'], 'readwrite');
            const store = transaction.objectStore('documentos');
            
            const getRequest = store.get(parseInt(docId));
            getRequest.onsuccess = (event) => {
                const documento = event.target.result;
                if (documento) {
                    documento.ruta_archivo = base64Data;
                    documento.actualizado_en = new Date().toISOString();
                    
                    const updateRequest = store.put(documento);
                    updateRequest.onsuccess = () => {
                        showToast("Archivo digitalizado subido exitosamente.", "success");
                        
                        // Actualizar visualización
                        if (document.getElementById('drawer-tab-upload')) {
                            openDetailsDrawer(documento.id, 'upload');
                        }
                        
                        // Registrar en timeline
                        const session = JSON.parse(localStorage.getItem('session'));
                        addTimelineEntry(documento.id, 'Digitalización', 
                            `Archivo digital subido por ${session.nombre_completo} (${file.name})`);
                    };
                }
            };
            
            transaction.onerror = () => {
                showToast("Error al subir el archivo.", "error");
            };
        };
        
        reader.onerror = () => {
            showToast("Error al leer el archivo.", "error");
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error("Error al subir archivo:", error);
        showToast("Error al procesar el archivo.", "error");
    }
}

/**
 * Crea un préstamo para un documento.
 */
async function createLoan() {
    try {
        const docId = document.getElementById('loan-doc-id').value;
        const funcionario = document.getElementById('loan-funcionario').value.trim();
        const departamento = document.getElementById('loan-departamento').value.trim();
        const fechaEstimada = document.getElementById('loan-fecha_estimada').value;
        
        if (!funcionario || !departamento || !fechaEstimada) {
            showToast("Todos los campos del préstamo son requeridos.", "error");
            return;
        }
        
        if (new Date(fechaEstimada) < new Date()) {
            showToast("La fecha estimada debe ser futura.", "error");
            return;
        }
        
        const session = JSON.parse(localStorage.getItem('session'));
        const db = await initIndexedDB();
        
        // Actualizar estado del documento
        const docTransaction = db.transaction(['documentos'], 'readwrite');
        const docStore = docTransaction.objectStore('documentos');
        
        const getRequest = docStore.get(parseInt(docId));
        getRequest.onsuccess = (e) => {
            const documento = e.target.result;
            if (!documento) {
                showToast("Documento no encontrado.", "error");
                return;
            }
            
            documento.estado = 'Prestado';
            documento.actualizado_en = new Date().toISOString();
            
            docStore.put(documento);
            
            // Crear registro de préstamo
            const loanTransaction = db.transaction(['prestamos'], 'readwrite');
            const loanStore = loanTransaction.objectStore('prestamos');
            
            const prestamo = {
                documento_id: parseInt(docId),
                funcionario: funcionario,
                departamento: departamento,
                fecha_salida: new Date().toISOString(),
                fecha_estimada: fechaEstimada,
                fecha_real_devolucion: null,
                notas: '',
                creado_por: session.nombre_completo,
                creado_en: new Date().toISOString()
            };
            
            const addRequest = loanStore.add(prestamo);
            addRequest.onsuccess = (e) => {
                showToast(`Préstamo registrado para ${funcionario}.`, "success");
                closeDetailsDrawer();
                loadDocumentsFromDB();
                
                // Registrar en timeline
                addTimelineEntry(documento.id, 'Préstamo', 
                    `Expediente prestado a ${funcionario} (${departamento}) por ${session.nombre_completo}`);
            };
        };
        
    } catch (error) {
        console.error("Error al crear préstamo:", error);
        showToast("Error al registrar el préstamo.", "error");
    }
}

/**
 * Procesa la devolución de un préstamo.
 */
async function returnLoan() {
    try {
        const loanId = document.getElementById('return-loan-id').value;
        const notas = document.getElementById('return-notas').value.trim();
        
        const session = JSON.parse(localStorage.getItem('session'));
        const db = await initIndexedDB();
        
        // Actualizar préstamo
        const loanTransaction = db.transaction(['prestamos'], 'readwrite');
        const loanStore = loanTransaction.objectStore('prestamos');
        
        const getRequest = loanStore.get(parseInt(loanId));
        getRequest.onsuccess = (e) => {
            const prestamo = e.target.result;
            if (!prestamo) {
                showToast("Préstamo no encontrado.", "error");
                return;
            }
            
            prestamo.fecha_real_devolucion = new Date().toISOString();
            prestamo.notas = notas;
            
            loanStore.put(prestamo);
            
            // Actualizar estado del documento
            const docTransaction = db.transaction(['documentos'], 'readwrite');
            const docStore = docTransaction.objectStore('documentos');
            
            const docGetRequest = docStore.get(prestamo.documento_id);
            docGetRequest.onsuccess = (e) => {
                const documento = e.target.result;
                if (documento) {
                    documento.estado = 'Disponible';
                    documento.actualizado_en = new Date().toISOString();
                    
                    docStore.put(documento);
                    
                    showToast("Devolución registrada exitosamente.", "success");
                    closeDetailsDrawer();
                    loadDocumentsFromDB();
                    
                    // Registrar en timeline
                    addTimelineEntry(documento.id, 'Devolución', 
                        `Expediente devuelto por ${prestamo.funcionario}. Notas: ${notas}`);
                }
            };
        };
        
    } catch (error) {
        console.error("Error al procesar devolución:", error);
        showToast("Error al registrar la devolución.", "error");
    }
}

/**
 * Agrega una entrada al timeline de un documento.
 */
async function addTimelineEntry(docId, accion, descripcion) {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        const db = await initIndexedDB();
        const transaction = db.transaction(['timeline'], 'readwrite');
        const store = transaction.objectStore('timeline');
        
        const entry = {
            documento_id: parseInt(docId),
            accion: accion,
            descripcion: descripcion,
            usuario_nombre: session.nombre_completo,
            fecha: new Date().toISOString()
        };
        
        store.add(entry);
        
    } catch (error) {
        console.error("Error al agregar timeline:", error);
    }
}

/**
 * Elimina un documento después de confirmación.
 */
async function confirmDeleteDoc(id, codigo) {
    if (!confirm(`¿Está seguro de eliminar el expediente ${codigo}?\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        const isAdmin = session?.rol === 'admin';
        const canDelete = isAdmin || session?.permisos?.eliminar;
        
        if (!canDelete) {
            showToast("No tiene permisos para eliminar expedientes.", "error");
            return;
        }
        
        const db = await initIndexedDB();
        const transaction = db.transaction(['documentos'], 'readwrite');
        const store = transaction.objectStore('documentos');
        
        const deleteRequest = store.delete(parseInt(id));
        deleteRequest.onsuccess = () => {
            showToast(`Expediente ${codigo} eliminado.`, "success");
            loadDocumentsFromDB();
            
            // Registrar en timeline
            addTimelineEntry(id, 'Eliminación', 
                `Expediente eliminado por ${session.nombre_completo}`);
        };
        
        transaction.onerror = () => {
            showToast("Error al eliminar el expediente.", "error");
        };
        
    } catch (error) {
        console.error("Error al eliminar documento:", error);
        showToast("Error al eliminar el expediente.", "error");
    }
}

/**
 * Crea una cuenta de asistente nuevo.
 */
async function createAssistantUser() {
    try {
        const fullname = document.getElementById('new-fullname').value.trim();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        
        if (!fullname || !username || !password) {
            showToast("Todos los campos son requeridos.", "error");
            return;
        }
        
        let usuarios = getRelationalUsers();
        
        // Verificar si el usuario ya existe
        const userExist = usuarios.find(u => u.usuario.toLowerCase() === username.toLowerCase());
        if (userExist) {
            showToast("El nombre de usuario ya está registrado.", "error");
            return;
        }
        
        // Generar hash de clave
        const passwordHash = await sha256(password);
        
        // Crear nuevo usuario
        const nuevoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
        const nuevoAsistente = {
            id: nuevoId,
            usuario: username,
            clave: passwordHash,
            nombre_completo: fullname,
            rol: 'asistente',
            permisos: {
                registrar: document.getElementById('perm-registrar').checked,
                editar: document.getElementById('perm-editar').checked,
                eliminar: document.getElementById('perm-eliminar').checked,
                prestar: document.getElementById('perm-prestar').checked,
                respaldar: document.getElementById('perm-respaldar').checked
            }
        };
        
        usuarios.push(nuevoAsistente);
        saveRelationalUsers(usuarios);
        
        showToast(`Asistente ${fullname} registrado exitosamente.`, "success");
        
        // Limpiar formulario
        document.getElementById('new-fullname').value = '';
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('perm-registrar').checked = true;
        document.getElementById('perm-editar').checked = false;
        document.getElementById('perm-eliminar').checked = false;
        document.getElementById('perm-prestar').checked = false;
        document.getElementById('perm-respaldar').checked = false;
        
        // Re-renderizar lista
        renderAssistantsList();
        
    } catch (error) {
        console.error("Error al crear asistente:", error);
        showToast("Error al registrar la cuenta.", "error");
    }
}

/**
 * Elimina una cuenta de asistente.
 */
function deleteAssistantUser(userId) {
    if (!confirm("¿Está seguro de eliminar esta cuenta de asistente?")) {
        return;
    }
    
    try {
        let usuarios = getRelationalUsers();
        usuarios = usuarios.filter(u => u.id !== userId);
        saveRelationalUsers(usuarios);
        
        showToast("Cuenta de asistente eliminada exitosamente.", "success");
        renderAssistantsList();
    } catch (error) {
        console.error("Error al eliminar asistente:", error);
        showToast("Error al eliminar la cuenta.", "error");
    }
}

/**
 * Guarda los cambios realizados en el perfil del usuario actual.
 */
async function saveUserProfile(e) {
    e.preventDefault();
    try {
        const fullname = document.getElementById('profile-nombre').value.trim();
        const username = document.getElementById('profile-usuario').value.trim();
        const password = document.getElementById('profile-clave').value.trim();
        
        if (!fullname || !username) {
            showToast("Nombre y usuario son requeridos.", "error");
            return;
        }
        
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session) return;
        
        let usuarios = getRelationalUsers();
        const userIndex = usuarios.findIndex(u => u.id === session.id);
        
        if (userIndex === -1) {
            showToast("Usuario no encontrado.", "error");
            return;
        }
        
        // Validar si el nombre de usuario ya está tomado por otro ID
        const usernameConflict = usuarios.find(u => u.usuario.toLowerCase() === username.toLowerCase() && u.id !== session.id);
        if (usernameConflict) {
            showToast("El nombre de usuario ya está en uso.", "error");
            return;
        }
        
        // Actualizar datos
        usuarios[userIndex].nombre_completo = fullname;
        usuarios[userIndex].usuario = username;
        
        // Si ingresó una clave, encriptarla
        if (password) {
            usuarios[userIndex].clave = await sha256(password);
        }
        
        // Guardar usuarios en motor relacional
        saveRelationalUsers(usuarios);
        
        // Actualizar sesión activa
        session.nombre_completo = fullname;
        session.usuario = username;
        localStorage.setItem('session', JSON.stringify(session));
        
        showToast("Perfil actualizado exitosamente. Actualizando sesión...", "success");
        closeModal('config-modal');
        
        // Refrescar UI del dashboard
        setTimeout(() => {
            routeApplication();
        }, 1000);
        
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        showToast("Error al guardar los cambios.", "error");
    }
}