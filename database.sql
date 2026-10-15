-- ============================================================
-- SCHEMA SQL para MySQL
-- Sistema DGAF — Dirección General de Administración y Finanzas
-- ============================================================

CREATE DATABASE IF NOT EXISTS dgaf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dgaf_db;

-- ========================
-- TABLA: berti_usuario
-- ========================
CREATE TABLE IF NOT EXISTS berti_usuario (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    usuario     VARCHAR(100) NOT NULL UNIQUE,
    clave       VARCHAR(255) NOT NULL,
    correo      VARCHAR(150) NOT NULL UNIQUE,
    telefono    VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_direccion
-- ========================
CREATE TABLE IF NOT EXISTS berti_direccion (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    calle       VARCHAR(150),
    avenida     VARCHAR(150),
    sector      VARCHAR(150),
    numero_casa VARCHAR(20),
    status      VARCHAR(20),
    id_usuario  INT(11),
    FOREIGN KEY (id_usuario) REFERENCES berti_usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_rol
-- ========================
CREATE TABLE IF NOT EXISTS berti_rol (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_usuario_rol
-- ========================
CREATE TABLE IF NOT EXISTS berti_usuario_rol (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_usuario  INT(11),
    id_rol      INT(11),
    FOREIGN KEY (id_usuario) REFERENCES berti_usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES berti_rol(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_modulo
-- ========================
CREATE TABLE IF NOT EXISTS berti_modulo (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_rm_pagin
-- ========================
CREATE TABLE IF NOT EXISTS berti_rm_pagin (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_rol      INT(11),
    id_modulo   INT(11),
    FOREIGN KEY (id_rol) REFERENCES berti_rol(id) ON DELETE CASCADE,
    FOREIGN KEY (id_modulo) REFERENCES berti_modulo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_pagina
-- ========================
CREATE TABLE IF NOT EXISTS berti_pagina (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    url         VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_permisos
-- ========================
CREATE TABLE IF NOT EXISTS berti_permisos (
    id          INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: berti_rm_per
-- ========================
CREATE TABLE IF NOT EXISTS berti_rm_per (
    id              INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_rm_pagin     INT(11),
    id_pagina       INT(11),
    id_permiso      INT(11),
    FOREIGN KEY (id_rm_pagin) REFERENCES berti_rm_pagin(id) ON DELETE CASCADE,
    FOREIGN KEY (id_pagina) REFERENCES berti_pagina(id) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES berti_permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: correspondencia
-- ========================
CREATE TABLE IF NOT EXISTS correspondencia (
    id                  VARCHAR(100) PRIMARY KEY,
    asunto              VARCHAR(500) NOT NULL,
    remitente           VARCHAR(100) NOT NULL, -- Código de departamento (Ej: DGAF, DC)
    remitente_usuario   VARCHAR(255) NOT NULL, -- Email del creador
    destinatario        VARCHAR(100) NOT NULL, -- Código de departamento destino
    destinatario_correo VARCHAR(255),          -- Email opcional del funcionario asignado
    fecha_ingreso       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    fecha_limite        TIMESTAMP    NULL,
    estado              VARCHAR(50)  NOT NULL DEFAULT 'Recibido',
    tipo                VARCHAR(50)  DEFAULT 'Oficio',
    prioridad           VARCHAR(50)  DEFAULT 'normal',
    referencia          VARCHAR(255),
    firmante            VARCHAR(255),
    cuerpo              LONGTEXT,              -- Admite HTML/Quill.js
    anexos              LONGTEXT,              -- Almacenado como JSON String
    comentarios         LONGTEXT,              -- Almacenado como JSON String (hilo de notas)
    historial_versiones LONGTEXT,              -- Almacenado como JSON String
    historial           LONGTEXT,              -- Almacenado como JSON String (trazabilidad)
    leido               BOOLEAN      DEFAULT FALSE,
    firma               LONGTEXT,              -- Almacenado como JSON String (sello de firma)
    caso_maestro_id     VARCHAR(100),
    delegado_a          VARCHAR(255),          -- Email del analista delegado
    eliminado           BOOLEAN      DEFAULT FALSE,
    fecha_eliminado     TIMESTAMP    NULL,
    email_message_id    VARCHAR(255),
    formatting          LONGTEXT,              -- Opciones de formato y diseño en JSON
    smtp_message_id     VARCHAR(255),          -- ID del mensaje saliente SMTP
    fecha_envio         TIMESTAMP NULL         -- Fecha de despacho oficial por correo
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: auditoria (Logs)
-- ========================
CREATE TABLE IF NOT EXISTS auditoria (
    id        VARCHAR(100) PRIMARY KEY,
    usuario   VARCHAR(255) NOT NULL,
    email     VARCHAR(255) NOT NULL,
    ip        VARCHAR(50)  DEFAULT '127.0.0.1',
    fecha     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    accion    VARCHAR(255) NOT NULL,
    detalles  TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: plantillas
-- ========================
CREATE TABLE IF NOT EXISTS plantillas (
    id      VARCHAR(100) PRIMARY KEY,
    titulo  VARCHAR(255) NOT NULL,
    cuerpo  LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================
-- TABLA: casos (Expedientes)
-- ========================
CREATE TABLE IF NOT EXISTS casos (
    id          VARCHAR(100) PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices de Rendimiento
CREATE INDEX idx_corr_estado ON correspondencia(estado);
CREATE INDEX idx_corr_dest ON correspondencia(destinatario);
CREATE INDEX idx_corr_remit ON correspondencia(remitente);
CREATE INDEX idx_corr_elim ON correspondencia(eliminado);
CREATE INDEX idx_audit_fecha ON auditoria(fecha DESC);
