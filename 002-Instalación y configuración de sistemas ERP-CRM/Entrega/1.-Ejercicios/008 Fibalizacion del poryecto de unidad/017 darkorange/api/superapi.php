<?php

$db = new SQLite3('../data/darkorange.db');
$db->exec('PRAGMA foreign_keys = ON');

$ruta = $_GET['ruta'] ?? '';

function responder($datos) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos);
    exit;
}

function obtenerColumnas($db, $tabla) {
    $columnas = [];

    $resultado = $db->query("PRAGMA table_info(\"$tabla\")");

    while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
        if ($fila['pk'] != 1) {
            $columnas[] = $fila['name'];
        }
    }

    return $columnas;
}

switch ($ruta) {

    case "modulos":

        responder([
            "ventas",
            "rrhh",
            "facturacion",
            "compras"
        ]);

        break;


    case "entidades":

        $resultado = $db->query("
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            AND name NOT LIKE 'sqlite_%'
        ");

        $entidades = [];

        while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
            $entidades[] = $fila['name'];
        }

        responder($entidades);

        break;


    case "tabla":

        $tabla = $_GET['tabla'] ?? '';

        if ($tabla == '') {
            responder([
                "error" => "No se ha indicado ninguna tabla"
            ]);
        }

        $resultado = $db->query(
            "SELECT * FROM \"$tabla\""
        );

        $registros = [];

        while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
            $registros[] = $fila;
        }

        responder($registros);

        break;


    case "columnas":

        $tabla = $_GET['tabla'] ?? '';

        if ($tabla == '') {
            responder([
                "error" => "No se ha indicado ninguna tabla"
            ]);
        }

        responder(
            obtenerColumnas($db, $tabla)
        );

        break;


    case "crear":

        $tabla = $_POST['tabla'] ?? '';
        $datos = json_decode($_POST['datos'] ?? '{}', true);

        if ($tabla == '' || !is_array($datos)) {
            responder([
                "error" => "Datos incorrectos"
            ]);
        }

        $columnasPermitidas = obtenerColumnas($db, $tabla);

        $columnas = [];
        $valores = [];
        $marcadores = [];

        foreach ($datos as $columna => $valor) {

            if (in_array($columna, $columnasPermitidas)) {

                $columnas[] = '"' . $columna . '"';
                $valores[] = $valor;
                $marcadores[] = '?';

            }
        }

        $sql = "
            INSERT INTO \"$tabla\"
            (" . implode(',', $columnas) . ")
            VALUES (" . implode(',', $marcadores) . ")
        ";

        $stmt = $db->prepare($sql);

        foreach ($valores as $indice => $valor) {
            $stmt->bindValue(
                $indice + 1,
                $valor,
                SQLITE3_TEXT
            );
        }

        $stmt->execute();

        responder([
            "ok" => true
        ]);

        break;


    case "editar":

        $tabla = $_POST['tabla'] ?? '';
        $id = $_POST['id'] ?? '';
        $datos = json_decode($_POST['datos'] ?? '{}', true);

        if ($tabla == '' || $id == '' || !is_array($datos)) {
            responder([
                "error" => "Datos incorrectos"
            ]);
        }

        $columnasPermitidas = obtenerColumnas($db, $tabla);

        $cambios = [];
        $valores = [];

        foreach ($datos as $columna => $valor) {

            if (in_array($columna, $columnasPermitidas)) {

                $cambios[] = '"' . $columna . '" = ?';
                $valores[] = $valor;

            }
        }

        $sql = "
            UPDATE \"$tabla\"
            SET " . implode(',', $cambios) . "
            WHERE identificador = ?
        ";

        $stmt = $db->prepare($sql);

        foreach ($valores as $indice => $valor) {
            $stmt->bindValue(
                $indice + 1,
                $valor,
                SQLITE3_TEXT
            );
        }

        $stmt->bindValue(
            count($valores) + 1,
            $id,
            SQLITE3_INTEGER
        );

        $stmt->execute();

        responder([
            "ok" => true
        ]);

        break;


    case "borrar":

        $tabla = $_POST['tabla'] ?? '';
        $id = $_POST['id'] ?? '';

        if ($tabla == '' || $id == '') {
            responder([
                "error" => "Datos incorrectos"
            ]);
        }

        $stmt = $db->prepare("
            DELETE FROM \"$tabla\"
            WHERE identificador = ?
        ");

        $stmt->bindValue(
            1,
            $id,
            SQLITE3_INTEGER
        );

        $stmt->execute();

        responder([
            "ok" => true
        ]);

        break;


    default:

        responder([
            "error" => "Ruta no encontrada"
        ]);
}

$db->close();
?>