<?php

// El instalador devuelve una página HTML con el resultado de la operación.
header('Content-Type: text/html; charset=utf-8');

// El formulario envía el modelo como texto mediante POST.
// Si no existe el campo, utilizamos una cadena vacía para poder mostrar
// un error controlado en lugar de provocar un aviso de PHP.
$modelo = $_POST['modelo'] ?? '';

if (trim($modelo) === '') {
    // Un modelo vacío no contiene información suficiente para crear tablas.
    http_response_code(400);
    exit('No se ha recibido ningún modelo de datos.');
}

// Los nombres de tablas y columnas se incorporan al SQL como identificadores.
// Por eso se validan antes: los valores de los campos se parametrizan en
// superapi.php, pero los nombres no se pueden parametrizar de la misma forma.
function identificadorValido($valor) {
    return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $valor) === 1;
}

function convertirEnum($nombre, $definicion) {
    if (preg_match('/^ENUM\s*\((.*?)\)(.*)$/is', $definicion, $coincidencia) !== 1) {
        return $definicion;
    }

    $opciones = trim($coincidencia[1]);
    $resto = trim($coincidencia[2]);

    if ($opciones === '') {
        throw new RuntimeException("ENUM sin opciones en la columna: $nombre");
    }

    return 'TEXT'
        . ($resto === '' ? '' : ' ' . $resto)
        . ' CHECK ("' . $nombre . '" IN (' . $opciones . '))';
}

// Convierte una tabla del modelo de texto en una sentencia CREATE TABLE.
// El formato de cada campo es:
//
//     - nombre TIPO RESTRICCIONES
//
// Por ejemplo:
//
//     - email TEXT NOT NULL UNIQUE
//
// Si solo se escribe "- nombre", se conserva la compatibilidad con el
// formato antiguo y el campo se crea como TEXT.
function crearSqlTabla($tabla, $columnas) {
    if (!identificadorValido($tabla)) {
        throw new RuntimeException("Nombre de tabla no válido: $tabla");
    }

    // Todas las tablas de Ingeriar tienen un identificador automático.
    // No es necesario escribir "- id" en el modelo.
    $definiciones = [
        '"id" INTEGER PRIMARY KEY AUTOINCREMENT'
    ];
    $restricciones = [];

    foreach ($columnas as $columna) {
        // Las restricciones de tabla no tienen nombre de columna propio.
        // Se añaden sin comillas para conservar claves compuestas y nombres
        // de restricciones válidos en SQLite.
        if (preg_match('/^(PRIMARY KEY|UNIQUE(?: KEY)?|FOREIGN KEY|CHECK)\b/i', trim($columna)) === 1) {
            $restricciones[] = trim($columna);
            continue;
        }

        // Separamos únicamente por el primer grupo de espacios:
        // la primera parte es el nombre y el resto contiene tipo y reglas.
        $partes = preg_split('/\s+/', trim($columna), 2);
        $nombre = $partes[0];
        $definicion = $partes[1] ?? 'TEXT';

        // Evita crear una segunda columna id si aparece por error en el modelo.
        if ($nombre === 'id') {
            continue;
        }

        if (!identificadorValido($nombre)) {
            throw new RuntimeException("Nombre de columna no válido: $nombre");
        }

        $definicion = trim($definicion);

        if ($definicion === '') {
            $definicion = 'TEXT';
        }

        // SQLite no tiene ENUM nativo: se convierte en TEXT + CHECK.
        $definicion = convertirEnum($nombre, $definicion);

        // Las restricciones se conservan para que SQLite cree la estructura
        // real indicada por el modelo: INTEGER, DATE, NOT NULL, UNIQUE, etc.
        $definiciones[] = '"' . $nombre . '" ' . $definicion;
    }

    // IF NOT EXISTS permite ejecutar el instalador sin sobrescribir una tabla
    // ya creada ni borrar sus datos.
    return 'CREATE TABLE IF NOT EXISTS "' . $tabla . '" ('
        . implode(', ', array_merge($definiciones, $restricciones))
        . ')';
}

// El modelo utiliza una línea por tabla y líneas con "-" para sus columnas.
// \R permite separar correctamente saltos de línea de distintos sistemas.
$lineas = preg_split('/\R/', $modelo);
$tablas = [];
$tablaActual = null;
$columnasActuales = [];

foreach ($lineas as $linea) {
    $linea = trim($linea);

    // Se permiten líneas vacías y comentarios que comiencen por "#".
    if ($linea === '' || str_starts_with($linea, '#')) {
        continue;
    }

    if (str_starts_with($linea, '-')) {
        if ($tablaActual === null) {
            // Una columna solo tiene sentido después de declarar su tabla.
            throw new RuntimeException('Se ha encontrado una columna antes de indicar una tabla.');
        }

        // Quitamos el "-" y guardamos la definición completa del campo.
        $columnasActuales[] = trim(substr($linea, 1));
        continue;
    }

    // Una línea sin "-" empieza una tabla nueva. Antes de cambiar de tabla
    // generamos la sentencia de la tabla anterior.
    if ($tablaActual !== null) {
        $tablas[] = crearSqlTabla($tablaActual, $columnasActuales);
    }

    $tablaActual = $linea;
    $columnasActuales = [];
}

// La última tabla no tiene una tabla posterior que active el bloque anterior,
// así que hay que añadirla después de terminar el recorrido.
if ($tablaActual !== null) {
    $tablas[] = crearSqlTabla($tablaActual, $columnasActuales);
}

if (count($tablas) === 0) {
    http_response_code(400);
    exit('El modelo no contiene ninguna tabla.');
}

// SQLite crea el archivo si todavía no existe y abre el existente si ya está
// creado. La ruta se basa en __DIR__ para que no dependa del directorio desde
// el que se haya iniciado el servidor PHP.
$db = new SQLite3(__DIR__ . '/../data/ingeriar.db');

// Hace que los errores de SQLite se conviertan en excepciones y puedan
// mostrarse mediante el bloque catch en lugar de ignorarse silenciosamente.
$db->enableExceptions(true);

// Las claves foráneas solo se aplican si esta opción está activa en SQLite.
$db->exec('PRAGMA foreign_keys = ON');

try {
    // Si falla una tabla, se deshacen también las tablas creadas antes dentro
    // de esta instalación. Así no queda una base de datos a medias.
    $db->exec('BEGIN');
    $transaccionIniciada = true;

    foreach ($tablas as $sql) {
        $db->exec($sql);
    }

    $db->exec('COMMIT');
    $transaccionIniciada = false;
} catch (Throwable $error) {
    if (!empty($transaccionIniciada)) {
        $db->exec('ROLLBACK');
    }

    // Se informa del error real y se devuelve un estado HTTP de servidor.
    http_response_code(500);
    exit('No se pudo instalar el modelo: ' . htmlspecialchars($error->getMessage()));
} finally {
    // Cerramos la conexión tanto si la instalación termina bien como si falla.
    $db->close();
}

// Mostramos el resultado y el SQL generado para poder revisar qué ha
// interpretado el instalador antes de utilizar la base de datos.
echo '<h1>Base de datos creada correctamente</h1>';
echo '<p>Se han procesado ' . count($tablas) . ' tablas.</p>';
// CREATE TABLE IF NOT EXISTS crea tablas nuevas, pero no modifica tablas
// existentes. Cambiar tipos o restricciones requeriría una migración.
echo '<p>Las tablas existentes no se modifican porque el instalador utiliza '
    . '<code>CREATE TABLE IF NOT EXISTS</code>.</p>';
echo '<h2>SQL generado</h2>';
foreach ($tablas as $sql) {
    echo '<pre>' . htmlspecialchars($sql) . ';</pre>';
}

/*
<?php
	// El modelo llega desde el formulario mediante una petición POST.
	// También se muestra en pantalla para poder comprobar qué se va a instalar.
	echo "Hola que tal soy tu instalador";
	echo "<br>";
	echo $_POST['modelo'];
	echo "<br>";
	echo "Vamos a destripar";
	echo "<br>";

	// SQLite3 crea el archivo si todavía no existe y lo abre si ya estaba creado.
	$db = new SQLite3('../data/ingeriar.db');

	// Cada línea del modelo representa una tabla o una columna.
	$partido = explode("\n",$_POST['modelo']);

	$tabla = "";
	$columnas = [];

	foreach($partido as $clave){

		// Eliminamos espacios y saltos de línea sobrantes para interpretar la línea.
		$clave = trim($clave);

		if($clave == ""){
			continue;
		}

		if($clave[0] == "-"){
			// Las líneas que empiezan por "-" son columnas de la tabla actual.
			$columna = trim(substr($clave,1));
			$columnas[] = $columna;
		}else{

			// Si ya teníamos una tabla, la creamos
			if($tabla != ""){
				// Se añade siempre un id autoincremental y el resto de columnas como TEXT.
				$sql = "CREATE TABLE IF NOT EXISTS ".$tabla." (";
				$sql .= "id INTEGER PRIMARY KEY AUTOINCREMENT";

				if(count($columnas) > 0){
					$sql .= ", ";
					$sql .= implode(" TEXT, ",$columnas)." TEXT";
				}

				$sql .= ");";

				echo "<pre>".$sql."</pre>";

				$db->exec($sql);
			}

			// Una línea sin "-" inicia una nueva tabla. Sus columnas se recogerán
			// hasta encontrar otra tabla o llegar al final del modelo.
			$tabla = $clave;
			$columnas = [];
		}
	}

	// El bucle solo crea una tabla al detectar la siguiente; por eso hay que
	// crear aquí la última tabla, que no tiene otra después que la dispare.
	if($tabla != ""){
		$sql = "CREATE TABLE IF NOT EXISTS ".$tabla." (";
		$sql .= "id INTEGER PRIMARY KEY AUTOINCREMENT";

		if(count($columnas) > 0){
			$sql .= ", ";
			$sql .= implode(" TEXT, ",$columnas)." TEXT";
		}

		$sql .= ");";

		echo "<pre>".$sql."</pre>";

		$db->exec($sql);
	}

	$db->close();

	echo "<br>";
	echo "Base de datos creada correctamente";
	echo "<br>";
	echo "../data/ingeriar.db";
?>

*/