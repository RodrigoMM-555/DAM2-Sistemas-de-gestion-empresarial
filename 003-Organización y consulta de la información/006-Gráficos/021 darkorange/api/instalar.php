<?php
// Mensaje inicial de la página de instalación.
	echo "Hola que tal soy tu instalador";
	// Salto de línea HTML.
	echo "<br>";
	// Mostramos temporalmente el modelo recibido para poder comprobarlo.
	echo $_POST['modelo'];
	echo "<br>";
	echo "Vamos a destripar";
	echo "<br>";

	// Creamos o abrimos el archivo de base de datos SQLite.
	$db = new SQLite3('../data/darkorange.db');

	// Separamos el modelo en líneas para procesar tablas y columnas.
	$partido = explode("\n",$_POST['modelo']);

	// Nombre de la tabla que estamos procesando.
	$tabla = "";
	// Columnas acumuladas de la tabla actual.
	$columnas = [];

	// Recorremos todas las líneas del modelo recibido.
	foreach($partido as $clave){

		// Quitamos espacios y saltos de línea sobrantes.
		$clave = trim($clave);

		// Ignoramos las líneas vacías.
		if($clave == ""){
			continue;
		}

		// Una línea que comienza por "-" representa una columna.
		if($clave[0] == "-"){
			// Quitamos el guion y los espacios que rodean al nombre.
			$columna = trim(substr($clave,1));
			// Guardamos la columna hasta crear la tabla.
			$columnas[] = $columna;
		}else{

			// Si ya teníamos una tabla, la creamos
			if($tabla != ""){
				// Comenzamos la sentencia CREATE TABLE.
				$sql = "CREATE TABLE IF NOT EXISTS ".$tabla." (";
				// Todas las tablas reciben una clave primaria autoincremental.
				$sql .= "id INTEGER PRIMARY KEY AUTOINCREMENT";

				// Si hay columnas, las añadimos como campos de texto.
				if(count($columnas) > 0){
					$sql .= ", ";
					$sql .= implode(" TEXT, ",$columnas)." TEXT";
				}

				// Cerramos la sentencia SQL.
				$sql .= ");";

				// Mostramos la sentencia generada para depuración.
				echo "<pre>".$sql."</pre>";

				// Ejecutamos la creación de la tabla.
				$db->exec($sql);
			}

			// Empezamos una nueva tabla
			$tabla = $clave;
			// Reiniciamos las columnas para la nueva tabla.
			$columnas = [];
		}
	}

	// Creamos la última tabla
	if($tabla != ""){
		// Construimos la sentencia de la última tabla, que no tiene otra línea posterior que la dispare.
		$sql = "CREATE TABLE IF NOT EXISTS ".$tabla." (";
		$sql .= "id INTEGER PRIMARY KEY AUTOINCREMENT";

		if(count($columnas) > 0){
			$sql .= ", ";
			$sql .= implode(" TEXT, ",$columnas)." TEXT";
		}

		// Cerramos la sentencia CREATE TABLE.
		$sql .= ");";

		// Mostramos y ejecutamos la sentencia.
		echo "<pre>".$sql."</pre>";

		$db->exec($sql);
	}

	// Cerramos la conexión con SQLite.
	$db->close();

	// Informamos al usuario de que el proceso terminó.
	echo "<br>";
	echo "Base de datos creada correctamente";
	echo "<br>";
	echo "../data/darkorange.db";
?>