<?php

$db = new SQLite3(__DIR__ . '/../data/ingeriar.db');
$db->exec('PRAGMA foreign_keys = ON');

$ruta = $_GET['ruta'] ?? '';

function responder($datos) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos);
    exit;
}

function obtenerOpcionesEnum($db, $tabla, $nombre) {
    $stmt = $db->prepare(
        'SELECT sql FROM sqlite_master WHERE type = :tipo AND name = :tabla'
    );
    $stmt->bindValue(':tipo', 'table', SQLITE3_TEXT);
    $stmt->bindValue(':tabla', $tabla, SQLITE3_TEXT);
    $resultado = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    $sql = $resultado['sql'] ?? '';

    $patron = '/CHECK\s*\(\s*"?'
        . preg_quote($nombre, '/')
        . '"?\s+IN\s*\((.*?)\)\s*\)/is';

    if (preg_match($patron, $sql, $coincidencia) !== 1) {
        return [];
    }

    preg_match_all("/'((?:''|[^'])*)'/", $coincidencia[1], $valores);

    return array_map(function ($valor) {
        return str_replace("''", "'", $valor);
    }, $valores[1]);
}

function limpiarValorPorDefecto($valor) {
    if (
        is_string($valor) &&
        strlen($valor) >= 2 &&
        $valor[0] === "'" &&
        $valor[strlen($valor) - 1] === "'"
    ) {
        return str_replace("''", "'", substr($valor, 1, -1));
    }

    return $valor;
}

function obtenerRelaciones($db, $tabla) {
    $relaciones = [];
    $resultado = $db->query("PRAGMA foreign_key_list(\"$tabla\")");

    while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
        $relaciones[$fila['from']] = [
            'tabla' => $fila['table'],
            'campo_valor' => $fila['to']
        ];
    }

    return $relaciones;
}

function obtenerColumnas($db, $tabla) {
    $columnas = [];
    $relaciones = obtenerRelaciones($db, $tabla);

    $resultado = $db->query("PRAGMA table_info(\"$tabla\")");

    while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
        $tipo = strtoupper($fila['type']);
        $opciones = obtenerOpcionesEnum($db, $tabla, $fila['name']);

        $columnas[] = [
            'name' => $fila['name'],
            'type' => $tipo,
            'pk' => (int)$fila['pk'],
            'tipo_formulario' => count($opciones) > 0 ? 'ENUM' : $tipo,
            'required' => (int)$fila['notnull'] === 1,
            'defaultValue' => limpiarValorPorDefecto($fila['dflt_value']),
            'options' => $opciones,
            'relation' => $relaciones[$fila['name']] ?? null
        ];
    }

    return $columnas;
}

switch ($ruta) {

    case "configuracion":

        $rutaConfiguracion = __DIR__ . '/../data/config.php';

        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $contenido = file_get_contents($rutaConfiguracion);
            $configuracion = json_decode($contenido, true);

            if (!is_array($configuracion)) {
                responder([
                    "error" => "La configuración no es válida"
                ]);
            }

            responder($configuracion);
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $contenido = file_get_contents('php://input');
            $configuracion = json_decode($contenido, true);

            if (!is_array($configuracion)) {
                responder([
                    "error" => "La configuración no es válida"
                ]);
            }

            $resultado = file_put_contents(
                $rutaConfiguracion,
                json_encode(
                    $configuracion,
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
                )
            );

            if ($resultado === false) {
                responder([
                    "error" => "No se pudo guardar la configuración"
                ]);
            }

            responder([
                "ok" => true
            ]);
        }

        responder([
            "error" => "Método no permitido"
        ]);

        break;

    case "modulos":

        responder([
            "Documentacion",
            "Tesoreria",
            "Intendencia",
            "Animacion pedagogica",
            "Jefatura",
            "Comite",
            "Ramas"
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

        $columnas = obtenerColumnas($db, $tabla);
        $clavePrimaria = null;
        foreach ($columnas as $columna) {
            if ($columna['pk'] > 0) {
                $clavePrimaria = $columna['name'];
                break;
            }
        }

        $resultado = $db->query("SELECT * FROM \"$tabla\"");

        $registros = [];

        while ($fila = $resultado->fetchArray(SQLITE3_ASSOC)) {
            $registros[] = $fila;
        }

        responder([
            'tabla' => $tabla,
            'columnas' => $columnas,
            'registros' => $registros,
            'primaryKey' => $clavePrimaria
        ]);

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

        $columnasPermitidas = array_column(
            array_filter(
                obtenerColumnas($db, $tabla),
                fn($columna) => $columna['pk'] === 0
            ),
            'name'
        );

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

        $columnasPermitidas = array_column(
            array_filter(
                obtenerColumnas($db, $tabla),
                fn($columna) => $columna['pk'] === 0
            ),
            'name'
        );
        $clavePrimaria = array_values(array_filter(
            obtenerColumnas($db, $tabla),
            fn($columna) => $columna['pk'] > 0
        ))[0]['name'] ?? 'id';

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
            WHERE \"$clavePrimaria\" = ?
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

        $clavePrimaria = array_values(array_filter(
            obtenerColumnas($db, $tabla),
            fn($columna) => $columna['pk'] > 0
        ))[0]['name'] ?? 'id';

        $stmt = $db->prepare("
            DELETE FROM \"$tabla\"
            WHERE \"$clavePrimaria\" = ?
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