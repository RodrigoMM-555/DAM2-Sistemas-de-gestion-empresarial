## General
- Unificar la generación de cabeceras

## MySQL
- Ejecutar `server/data/schema.sql` en MySQL para crear la base de datos `ingeriar_v3`.
- La aplicación usa PDO y acepta `INGERIAR_DB_HOST`, `INGERIAR_DB_PORT`,
  `INGERIAR_DB_NAME`, `INGERIAR_DB_USER` e `INGERIAR_DB_PASSWORD`.
- `server/data/demo.sql` contiene datos de prueba compatibles con el esquema.
- El instalador crea las tablas sin una transacción global porque MySQL hace
  `COMMIT` implícito al ejecutar sentencias DDL como `CREATE TABLE`.
- No se debe usar `root` desde PHP. En Ubuntu, `root` suele autenticarse con
  `unix_socket`, por lo que produce el error `SQLSTATE[HY000] [1698]`.
- Crear el usuario de la aplicación desde una terminal con permisos
  administrativos:

  ```sql
  sudo mysql
  CREATE DATABASE IF NOT EXISTS ingeriar_v3
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ingeriar_app'@'localhost'
      IDENTIFIED BY 'cambia_esta_clave';
  CREATE USER IF NOT EXISTS 'ingeriar_app'@'127.0.0.1'
      IDENTIFIED BY 'cambia_esta_clave';
  GRANT ALL PRIVILEGES ON ingeriar_v3.* TO 'ingeriar_app'@'localhost';
  GRANT ALL PRIVILEGES ON ingeriar_v3.* TO 'ingeriar_app'@'127.0.0.1';
  FLUSH PRIVILEGES;
  EXIT;
  ```

- Configurar esas credenciales en el VirtualHost de Apache, sin publicarlas
  dentro de `public/`:

  ```apache
  SetEnv INGERIAR_DB_HOST localhost
  SetEnv INGERIAR_DB_PORT 3306
  SetEnv INGERIAR_DB_NAME ingeriar_v3
  SetEnv INGERIAR_DB_USER ingeriar_app
  SetEnv INGERIAR_DB_PASSWORD tu_clave_de_mysql
  ```

  Después de cambiar el VirtualHost, reiniciar Apache.
- Si aparece `using password: NO`, Apache no está pasando la variable de
  contraseña. Comprueba que tienes activo `mod_env`, que `SetEnv` está dentro
  del VirtualHost correcto y reinicia Apache completamente:

  ```bash
  sudo a2enmod env
  sudo systemctl restart apache2
  ```

## Estructura cliente-servidor
- Configurar Apache con `public/` como `DocumentRoot`; no publicar la carpeta raíz del proyecto.
- `public/` contiene únicamente el cliente y los puntos de entrada HTTP de la API.
- `server/` contiene PHP, configuración, esquema y credenciales, y tiene el acceso web bloqueado.
- `storage/galeria/` y `storage/documentos/` están fuera de `public/`; deben servirse mediante PHP después de comprobar autenticación y permisos.
