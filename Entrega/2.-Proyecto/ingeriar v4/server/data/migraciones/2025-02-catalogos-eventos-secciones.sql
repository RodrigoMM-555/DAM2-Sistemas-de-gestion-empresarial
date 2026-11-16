CREATE TABLE IF NOT EXISTS tipos_evento (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS secciones (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    edad_minima TINYINT UNSIGNED NULL,
    edad_maxima TINYINT UNSIGNED NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eventos_secciones (
    id_evento INT UNSIGNED NOT NULL,
    seccion VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_evento, seccion),
    FOREIGN KEY (id_evento) REFERENCES eventos(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO tipos_evento (codigo, nombre, activo, orden) VALUES
    ('reunión de familias', 'Reunión de familias', TRUE, 10),
    ('sabado', 'Sábado', TRUE, 20),
    ('festival', 'Festival', TRUE, 30),
    ('excursion', 'Excursión', TRUE, 40),
    ('acampada', 'Acampada', TRUE, 50),
    ('otro', 'Otro', TRUE, 60);

INSERT IGNORE INTO secciones
    (codigo, nombre, edad_minima, edad_maxima, activo, orden)
VALUES
    ('colonia', 'Colonia', 5, 6, TRUE, 10),
    ('manada', 'Manada', 7, 9, TRUE, 20),
    ('tropa', 'Tropa', 10, 12, TRUE, 30),
    ('posta', 'Posta', 13, 15, TRUE, 40),
    ('rutas', 'Rutas', 16, 19, TRUE, 50);

ALTER TABLE eventos MODIFY COLUMN tipo VARCHAR(50) NOT NULL;
ALTER TABLE eventos_secciones MODIFY COLUMN seccion VARCHAR(50) NOT NULL;

DELIMITER //

DROP PROCEDURE IF EXISTS migrar_seccion_eventos//
CREATE PROCEDURE migrar_seccion_eventos()
BEGIN
    DECLARE columna_antigua INT DEFAULT 0;

    SELECT COUNT(*) INTO columna_antigua
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'eventos'
      AND COLUMN_NAME = 'seccion';

    IF columna_antigua > 0 THEN
        INSERT IGNORE INTO eventos_secciones (id_evento, seccion)
        SELECT id, seccion
        FROM eventos
        WHERE seccion IS NOT NULL AND seccion <> '';

        ALTER TABLE eventos DROP COLUMN seccion;
    END IF;
END//

CALL migrar_seccion_eventos()//
DROP PROCEDURE migrar_seccion_eventos//

DELIMITER ;
