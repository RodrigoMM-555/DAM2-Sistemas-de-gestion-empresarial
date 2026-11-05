<?php

require_once __DIR__ . '/../auth/sesion.php';

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $parametros = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $parametros['path'],
        $parametros['domain'] ?? '',
        (bool) $parametros['secure'],
        (bool) $parametros['httponly']
    );
}
session_destroy();
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true]);
