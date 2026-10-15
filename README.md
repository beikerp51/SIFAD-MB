# Sistema de Información Financiera y Archivo Documental (SIFAD-MB)

**Proyecto Especial de Grado para optar al Título de Técnico Superior Universitario (TSU) en Informática**  
**Autor:** Beiker Alfredo Pérez Arrieta  
**Institución Beneficiaria:** Alcaldía Bolivariana de Maracaibo — Dirección General de Administración y Finanzas  

---

## 🏛️ Descripción del Sistema

El **Sistema de Información Financiera y Archivo Documental (SIFAD-MB)** es una solución web de gestión documental diseñada para automatizar, ordenar y resguardar los expedientes físicos y digitales generados por la Dirección General de Administración y Finanzas de la Alcaldía Bolivariana de Maracaibo.

El sistema implementa una arquitectura modular que optimiza:
- Registro, clasificación y foliado de expedientes físicos y digitales.
- Control de préstamos documentales y emisión de boletas de salida con firma autorizada.
- Ubicación física topológica en estanterías mediante asignación visual de archivadores (Racks y Cuerpos).
- Trazabilidad y auditoría de movimientos históricos.
- Reportes consolidados de cierre semanal e inventario en PDF/impresión.
- Plan de resguardo preventivo y copias de seguridad de datos.

---

## 🚀 Tecnologías Empleadas

- **Frontend:** HTML5 Semántico, Vanilla JavaScript (ES6+), Tailwind CSS (estilo corporativo institucional).
- **Almacenamiento Local de Alto Rendimiento:** IndexedDB API y LocalStorage para persistencia transaccional y sin latencia.
- **Seguridad:** Cifrado de contraseñas mediante hashing criptográfico SHA-256 nativo (`crypto.subtle`).
- **Control de Acceso:** Matriz de permisos por roles (Administrador y Asistentes de Archivo).
- **Empaquetado y Respaldos:** JSZip para empaquetado de copias de seguridad en formato `.zip`.
- **Servidor Local de Despliegue:** PowerShell HTTP Server / Servidor web ligero multiplataforma.

---

## 💻 Instrucciones de Instalación y Ejecución Local

### 🌐 Acceso Directo en Línea (PWA / Web)
El sistema se encuentra desplegado y accesible públicamente con soporte completo para navegadores móviles y de escritorio en:
👉 **[https://beikerp51.github.io/SIFAD-MB/](https://beikerp51.github.io/SIFAD-MB/)**

---

### Prerrequisitos para Ejecución Local
- Cualquier navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox o Brave).
- PowerShell (incluido de forma nativa en Windows) o cualquier servidor web estático.

### Ejecución Local con Servidor Integrado
1. Clone este repositorio:
   ```bash
   git clone https://github.com/beikerp51/SIFAD-MB.git
   ```
2. Ingrese a la carpeta del proyecto:
   ```bash
   cd "SIFAD-MB"
   ```
3. Ejecute el servidor local incluido:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\webserver.ps1
   ```
4. Abra su navegador web e ingrese a la dirección:
   ```
   http://localhost:8080/
   ```

---

## 🔐 Credenciales Predeterminadas de Acceso

- **Usuario:** `Norwuin123`
- **Contraseña:** `admin2026`
- **Rol:** Administrador de Archivo

---

## 📁 Estructura del Proyecto

```text
├── assets/
│   ├── css/
│   │   └── styles.css          # Estilos institucionales y variables del sistema
│   ├── images/
│   │   ├── logo_alcaldia.png   # Emblema de la Alcaldía Bolivariana de Maracaibo
│   │   ├── logo_gestion.png    # Isotipo de Gestión de Archivo
│   │   └── anexos/             # Capturas del sistema para manuales
│   └── js/
│       ├── app.js              # Controlador principal, routing e inicialización
│       ├── main.js             # UI general, modal management y notificaciones
│       ├── dashboard.js        # Tablas, estadísticas y tablero de control
│       ├── forms.js            # Validaciones y registro de expedientes
│       ├── report.js           # Generación de reportes semanales y boletas
│       └── backup.js           # Mecanismo de respaldo .ZIP y bloqueo preventivo
├── database.sql                # Esquema de base de datos relacional para referencia
├── index.html                  # Aplicación web SPA principal
├── webserver.ps1               # Servidor web local en PowerShell
├── .gitignore                  # Exclusiones de control de versiones
└── README.md                   # Documentación técnica del proyecto
```

---

## 🎓 Créditos y Reconocimientos

- **Autor:** Beiker Alfredo Pérez Arrieta
- **Carrera:** TSU en Informática
- **Entidad:** Alcaldía Bolivariana de Maracaibo — Dirección General de Administración y Finanzas
