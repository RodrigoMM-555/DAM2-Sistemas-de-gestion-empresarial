<?php

require_once __DIR__ . '/../data/database.php';
header('Content-Type: text/html; charset=utf-8');

$modelo = trim($_POST['modelo'] ?? '');
if ($modelo === '') {
    http_response_code(400);
    exit('No se ha recibido ningún modelo de datos.');
}

function identificadorValido(string $valor): bool
{
    return preg_match('/^[\p{L}_][\p{L}\p{N}_]*$/u', $valor) === 1;
}

function crearSqlTabla(string $tabla, array $columnas): string
{
    if (!identificadorValido($tabla)) {
        throw new RuntimeException("Nombre de tabla no válido: {$tabla}");
    }

    $definiciones = ['`id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY'];
    foreach ($columnas as $columna) {
        if (preg_match('/^(PRIMARY KEY|UNIQUE(?: KEY)?|FOREIGN KEY|CHECK)\b/i', trim($columna))) {
            $definiciones[] = trim($columna);
            continue;
        }
        $partes = preg_split('/\s+/', trim($columna), 2);
        $nombre = $partes[0];
        if ($nombre === 'id') {
            continue;
        }
        if (!identificadorValido($nombre)) {
            throw new RuntimeException("Nombre de columna no válido: {$nombre}");
        }
        $definicion = trim($partes[1] ?? 'TEXT');
        $definiciones[] = '`' . $nombre . '` ' . $definicion;
    }

    return 'CREATE TABLE IF NOT EXISTS `' . $tabla . '` ('
        . implode(', ', $definiciones) . ') ENGINE=InnoDB';
}

try {
    $lineas = preg_split('/\R/', $modelo);
    $tablas = [];
    $tablaActual = null;
    $columnas = [];

    foreach ($lineas as $linea) {
        $linea = trim($linea);
        if ($linea === '' || str_starts_with($linea, '#')) {
            continue;
        }
        if (str_starts_with($linea, '-')) {
            if ($tablaActual === null) {
                throw new RuntimeException('Hay una columna antes de declarar una tabla.');
            }
            $columnas[] = trim(substr($linea, 1));
            continue;
        }
        if ($tablaActual !== null) {
            $tablas[] = crearSqlTabla($tablaActual, $columnas);
        }
        $tablaActual = $linea;
        $columnas = [];
    }
    if ($tablaActual !== null) {
        $tablas[] = crearSqlTabla($tablaActual, $columnas);
    }
    if (!$tablas) {
        throw new RuntimeException('El modelo no contiene ninguna tabla.');
    }

    $db = obtenerConexion(false);
    $nombre = getenv('INGERIAR_DB_NAME') ?: 'ingeriar';
    $db->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '``', $nombre)
        . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $db->exec('USE `' . str_replace('`', '``', $nombre) . '`');
    foreach ($tablas as $sql) {
        $db->exec($sql);
    }
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    if ($error instanceof PDOException && (int) $error->errorInfo[1] === 1698) {
        exit(
            'No se pudo autenticar MySQL. No uses root desde PHP; crea el usuario '
            . 'ingeriar_app y configura INGERIAR_DB_USER e INGERIAR_DB_PASSWORD.'
        );
    }
    exit('No se pudo instalar el modelo: ' . htmlspecialchars($error->getMessage()));
}

echo '<h1>Base de datos MySQL creada correctamente</h1>';
echo '<p>Se han procesado ' . count($tablas) . ' tablas.</p>';
foreach ($tablas as $sql) {
    echo '<pre>' . htmlspecialchars($sql) . ';</pre>';
}
