<?php
// Abrimos la base de datos SQLite utilizada por DarkOrange.
$db = new SQLite3('../data/darkorange.db');

// Buscamos todas las tablas creadas por el usuario.
$result = $db->query("
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
");

// Array que contendrá cada tabla junto con sus registros.
$basededatos = [];

// Recorremos las tablas obtenidas.
while ($fila = $result->fetchArray(SQLITE3_ASSOC)) {
    // Extraemos el nombre de la tabla actual.
    $tabla = $fila['name'];

    // Consultamos todos los registros de la tabla actual.
    $resultadoTabla = $db->query(
        'SELECT * FROM "' . str_replace('"', '""', $tabla) . '"'
    );

    $registros = [];

    while ($registro = $resultadoTabla->fetchArray(SQLITE3_ASSOC)) {
        $registros[] = $registro;
    }

    // Asociamos los registros con el nombre de su tabla.
    $basededatos[$tabla] = $registros;
}

// Indicamos que la respuesta será JSON en UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Enviamos toda la base de datos con formato legible.
echo json_encode(
    $basededatos,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
);

// Cerramos la conexión con SQLite.
$db->close();

?>