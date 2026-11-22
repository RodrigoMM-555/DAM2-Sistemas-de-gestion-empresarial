<?php

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

function usuarioActual(): ?array
{
    return $_SESSION['usuario'] ?? null;
}

function exigirAutenticacion(): array
{
    $usuario = usuarioActual();
    if ($usuario === null) {
        responder(['error' => 'No autenticado'], 401);
    }
    return $usuario;
}

function exigirRol(array $roles): array
{
    $usuario = exigirAutenticacion();
    if (!in_array($usuario['rol'], $roles, true)) {
        responder(['error' => 'No tienes permisos para esta operación'], 403);
    }
    return $usuario;
}
