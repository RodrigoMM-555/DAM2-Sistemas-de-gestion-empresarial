<?php

require_once __DIR__ . '/../data/database.php';
require_once __DIR__ . '/../auth/sesion.php';

function responderLogin(array $datos, int $estado = 200): never
{
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderLogin(['error' => 'Método no permitido'], 405);
}

$datos = json_decode(file_get_contents('php://input'), true);
$email = trim((string) ($datos['email'] ?? ''));
$contrasena = (string) ($datos['contrasena'] ?? '');

if ($email === '' || $contrasena === '') {
    responderLogin(['error' => 'Email y contraseña son obligatorios'], 400);
}

try {
    $db = obtenerConexion();
    $stmt = $db->prepare(
        'SELECT id, nombre, apellidos, email, rol, `contraseña`
         FROM usuarios WHERE email = ? LIMIT 1'
    );
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();
} catch (Throwable $error) {
    responderLogin([
        'error' => 'No se pudo conectar con la base de datos. '
            . 'Comprueba la configuración de MySQL y Apache.'
    ], 500);
}

if (!$usuario || !hash_equals((string) $usuario['contraseña'], hash('sha256', $contrasena))) {
    responderLogin(['error' => 'Email o contraseña incorrectos'], 401);
}

session_regenerate_id(true);
$_SESSION['usuario'] = [
    'id' => (int) $usuario['id'],
    'nombre' => $usuario['nombre'],
    'apellidos' => $usuario['apellidos'],
    'email' => $usuario['email'],
    'rol' => $usuario['rol'],
];

responderLogin(['usuario' => $_SESSION['usuario']]);
