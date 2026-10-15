# MANUAL DE DESPLIEGUE, ACCESOS Y APLICACIÓN MÓVIL (APK / iOS)
## Sistema de Información Financiera y Archivo Documental (SIFAD-MB)

---

### 📋 Ficha Técnica del Proyecto
- **Nombre Oficial:** Sistema de Información Financiera y Archivo Documental (SIFAD-MB)
- **Autor / Desarrollador:** Beiker Alfredo Pérez Arrieta
- **Título Académico:** Trabajo Especial de Grado - Técnico Superior Universitario (TSU) en Informática
- **Entidad Beneficiaria:** Alcaldía Bolivariana de Maracaibo — Dirección General de Administración y Finanzas
- **Versión del Sistema:** v1.0.1 (Optimización Móvil Nativa y Logos de Alta Fidelidad)

---

### 🌐 1. Enlaces Oficiales del Sistema en Internet

| Plataforma / Servicio | Enlace Directo | Descripción |
| :--- | :--- | :--- |
| **Repositorio GitHub** | [https://github.com/beikerp51/SIFAD-MB](https://github.com/beikerp51/SIFAD-MB) | Código fuente oficial, versiones y respaldo |
| **Sistema Web en Línea (PWA)** | [https://beikerp51.github.io/SIFAD-MB/](https://beikerp51.github.io/SIFAD-MB/) | Acceso al sistema en vivo desde cualquier navegador |
| **Generador de APK (PWABuilder)** | [PWABuilder para SIFAD-MB](https://www.pwabuilder.com/?url=https://beikerp51.github.io/SIFAD-MB/) | Herramienta oficial para generar el instalable Android |
| **Servidor Local de Demostración** | `http://localhost:8080/` | Ejecución en red local mediante PowerShell |

---

### 🔐 2. Credenciales Administrativas Predeterminadas

- **Usuario Funcionario:** `Norwuin123`
- **Clave de Seguridad:** `admin2026`
- **Rol:** Administrador General de Archivo y Finanzas
- **Permisos Habilitados:** Creación, edición, eliminación física, préstamos, reportes semanales y respaldos.

---

### 📱 3. Cómo Quitar la Barra Superior ("beikerp51.github.io") y Tener la APK 100% Nativa

En los dispositivos Android existen **dos formas** de disfrutar de SIFAD-MB en pantalla completa inmersiva, sin ninguna barra del navegador, sin la raya superior de GitHub y con apariencia 100% nativa de aplicación corporativa:

#### 🥇 Método Recomendado: Instalación Nativa Directa vía WebAPK (1 Solo Toque, 100% Sin Barra)
Google Chrome en Android cuenta con el compilador oficial de Google Play Services para instalar **WebAPKs nativas**:
1. Abre **Google Chrome** en tu teléfono Android.
2. Ingresa a la URL oficial: **[https://beikerp51.github.io/SIFAD-MB/](https://beikerp51.github.io/SIFAD-MB/)**.
3. Verás abajo un aviso emergente que dice **"Agregar SIFAD-MB a la pantalla principal"** o puedes tocar los **tres puntos verticales (⋮)** arriba a la derecha en Chrome y seleccionar **"Instalar aplicación"**.
4. Pulsa **"Instalar"**.
5. Tu teléfono creará una aplicación real instalada en el cajón de aplicaciones y en la pantalla de inicio con su icono institucional de alta resolución.
6. **Resultado:** Al abrirla, la aplicación corre a **pantalla completa absoluta**, sin barra superior de `beikerp51.github.io`, sin botones de compartir ni de navegador, comportándose idéntica a una aplicación nativa descargada de Google Play Store.

#### 🥈 Método APK empaquetada (PWABuilder / Bubblewrap / TWA)
Si generas el archivo `.apk` mediante PWABuilder:
- **Por qué aparecía la barra:** Android Trusted Web Activity (TWA) exige la validación de propiedad de dominio mediante el protocolo **Digital Asset Links**. Si el archivo `/.well-known/assetlinks.json` no existe en el servidor con la huella digital criptográfica SHA-256 de la APK, Chrome muestra por seguridad la barra de origen para evitar suplantaciones.
- **Solución implementada:**
  1. Ya se incorporó el archivo `.nojekyll` en el repositorio para que GitHub Pages sirva correctamente la carpeta `.well-known/`.
  2. Se configuró el archivo `.well-known/assetlinks.json`. Si descargas el ZIP de PWABuilder, dentro viene el archivo `assetlinks.json` con la huella SHA-256 exacta de tu APK. Al subirlo a GitHub, la APK elimina de inmediato la barra superior.

---

### 🎨 4. Mejoras Visuales y de Ergonomía Móvil Implementadas

1. **Logos de Identidad Institucional:**
   - **Alcaldía Bolivariana de Maracaibo:** Procesado y limpiado para máxima nitidez en pantallas de alta densidad (Retina / AMOLED).
   - **"Maracaibo, Con mi gente se resuelve":** Se eliminó el marco cuadrado gris (`64x64px`) que lo comprimía y pixelaba el texto manuscrito. Ahora cuenta con un escalado proporcional fluido de alta resolución (`314x378`), permitiendo leer con total claridad cada letra del eslogan.
2. **Barra de Navegación Inferior (Mobile Bottom Bar):**
   - Corregido el problema donde la barra inferior (`Inicio`, `Nuevo`, `Buscar`, `Menú`) se mostraba en la pantalla de inicio de sesión (*Login*) antes de ingresar.
   - Ahora permanece estrictamente oculta hasta que el funcionario inicia sesión exitosamente en el panel operativo.
3. **Distribución en Cuadrícula 2x2 para Teléfonos:**
   - Las cuatro tarjetas métricas (*Total Archivados*, *Disponibles*, *En Préstamo*, *Incompletos*) se organizan en una cuadrícula compacta de 2 columnas por 2 filas, evitando que el usuario deba desplazarse verticalmente solo para ver los números.
4. **Panel de Gráficos Plegable en Móvil:**
   - En teléfonos inteligentes, los gráficos de indicadores SVG inician plegados para no restar espacio a la tabla de expedientes y pueden expandirse con un toque mediante el botón *"Mostrar/Ocultar Gráficos"*.
5. **Herramientas de Búsqueda y Filtros Optimizados al Tacto:**
   - Buscador y selectores organizados en 3 columnas adaptativas con botones de acción rápida (*Excel* y *+ Expediente*) para operación cómoda con el pulgar.

---

### 💻 5. Servidor Local de Demostración (Offline / Windows)

Para ejecutar el sistema en una computadora sin acceso a internet durante una defensa presencial:
1. Abre **PowerShell** en la carpeta del proyecto.
2. Ejecuta:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\webserver.ps1
   ```
3. El sistema estará disponible en tu navegador en `http://localhost:8080/`.
