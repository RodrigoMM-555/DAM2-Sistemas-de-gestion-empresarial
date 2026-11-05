CREATE DATABASE IF NOT EXISTS ingeriar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE ingeriar;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL UNIQUE,
    `contraseña` VARCHAR(255) NOT NULL,
    rol ENUM('administrador', 'scouter', 'tutor') NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS educandos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    DNI CHAR(9) NOT NULL UNIQUE,
    naz DATE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facturas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    responsable_id INT UNSIGNED NOT NULL,
    numero_fact INT NOT NULL,
    CIF_prov VARCHAR(20) NOT NULL,
    fecha_emision DATETIME NOT NULL,
    fecha_compra DATETIME NOT NULL,
    concepto TEXT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    categoria enum('envíos', 'comida', 'material', 'gasolina', 'otros', 'agua', 'luz', 'gas') NOT NULL,
    estado VARCHAR(50) NOT NULL,
    CONSTRAINT fk_facturas_responsable
        FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios_educandos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    id_educando INT UNSIGNED NOT NULL,
    UNIQUE KEY unique_usuario_educando (id_usuario, id_educando),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_educando) REFERENCES educandos(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eventos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    id_responsable INT UNSIGNED,
    lugar VARCHAR(150),
    municipio VARCHAR(100),
    comunidad VARCHAR(100),
    tipo  ENUM('reunión de familias', 'sabado', 'festival', 'excursion', 'otro') NOT NULL,
    circular BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_responsable) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS educandos_asistencias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_educando INT UNSIGNED NOT NULL,
    id_evento INT UNSIGNED NOT NULL,
    estado ENUM('pendiente', 'si', 'no') NOT NULL DEFAULT 'pendiente',
    archivo_entrega VARCHAR(255),
    UNIQUE KEY unique_educando_asistencia (id_educando, id_evento),
    FOREIGN KEY (id_educando) REFERENCES educandos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_evento) REFERENCES eventos(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
