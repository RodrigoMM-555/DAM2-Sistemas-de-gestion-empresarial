## General
- Unificar la generación de cabeceras

## MySQL
- Ejecutar `server/data/schema.sql` en MySQL para crear la base de datos `ingeriar`.
- La aplicación usa PDO y acepta `INGERIAR_DB_HOST`, `INGERIAR_DB_PORT`,
  `INGERIAR_DB_NAME`, `INGERIAR_DB_USER` e `INGERIAR_DB_PASSWORD`.
- `server/data/demo.sql` contiene datos de prueba compatibles con el esquema.
- El demo genera 30 usuarios, 100 educandos, 100 relaciones, 40 eventos,
  80 facturas y 160 asistencias. Las contraseñas de demo son `demo-1` hasta
  `demo-30`.
- El acceso se realiza desde `public/login.html`. Los tutores solo pueden
  consultar el calendario y registrar la asistencia de sus educandos; los
  scouters gestionan eventos, asistencias, educandos y facturas; los
  administradores tienen acceso completo.
- La tabla `educandos_asistencias` usa `id_educando`, no `id_usuario`, para
  poder validar que un tutor solo modifica la asistencia de sus hijos.
- Los formularios detectan automáticamente las foreign keys del esquema
  MySQL. Cada relación se muestra como un selector reutilizable, usando
  `nombre` y `apellidos` como texto visible en lugar del identificador. Esto
  también permite administrar relaciones mediante tablas intermedias, como
  `usuarios_educandos`, que ofrece un selector de usuario y otro de educando.
- El formulario de usuarios incluye un selector múltiple de educandos. Al
  guardar, la API sincroniza automáticamente la tabla intermedia
  `usuarios_educandos`; el formulario de eventos usa un selector simple para
  `id_responsable`.
- `responsable_id` de facturas y `id_responsable` de eventos usan igualmente
  un selector de usuarios. La API conserva una detección convencional como
  respaldo para bases antiguas donde la foreign key no esté registrada en
  `information_schema`.
- En facturas solo se muestran y aceptan usuarios con rol `scouter`, que es el
  rol de monitor utilizado por esta aplicación.
- Los tutores solo pueden consultar sus educandos. Pueden abrir el histórico
  de entregas de circulares de cada educando, pero no editar ni borrar datos.
  La asistencia y las entregas no se pueden registrar para eventos que ya han
  terminado. El panel lateral del calendario muestra todos los eventos del
  mes visible.
- Los educandos se ordenan siempre de menor a mayor edad, comenzando por
  colonia y terminando en rutas, dejando al final los que no tienen fecha. El
  visor de circulares muestra tarjetas con una previsualización asíncrona:
  las imágenes se generan en un Web Worker y los PDF se convierten en una
  imagen estática de su primera página mediante `pdftoppm`. El nombre de la
  tarjeta es el único enlace y descarga el archivo original.
- Para una base ya instalada, añadir las columnas de circulares y entregas:

  ```sql
  ALTER TABLE eventos
      ADD COLUMN circular BOOLEAN NOT NULL DEFAULT FALSE;

  ALTER TABLE educandos_asistencias
      ADD COLUMN archivo_entrega VARCHAR(255) NULL;
  ```

- Las circulares se guardan en `storage/documentos/biblioteca/`. Las entregas
  se guardan automáticamente en
  `storage/documentos/<ronda>/<seccion>/<educando>/`, por ejemplo
  `storage/documentos/26-27/tropa/15-ana-garcia/`.
- Las secciones se calculan en el servidor a partir de `naz` al inicio de cada
  ronda (1 de septiembre): 5-6 años, `colonia`; 7-9, `manada`; 10-12,
  `tropa`; 13-15, `posta`; 16-19, `rutas`. No se guarda una sección
  duplicada en la base de datos, así el cambio de ronda no deja datos
  obsoletos.
- Las filas de educandos muestran un color según su sección: colonia naranja,
  manada amarillo, tropa azul, posta rojo y rutas verde.
- La aplicación usa siempre la circular fija `biblioteca/circular1.pdf`. Debe
  existir en `storage/documentos/biblioteca/`.
- Los campos booleanos se muestran como selectores `Sí`/`No` y tienen `No`
  como valor predeterminado.
- En una base ya existente, elimina la columna antigua con:
  `ALTER TABLE eventos DROP COLUMN circular_archivo;`.
- El instalador crea las tablas sin una transacción global porque MySQL hace
  `COMMIT` implícito al ejecutar sentencias DDL como `CREATE TABLE`.
- No se debe usar `root` desde PHP. En Ubuntu, `root` suele autenticarse con
  `unix_socket`, por lo que produce el error `SQLSTATE[HY000] [1698]`.
- Crear el usuario de la aplicación desde una terminal con permisos
  administrativos:

  ```sql
  sudo mysql
  CREATE DATABASE IF NOT EXISTS ingeriar
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ingeriar_app'@'localhost'
      IDENTIFIED BY 'cambia_esta_clave';
  CREATE USER IF NOT EXISTS 'ingeriar_app'@'127.0.0.1'
      IDENTIFIED BY 'cambia_esta_clave';
  GRANT ALL PRIVILEGES ON ingeriar.* TO 'ingeriar_app'@'localhost';
  GRANT ALL PRIVILEGES ON ingeriar.* TO 'ingeriar_app'@'127.0.0.1';
  FLUSH PRIVILEGES;
  EXIT;
  ```

- Configurar esas credenciales en el VirtualHost de Apache, sin publicarlas
  dentro de `public/`:

  ```apache
  SetEnv INGERIAR_DB_HOST localhost
  SetEnv INGERIAR_DB_PORT 3306
  SetEnv INGERIAR_DB_NAME ingeriar
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
