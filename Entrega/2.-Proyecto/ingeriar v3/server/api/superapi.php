<?php

require_once __DIR__ . '/../data/database.php';

$db = obtenerConexion();
$ruta = $_GET['ruta'] ?? '';

function responder($datos): void
{
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function identificadorValido(string $identificador): bool
{
    return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identificador) === 1;
}

function comprobarTabla(PDO $db, string $tabla): void
{
    if (!identificadorValido($tabla)) {
        responder(['error' => 'Nombre de tabla no válido']);
    }

    $stmt = $db->prepare(
        'SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute([$tabla]);
    if (!$stmt->fetchColumn()) {
        responder(['error' => 'La tabla no existe']);
    }
}

function obtenerColumnas(PDO $db, string $tabla): array
{
    comprobarTabla($db, $tabla);
    $stmt = $db->prepare(
        'SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE,
                COLUMN_DEFAULT, ORDINAL_POSITION
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION'
    );
    $stmt->execute([$tabla]);
    $columnas = [];

    foreach ($stmt->fetchAll() as $fila) {
        $opciones = [];
        if (str_starts_with(strtolower($fila['COLUMN_TYPE']), 'enum(')) {
            preg_match_all("/'((?:''|[^'])*)'/", $fila['COLUMN_TYPE'], $valores);
            $opciones = array_map(
                fn(string $valor): string => str_replace("''", "'", $valor),
                $valores[1]
            );
        }

        $relacion = null;
        $relacionStmt = $db->prepare(
            'SELECT REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
               AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL'
        );
        $relacionStmt->execute([$tabla, $fila['COLUMN_NAME']]);
        $referencia = $relacionStmt->fetch();
        if ($referencia) {
            $relacion = [
                'tabla' => $referencia['REFERENCED_TABLE_NAME'],
                'campo_valor' => $referencia['REFERENCED_COLUMN_NAME'],
            ];
        }

        $columnas[] = [
            'name' => $fila['COLUMN_NAME'],
            'type' => strtoupper($fila['DATA_TYPE']),
            'pk' => $fila['COLUMN_KEY'] === 'PRI' ? 1 : 0,
            'tipo_formulario' => $opciones ? 'ENUM' : strtoupper($fila['DATA_TYPE']),
            'required' => $fila['IS_NULLABLE'] === 'NO',
            'defaultValue' => $fila['COLUMN_DEFAULT'],
            'options' => $opciones,
            'relation' => $relacion,
        ];
    }
    return $columnas;
}

switch ($ruta) {
    case 'configuracion':
        $rutaConfiguracion = __DIR__ . '/../data/config.php';
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $configuracion = json_decode(file_get_contents($rutaConfiguracion), true);
            responder(is_array($configuracion)
                ? $configuracion
                : ['error' => 'La configuración no es válida']);
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $configuracion = json_decode(file_get_contents('php://input'), true);
            if (!is_array($configuracion)) {
                responder(['error' => 'La configuración no es válida']);
            }
            if (file_put_contents(
                $rutaConfiguracion,
                json_encode($configuracion, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            ) === false) {
                responder(['error' => 'No se pudo guardar la configuración']);
            }
            responder(['ok' => true]);
        }
        responder(['error' => 'Método no permitido']);

    case 'modulos':
        responder([]);

    case 'entidades':
        $entidades = $db->query(
            "SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
        )->fetchAll(PDO::FETCH_COLUMN);
        responder($entidades);

    case 'tabla':
        $tabla = $_GET['tabla'] ?? '';
        if ($tabla === '') {
            responder(['error' => 'No se ha indicado ninguna tabla']);
        }
        $columnas = obtenerColumnas($db, $tabla);
        $clavePrimaria = null;
        foreach ($columnas as $columna) {
            if ($columna['pk']) {
                $clavePrimaria = $columna['name'];
                break;
            }
        }
        $registros = $db->query(
            'SELECT * FROM `' . str_replace('`', '``', $tabla) . '`'
        )->fetchAll();
        responder([
            'tabla' => $tabla,
            'columnas' => $columnas,
            'registros' => $registros,
            'primaryKey' => $clavePrimaria,
        ]);

    case 'columnas':
        $tabla = $_GET['tabla'] ?? '';
        responder($tabla === '' ? ['error' => 'No se ha indicado ninguna tabla'] : obtenerColumnas($db, $tabla));

    case 'crear':
    case 'editar':
        $tabla = $_POST['tabla'] ?? '';
        $datos = json_decode($_POST['datos'] ?? '{}', true);
        if ($tabla === '' || !is_array($datos)) {
            responder(['error' => 'Datos incorrectos']);
        }
        $columnas = obtenerColumnas($db, $tabla);
        $permitidas = array_column(array_filter($columnas, fn($columna) => !$columna['pk']), 'name');
        $datosValidos = array_intersect_key($datos, array_flip($permitidas));

        if ($ruta === 'crear') {
            $nombres = array_keys($datosValidos);
            $sql = 'INSERT INTO `' . str_replace('`', '``', $tabla) . '` (`'
                . implode('`,`', array_map(fn($nombre) => str_replace('`', '``', $nombre), $nombres))
                . '`) VALUES (' . implode(',', array_fill(0, count($nombres), '?')) . ')';
            $db->prepare($sql)->execute(array_values($datosValidos));
        } else {
            $id = $_POST['id'] ?? '';
            $pk = array_values(array_filter($columnas, fn($columna) => $columna['pk']))[0]['name'] ?? 'id';
            $cambios = array_map(
                fn($nombre) => '`' . str_replace('`', '``', $nombre) . '` = ?',
                array_keys($datosValidos)
            );
            $sql = 'UPDATE `' . str_replace('`', '``', $tabla) . '` SET '
                . implode(',', $cambios) . ' WHERE `' . $pk . '` = ?';
            $db->prepare($sql)->execute([...array_values($datosValidos), $id]);
        }
        responder(['ok' => true]);

    case 'borrar':
        $tabla = $_POST['tabla'] ?? '';
        $id = $_POST['id'] ?? '';
        $columnas = obtenerColumnas($db, $tabla);
        $pk = array_values(array_filter($columnas, fn($columna) => $columna['pk']))[0]['name'] ?? 'id';
        $sql = 'DELETE FROM `' . str_replace('`', '``', $tabla) . '` WHERE `' . $pk . '` = ?';
        $db->prepare($sql)->execute([$id]);
        responder(['ok' => true]);

    default:
        responder(['error' => 'Ruta no encontrada']);
}
