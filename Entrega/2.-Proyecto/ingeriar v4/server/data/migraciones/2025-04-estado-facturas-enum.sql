ALTER TABLE facturas
    MODIFY COLUMN estado ENUM(
        'pendiente',
        'pagada',
        'rechazada'
    ) NOT NULL DEFAULT 'pendiente';
