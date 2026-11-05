<?php

function rondaActual(?DateTimeImmutable $fecha = null): string
{
    $fecha ??= new DateTimeImmutable('now');
    $ano = (int) $fecha->format('Y');
    $mes = (int) $fecha->format('n');
    $inicio = $mes >= 9 ? $ano : $ano - 1;

    return sprintf('%02d-%02d', $inicio % 100, ($inicio + 1) % 100);
}

function seccionDeEducando(?string $nacimiento, ?DateTimeImmutable $fecha = null): ?string
{
    if (!$nacimiento) {
        return null;
    }

    try {
        $fechaNacimiento = new DateTimeImmutable($nacimiento);
        $fecha ??= new DateTimeImmutable('now');
        $inicioRonda = new DateTimeImmutable(
            (int) $fecha->format('Y') . '-09-01'
        );
        if ($fecha < $inicioRonda) {
            $inicioRonda = $inicioRonda->modify('-1 year');
        }
        $edad = (int) $fechaNacimiento->diff($inicioRonda)->y;
    } catch (Exception) {
        return null;
    }

    return match (true) {
        $edad >= 5 && $edad <= 6 => 'colonia',
        $edad >= 7 && $edad <= 9 => 'manada',
        $edad >= 10 && $edad <= 12 => 'tropa',
        $edad >= 13 && $edad <= 15 => 'posta',
        $edad >= 16 && $edad <= 19 => 'rutas',
        default => null,
    };
}

function nombreCarpetaEducando(int $id, string $nombre, string $apellidos): string
{
    $texto = $id . '-' . $nombre . '-' . $apellidos;
    $texto = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto) ?: $texto;
    $texto = strtolower($texto);
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto);

    return trim((string) $texto, '-') ?: (string) $id;
}
