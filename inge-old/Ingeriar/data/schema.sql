CREATE DATABASE webscout;
USE webscout;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL UNIQUE,
    rol ENUM('administrador', 'scouter', 'tutor') NOT NULL
);

CREATE TABLE educandos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    dni CHAR(9) NOT NULL UNIQUE,
    fecha_nac DATE
);

CREATE TABLE educando_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    educando_id INT NOT NULL,
    usuario_id INT NOT NULL,
    UNIQUE KEY unique_educando_usuario (educando_id, usuario_id),
    FOREIGN KEY (educando_id) REFERENCES educandos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    responsable_id INT,
    fecha_inicio DATETIME NOT NULL,
    fecha_final DATETIME NOT NULL,
    lugar VARCHAR(150),
    municipio VARCHAR(100),
    provincia VARCHAR(100),
    tipo VARCHAR(50) NOT NULL,
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    educando_id INT NOT NULL,
    asistencia ENUM('pendiente', 'si', 'no') NOT NULL DEFAULT 'pendiente',

    UNIQUE KEY unique_asistencia (evento_id, educando_id),

    FOREIGN KEY (evento_id) REFERENCES eventos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (educando_id) REFERENCES educandos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);