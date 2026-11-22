USE ingeriar;

-- 30 usuarios de prueba. La contraseña de cada uno es demo-<numero>.
INSERT INTO usuarios
    (nombre, apellidos, email, telefono, `contraseña`, rol)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 30
)
SELECT
    CONCAT('Usuario ', numero),
    CONCAT('Apellido ', numero),
    CONCAT('usuario', numero, '@ingeriar.test'),
    CONCAT('600', LPAD(numero, 6, '0')),
    SHA2(CONCAT('demo-', numero), 256),
    CASE MOD(numero, 3)
        WHEN 1 THEN 'administrador'
        WHEN 2 THEN 'scouter'
        ELSE 'tutor'
    END
FROM numeros;

-- 100 educandos con DNI y fechas de nacimiento únicas.
INSERT INTO educandos (nombre, apellidos, DNI, naz)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 100
)
SELECT
    CONCAT('Educando ', numero),
    CONCAT('Familia ', numero),
    CONCAT(LPAD(numero, 8, '0'), CHAR(65 + MOD(numero - 1, 26))),
    DATE_ADD('2010-01-01', INTERVAL MOD(numero * 37, 3000) DAY)
FROM numeros;

-- Cada educando queda vinculado a un tutor o scouter.
INSERT INTO usuarios_educandos (id_usuario, id_educando)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 100
)
SELECT 3 + MOD(numero - 1, 28), numero
FROM numeros;

-- 40 eventos repartidos durante 2026 y 2027.
INSERT INTO eventos
    (nombre, fecha_inicio, fecha_fin, id_responsable, lugar, municipio, comunidad,
     tipo, circular)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 40
)
SELECT
    CONCAT('Actividad programada ', numero),
    DATE_ADD('2026-01-10 09:00:00', INTERVAL numero * 14 DAY),
    DATE_ADD('2026-01-10 18:00:00', INTERVAL numero * 14 DAY),
    2 + MOD(numero - 1, 28),
    CONCAT('Centro scout ', MOD(numero - 1, 8) + 1),
    CONCAT('Municipio ', MOD(numero - 1, 12) + 1),
    CONCAT('Comunidad ', MOD(numero - 1, 5) + 1),
    CASE MOD(numero, 5)
        WHEN 1 THEN 'Campamento'
        WHEN 2 THEN 'Taller'
        WHEN 3 THEN 'Excursión'
        WHEN 4 THEN 'Convivencia'
        ELSE 'Actividad'
    END,
    MOD(numero, 2) = 0
FROM numeros;

-- 80 facturas asociadas a responsables existentes.
INSERT INTO facturas
    (responsable_id, numero_fact, CIF_prov, fecha_emision, fecha_compra,
     concepto, precio, categoria, estado)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 80
)
SELECT
    1 + MOD(numero - 1, 30),
    20260000 + numero,
    CONCAT('B', LPAD(numero, 8, '0')),
    DATE_ADD('2026-01-01 10:00:00', INTERVAL numero * 3 DAY),
    DATE_ADD('2026-01-02 10:00:00', INTERVAL numero * 3 DAY),
    CONCAT('Material para actividad ', numero),
    ROUND(15 + (numero * 13.75), 2),
    CASE MOD(numero, 4)
        WHEN 1 THEN 'Material'
        WHEN 2 THEN 'Transporte'
        WHEN 3 THEN 'Alimentación'
        ELSE 'Alojamiento'
    END,
    CASE MOD(numero, 3)
        WHEN 1 THEN 'pendiente'
        WHEN 2 THEN 'pagada'
        ELSE 'rechazada'
    END
FROM numeros;

-- 160 asistencias de prueba con combinaciones únicas de usuario y evento.
INSERT INTO educandos_asistencias
    (id_educando, id_evento, estado, archivo_entrega)
WITH RECURSIVE numeros AS (
    SELECT 1 AS numero
    UNION ALL
    SELECT numero + 1 FROM numeros WHERE numero < 160
)
SELECT
    1 + MOD(numero - 1, 100),
    1 + MOD(numero - 1, 40),
    CASE MOD(numero, 3)
        WHEN 1 THEN 'si'
        WHEN 2 THEN 'no'
        ELSE 'pendiente'
    END,
    NULL
FROM numeros;
