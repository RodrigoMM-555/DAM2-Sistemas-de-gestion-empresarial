<?php
header('Content-Type: application/json; charset=utf-8');
// Indicamos al navegador que todas las respuestas de esta API son JSON y usan UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Abrimos la base de datos SQLite que está dentro de la carpeta data.
$db = new SQLite3('../data/darkorange.db');
// Hacemos que SQLite lance excepciones cuando se produce un error.
$db->enableExceptions(true);

// Lee el cuerpo JSON de una petición y siempre devuelve un array.
function entrada() {
    // php://input contiene el cuerpo original enviado por fetch.
    $datos = json_decode(file_get_contents('php://input'), true);
    // Si el JSON no representa un array, devolvemos un array vacío.
    return is_array($datos) ? $datos : [];
}

// Encierra un nombre para poder usarlo como identificador de SQLite de forma segura.
function nombreSeguro($nombre) {
    // Las comillas dobles internas se duplican según la sintaxis de SQLite.
    return '"' . str_replace('"', '""', $nombre) . '"';
}

// Comprueba que la tabla solicitada existe realmente en la base de datos.
function validarTabla($db, $tabla) {
    // Usamos un parámetro para no concatenar directamente el nombre recibido.
    $stmt = $db->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? AND name NOT LIKE 'sqlite_%'");
    // Vinculamos el nombre de tabla como texto.
    $stmt->bindValue(1, $tabla, SQLITE3_TEXT);
    // Ejecutamos la consulta y obtenemos su primera fila.
    $r = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    // Si no existe, detenemos la petición con un error controlado.
    if (!$r) throw new Exception('Tabla no válida');
    // Devolvemos el nombre preparado para usarlo en una consulta SQL.
    return nombreSeguro($tabla);
}

// Obtiene la definición de las columnas y el nombre de la clave primaria.
function estructura($db, $tabla) {
    // Primero validamos la tabla y la convertimos en un identificador seguro.
    $segura = validarTabla($db, $tabla);
    // PRAGMA table_info devuelve una fila por cada columna de la tabla.
    $res = $db->query("PRAGMA table_info($segura)");
    // Aquí guardaremos las columnas completas devueltas por SQLite.
    $columnas = [];
    // Si la tabla no tiene PK, este valor permanecerá a null.
    $pk = null;
    // Recorremos todas las columnas de la tabla.
    while ($c = $res->fetchArray(SQLITE3_ASSOC)) {
        // Añadimos la información de la columna al resultado.
        $columnas[] = $c;
        // En SQLite, pk contiene un valor distinto de cero para la clave primaria.
        if (!empty($c['pk'])) $pk = $c['name'];
    }
    // Devolvemos ambos datos para que los use la ruta solicitada.
    return [$columnas, $pk];
}

// Capturamos cualquier error producido durante el tratamiento de la petición.
try {
    // Leemos la ruta de la API desde la URL; si falta, usamos una cadena vacía.
    $ruta = $_GET['ruta'] ?? '';
    // Cada caso representa una operación diferente de la aplicación.
    switch ($ruta) {
        case 'modulos':
            // Devuelve los módulos fijos que se muestran en el primer menú.
            echo json_encode(['ventas','rrhh','facturacion','compras'], JSON_UNESCAPED_UNICODE);
            break;

        case 'entidades':
            // Consultamos las tablas de usuario, excluyendo las tablas internas de SQLite.
            $r = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
            // Array donde construiremos la lista de nombres.
            $tablas = [];
            // Convertimos cada fila de la consulta en un nombre de tabla.
            while ($f = $r->fetchArray(SQLITE3_ASSOC)) $tablas[] = $f['name'];
            // Enviamos la lista al navegador.
            echo json_encode($tablas, JSON_UNESCAPED_UNICODE);
            break;

        case 'tabla':
            // Obtenemos el nombre de la tabla que el usuario quiere consultar.
            $tabla = $_GET['tabla'] ?? '';
            // Validamos el nombre antes de utilizarlo en SQL.
            $segura = validarTabla($db, $tabla);
            // Recuperamos sus columnas y su clave primaria.
            [$columnas, $pk] = estructura($db, $tabla);
            // Ordenamos por la PK descendente para mostrar primero los registros nuevos.
            $orden = $pk ? ' ORDER BY '.nombreSeguro($pk).' DESC' : '';
            // Leemos todos los registros de la tabla.
            $r = $db->query("SELECT * FROM $segura$orden");
            // Array donde se almacenarán las filas.
            $registros = [];
            // Convertimos cada fila SQLite en un array asociativo.
            while ($f = $r->fetchArray(SQLITE3_ASSOC)) $registros[] = $f;
            // Devolvemos metadatos y datos para que JavaScript construya la interfaz.
            echo json_encode([
                'tabla'=>$tabla,
                'columnas'=>$columnas,
                'clavePrimaria'=>$pk,
                'registros'=>$registros
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'crear':
            // Leemos el objeto JSON enviado por el formulario.
            $e = entrada();
            // Extraemos tabla y datos, usando valores vacíos si no se recibieron.
            $tabla = $e['tabla'] ?? '';
            $datos = $e['datos'] ?? [];
            // Validamos la tabla y obtenemos su estructura.
            $segura = validarTabla($db, $tabla);
            [$columnas, $pk] = estructura($db, $tabla);

            // Permitimos insertar solo columnas existentes que no sean la PK.
            $permitidas = array_column(
                array_filter($columnas, fn($c) => empty($c['pk']) && $c['name'] !== 'id'),
                'name'
            );
            // Eliminamos del cuerpo cualquier campo no permitido.
            $datos = array_intersect_key($datos, array_flip($permitidas));
            // No se puede hacer un INSERT sin campos.
            if (!$datos) throw new Exception('No hay campos para insertar');

            // Obtenemos los nombres de campos recibidos.
            $campos = array_keys($datos);
            // Protegemos cada nombre de columna y los unimos con comas.
            $nombres = implode(',', array_map('nombreSeguro', $campos));
            // Creamos un signo ? por cada valor para usar una consulta preparada.
            $marcas = implode(',', array_fill(0, count($campos), '?'));
            // Preparamos el INSERT evitando concatenar los valores del usuario.
            $stmt = $db->prepare("INSERT INTO $segura ($nombres) VALUES ($marcas)");
            // Los parámetros de SQLite empiezan en la posición 1.
            $i = 1;
            // Vinculamos cada valor recibido con su signo de interrogación.
            foreach ($datos as $valor) $stmt->bindValue($i++, $valor, SQLITE3_TEXT);
            // Ejecutamos la inserción.
            $stmt->execute();

            // Confirmamos la operación y devolvemos el ID generado.
            echo json_encode(['ok'=>true,'id'=>$db->lastInsertRowID()], JSON_UNESCAPED_UNICODE);
            break;

        default:
            // Cualquier ruta desconocida se considera un error de petición.
            throw new Exception('Ruta no válida');
    }
} catch (Throwable $e) {
    // Indicamos al cliente que la petición no se pudo procesar.
    http_response_code(400);
    // Devolvemos el mensaje para que el frontend pueda mostrar o lanzar el error.
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
// Cerramos la conexión SQLite al terminar la petición.
$db->close();
?>