DROP TABLE IF EXISTS estados_factura;

CREATE TABLE IF NOT EXISTS categorias_factura (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO categorias_factura (codigo, nombre, activo, orden) VALUES
    ('envíos', 'Envíos', TRUE, 10),
    ('comida', 'Comida', TRUE, 20),
    ('material', 'Material', TRUE, 30),
    ('gasolina', 'Gasolina', TRUE, 40),
    ('otros', 'Otros', TRUE, 50),
    ('agua', 'Agua', TRUE, 60),
    ('luz', 'Luz', TRUE, 70),
    ('gas', 'Gas', TRUE, 80);

ALTER TABLE facturas MODIFY COLUMN categoria VARCHAR(50) NOT NULL;
