/**
 * SIFAD-MB - Script de Monitoreo de Actividad y Alertas Toast
 * Administra el cierre automático por inactividad de 5 minutos (300 segundos).
 */

const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutos en milisegundos
let activityTimer;

/**
 * Restablece el temporizador por inactividad al detectar actividad física.
 */
function resetActivityTimer() {
    clearTimeout(activityTimer);
    
    // Solo monitorear si hay una sesión activa de usuario
    if (localStorage.getItem('session')) {
        activityTimer = setTimeout(logoutSessionInactive, INACTIVITY_TIME);
    }
}

/**
 * Cierra automáticamente la sesión activa por inactividad y devuelve al login.
 */
function logoutSessionInactive() {
    localStorage.removeItem('session');
    showToast("Sesión cerrada automáticamente por inactividad física de 5 minutos.", "error");
    setTimeout(() => {
        routeApplication();
    }, 1500);
}

// Configurar los escuchadores de eventos globales para resetear el temporizador
window.addEventListener('load', resetActivityTimer);
document.addEventListener('mousemove', resetActivityTimer);
document.addEventListener('keypress', resetActivityTimer);
document.addEventListener('mousedown', resetActivityTimer);
document.addEventListener('scroll', resetActivityTimer);

/**
 * Cierra manualmente la sesión de usuario activa.
 */
function logoutSession() {
    localStorage.removeItem('session');
    showToast("Sesión cerrada exitosamente.", "success");
    setTimeout(() => {
        routeApplication();
    }, 1000);
}

/**
 * Muestra un banner flotante de Toast dinámico en la esquina inferior derecha.
 * 
 * @param {string} message Mensaje a mostrar.
 * @param {string} type Tipo de alerta ('success', 'error', 'info', 'warning').
 */
function showToast(message, type = 'info') {
    // Quitar Toast previo
    const oldToast = document.getElementById('siarad-toast');
    if (oldToast) {
        oldToast.remove();
    }

    const colors = {
        success: 'bg-emerald-700 text-white shadow-emerald-900/20 border-emerald-600',
        error: 'bg-rose-700 text-white shadow-rose-900/20 border-rose-600',
        info: 'bg-slate-800 text-white shadow-slate-900/20 border-slate-700',
        warning: 'bg-amber-600 text-white shadow-amber-900/20 border-amber-500'
    };

    const icons = {
        success: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        info: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        warning: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
    };

    const colorClass = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    // Crear el elemento HTML
    const toast = document.createElement('div');
    toast.id = 'siarad-toast';
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold tracking-wide animate-fade-in ${colorClass} no-print`;
    toast.innerHTML = `<span class="inline-flex">${icon}</span><span>${message}</span>`;

    document.body.appendChild(toast);

    // Ocultar y remover después de 4 segundos
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

/**
 * ==============================================================================
 * CONTROLADORES MÓVILES Y PWA (ANDROID APK / iOS / TABLETS)
 * ==============================================================================
 */

/**
 * Abre el cajón lateral de navegación en pantallas móviles.
 */
function openMobileDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const drawer = document.getElementById('mobile-drawer');
    if (overlay && drawer) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        drawer.classList.remove('-translate-x-full');
        drawer.classList.add('translate-x-0');
    }
}

/**
 * Cierra el cajón lateral de navegación móvil.
 */
function closeMobileDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const drawer = document.getElementById('mobile-drawer');
    if (overlay && drawer) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
        drawer.classList.add('-translate-x-full');
        drawer.classList.remove('translate-x-0');
    }
}

// Gestión del evento de instalación nativa PWA (Android / Chrome / Edge)
let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
    }
});

function triggerPwaInstall() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast("¡SIFAD-MB instalándose en tu dispositivo móvil!", "success");
            }
            deferredPwaPrompt = null;
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.classList.add('hidden');
        });
    } else {
        showToast("Para instalar en iPhone: pulsa Compartir y selecciona 'Agregar a Inicio'", "info");
    }
}

// Registro automático del Service Worker PWA para capacidades offline y empaquetado APK
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => {
                console.log('[SIFAD-MB] PWA Service Worker registrado con éxito. Scope:', reg.scope);
            })
            .catch((err) => {
                console.warn('[SIFAD-MB] Registro de Service Worker omitido:', err);
            });
    });
}

