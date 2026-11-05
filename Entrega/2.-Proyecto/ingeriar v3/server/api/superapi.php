<?php

require_once __DIR__ . '/../data/database.php';
require_once __DIR__ . '/../data/secciones.php';
require_once __DIR__ . '/../auth/sesion.php';

$db = obtenerConexion();
$ruta = $_GET['ruta'] ?? '';
$usuario = exigirAutenticacion();

const CIRCULAR_FIJA = 'biblioteca/circular1.pdf';

function responder($datos, int $estado = 200): void
{
    http_response_code($estado);
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
        if (!$relacion) {
            $relacionesConvencionales = [
                'facturas.responsable_id' => ['tabla' => 'usuarios', 'campo_valor' => 'id'],
                'eventos.id_responsable' => ['tabla' => 'usuarios', 'campo_valor' => 'id'],
                'usuarios_educandos.id_usuario' => ['tabla' => 'usuarios', 'campo_valor' => 'id'],
                'usuarios_educandos.id_educando' => ['tabla' => 'educandos', 'campo_valor' => 'id'],
            ];
            $relacion = $relacionesConvencionales[$tabla . '.' . $fila['COLUMN_NAME']]
                ?? null;
        }

        $columnas[] = [
            'name' => $fila['COLUMN_NAME'],
            'type' => strtoupper($fila['DATA_TYPE']),
            'pk' => $fila['COLUMN_KEY'] === 'PRI' ? 1 : 0,
            'tipo_formulario' => $opciones
                ? 'ENUM'
                : (strtolower($fila['COLUMN_TYPE']) === 'tinyint(1)'
                    ? 'BOOLEAN'
                    : strtoupper($fila['DATA_TYPE'])),
            'required' => $fila['IS_NULLABLE'] === 'NO',
            'defaultValue' => $fila['COLUMN_DEFAULT'],
            'options' => $opciones,
            'relation' => $relacion,
        ];
    }
    return $columnas;
}

function tutorTieneEducando(PDO $db, int $usuarioId, int $educandoId): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM usuarios_educandos
         WHERE id_usuario = ? AND id_educando = ?'
    );
    $stmt->execute([$usuarioId, $educandoId]);
    return (bool) $stmt->fetchColumn();
}

function exigirPermisoTabla(array $usuario, string $tabla, string $operacion): void
{
    if ($usuario['rol'] === 'administrador') {
        return;
    }

    $permisos = [
        'scouter' => [
            'lectura' => ['usuarios', 'educandos', 'eventos', 'educandos_asistencias', 'facturas'],
            'escritura' => ['eventos', 'educandos_asistencias', 'facturas'],
        ],
        'tutor' => [
            'lectura' => ['eventos', 'educandos'],
            'escritura' => [],
        ],
    ];
    $grupo = $permisos[$usuario['rol']][$operacion] ?? [];
    if (!in_array($tabla, $grupo, true)) {
        responder(['error' => 'No tienes permisos para esta operación'], 403);
    }
}

switch ($ruta) {
    case 'usuario_actual':
        responder(['usuario' => $usuario]);

    case 'asistencia_tutor':
        if ($usuario['rol'] !== 'tutor') {
            responder(['error' => 'Solo los tutores pueden usar esta ruta'], 403);
        }

        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $eventoId = (int) ($_GET['evento'] ?? 0);
            if ($eventoId < 1) {
                responder(['error' => 'Evento no válido'], 400);
            }
            $stmt = $db->prepare(
                "SELECT e.id, e.nombre, e.circular,
                        educ.id AS educando_id,
                        educ.nombre, educ.apellidos, educ.naz,
                        COALESCE(ea.estado, 'pendiente') AS estado,
                        ea.archivo_entrega
                 FROM usuarios_educandos ue
                 JOIN educandos educ ON educ.id = ue.id_educando
                 JOIN eventos e ON e.id = ?
                 LEFT JOIN educandos_asistencias ea
                    ON ea.id_evento = e.id AND ea.id_educando = educ.id
                 WHERE ue.id_usuario = ?
                 ORDER BY educ.naz IS NULL, educ.naz DESC,
                          educ.apellidos, educ.nombre"
            );
            $stmt->execute([$eventoId, $usuario['id']]);
            $asistencias = $stmt->fetchAll();
            foreach ($asistencias as &$asistencia) {
                $asistencia['seccion'] = seccionDeEducando($asistencia['naz']);
            }
            unset($asistencia);
            responder($asistencias);
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $datos = json_decode(file_get_contents('php://input'), true);
            $eventoId = (int) ($datos['evento'] ?? 0);
            $educandoId = (int) ($datos['educando'] ?? 0);
            $estado = $datos['estado'] ?? '';
            if (
                $eventoId < 1 || $educandoId < 1
                || !in_array($estado, ['pendiente', 'si', 'no'], true)
                || !tutorTieneEducando($db, $usuario['id'], $educandoId)
            ) {
                responder(['error' => 'Datos de asistencia no válidos'], 400);
            }
            $eventoStmt = $db->prepare(
                'SELECT fecha_fin FROM eventos WHERE id = ? AND fecha_fin >= NOW()'
            );
            $eventoStmt->execute([$eventoId]);
            if (!$eventoStmt->fetchColumn()) {
                responder(['error' => 'No se puede rellenar la asistencia de un evento pasado'], 409);
            }
            if ($estado === 'si') {
                $stmt = $db->prepare(
                    'INSERT INTO educandos_asistencias
                        (id_educando, id_evento, estado)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE estado = VALUES(estado)'
                );
                $stmt->execute([$educandoId, $eventoId, $estado]);
            } else {
                $stmt = $db->prepare(
                    'INSERT INTO educandos_asistencias
                        (id_educando, id_evento, estado, archivo_entrega)
                     VALUES (?, ?, ?, NULL)
                     ON DUPLICATE KEY UPDATE estado = VALUES(estado),
                        archivo_entrega = NULL'
                );
                $stmt->execute([$educandoId, $eventoId, $estado]);
            }
            responder(['ok' => true]);
        }
        responder(['error' => 'Método no permitido'], 405);

    case 'educando_documentos':
        if ($usuario['rol'] !== 'tutor') {
            responder(['error' => 'Solo los tutores pueden consultar estos documentos'], 403);
        }
        $educandoId = (int) ($_GET['educando'] ?? 0);
        if ($educandoId < 1 || !tutorTieneEducando($db, $usuario['id'], $educandoId)) {
            responder(['error' => 'Educando no válido'], 403);
        }
        $stmt = $db->prepare(
            "SELECT e.id AS evento_id, e.nombre AS evento, e.fecha_inicio,
                    e.fecha_fin, ea.archivo_entrega
             FROM educandos_asistencias ea
             JOIN eventos e ON e.id = ea.id_evento
             WHERE ea.id_educando = ? AND ea.archivo_entrega IS NOT NULL
             ORDER BY e.fecha_inicio DESC"
        );
        $stmt->execute([$educandoId]);
        responder($stmt->fetchAll());

    case 'configuracion':
        $rutaConfiguracion = __DIR__ . '/../data/config.php';
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $configuracion = json_decode(file_get_contents($rutaConfiguracion), true);
            responder(is_array($configuracion)
                ? $configuracion
                : ['error' => 'La configuración no es válida']);
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            exigirRol(['administrador']);
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
        if ($usuario['rol'] === 'tutor') {
            responder(['educandos']);
        }
        $entidades = $db->query(
            "SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
        )->fetchAll(PDO::FETCH_COLUMN);
        if ($usuario['rol'] === 'scouter') {
            $permitidas = [
                'educandos', 'eventos', 'educandos_asistencias', 'facturas'
            ];
            $entidades = array_values(array_intersect($entidades, $permitidas));
        }
        responder($entidades);

    case 'tabla':
        $tabla = $_GET['tabla'] ?? '';
        if ($tabla === '') {
            responder(['error' => 'No se ha indicado ninguna tabla']);
        }
        exigirPermisoTabla($usuario, $tabla, 'lectura');
        $columnas = obtenerColumnas($db, $tabla);
        $clavePrimaria = null;
        foreach ($columnas as $columna) {
            if ($columna['pk']) {
                $clavePrimaria = $columna['name'];
                break;
            }
        }
        $sql = 'SELECT * FROM `' . str_replace('`', '``', $tabla) . '`';
        $parametros = [];
        if ($usuario['rol'] === 'tutor' && $tabla === 'educandos') {
            $sql .= ' WHERE id IN (SELECT id_educando FROM usuarios_educandos WHERE id_usuario = ?)';
            $parametros[] = $usuario['id'];
        }
        if ($tabla === 'educandos') {
            $sql .= ' ORDER BY naz IS NULL, naz DESC, apellidos, nombre';
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($parametros);
        $registros = $stmt->fetchAll();
        if ($tabla === 'educandos') {
            foreach ($registros as &$registro) {
                $registro['seccion'] = seccionDeEducando($registro['naz'] ?? null);
            }
            unset($registro);
        }
        responder([
            'tabla' => $tabla,
            'columnas' => $columnas,
            'registros' => $registros,
            'primaryKey' => $clavePrimaria,
        ]);

    case 'columnas':
        $tabla = $_GET['tabla'] ?? '';
        exigirPermisoTabla($usuario, $tabla, 'lectura');
        responder($tabla === '' ? ['error' => 'No se ha indicado ninguna tabla'] : obtenerColumnas($db, $tabla));

    case 'educandos_usuario':
        if ($usuario['rol'] !== 'administrador') {
            responder(['error' => 'No tienes permisos para esta operación'], 403);
        }
        $usuarioId = (int) ($_GET['usuario'] ?? 0);
        $stmt = $db->prepare(
            'SELECT e.id, e.nombre, e.apellidos
             FROM educandos e
             JOIN usuarios_educandos ue ON ue.id_educando = e.id
             WHERE ue.id_usuario = ?
             ORDER BY e.naz IS NULL, e.naz, e.apellidos, e.nombre'
        );
        $stmt->execute([$usuarioId]);
        responder($stmt->fetchAll());

    case 'crear':
    case 'editar':
        $tabla = $_POST['tabla'] ?? '';
        $datos = json_decode($_POST['datos'] ?? '{}', true);
        if ($tabla === '' || !is_array($datos)) {
            responder(['error' => 'Datos incorrectos']);
        }
        exigirPermisoTabla($usuario, $tabla, 'escritura');
        $educandosRelacionados = $tabla === 'usuarios'
            ? array_values(array_filter(
                $datos['educandos_relacionados'] ?? [],
                fn($id): bool => filter_var($id, FILTER_VALIDATE_INT) !== false
            ))
            : [];
        unset($datos['educandos_relacionados']);
        $columnas = obtenerColumnas($db, $tabla);
        $permitidas = array_column(array_filter($columnas, fn($columna) => !$columna['pk']), 'name');
        $datosValidos = array_intersect_key($datos, array_flip($permitidas));
        if ($tabla === 'eventos') {
            if (array_key_exists('circular', $datosValidos)) {
                $datosValidos['circular'] = filter_var(
                    $datosValidos['circular'],
                    FILTER_VALIDATE_BOOLEAN
                ) ? 1 : 0;
            }
        }
        foreach ($columnas as $columna) {
            if (
                $columna['tipo_formulario'] === 'BOOLEAN'
                && array_key_exists($columna['name'], $datosValidos)
            ) {
                $datosValidos[$columna['name']] = in_array(
                    strtolower((string) $datosValidos[$columna['name']]),
                    ['1', 'true', 'si', 'sí', 'yes'],
                    true
                ) ? 1 : 0;
            }
        }
        if ($tabla === 'facturas' && array_key_exists('responsable_id', $datosValidos)) {
            $responsableStmt = $db->prepare(
                "SELECT 1 FROM usuarios
                 WHERE id = ? AND rol = 'scouter'"
            );
            $responsableStmt->execute([(int) $datosValidos['responsable_id']]);
            if (!$responsableStmt->fetchColumn()) {
                responder([
                    'error' => 'El responsable de una factura debe ser un monitor (scouter)'
                ], 400);
            }
        }

        if ($ruta === 'crear') {
            $nombres = array_keys($datosValidos);
            $sql = 'INSERT INTO `' . str_replace('`', '``', $tabla) . '` (`'
                . implode('`,`', array_map(fn($nombre) => str_replace('`', '``', $nombre), $nombres))
                . '`) VALUES (' . implode(',', array_fill(0, count($nombres), '?')) . ')';
            $db->prepare($sql)->execute(array_values($datosValidos));
            $registroId = (int) $db->lastInsertId();
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
            $registroId = (int) $id;
        }
        if ($tabla === 'usuarios') {
            $db->prepare('DELETE FROM usuarios_educandos WHERE id_usuario = ?')
                ->execute([$registroId]);
            $relacion = $db->prepare(
                'INSERT INTO usuarios_educandos (id_usuario, id_educando)
                 VALUES (?, ?)'
            );
            foreach (array_unique($educandosRelacionados) as $educandoId) {
                $relacion->execute([$registroId, $educandoId]);
            }
        }
        responder(['ok' => true]);

    case 'borrar':
        $tabla = $_POST['tabla'] ?? '';
        $id = $_POST['id'] ?? '';
        exigirPermisoTabla($usuario, $tabla, 'escritura');
        $columnas = obtenerColumnas($db, $tabla);
        $pk = array_values(array_filter($columnas, fn($columna) => $columna['pk']))[0]['name'] ?? 'id';
        $sql = 'DELETE FROM `' . str_replace('`', '``', $tabla) . '` WHERE `' . $pk . '` = ?';
        $db->prepare($sql)->execute([$id]);
        responder(['ok' => true]);

    default:
        responder(['error' => 'Ruta no encontrada']);
}
