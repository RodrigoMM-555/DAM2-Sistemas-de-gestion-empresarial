PRAGMA foreign_keys = ON;

CREATE TABLE usuarios(
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('administrador', 'scouter', 'tutor'))
);

CREATE TABLE educandos(
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    usuario_id INTEGER,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(identificador)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE eventos(
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_final TEXT NOT NULL,
    tipo TEXT NOT NULL
);