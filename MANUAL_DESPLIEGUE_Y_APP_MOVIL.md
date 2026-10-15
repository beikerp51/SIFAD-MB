# MANUAL DE DESPLIEGUE, ACCESOS Y APLICACIÓN MÓVIL (APK / iOS)
## Sistema de Información Financiera y Archivo Documental (SIFAD-MB)

---

### 📋 Ficha Técnica del Proyecto
- **Nombre Oficial:** Sistema de Información Financiera y Archivo Documental (SIFAD-MB)
- **Autor / Desarrollador:** Beiker Alfredo Pérez Arrieta
- **Título Académico:** Trabajo Especial de Grado - Técnico Superior Universitario (TSU) en Informática
- **Entidad Beneficiaria:** Alcaldía Bolivariana de Maracaibo — Dirección General de Administración y Finanzas
- **Versión del Sistema:** v1.0.0 (Release Oficial para Jurado Evaluador)

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

### 📱 3. Instalación en Dispositivos Móviles

#### A. En Teléfonos Android (PWA Nativa)
1. Abre el navegador **Google Chrome** en tu teléfono Android.
2. Ingresa a: **[https://beikerp51.github.io/SIFAD-MB/](https://beikerp51.github.io/SIFAD-MB/)**
3. En la barra superior del sistema verás el botón **"Instalar App"**, pulsa sobre él.
   *(También puedes presionar los tres puntos verticales de Chrome arriba a la derecha y seleccionar **"Instalar aplicación"** o **"Agregar a la pantalla principal"**).*
4. Se creará el ícono institucional de **SIFAD-MB** en la pantalla de inicio de tu teléfono. Al abrirlo, funcionará a pantalla completa sin barra de navegación del navegador.

#### B. En iPhone / iPad (Apple iOS)
1. Abre el navegador **Safari** en tu iPhone.
2. Ingresa a: **[https://beikerp51.github.io/SIFAD-MB/](https://beikerp51.github.io/SIFAD-MB/)**
3. Toca el botón **Compartir** de Safari (el ícono cuadrado con una flecha hacia arriba en la parte inferior).
4. Desplaza las opciones y selecciona **"Agregar a Inicio"** (*Add to Home Screen*).
5. Confirma el nombre **SIFAD-MB** y pulsa **Agregar**.
6. El sistema se abrirá como una aplicación nativa de iOS, adaptada a la *Isla Dinámica* y al *Notch*.

---

### 📦 4. Cómo Generar y Descargar el Archivo APK (`.apk`)

#### Opción 1: Descarga Directa con PWABuilder (Recomendado, en 1 minuto)
1. Ingresa a: **[PWABuilder para SIFAD-MB](https://www.pwabuilder.com/?url=https://beikerp51.github.io/SIFAD-MB/)**
2. La plataforma analizará automáticamente el `manifest.json` y el `sw.js` (ambos ya están configurados con calificación 100% aprobada).
3. Haz clic en el botón **"Package for Stores"** o presiona la tarjeta **Android**.
4. Haz clic en **"Generate"** o **"Download Package"**.
5. Obtendrás un archivo comprimido `.zip` que contiene tu archivo **`.apk` firmado**, listo para ser instalado en cualquier teléfono Android o entregado a los profesores.

#### Opción 2: Compilación con Android Studio (Para el Siguiente Trimestre)
Si en tu siguiente periodo académico te exigen compilar el proyecto en Android Studio con Gradle:
1. Abre tu terminal de comandos en la carpeta del proyecto.
2. Ejecuta:
   ```bash
   npm run cap:add:android
   npm run cap:sync
   npm run cap:open:android
   ```
3. Se abrirá **Android Studio** con la estructura nativa creada.
4. Dirígete a **Build > Build Bundle(s) / APK(s) > Build APK(s)** y el ejecutable se generará en la carpeta `android/app/build/outputs/apk/debug/app-debug.apk`.

---

### 💻 5. Ejecución del Servidor Web Local en Windows

Si necesitas hacer una presentación presencial sin conexión a internet:
1. Abre **PowerShell** en la carpeta del proyecto.
2. Ejecuta el comando:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\webserver.ps1
   ```
3. Abre tu navegador en `http://localhost:8080/`.

---

*Documento técnico compilado para la defensa de grado del TSU Beiker Alfredo Pérez Arrieta — Alcaldía Bolivariana de Maracaibo.*
