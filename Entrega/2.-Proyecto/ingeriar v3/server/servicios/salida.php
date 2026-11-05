<?php

require_once __DIR__ . '/../data/database.php';

$db = obtenerConexion();
$tablas = $db->query(
    "SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME"
)->fetchAll(PDO::FETCH_COLUMN);

$baseDeDatos = [];
foreach ($tablas as $tabla) {
    $stmt = $db->query(
        'SELECT * FROM `' . str_replace('`', '``', $tabla) . '`'
    );
    $baseDeDatos[$tabla] = $stmt->fetchAll();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($baseDeDatos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
