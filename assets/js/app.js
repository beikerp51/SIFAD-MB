/**
 * SIFAD-MB - Motor de Base de Datos Cliente (IndexedDB / localStorage)
 * Administra el almacenamiento persistente de registros y archivos Base64 en el navegador,
 * la encriptación de claves, el inicio de sesión y la ruteación visual de la SPA.
 */

// Constantes institucionales y de propiedad intelectual obligatorias
const APP_NAME = 'SIFAD-MB';
const APP_WELCOME = 'Bienvenido, SIFAD-MB - Norwuin Alexander Albarrán Meneses';
const APP_CREDITS = 'Desarrollado por el TSU en Informática Beiker Alfredo Pérez Arrieta | © 2026 Todos los derechos reservados.';

// Configuración de base de datos IndexedDB
const DB_NAME = 'sifadDB';
const DB_VERSION = 2;
let dbInstance = null;

/**
 * Inicializa la base de datos IndexedDB.
 * Retorna una Promesa que resuelve con la instancia abierta.
 */
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Error abriendo IndexedDB:", event);
            reject("No se pudo abrir la base de datos local.");
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Almacén de Documentos
            if (!db.objectStoreNames.contains('documentos')) {
                const docStore = db.createObjectStore('documentos', { keyPath: 'id', autoIncrement: true });
                docStore.createIndex('idx_codigo', 'codigo', { unique: true });
                docStore.createIndex('idx_busqueda', ['ano_fiscal', 'tipo', 'estado'], { unique: false });
            }

            // 2. Almacén de Préstamos
            if (!db.objectStoreNames.contains('prestamos')) {
                const loanStore = db.createObjectStore('prestamos', { keyPath: 'id', autoIncrement: true });
                loanStore.createIndex('idx_doc_id', 'documento_id', { unique: false });
            }

            // 3. Almacén de Timeline (Bitácora)
            if (!db.objectStoreNames.contains('timeline')) {
                const timelineStore = db.createObjectStore('timeline', { keyPath: 'id', autoIncrement: true });
                timelineStore.createIndex('idx_doc_id', 'documento_id', { unique: false });
            }
        };
    });
}

/**
 * Función para generar un hash criptográfico SHA-256 nativo.
 * Utilizado para encriptar contraseñas en localStorage.
 * 
 * @param {string} text Contraseña en texto plano.
 * @return {Promise<string>} Hash hexadecimal de 64 caracteres.
 */
async function sha256(text) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const msgBuffer = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("Crypto API falló, usando hash JS fallback:", e);
        }
    }
    
    // Fallback de SHA-256 en Javascript puro (seguro para file://)
    return sha256Fallback(text);
}

function sha256Fallback(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';

    var words = [];
    var asciiLength = ascii[lengthProperty];
    
    var hash = sha256Fallback.h = sha256Fallback.h || [];
    var k = sha256Fallback.k = sha256Fallback.k || [];
    var primeCounter = 0;

    var isFractional = function(x) {
        return ((x - Math.floor(x)) * maxWord) | 0;
    };

    if (!hash[lengthProperty]) {
        var n = 2;
        while (primeCounter < 64) {
            var isPrime = true;
            for (var factor = 2; factor * factor <= n; factor++) {
                if (n % factor === 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                if (primeCounter < 8) {
                    hash[primeCounter] = isFractional(mathPow(n, 1/2));
                }
                k[primeCounter] = isFractional(mathPow(n, 1/3));
                primeCounter++;
            }
            n++;
        }
    }
    
    var bytes = [];
    for (i = 0; i < asciiLength; i++) {
        var charCode = ascii.charCodeAt(i);
        if (charCode < 128) {
            bytes.push(charCode);
        } else if (charCode < 2048) {
            bytes.push((charCode >> 6) | 192);
            bytes.push((charCode & 63) | 128);
        } else {
            bytes.push((charCode >> 12) | 224);
            bytes.push(((charCode >> 6) & 63) | 128);
            bytes.push((charCode & 63) | 128);
        }
    }
    
    var wordCount = bytes[lengthProperty];
    var wordsLength = ((wordCount + 8) >> 6) + 1;
    var finalWords = new Array(wordsLength * 16);
    
    for (i = 0; i < wordCount; i++) {
        finalWords[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }
    
    finalWords[wordCount >> 2] |= 0x80 << (24 - (wordCount % 4) * 8);
    finalWords[finalWords[lengthProperty] - 1] = wordCount * 8;
    
    var h0 = hash[0], h1 = hash[1], h2 = hash[2], h3 = hash[3],
        h4 = hash[4], h5 = hash[5], h6 = hash[6], h7 = hash[7];
        
    for (i = 0; i < finalWords[lengthProperty]; i += 16) {
        var w = new Array(64);
        for (j = 0; j < 16; j++) {
            w[j] = finalWords[i + j] | 0;
        }
        for (j = 16; j < 64; j++) {
            var s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            var s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }
        
        var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
        
        for (j = 0; j < 64; j++) {
            var S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            var ch = (e & f) ^ ((~e) & g);
            var temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
            var S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            var maj = (a & b) ^ (a & c) ^ (b & c);
            var temp2 = (S0 + maj) | 0;
            
            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }
        
        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
        h5 = (h5 + f) | 0;
        h6 = (h6 + g) | 0;
        h7 = (h7 + h) | 0;
    }
    
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(function(val) {
        var unsigned = val >>> 0;
        var str = unsigned.toString(16);
        return '00000000'.substring(0, 8 - str[lengthProperty]) + str;
    }).join('');
}

/**
 * Recupera todos los usuarios mapeando las 9 tablas del modelo relacional RBAC.
 * @return {Array} Lista consolidada de usuarios compatible con la SPA.
 */
function getRelationalUsers() {
    const usuarios = JSON.parse(localStorage.getItem('berti_usuario') || '[]');
    const direcciones = JSON.parse(localStorage.getItem('berti_direccion') || '[]');
    const usuarioRoles = JSON.parse(localStorage.getItem('berti_usuario_rol') || '[]');
    const roles = JSON.parse(localStorage.getItem('berti_rol') || '[]');
    const rmPagins = JSON.parse(localStorage.getItem('berti_rm_pagin') || '[]');
    const rmPers = JSON.parse(localStorage.getItem('berti_rm_per') || '[]');
    const permisos = JSON.parse(localStorage.getItem('berti_permisos') || '[]');

    return usuarios.map(u => {
        const dir = direcciones.find(d => d.id_usuario === u.id) || {};
        const uRol = usuarioRoles.find(ur => ur.id_usuario === u.id);
        const rolObj = uRol ? roles.find(r => r.id === uRol.id_rol) : null;
        const rolNombre = rolObj ? rolObj.nombre : 'asistente';

        const userPermisos = {
            registrar: false,
            editar: false,
            eliminar: false,
            prestar: false,
            respaldar: false
        };

        if (rolNombre === 'admin') {
            userPermisos.registrar = true;
            userPermisos.editar = true;
            userPermisos.eliminar = true;
            userPermisos.prestar = true;
            userPermisos.respaldar = true;
        } else {
            const userRmPagins = rmPagins.filter(rm => rm.id_rol === (uRol ? uRol.id_rol : 0));
            userRmPagins.forEach(rm => {
                const associatedPers = rmPers.filter(rp => rp.id_rm_pagin === rm.id);
                associatedPers.forEach(rp => {
                    const permObj = permisos.find(p => p.id === rp.id_permiso);
                    if (permObj && userPermisos.hasOwnProperty(permObj.nombre)) {
                        userPermisos[permObj.nombre] = true;
                    }
                });
            });
        }

        return {
            id: u.id,
            usuario: u.usuario,
            clave: u.clave,
            nombre_completo: u.nombre,
            correo: u.correo,
            telefono: u.telefono,
            rol: rolNombre === 'admin' ? 'admin' : 'asistente',
            direccion: {
                calle: dir.calle || '',
                avenida: dir.avenida || '',
                sector: dir.sector || '',
                numero_casa: dir.numero_casa || '',
                status: dir.status || ''
            },
            permisos: userPermisos
        };
    });
}

/**
 * Guarda y distribuye los usuarios de la SPA en las 9 tablas relacionales en localStorage.
 * @param {Array} usersArray Lista consolidada de usuarios.
 */
function saveRelationalUsers(usersArray) {
    const usuarios = [];
    const direcciones = [];
    const usuarioRoles = [];
    const roles = JSON.parse(localStorage.getItem('berti_rol') || '[]');
    const modulos = JSON.parse(localStorage.getItem('berti_modulo') || '[]');
    const permisos = JSON.parse(localStorage.getItem('berti_permisos') || '[]');
    
    let rmPagins = JSON.parse(localStorage.getItem('berti_rm_pagin') || '[]');
    let rmPers = JSON.parse(localStorage.getItem('berti_rm_per') || '[]');

    // Filtrar para mantener las relaciones del admin
    rmPagins = rmPagins.filter(rm => rm.id_rol === 1);
    rmPers = rmPers.filter(rp => {
        const rm = rmPagins.find(r => r.id === rp.id_rm_pagin);
        return rm && rm.id_rol === 1;
    });

    usersArray.forEach(u => {
        usuarios.push({
            id: u.id,
            nombre: u.nombre_completo,
            usuario: u.usuario,
            clave: u.clave,
            correo: u.correo || (u.usuario.toLowerCase() + '@sifad.gob.ve'),
            telefono: u.telefono || 'Sin teléfono'
        });

        direcciones.push({
            id: u.id,
            calle: u.direccion?.calle || 'Av. Principal',
            avenida: u.direccion?.avenida || 'Av. Principal',
            sector: u.direccion?.sector || 'Centro',
            numero_casa: u.direccion?.numero_casa || 'S/N',
            status: u.direccion?.status || 'activo',
            id_usuario: u.id
        });

        let userRolId = 2;
        if (u.rol === 'admin') {
            userRolId = 1;
        } else {
            userRolId = 100 + u.id;
            const rolName = `rol_asistente_${u.id}`;
            const rolDesc = `Rol personalizado para el asistente ${u.nombre_completo}`;
            
            const existingRolIdx = roles.findIndex(r => r.id === userRolId);
            const newRol = { id: userRolId, nombre: rolName, descripcion: rolDesc };
            if (existingRolIdx > -1) {
                roles[existingRolIdx] = newRol;
            } else {
                roles.push(newRol);
            }

            modulos.forEach(mod => {
                const newRmPaginId = rmPagins.length > 0 ? Math.max(...rmPagins.map(r => r.id)) + 1 : 1;
                rmPagins.push({
                    id: newRmPaginId,
                    id_rol: userRolId,
                    id_modulo: mod.id
                });

                const activePermsForMod = [];
                if (mod.id === 1) {
                    if (u.permisos?.registrar) activePermsForMod.push('registrar');
                    if (u.permisos?.editar) activePermsForMod.push('editar');
                    if (u.permisos?.eliminar) activePermsForMod.push('eliminar');
                } else if (mod.id === 2) {
                    if (u.permisos?.prestar) activePermsForMod.push('prestar');
                } else if (mod.id === 3) {
                    if (u.permisos?.respaldar) activePermsForMod.push('respaldar');
                }

                activePermsForMod.forEach(permName => {
                    const permObj = permisos.find(p => p.nombre === permName);
                    if (permObj) {
                        let pageId = 1;
                        if (mod.id === 3) pageId = 4;
                        
                        const newRmPerId = rmPers.length > 0 ? Math.max(...rmPers.map(rp => rp.id)) + 1 : 1;
                        rmPers.push({
                            id: newRmPerId,
                            id_rm_pagin: newRmPaginId,
                            id_pagina: pageId,
                            id_permiso: permObj.id
                        });
                    }
                });
            });
        }

        usuarioRoles.push({
            id: u.id,
            id_usuario: u.id,
            id_rol: userRolId
        });
    });

    localStorage.setItem('berti_usuario', JSON.stringify(usuarios));
    localStorage.setItem('berti_direccion', JSON.stringify(direcciones));
    localStorage.setItem('berti_usuario_rol', JSON.stringify(usuarioRoles));
    localStorage.setItem('berti_rol', JSON.stringify(roles));
    localStorage.setItem('berti_rm_pagin', JSON.stringify(rmPagins));
    localStorage.setItem('berti_rm_per', JSON.stringify(rmPers));
    
    localStorage.setItem('usuarios', JSON.stringify(usersArray));
}

/**
 * Inicializa y valida los datos base de configuración y el administrador en localStorage.
 */
async function seedDefaultData() {
    // 1. Inserción de Configuración de Respaldos
    if (!localStorage.getItem('ultimo_respaldo')) {
        localStorage.setItem('ultimo_respaldo', 'Nunca');
    }

    // Inicializar catálogos del esquema relacional (Roles, Módulos, Páginas, Permisos)
    if (!localStorage.getItem('berti_rol')) {
        localStorage.setItem('berti_rol', JSON.stringify([
            { id: 1, nombre: 'admin', descripcion: 'Administrador Principal' },
            { id: 2, nombre: 'asistente', descripcion: 'Asistente de Archivo' }
        ]));
    }
    if (!localStorage.getItem('berti_modulo')) {
        localStorage.setItem('berti_modulo', JSON.stringify([
            { id: 1, nombre: 'Digitalización' },
            { id: 2, nombre: 'Préstamos' },
            { id: 3, nombre: 'Configuración' },
            { id: 4, nombre: 'Auditoría' }
        ]));
    }
    if (!localStorage.getItem('berti_pagina')) {
        localStorage.setItem('berti_pagina', JSON.stringify([
            { id: 1, nombre: 'Tablero de Control', url: '/' },
            { id: 2, nombre: 'Reportes', url: 'reports' },
            { id: 3, nombre: 'Auditoría', url: 'audit' },
            { id: 4, nombre: 'Configuración', url: 'config' }
        ]));
    }
    if (!localStorage.getItem('berti_permisos')) {
        localStorage.setItem('berti_permisos', JSON.stringify([
            { id: 1, nombre: 'registrar' },
            { id: 2, nombre: 'editar' },
            { id: 3, nombre: 'eliminar' },
            { id: 4, nombre: 'prestar' },
            { id: 5, nombre: 'respaldar' }
        ]));
    }

    // Inicializar relaciones de admin por defecto (rm_pagin y rm_per)
    if (!localStorage.getItem('berti_rm_pagin')) {
        localStorage.setItem('berti_rm_pagin', JSON.stringify([
            { id: 1, id_rol: 1, id_modulo: 1 },
            { id: 2, id_rol: 1, id_modulo: 2 },
            { id: 3, id_rol: 1, id_modulo: 3 },
            { id: 4, id_rol: 1, id_modulo: 4 }
        ]));
    }
    if (!localStorage.getItem('berti_rm_per')) {
        localStorage.setItem('berti_rm_per', JSON.stringify([
            { id: 1, id_rm_pagin: 1, id_pagina: 1, id_permiso: 1 }, // admin -> registrar
            { id: 2, id_rm_pagin: 1, id_pagina: 1, id_permiso: 2 }, // admin -> editar
            { id: 3, id_rm_pagin: 1, id_pagina: 1, id_permiso: 3 }, // admin -> eliminar
            { id: 4, id_rm_pagin: 2, id_pagina: 1, id_permiso: 4 }, // admin -> prestar
            { id: 5, id_rm_pagin: 3, id_pagina: 4, id_permiso: 5 }  // admin -> respaldar
        ]));
    }

    // 2. Inserción del Administrador Norwuin Alexander
    let usuarios = getRelationalUsers();
    const adminExist = usuarios.find(u => u.usuario === 'Norwuin123');

    if (!adminExist) {
        // Encriptar clave 'admin2026' obligatoriamente con SHA-256
        const passwordHash = await sha256('admin2026');
        usuarios.push({
            id: 1,
            usuario: 'Norwuin123',
            clave: passwordHash,
            nombre_completo: 'Norwuin Alexander Albarrán Meneses',
            rol: 'admin',
            correo: 'norwuin@sifad.gob.ve',
            telefono: '0412-1234567',
            direccion: {
                calle: 'Av. Bella Vista',
                avenida: 'Av. 4',
                sector: 'El Milagro',
                numero_casa: '12-34',
                status: 'activo'
            },
            permisos: {
                registrar: true,
                editar: true,
                eliminar: true,
                prestar: true,
                respaldar: true
            }
        });
        saveRelationalUsers(usuarios);
    }
}

/**
 * Valida el estado de la sesión activa y rutea la SPA al contenedor correspondiente.
 */
function routeApplication() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        const loginScreen = document.getElementById('login-screen');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const backupLockScreen = document.getElementById('backup-lock-screen');
        const mobileBottomBar = document.getElementById('mobile-bottom-bar');

        // Ocultar todas las pantallas y barras por defecto
        if (loginScreen) loginScreen.classList.add('hidden');
        if (dashboardScreen) dashboardScreen.classList.add('hidden');
        if (backupLockScreen) backupLockScreen.classList.add('hidden');
        if (mobileBottomBar) mobileBottomBar.classList.add('hidden');

        // Cargar textos de créditos requeridos
        const loginCredits = document.getElementById('login-credits');
        const lockCredits = document.getElementById('lock-credits');
        const dashCredits = document.getElementById('dashboard-credits');
        if (loginCredits) loginCredits.textContent = APP_CREDITS;
        if (lockCredits) lockCredits.textContent = APP_CREDITS;
        if (dashCredits) dashCredits.textContent = APP_CREDITS;

        if (!session) {
            // Redirigir a login
            const loginUser = document.getElementById('login-user');
            const loginPass = document.getElementById('login-pass');
            if (loginUser) loginUser.value = '';
            if (loginPass) loginPass.value = '';
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (mobileBottomBar) mobileBottomBar.classList.add('hidden');
            return;
        }

        // Si tiene sesión, verificar bloqueo preventivo semanal por falta de copia de seguridad (Módulo VI)
        if (isBackupLocked()) {
            const ultimoRespaldo = localStorage.getItem('ultimo_respaldo');
            const formatted = ultimoRespaldo && ultimoRespaldo !== 'Nunca' ? new Date(ultimoRespaldo + 'T00:00:00').toLocaleDateString('es-VE') : 'Nunca';
            const lockDateEl = document.getElementById('lock-last-backup-date');
            if (lockDateEl) lockDateEl.textContent = formatted;
            if (backupLockScreen) backupLockScreen.classList.remove('hidden');
            if (mobileBottomBar) mobileBottomBar.classList.add('hidden');
            return;
        }

        // Si todo está correcto, cargar Dashboard (o vista standalone en nueva pestaña)
        if (mobileBottomBar) mobileBottomBar.classList.remove('hidden');

        const welcomeEl = document.getElementById('header-user-welcome');
        if (welcomeEl) welcomeEl.textContent = 'Bienvenido, ' + session.nombre_completo;

        const roleEl = document.getElementById('header-user-role');
        if (roleEl) roleEl.textContent = session.rol === 'admin' ? 'Administrador Principal' : 'Asistente de Archivo';

        const greetingEl = document.getElementById('header-greeting');
        if (greetingEl) greetingEl.textContent = 'Bienvenido, ' + session.nombre_completo;

        // Ajustar visibilidad de botones según permisos de usuario (ACL)
        adjustDashboardACL(session);

        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view');

        if (view) {
            // Ocultar sidebar y panel principal normal para vistas standalone
            var aside = document.querySelector('aside');
            var header = document.querySelector('header');
            if (aside) aside.classList.add('hidden');
            if (header) header.classList.add('hidden');
            if (dashboardScreen) dashboardScreen.classList.add('hidden');

            if (view === 'reports') {
                var reportsModal = document.getElementById('reports-modal');
                if (reportsModal) {
                    reportsModal.classList.remove('hidden', 'bg-slate-950/40', 'backdrop-blur-sm', 'fixed', 'inset-0');
                    reportsModal.classList.add('min-h-screen', 'w-full', 'bg-slate-50', 'flex', 'items-center', 'justify-center', 'p-6');
                    var glass = reportsModal.querySelector('.glass-modal');
                    if (glass) { glass.classList.remove('max-w-md'); glass.classList.add('max-w-2xl', 'w-full'); }
                    var closeBtn = reportsModal.querySelector('.reports-close-btn');
                    if (closeBtn) closeBtn.classList.add('hidden');
                    var backBtn = reportsModal.querySelector('.reports-back-btn');
                    if (backBtn) backBtn.classList.remove('hidden');
                }
            } else if (view === 'audit') {
                var auditModal = document.getElementById('audit-modal');
                if (auditModal) {
                    auditModal.classList.remove('hidden', 'bg-slate-950/40', 'backdrop-blur-sm', 'fixed', 'inset-0');
                    auditModal.classList.add('min-h-screen', 'w-full', 'bg-slate-50', 'flex', 'items-center', 'justify-center', 'p-6');
                    var glass2 = auditModal.querySelector('.glass-modal');
                    if (glass2) { glass2.classList.remove('max-w-2xl'); glass2.classList.add('max-w-4xl', 'w-full', 'max-h-[90vh]'); }
                    var closeBtn2 = auditModal.querySelector('.audit-close-btn');
                    if (closeBtn2) closeBtn2.classList.add('hidden');
                    var backBtn2 = auditModal.querySelector('.audit-back-btn');
                    if (backBtn2) backBtn2.classList.remove('hidden');
                    setTimeout(function() {
                        if (typeof renderGlobalAuditLog === 'function') { renderGlobalAuditLog(); }
                    }, 100);
                }
            } else if (view === 'config') {
                var configModal = document.getElementById('config-modal');
                if (configModal) {
                    configModal.classList.remove('hidden', 'bg-slate-950/40', 'backdrop-blur-sm', 'fixed', 'inset-0');
                    configModal.classList.add('min-h-screen', 'w-full', 'bg-slate-50', 'flex', 'items-center', 'justify-center', 'p-6');
                    var glass3 = configModal.querySelector('.glass-modal');
                    if (glass3) { glass3.classList.remove('max-w-3xl'); glass3.classList.add('max-w-4xl', 'w-full', 'max-h-[90vh]'); }
                    var closeBtn3 = configModal.querySelector('.config-close-btn');
                    if (closeBtn3) closeBtn3.classList.add('hidden');
                    var backBtn3 = configModal.querySelector('.config-back-btn');
                    if (backBtn3) backBtn3.classList.remove('hidden');
                    setTimeout(function() {
                        if (typeof loadConfigTab === 'function') {
                            var btnTabAssistants = document.getElementById('config-tab-btn-assistants');
                            var btnTabBackups = document.getElementById('config-tab-btn-backups');
                            if (session.rol === 'admin') {
                                if (btnTabAssistants) btnTabAssistants.classList.remove('hidden');
                                if (btnTabBackups) btnTabBackups.classList.remove('hidden');
                            } else {
                                if (btnTabAssistants) btnTabAssistants.classList.add('hidden');
                                if (session.permisos && session.permisos.respaldar) {
                                    if (btnTabBackups) btnTabBackups.classList.remove('hidden');
                                } else {
                                    if (btnTabBackups) btnTabBackups.classList.add('hidden');
                                }
                            }
                            loadConfigTab('profile');
                        }
                    }, 100);
                }
            } else if (view === 'workflow') {
                var workflowScreen = document.getElementById('workflow-screen');
                if (workflowScreen) {
                    workflowScreen.classList.remove('hidden');
                    setTimeout(function() {
                        if (typeof loadWorkflowDataFromDB === 'function') { loadWorkflowDataFromDB(); }
                    }, 100);
                }
            }

            document.body.classList.add('bg-slate-50');
            return;
        }

        // Mostrar dashboard principal
        if (dashboardScreen) dashboardScreen.classList.remove('hidden');

        // Disparar carga de expedientes en tabla
        if (typeof loadDocumentsFromDB === 'function') {
            loadDocumentsFromDB();
        }
    } catch (e) {
        console.error('Error en routeApplication:', e);
        var fallbackLogin = document.getElementById('login-screen');
        if (fallbackLogin) fallbackLogin.classList.remove('hidden');
    }
}

/**
 * Determina si se debe bloquear el sistema por falta de respaldos el día lunes (Módulo VI).
 */
function isBackupLocked() {
    const ultimoRespaldo = localStorage.getItem('ultimo_respaldo');
    const diaSemana = new Date().getDay(); // 0 = Domingo, 1 = Lunes

    if (!ultimoRespaldo || ultimoRespaldo === 'Nunca') {
        // Si nunca se ha respaldado, bloqueamos solo el lunes para forzar el primer respaldo
        return (diaSemana === 1);
    }

    const fechaUltimo = new Date(ultimoRespaldo + 'T00:00:00');
    const hoy = new Date();
    fechaUltimo.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    const diferenciaDias = Math.floor((hoy - fechaUltimo) / (1000 * 60 * 60 * 24));

    // Es lunes y han pasado más de 7 días continuos sin respaldar
    return (diaSemana === 1 && diferenciaDias > 7);
}

/**
 * Oculta o muestra elementos del Dashboard según el rol y la matriz de permisos.
 * 
 * @param {Object} session Objeto del usuario en sesión.
 */
function adjustDashboardACL(session) {
    const btnNew = document.getElementById('btn-new-document');
    const btnBackups = document.getElementById('btn-backups');
    const btnAdminUsers = document.getElementById('admin-users-btn');
    const btnGlobalAudit = document.getElementById('btn-global-audit');

    // 1. Mostrar gestor de usuarios solo al administrador principal (Norwuin)
    if (session.rol === 'admin') {
        if (btnAdminUsers) btnAdminUsers.classList.remove('hidden');
        if (btnNew) btnNew.classList.remove('hidden');
        if (btnBackups) btnBackups.classList.remove('hidden');
        if (btnGlobalAudit) btnGlobalAudit.classList.remove('hidden');
        return;
    }

    // 2. Si es asistente, evaluar matriz de permisos individuales
    if (btnAdminUsers) btnAdminUsers.classList.add('hidden'); // Asistentes nunca ven control de cuentas
    if (btnGlobalAudit) btnGlobalAudit.classList.add('hidden');

    if (session.permisos.registrar) {
        if (btnNew) btnNew.classList.remove('hidden');
    } else {
        if (btnNew) btnNew.classList.add('hidden');
    }

    if (session.permisos.respaldar) {
        if (btnBackups) btnBackups.classList.remove('hidden');
    } else {
        if (btnBackups) btnBackups.classList.add('hidden');
    }
}

// Inicializar el sistema al cargar la página
window.addEventListener('load', async () => {
    try {
        await initIndexedDB();
        await seedDefaultData();
        routeApplication();
    } catch (e) {
        alert("Error crítico al inicializar la base de datos local: " + e);
    }
});
