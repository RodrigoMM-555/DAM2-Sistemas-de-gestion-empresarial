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