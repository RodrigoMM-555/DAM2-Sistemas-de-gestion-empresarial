<?php

require_once __DIR__ . '/../data/database.php';
require_once __DIR__ . '/../data/secciones.php';
require_once __DIR__ . '/../auth/sesion.php';

$db = obtenerConexion();
$ruta = $_GET['ruta'] ?? '';

function tablaExiste(PDO $db, string $tabla): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute([$tabla]);
    return (bool) $stmt->fetchColumn();
}
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

    function guardarImagenFactura(PDO $db, int $facturaId): void
    {
        $imagen = $_FILES['imagen_factura'] ?? null;
        if (!$imagen || $imagen['error'] === UPLOAD_ERR_NO_FILE) {
            return;
        }
        if ($imagen['error'] !== UPLOAD_ERR_OK || $imagen['size'] > 10 * 1024 * 1024) {
            responder(['error' => 'La imagen de la factura no es válida o supera los 10 MB'], 400);
        }

        $permitidos = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($imagen['tmp_name']);
        if (!isset($permitidos[$mime])) {
            responder(['error' => 'Solo se aceptan imágenes JPEG, PNG o WebP'], 415);
        }

        $directorio = __DIR__ . '/../../storage/facturas';
        if (!is_dir($directorio) && !mkdir($directorio, 0750, true)) {
            responder(['error' => 'No se pudo preparar la carpeta de facturas'], 500);
        }
        $nombre = 'factura-' . $facturaId . '-' . bin2hex(random_bytes(12))
            . '.' . $permitidos[$mime];
        if (!move_uploaded_file($imagen['tmp_name'], $directorio . '/' . $nombre)) {
            responder(['error' => 'No se pudo guardar la imagen de la factura'], 500);
        }

        $db->prepare(
            'UPDATE facturas SET imagen_factura = ? WHERE id = ?'
        )->execute([$nombre, $facturaId]);
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

function catalogos(PDO $db, bool $soloActivos = false): array
{
    $filtro = $soloActivos ? ' WHERE activo = 1' : '';
    $tipos = $db->query(
        'SELECT codigo, nombre, activo, orden FROM tipos_evento' .
        $filtro . ' ORDER BY orden, nombre'
    )->fetchAll();
    $secciones = $db->query(
        'SELECT codigo, nombre, edad_minima, edad_maxima, activo, orden
         FROM secciones' . $filtro . ' ORDER BY orden, nombre'
    )->fetchAll();
    $categoriasFactura = $db->query(
        'SELECT codigo, nombre, activo, orden FROM categorias_factura' .
        $filtro . ' ORDER BY orden, nombre'
    )->fetchAll();
    return [
        'tipos_evento' => $tipos,
        'secciones' => $secciones,
        'categorias_factura' => $categoriasFactura
    ];
}

function seccionEducando(PDO $db, ?string $nacimiento): ?string
{
    if (!tablaExiste($db, 'secciones')) {
        return seccionDeEducando($nacimiento);
    }
    try {
        $secciones = $db->query(
            'SELECT codigo, edad_minima, edad_maxima FROM secciones
             WHERE activo = 1 ORDER BY orden, nombre'
        )->fetchAll();
    } catch (PDOException) {
        return seccionDeEducando($nacimiento);
    }
    return seccionDeEducandoConCatalogo($nacimiento, $secciones);
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
        if ($tabla === 'eventos' && $fila['COLUMN_NAME'] === 'tipo'
            && tablaExiste($db, 'tipos_evento')) {
            $opciones = $db->query(
                'SELECT codigo FROM tipos_evento WHERE activo = 1
                 ORDER BY orden, nombre'
            )->fetchAll(PDO::FETCH_COLUMN);
        }
        if ($tabla === 'facturas' && $fila['COLUMN_NAME'] === 'categoria'
            && tablaExiste($db, 'categorias_factura')) {
            $opciones = $db->query(
                'SELECT codigo FROM categorias_factura WHERE activo = 1
                 ORDER BY orden, nombre'
            )->fetchAll(PDO::FETCH_COLUMN);
        }
        if ($tabla === 'facturas' && $fila['COLUMN_NAME'] === 'estado') {
            $opciones = ['pendiente', 'pagada', 'rechazada'];
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

    case 'dashboard':
        $consultar = function (string $sql, array $parametros = []) use ($db): array {
            $stmt = $db->prepare($sql);
            $stmt->execute($parametros);
            return $stmt->fetch() ?: [];
        };
        $consultarTodos = function (string $sql, array $parametros = []) use ($db): array {
            $stmt = $db->prepare($sql);
            $stmt->execute($parametros);
            return $stmt->fetchAll();
        };

        $datos = [
            'rol' => $usuario['rol'],
            'indicadores' => [],
            'graficas' => [],
        ];
        $eventosDashboard = $consultarTodos(
            "SELECT id, nombre, fecha_inicio, fecha_fin, tipo, lugar
             FROM eventos
             WHERE fecha_fin >= NOW()
             ORDER BY fecha_inicio"
        );
        $convocatoriasDashboard = [];
        if (tablaExiste($db, 'eventos_secciones')) {
            foreach ($consultarTodos(
                'SELECT id_evento, seccion FROM eventos_secciones'
            ) as $convocatoria) {
                $convocatoriasDashboard[$convocatoria['id_evento']][] =
                    $convocatoria['seccion'];
            }
        }
        $seccionesUsuario = [];
        if ($usuario['rol'] === 'tutor') {
            $educandosUsuario = $consultarTodos(
                'SELECT naz FROM educandos e
                 JOIN usuarios_educandos ue ON ue.id_educando = e.id
                 WHERE ue.id_usuario = ?',
                [$usuario['id']]
            );
            foreach ($educandosUsuario as $educando) {
                $seccion = seccionEducando($db, $educando['naz'] ?? null);
                if ($seccion) {
                    $seccionesUsuario[] = $seccion;
                }
            }
        }
        $eventoConvoca = function (array $evento) use (
            $usuario, $seccionesUsuario, $convocatoriasDashboard
        ): bool {
            if ($usuario['rol'] !== 'tutor') {
                return true;
            }
            $convocatorias = $convocatoriasDashboard[$evento['id']] ?? [];
            return !$convocatorias
                || array_intersect($convocatorias, $seccionesUsuario);
        };
        $eventosVisibles = array_values(array_filter(
            $eventosDashboard,
            $eventoConvoca
        ));
        $proximoEvento = $eventosVisibles[0] ?? null;
        $inicioMes = new DateTimeImmutable('first day of this month 00:00:00');
        $finMes = $inicioMes->modify('last day of this month 23:59:59');
        $sabadosMes = array_values(array_filter(
            $eventosVisibles,
            fn($evento): bool => $evento['tipo'] === 'sabado'
                && new DateTimeImmutable($evento['fecha_inicio']) >= $inicioMes
                && new DateTimeImmutable($evento['fecha_inicio']) <= $finMes
        ));
        $sabadosProximos = array_values(array_filter(
            $eventosVisibles,
            fn($evento): bool => $evento['tipo'] === 'sabado'
        ));
        $acampadas = array_values(array_filter(
            $eventosVisibles,
            fn($evento): bool => in_array(
                strtolower($evento['tipo']),
                ['campamento', 'acampada'],
                true
            )
        ));
        $cumples = [];
        $hoy = new DateTimeImmutable('today');
        $finSemana = $hoy->modify('+7 days');
        foreach ($consultarTodos(
            'SELECT nombre, apellidos, naz FROM educandos WHERE naz IS NOT NULL'
        ) as $educando) {
            $nacimiento = new DateTimeImmutable($educando['naz']);
            $cumple = new DateTimeImmutable(
                $hoy->format('Y') . '-' . $nacimiento->format('m-d')
            );
            if ($cumple < $hoy) {
                $cumple = $cumple->modify('+1 year');
            }
            if ($cumple <= $finSemana) {
                $cumples[] = [
                    'nombre' => $educando['nombre'] . ' ' . $educando['apellidos'],
                    'fecha' => $cumple->format('Y-m-d'),
                ];
            }
        }
        $datos['resumen'] = [
            'proximo_evento' => $proximoEvento,
            'sabados_mes' => $sabadosMes,
            'proxima_acampada' => $acampadas[0] ?? null,
            'cumpleanos' => $cumples,
        ];
        $datos['mini_calendario'] = array_map(
            fn($evento): array => [
                'fecha' => substr($evento['fecha_inicio'], 0, 10),
                'nombre' => $evento['nombre'],
            ],
            $eventosVisibles
        );
        $eventosPendientes = (int) ($consultar(
            'SELECT COUNT(*) AS cantidad FROM eventos WHERE fecha_fin >= NOW()'
        )['cantidad'] ?? 0);
        $eventosProximos = $consultarTodos(
            "SELECT tipo, COUNT(*) AS cantidad
             FROM eventos
             WHERE fecha_fin >= NOW()
             GROUP BY tipo
             ORDER BY cantidad DESC, tipo"
        );
        $nombresTiposEvento = [];
        if (tablaExiste($db, 'tipos_evento')) {
            $nombresTiposEvento = $db->query(
                'SELECT codigo, nombre FROM tipos_evento'
            )->fetchAll(PDO::FETCH_KEY_PAIR);
        }
        $datos['graficas'][] = [
            'tipo' => 'anillo',
            'titulo' => 'Próximos eventos por tipo',
            'etiquetas' => array_map(
                fn($tipo): string => $nombresTiposEvento[$tipo] ?? $tipo,
                array_column($eventosProximos, 'tipo')
            ),
            'valores' => array_map('intval', array_column($eventosProximos, 'cantidad')),
        ];

        if ($usuario['rol'] === 'administrador') {
            $usuarios = $consultarTodos(
                'SELECT rol, COUNT(*) AS cantidad FROM usuarios GROUP BY rol ORDER BY rol'
            );
            $facturas = $consultar(
                'SELECT COUNT(*) AS cantidad, COALESCE(SUM(precio), 0) AS total FROM facturas'
            );
            $datos['indicadores'] = [
                ['nombre' => 'Usuarios', 'valor' => $consultar('SELECT COUNT(*) AS cantidad FROM usuarios')['cantidad'] ?? 0, 'detalle' => 'Cuentas registradas'],
                ['nombre' => 'Educandos', 'valor' => $consultar('SELECT COUNT(*) AS cantidad FROM educandos')['cantidad'] ?? 0, 'detalle' => 'Personas inscritas'],
                ['nombre' => 'Eventos próximos', 'valor' => $eventosPendientes, 'detalle' => 'Actividades pendientes'],
                ['nombre' => 'Gasto registrado', 'valor' => number_format((float) $facturas['total'], 2, ',', '.') . ' €', 'detalle' => $facturas['cantidad'] . ' facturas'],
            ];
            $datos['graficas'][] = [
                'tipo' => 'barras',
                'titulo' => 'Usuarios por rol',
                'etiquetas' => array_column($usuarios, 'rol'),
                'valores' => array_map('intval', array_column($usuarios, 'cantidad')),
            ];
        } elseif ($usuario['rol'] === 'scouter') {
            $sabado = $sabadosProximos[0] ?? null;
            $asistenciaSabado = [];
            if ($sabado) {
                $educandos = $consultarTodos(
                    'SELECT e.id, e.nombre, e.apellidos, e.naz
                     FROM educandos e ORDER BY e.apellidos, e.nombre'
                );
                $estados = $consultarTodos(
                    'SELECT id_educando, estado FROM educandos_asistencias
                     WHERE id_evento = ?',
                    [$sabado['id']]
                );
                $estadosPorEducando = array_column($estados, 'estado', 'id_educando');
                foreach ($educandos as $educando) {
                    $seccion = seccionEducando($db, $educando['naz'] ?? null);
                    $convocatorias = $convocatoriasDashboard[$sabado['id']] ?? [];
                    if ($convocatorias && !in_array($seccion, $convocatorias, true)) {
                        continue;
                    }
                    $estado = $estadosPorEducando[$educando['id'] ?? 0] ?? 'pendiente';
                    $asistenciaSabado[$seccion ?: 'sin_seccion'][$estado] =
                        ($asistenciaSabado[$seccion ?: 'sin_seccion'][$estado] ?? 0) + 1;
                }
            }
            $datos['asistencias_sabado'] = [
                'evento' => $sabado,
                'secciones' => $asistenciaSabado,
            ];
            $facturas = $consultar(
                'SELECT COUNT(*) AS cantidad, COALESCE(SUM(precio), 0) AS total
                 FROM facturas WHERE responsable_id = ?',
                [$usuario['id']]
            );
            $datos['indicadores'] = [
                ['nombre' => 'Educandos', 'valor' => $consultar('SELECT COUNT(*) AS cantidad FROM educandos')['cantidad'] ?? 0, 'detalle' => 'A tu cargo en la aplicación'],
                ['nombre' => 'Eventos próximos', 'valor' => $eventosPendientes, 'detalle' => 'Actividades pendientes'],
                ['nombre' => 'Mis facturas', 'valor' => $facturas['cantidad'], 'detalle' => 'Facturas registradas'],
                ['nombre' => 'Mi gasto', 'valor' => number_format((float) $facturas['total'], 2, ',', '.') . ' €', 'detalle' => 'Total de mis facturas'],
            ];
        } else {
            $educandos = $consultar(
                'SELECT COUNT(*) AS cantidad FROM usuarios_educandos WHERE id_usuario = ?',
                [$usuario['id']]
            );
            $asistencias = $consultar(
                "SELECT
                    SUM(ea.estado = 'si') AS confirmadas,
                    SUM(ea.estado = 'no') AS ausencias,
                    SUM(ea.estado = 'pendiente' OR ea.estado IS NULL) AS pendientes
                 FROM usuarios_educandos ue
                 CROSS JOIN eventos e
                 LEFT JOIN educandos_asistencias ea
                    ON ea.id_educando = ue.id_educando AND ea.id_evento = e.id
                 WHERE ue.id_usuario = ? AND e.fecha_fin >= NOW()",
                [$usuario['id']]
            );
            $datos['indicadores'] = [
                ['nombre' => 'Mis educandos', 'valor' => $educandos['cantidad'] ?? 0, 'detalle' => 'Personas vinculadas'],
                ['nombre' => 'Próximas actividades', 'valor' => $eventosPendientes, 'detalle' => 'Eventos del calendario'],
                ['nombre' => 'Asistencias pendientes', 'valor' => $asistencias['pendientes'] ?? 0, 'detalle' => 'Requieren respuesta'],
                ['nombre' => 'Confirmadas', 'valor' => $asistencias['confirmadas'] ?? 0, 'detalle' => 'Asistencias registradas'],
            ];
            $datos['graficas'][] = [
                'tipo' => 'tarta',
                'titulo' => 'Estado de próximas asistencias',
                'etiquetas' => ['Confirmadas', 'No asisten', 'Pendientes'],
                'valores' => array_map('intval', [
                    $asistencias['confirmadas'] ?? 0,
                    $asistencias['ausencias'] ?? 0,
                    $asistencias['pendientes'] ?? 0,
                ]),
            ];
            $eventosVisiblesIds = array_map(
                'intval',
                array_column($eventosVisibles, 'id')
            );
            $pendientesCirculares = $consultarTodos(
                "SELECT e.id AS evento_id
                 FROM usuarios_educandos ue
                 JOIN eventos e ON e.fecha_fin >= NOW() AND e.circular = 1
                 LEFT JOIN educandos_asistencias ea
                   ON ea.id_evento = e.id AND ea.id_educando = ue.id_educando
                 WHERE ue.id_usuario = ?
                   AND (ea.estado IS NULL OR ea.estado <> 'si')",
                [$usuario['id']]
            );
            $datos['tutor'] = [
                'circulares_pendientes' => count(array_filter(
                    $pendientesCirculares,
                    fn($fila): bool => in_array(
                        (int) $fila['evento_id'],
                        $eventosVisiblesIds,
                        true
                    )
                )),
                'asistencias_pendientes' => (int) ($asistencias['pendientes'] ?? 0),
            ];
        }

        responder($datos);

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
            $seccionesEvento = [];
            if (tablaExiste($db, 'eventos_secciones')) {
                $seccionesStmt = $db->prepare(
                    'SELECT seccion FROM eventos_secciones WHERE id_evento = ?'
                );
                $seccionesStmt->execute([$eventoId]);
                $seccionesEvento = $seccionesStmt->fetchAll(PDO::FETCH_COLUMN);
            }
            $asistenciasFiltradas = [];
            foreach ($asistencias as $asistencia) {
                $asistencia['seccion'] = seccionEducando($db, $asistencia['naz']);
                if (
                    !$seccionesEvento
                    || in_array($asistencia['seccion'], $seccionesEvento, true)
                ) {
                    $asistenciasFiltradas[] = $asistencia;
                }
            }
            responder($asistenciasFiltradas);
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
        $educandoId = (int) ($_GET['educando'] ?? 0);
        $puedeConsultar = $usuario['rol'] !== 'tutor'
            || tutorTieneEducando($db, $usuario['id'], $educandoId);
        if ($educandoId < 1 || !$puedeConsultar) {
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

    case 'catalogos':
        if (!tablaExiste($db, 'tipos_evento')
            || !tablaExiste($db, 'secciones')
            || !tablaExiste($db, 'categorias_factura')) {
            responder(['error' => 'Faltan los catálogos. Ejecuta la migración de catálogos.'], 500);
        }
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            responder(catalogos($db, $usuario['rol'] === 'tutor'));
        }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST'
            || $usuario['rol'] !== 'administrador') {
            responder(['error' => 'No tienes permisos para modificar catálogos'], 403);
        }
        $recibida = json_decode(file_get_contents('php://input'), true);
        if (!is_array($recibida)
            || !isset($recibida['tipos_evento'], $recibida['secciones'],
                $recibida['categorias_factura'])
            || !is_array($recibida['tipos_evento'])
            || !is_array($recibida['secciones'])
            || !is_array($recibida['categorias_factura'])) {
            responder(['error' => 'Los catálogos no son válidos'], 400);
        }
        $validarCodigo = static function ($codigo): string {
            $codigo = trim((string) $codigo);
            if ($codigo === '' || strlen($codigo) > 50
                || preg_match('/^[\p{L}][\p{L}\p{N}_ -]*$/u', $codigo) !== 1) {
                responder(['error' => 'El código de catálogo no es válido'], 400);
            }
            return $codigo;
        };
        $guardarCatalogo = static function (
            PDO $db,
            string $tabla,
            array $elementos
        ) use ($validarCodigo): void {
            $codigos = [];
            foreach ($elementos as $indice => $elemento) {
                if (!is_array($elemento)) {
                    responder(['error' => 'Elemento inválido en ' . $tabla], 400);
                }
                $codigo = $validarCodigo($elemento['codigo'] ?? '');
                if (isset($codigos[$codigo])) {
                    responder(['error' => 'Hay códigos repetidos en ' . $tabla], 400);
                }
                $codigos[$codigo] = true;
                $nombre = trim((string) ($elemento['nombre'] ?? ''));
                if ($nombre === '' || strlen($nombre) > 100) {
                    responder(['error' => 'El nombre de catálogo no es válido'], 400);
                }
                $activo = !empty($elemento['activo']) ? 1 : 0;
                $orden = max(0, (int) ($elemento['orden'] ?? $indice));
                if ($tabla === 'tipos_evento' || $tabla === 'categorias_factura') {
                    $tablaSql = $tabla === 'categorias_factura'
                        ? 'categorias_factura' : 'tipos_evento';
                    $stmt = $db->prepare(
                        'INSERT INTO ' . $tablaSql . '
                         (codigo, nombre, activo, orden) VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre),
                         activo = VALUES(activo), orden = VALUES(orden)'
                    );
                    $stmt->execute([$codigo, $nombre, $activo, $orden]);
                } else {
                    $minima = $elemento['edad_minima'] === '' ||
                        $elemento['edad_minima'] === null
                        ? null : max(0, min(120, (int) $elemento['edad_minima']));
                    $maxima = $elemento['edad_maxima'] === '' ||
                        $elemento['edad_maxima'] === null
                        ? null : max(0, min(120, (int) $elemento['edad_maxima']));
                    if ($minima !== null && $maxima !== null && $minima > $maxima) {
                        responder(['error' => 'El intervalo de edades no es válido'], 400);
                    }
                    $stmt = $db->prepare(
                        'INSERT INTO secciones
                         (codigo, nombre, edad_minima, edad_maxima, activo, orden)
                         VALUES (?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre),
                         edad_minima = VALUES(edad_minima),
                         edad_maxima = VALUES(edad_maxima),
                         activo = VALUES(activo), orden = VALUES(orden)'
                    );
                    $stmt->execute([
                        $codigo, $nombre, $minima, $maxima, $activo, $orden
                    ]);
                }
            }
        };
        $db->beginTransaction();
        try {
            $guardarCatalogo($db, 'tipos_evento', $recibida['tipos_evento']);
            $guardarCatalogo($db, 'secciones', $recibida['secciones']);
            $guardarCatalogo($db, 'categorias_factura', $recibida['categorias_factura']);
            $db->commit();
        } catch (Throwable $error) {
            $db->rollBack();
            responder(['error' => 'No se pudieron guardar los catálogos'], 500);
        }
        responder(['ok' => true, 'catalogos' => catalogos($db)]);

    case 'configuracion_logo':
    case 'configuracion':
        $rutaConfiguracion = __DIR__ . '/../data/config.php';
        if ($_SERVER['REQUEST_METHOD'] === 'GET'
            && $ruta === 'configuracion_logo') {
            $configuracion = json_decode(
                file_get_contents($rutaConfiguracion),
                true
            );
            $archivo = $configuracion['logo_archivo'] ?? '';
            $rutaLogo = __DIR__ . '/../../storage/configuracion/' . basename($archivo);
            if (!$archivo || !is_file($rutaLogo)) {
                responder(['error' => 'No hay logo configurado'], 404);
            }
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($rutaLogo);
            header('Content-Type: ' . $mime);
            readfile($rutaLogo);
            exit;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $configuracion = json_decode(file_get_contents($rutaConfiguracion), true);
            if (is_array($configuracion)
                && !isset($configuracion['nombres_tipos_evento'])) {
                $configuracion['nombres_tipos_evento'] = [
                    'reunión de familias' => 'Reunión de familias',
                    'sabado' => 'Sábado',
                    'festival' => 'Festival',
                    'excursion' => 'Excursión',
                    'acampada' => 'Acampada',
                    'otro' => 'Otro'
                ];
            }
            if (is_array($configuracion) && tablaExiste($db, 'tipos_evento')
                && tablaExiste($db, 'secciones')
                && tablaExiste($db, 'categorias_factura')) {
                $configuracion['catalogos'] = catalogos($db);
            }
            responder(is_array($configuracion)
                ? $configuracion
                : ['error' => 'La configuración no es válida']);
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            exigirRol(['administrador']);
            $recibida = isset($_POST['configuracion'])
                ? json_decode($_POST['configuracion'], true)
                : json_decode(file_get_contents('php://input'), true);
            if (!is_array($recibida)) {
                responder(['error' => 'La configuración no es válida']);
            }
            $actual = json_decode(file_get_contents($rutaConfiguracion), true);
            $configuracion = is_array($actual) ? $actual : [];
            $camposTexto = [
                'nombre_grupo', 'color', 'color_secundario', 'cif',
                'direccion', 'municipio', 'provincia', 'telefono', 'correo',
                'coordinador', 'nombre_rol_administrador',
                'nombre_rol_scouter', 'nombre_rol_tutor', 'formato_nombre',
                'formatos_entrega'
            ];
            foreach ($camposTexto as $campo) {
                if (array_key_exists($campo, $recibida)) {
                    $configuracion[$campo] = trim((string) $recibida[$campo]);
                }
            }
            $tiposValidos = [
                'reunión de familias', 'sabado', 'festival', 'excursion',
                'acampada', 'otro'
            ];
            if (isset($recibida['nombres_tipos_evento'])
                && is_array($recibida['nombres_tipos_evento'])) {
                $nombres = [];
                foreach ($tiposValidos as $tipo) {
                    $nombre = trim((string) (
                        $recibida['nombres_tipos_evento'][$tipo] ?? $tipo
                    ));
                    $nombres[$tipo] = $nombre !== '' ? $nombre : $tipo;
                }
                $configuracion['nombres_tipos_evento'] = $nombres;
            }
            foreach (['modo_oscuro', 'mostrar_educandos_sin_seccion',
                'permitir_asistencia_pasada'] as $campo) {
                $configuracion[$campo] = filter_var(
                    $recibida[$campo] ?? false,
                    FILTER_VALIDATE_BOOLEAN
                );
            }
            if (isset($recibida['tamano_maximo_archivos_mb'])) {
                $configuracion['tamano_maximo_archivos_mb'] = max(
                    1,
                    min(50, (int) $recibida['tamano_maximo_archivos_mb'])
                );
            }
            $logo = $_FILES['logo'] ?? null;
            if ($logo && $logo['error'] !== UPLOAD_ERR_NO_FILE) {
                if ($logo['error'] !== UPLOAD_ERR_OK || $logo['size'] > 5 * 1024 * 1024) {
                    responder(['error' => 'El logo no es válido o supera los 5 MB'], 400);
                }
                $permitidos = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                ];
                $mime = (new finfo(FILEINFO_MIME_TYPE))->file($logo['tmp_name']);
                if (!isset($permitidos[$mime])) {
                    responder(['error' => 'El logo debe ser JPEG, PNG o WebP'], 415);
                }
                $directorio = __DIR__ . '/../../storage/configuracion';
                if (!is_dir($directorio) && !mkdir($directorio, 0750, true)) {
                    responder(['error' => 'No se pudo preparar el almacenamiento del logo'], 500);
                }
                $nombre = 'logo-' . bin2hex(random_bytes(12))
                    . '.' . $permitidos[$mime];
                if (!move_uploaded_file($logo['tmp_name'], $directorio . '/' . $nombre)) {
                    responder(['error' => 'No se pudo guardar el logo'], 500);
                }
                $configuracion['logo_archivo'] = $nombre;
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
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME NOT IN (
                   'eventos_secciones',
                   'tipos_evento',
                   'secciones',
                   'categorias_factura'
               )
             ORDER BY TABLE_NAME"
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
        $sql = $tabla === 'facturas'
            ? 'SELECT f.*, CONCAT(u.nombre, \' \', u.apellidos) AS responsable_nombre
               FROM facturas f
               JOIN usuarios u ON u.id = f.responsable_id'
            : ($tabla === 'eventos'
                ? 'SELECT e.*, CONCAT(u.nombre, \' \', u.apellidos)
                       AS responsable_nombre
                   FROM eventos e
                   LEFT JOIN usuarios u ON u.id = e.id_responsable'
                : 'SELECT * FROM `' . str_replace('`', '``', $tabla) . '`');
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
        if ($tabla === 'eventos' && tablaExiste($db, 'eventos_secciones')) {
            $seccionesStmt = $db->query(
                'SELECT id_evento, seccion FROM eventos_secciones ORDER BY seccion'
            );
            $seccionesPorEvento = [];
            foreach ($seccionesStmt->fetchAll() as $filaSeccion) {
                $seccionesPorEvento[$filaSeccion['id_evento']][] =
                    $filaSeccion['seccion'];
            }
            foreach ($registros as &$registro) {
                $registro['convocatorias'] =
                    $seccionesPorEvento[$registro['id']] ?? [];
            }
            unset($registro);
        }
        if ($tabla === 'educandos') {
            foreach ($registros as &$registro) {
                $registro['seccion'] = seccionEducando($db, $registro['naz'] ?? null);
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
        if ($tabla === 'eventos' && !tablaExiste($db, 'eventos_secciones')) {
            responder([
                'error' => 'Falta crear la tabla eventos_secciones. Ejecuta la migración de noteas.md'
            ], 500);
        }
        $educandosRelacionados = $tabla === 'usuarios'
            ? array_values(array_filter(
                $datos['educandos_relacionados'] ?? [],
                fn($id): bool => filter_var($id, FILTER_VALIDATE_INT) !== false
            ))
            : [];
        $convocatorias = $tabla === 'eventos'
            ? ($datos['convocatorias'] ?? [])
            : [];
        unset($datos['educandos_relacionados']);
        unset($datos['convocatorias']);
        $columnas = obtenerColumnas($db, $tabla);
        $permitidas = array_column(array_filter($columnas, fn($columna) => !$columna['pk']), 'name');
        $datosValidos = array_intersect_key($datos, array_flip($permitidas));
        if ($tabla === 'eventos') {
            if (!isset($datosValidos['tipo'])
                || !is_string($datosValidos['tipo'])) {
                responder(['error' => 'El tipo de evento es obligatorio'], 400);
            }
            $tipoStmt = $db->prepare(
                'SELECT 1 FROM tipos_evento WHERE codigo = ?'
            );
            $tipoStmt->execute([$datosValidos['tipo']]);
            if (!$tipoStmt->fetchColumn()) {
                responder(['error' => 'El tipo de evento no existe'], 400);
            }
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
        if ($tabla === 'facturas') {
            guardarImagenFactura($db, $registroId);
        }
        if ($tabla === 'eventos') {
            $seccionesValidas = $db->query(
                'SELECT codigo FROM secciones'
            )->fetchAll(PDO::FETCH_COLUMN);
            $convocatorias = array_values(array_intersect(
                $seccionesValidas,
                array_unique(array_map('strval', is_array($convocatorias)
                    ? $convocatorias : []))
            ));
            $db->prepare('DELETE FROM eventos_secciones WHERE id_evento = ?')
                ->execute([$registroId]);
            $seccionStmt = $db->prepare(
                'INSERT INTO eventos_secciones (id_evento, seccion) VALUES (?, ?)'
            );
            foreach ($convocatorias as $seccion) {
                $seccionStmt->execute([$registroId, $seccion]);
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
