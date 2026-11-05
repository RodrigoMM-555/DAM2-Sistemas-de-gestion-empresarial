<?php

require_once __DIR__ . '/../data/database.php';
require_once __DIR__ . '/../data/secciones.php';
require_once __DIR__ . '/../auth/sesion.php';

const CIRCULAR_FIJA = 'biblioteca/circular1.pdf';

$usuario = exigirAutenticacion();
$db = obtenerConexion();
$tipo = $_GET['tipo'] ?? '';
$eventoId = (int) ($_GET['evento'] ?? 0);
$educandoId = (int) ($_GET['educando'] ?? 0);

function tutorTieneEducandoArchivo(PDO $db, int $usuarioId, int $educandoId): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM usuarios_educandos
         WHERE id_usuario = ? AND id_educando = ?'
    );
    $stmt->execute([$usuarioId, $educandoId]);
    return (bool) $stmt->fetchColumn();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($usuario['rol'] !== 'tutor') {
        http_response_code(403);
        exit('Solo los tutores pueden subir entregas');
    }
    if (
        $tipo !== 'entrega' || $eventoId < 1 || $educandoId < 1
        || !tutorTieneEducandoArchivo($db, $usuario['id'], $educandoId)
    ) {
        http_response_code(400);
        exit('Datos de entrega no válidos');
    }
    $eventoStmt = $db->prepare('SELECT circular, fecha_fin FROM eventos WHERE id = ?');
    $eventoStmt->execute([$eventoId]);
    $evento = $eventoStmt->fetch();
    if (!$evento || !$evento['circular']) {
        http_response_code(409);
        exit('Este evento no requiere circular');
    }
    if (new DateTimeImmutable($evento['fecha_fin']) < new DateTimeImmutable()) {
        http_response_code(409);
        exit('No se pueden subir entregas de eventos pasados');
    }

    $archivo = $_FILES['archivo'] ?? null;
    if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        exit('No se ha recibido ningún archivo válido');
    }
    if ($archivo['size'] > 10 * 1024 * 1024) {
        http_response_code(413);
        exit('El archivo no puede superar los 10 MB');
    }

    $permitidos = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
    if (!isset($permitidos[$mime])) {
        http_response_code(415);
        exit('Tipo de archivo no permitido');
    }

    $educandoStmt = $db->prepare(
        'SELECT nombre, apellidos, naz FROM educandos WHERE id = ?'
    );
    $educandoStmt->execute([$educandoId]);
    $educando = $educandoStmt->fetch();
    $seccion = $educando
        ? seccionDeEducando($educando['naz'] ?? null)
        : null;
    if (!$educando || !$seccion) {
        http_response_code(409);
        exit('El educando no tiene una fecha de nacimiento válida para calcular su sección');
    }

    $nombreArchivo = bin2hex(random_bytes(16)) . '.' . $permitidos[$mime];
    $rutaRelativa = implode('/', [
        rondaActual(),
        $seccion,
        nombreCarpetaEducando($educandoId, $educando['nombre'], $educando['apellidos']),
        $nombreArchivo,
    ]);
    $directorio = __DIR__ . '/../../storage/documentos/' . dirname($rutaRelativa);
    if (!is_dir($directorio) && !mkdir($directorio, 0750, true)) {
        http_response_code(500);
        exit('No se pudo preparar el almacenamiento');
    }
    $destino = __DIR__ . '/../../storage/documentos/' . $rutaRelativa;
    if (!move_uploaded_file($archivo['tmp_name'], $destino)) {
        http_response_code(500);
        exit('No se pudo guardar el archivo');
    }

    $stmt = $db->prepare(
        "INSERT INTO educandos_asistencias
            (id_educando, id_evento, estado, archivo_entrega)
         VALUES (?, ?, 'si', ?)
         ON DUPLICATE KEY UPDATE archivo_entrega = VALUES(archivo_entrega)"
    );
    $stmt->execute([$educandoId, $eventoId, $rutaRelativa]);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'nombre' => $rutaRelativa]);
    exit;
}

if ($eventoId < 1) {
    http_response_code(400);
    exit('Evento no válido');
}

$stmt = $db->prepare(
    "SELECT e.circular, ea.archivo_entrega,
            COALESCE(ea.estado, 'pendiente') AS estado
     FROM eventos e
     LEFT JOIN educandos_asistencias ea
       ON ea.id_evento = e.id AND ea.id_educando = ?
     WHERE e.id = ?"
);
$stmt->execute([$educandoId ?: null, $eventoId]);
$registro = $stmt->fetch();
$baseDocumentos = realpath(__DIR__ . '/../../storage/documentos');

if (!$registro) {
    http_response_code(404);
    exit('No se encontró el evento');
}

if ($tipo === 'circular') {
    if (!$registro['circular']) {
        http_response_code(404);
        exit('Este evento no tiene circular');
    }
    $nombre = CIRCULAR_FIJA;
    $ruta = $baseDocumentos !== false
        ? realpath($baseDocumentos . '/' . $nombre)
        : false;
} elseif ($tipo === 'entrega' || $tipo === 'preview') {
    if ($registro['estado'] !== 'si') {
        http_response_code(409);
        exit('La entrega solo está disponible cuando se confirma la asistencia');
    }
    if ($usuario['rol'] === 'tutor' && !tutorTieneEducandoArchivo($db, $usuario['id'], $educandoId)) {
        http_response_code(403);
        exit('No tienes permisos para este documento');
    }
    $nombre = $registro['archivo_entrega'];
    $ruta = $baseDocumentos !== false
        ? realpath($baseDocumentos . '/' . ltrim((string) $nombre, '/'))
        : false;
} else {
    http_response_code(400);
    exit('Tipo de archivo no válido');
}

$baseDocumentos ??= realpath(__DIR__ . '/../../storage/documentos');
if (
    !$nombre || $ruta === false || !is_file($ruta)
    || $baseDocumentos === false
    || !str_starts_with($ruta, $baseDocumentos . DIRECTORY_SEPARATOR)
) {
    http_response_code(404);
    exit('No existe el archivo solicitado');
}

$mime = mime_content_type($ruta) ?: 'application/octet-stream';
if ($tipo === 'preview' && $mime === 'application/pdf') {
    $prefijo = tempnam(sys_get_temp_dir(), 'ingeriar-preview-');
    if ($prefijo === false) {
        http_response_code(500);
        exit('No se pudo preparar la previsualización');
    }
    unlink($prefijo);
    $proceso = proc_open(
        [
            'pdftoppm', '-f', '1', '-l', '1', '-png', '-singlefile',
            '-scale-to', '500', $ruta, $prefijo
        ],
        [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ],
        $tuberias
    );
    if (!is_resource($proceso)) {
        http_response_code(500);
        exit('No se pudo generar la previsualización');
    }
    stream_get_contents($tuberias[1]);
    $error = stream_get_contents($tuberias[2]);
    fclose($tuberias[1]);
    fclose($tuberias[2]);
    $codigo = proc_close($proceso);
    $vista = $prefijo . '.png';
    if ($codigo !== 0 || !is_file($vista)) {
        http_response_code(500);
        exit('No se pudo generar la primera página del PDF: ' . trim($error));
    }
    header('Content-Type: image/png');
    header('Content-Length: ' . filesize($vista));
    readfile($vista);
    unlink($vista);
    exit;
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($ruta));
header('Content-Disposition: inline; filename="' . basename($nombre) . '"');
readfile($ruta);
