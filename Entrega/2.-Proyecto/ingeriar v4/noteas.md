# Ingeriar v3

## 1. Descripción general

Ingeriar es una aplicación web para gestionar la actividad de un grupo scout:

- usuarios y roles;
- educandos y sus relaciones con tutores;
- eventos del calendario;
- asistencias y entregas de documentos;
- facturas;
- configuración visual del grupo;
- indicadores y gráficas.

La aplicación está separada en cliente, servidor, base de datos y almacenamiento
privado. Esta separación evita publicar directamente credenciales o archivos
subidos y permite controlar los permisos en el servidor.

## 2. Estructura del proyecto

```text
ingeriar v3/
├── public/                         Cliente y puntos de entrada web
│   ├── index.html                  Aplicación principal
│   ├── login.html                  Pantalla de acceso
│   ├── login.js                    Envío del inicio de sesión
│   ├── instalador.html             Formulario del instalador
│   ├── codigo.js                   Inicialización y navegación
│   ├── estilo.css                  Estilos comunes de toda la aplicación
│   ├── api/                        Entradas públicas que delegan en server/api
│   ├── nucleo/
│   │   ├── utilidades.js           Peticiones HTTP y funciones comunes
│   │   ├── configuracion.js        Configuración del grupo
│   │   ├── formulario.js           Formularios automáticos
│   │   ├── tabla.js                Tablas, filtros y acciones
│   │   ├── calendario.js           Calendario y asistencias
│   │   ├── dashboard.js            Indicadores y gráficas por rol
│   │   ├── graficas.js             Gráficas SVG sin librerías externas
│   │   ├── exportacion.js          Exportación de tablas y dashboard
│   │   └── documento-preview-worker.js
│   └── servicios/                  Servicios públicos heredados
├── server/
│   ├── api/
│   │   ├── login.php               Inicio de sesión
│   │   ├── logout.php              Cierre de sesión
│   │   ├── superapi.php            API principal de datos y permisos
│   │   ├── archivo.php             Subida y descarga de documentos
│   │   └── instalar.php            Creación de la base de datos
│   ├── auth/sesion.php              Sesión y autenticación
│   ├── data/
│   │   ├── database.php             Conexión PDO
│   │   ├── schema.sql               Esquema MySQL completo
│   │   ├── demo.sql                 Datos de prueba
│   │   ├── modeloDeDatos.txt        Modelo usado por el instalador
│   │   ├── config.php               Configuración del grupo
│   │   └── secciones.php            Cálculo de secciones por edad
│   └── servicios/                  Servicios privados
├── storage/
│   ├── documentos/                  Circulares y entregas
│   ├── facturas/                    Imágenes de facturas
│   └── galeria/                     Imágenes de galería
└── noteas.md                       Documentación y diario del proyecto
```

`public/` debe ser el `DocumentRoot` de Apache. `server/` y `storage/` no deben
ser accesibles como carpetas públicas. Los accesos a archivos se realizan a
través de PHP, después de comprobar autenticación y permisos.

La configuración general se guarda en `server/data/config.php` en formato JSON.
Desde la pantalla de administración se pueden cambiar:

- nombre y URL del logo del grupo;
- logo subido al almacenamiento privado;
- color principal, color secundario y modo oscuro;
- datos de contacto y del coordinador;
- nombres visibles de los roles;
- formato de nombres y educandos sin sección;
- asistencia en eventos pasados;
- tamaño máximo y formatos de archivos;
- categorías de facturas, tipos de evento y secciones.

Los tipos de evento se gestionan separando el identificador interno del nombre
visible. Por ejemplo, `sabado` puede mostrarse como `Sábado` y seguir siendo
el mismo valor para colores, filtros y gráficas. La configuración permite
Los nombres visibles se editan desde los catálogos `tipos_evento`,
`secciones` y `categorias_factura`. Los formatos de entrega son una preferencia
de archivos, mientras que las categorías de factura son un catálogo dinámico
independiente. El estado de una factura no es un catálogo: es un `ENUM` cerrado
con los valores `pendiente`, `pagada` y `rechazada`.
No se deben borrar identificadores internos usados por eventos antiguos: si se
quiere dejar de ofrecer uno nuevo, se puede ocultar en una futura mejora, pero
los registros existentes deben seguir siendo editables.

Los tipos de evento y las secciones son catálogos administrables. Cada uno
conserva un código interno estable y tiene nombre visible, orden y estado
activo. Las secciones también guardan un intervalo de edades para calcular
automáticamente la sección de cada educando. Para bases ya existentes hay que
ejecutar `server/data/migraciones/2025-02-catalogos-eventos-secciones.sql`.
Retirar un elemento lo archiva (`activo = false`) para conservar históricos.

El servidor conserva los valores existentes y valida los booleanos, el tamaño
máximo y las opciones de archivo antes de escribir el archivo. Las listas se
guardan como texto separado por comas para que sean fáciles de editar; su
aplicación sobre los `ENUM` de la base de datos requerirá una migración
posterior si se desea que cambien las opciones reales de esos formularios.

## 3. Tecnologías y motivos

### HTML, CSS y JavaScript sin frameworks

La interfaz usa HTML, CSS y JavaScript estándar. Se eligió esta opción porque:

- el proyecto es educativo y permite ver claramente el funcionamiento;
- no requiere instalar ni actualizar dependencias;
- facilita entender el DOM, los eventos y las peticiones `fetch`;
- la aplicación es suficientemente pequeña para no necesitar un framework.

No se usa React, Vue ni otra librería de interfaz porque añadirían complejidad,
compilación y conceptos que no son necesarios para las pantallas actuales.

### PHP y MySQL

El servidor usa PHP y MySQL:

- PHP encaja con el entorno Apache del proyecto;
- MySQL permite relaciones, claves foráneas y consultas agregadas;
- PDO permite consultas preparadas y evita construir valores directamente en SQL;
- `information_schema` permite descubrir columnas, tipos y relaciones para crear
  formularios reutilizables.

### SVG para gráficas

Las gráficas se dibujan con SVG desde `graficas.js`. Así se evitan dependencias
externas, se mantienen ligeras y se pueden añadir tooltips y etiquetas con el
DOM estándar.

### Web Worker para previsualizaciones

La generación de vistas previas de imágenes se ejecuta en
`documento-preview-worker.js` para no bloquear la interfaz principal. Los PDF
se convierten en el servidor mediante `pdftoppm` para mostrar su primera página.

## 4. Flujo de inicio de la aplicación

1. El usuario abre `public/login.html`.
2. `login.js` envía el correo y la contraseña a `api/login.php`.
3. El servidor consulta el usuario con PDO y verifica la contraseña.
4. Se crea una sesión PHP con el identificador, nombre, apellidos y rol.
5. El navegador redirige a `index.html`.
6. `codigo.js` consulta `usuario_actual`.
7. Se cargan la configuración, los módulos y las entidades permitidas.
8. Se crean los objetos de tablas, formularios, calendario, dashboard y gráficas.
9. Se muestra inicialmente el dashboard.

Si una petición devuelve un error HTTP o un objeto con `error`, las utilidades
lo convierten en un error visible para el código que hizo la petición.

## 5. Flujo de datos

El cliente no accede directamente a MySQL:

```text
Navegador
   ↓ fetch
public/api/*.php
   ↓ require
server/api/*.php
   ↓ PDO
MySQL
```

Para datos normales, `superapi.php` recibe una ruta como `tabla`, `columnas`,
`crear`, `editar` o `borrar`. Comprueba la sesión y el permiso antes de consultar
o modificar la base de datos.

Para archivos, `archivo.php` comprueba el usuario, el evento, el educando y la
ruta física antes de devolver el archivo. Los archivos no se sirven directamente
desde `storage`.

## 6. Roles y permisos

### Administrador

- acceso completo a usuarios, educandos, eventos y facturas;
- gestión de la configuración del grupo;
- acceso al dashboard general;
- exportación de datos;
- consulta de documentación de cualquier educando.

### Scouter

- gestión de eventos, educandos y facturas;
- consulta de asistencias;
- subida de imágenes de facturas;
- dashboard de actividades y gastos;
- consulta de documentación de cualquier educando.

### Tutor

- consulta únicamente de sus educandos;
- consulta del calendario;
- registro de asistencia de sus educandos;
- subida de entregas cuando corresponda;
- consulta de la documentación de sus educandos;
- sin edición ni borrado general de datos.

Los permisos se comprueban siempre en el servidor. Ocultar un botón en el
cliente solo mejora la interfaz, pero no sustituye la comprobación de PHP.

## 7. Base de datos

La base de datos estable se llama `ingeriar`. Las tablas principales son:

- `usuarios`: cuentas, credenciales y roles;
- `educandos`: datos de los menores;
- `usuarios_educandos`: relación entre tutores y educandos;
- `eventos`: actividades del calendario;
- `educandos_asistencias`: asistencia y archivo de entrega;
- `facturas`: gastos, responsable e imagen opcional.

Las claves foráneas mantienen la integridad de las relaciones. La relación entre
usuario y educando se guarda en una tabla intermedia porque un tutor puede tener
varios educandos y un educando puede estar relacionado con más de un usuario.

El esquema principal está en `server/data/schema.sql` y los datos de prueba en
`server/data/demo.sql`. El demo genera 30 usuarios, 100 educandos, 100 relaciones,
40 eventos, 80 facturas y 160 asistencias.

## 8. Formularios automáticos

`formulario.js` solicita las columnas de la tabla y crea controles según el tipo:

- `DATE` crea un selector de fecha;
- `DATETIME` crea fecha y hora;
- números crean campos numéricos;
- `ENUM` crea un `select`;
- booleanos crean `Sí`/`No`;
- relaciones crean selectores con nombres legibles.

Las relaciones se detectan con `information_schema`. También existen relaciones
convencionales de respaldo para bases antiguas. Los identificadores se mantienen
para guardar datos, pero el usuario ve nombres y apellidos.

Las facturas tienen un campo especial de imagen. El archivo se envía junto con
el resto del formulario mediante `FormData`; los campos normales siguen viajando
como JSON dentro de ese formulario.

## 9. Facturas e imágenes

Las facturas contienen `imagen_factura`, una ruta relativa opcional. Al guardar:

1. PHP comprueba que la petición corresponde a una factura.
2. Comprueba tamaño máximo de 10 MB.
3. Comprueba el MIME real con `finfo`.
4. Acepta JPEG, PNG y WebP.
5. Genera un nombre aleatorio para evitar colisiones y nombres peligrosos.
6. Guarda la imagen en `storage/facturas/`.
7. Guarda el nombre generado en la factura.

Para una base instalada antes de esta funcionalidad:

```sql
ALTER TABLE facturas
    ADD COLUMN imagen_factura VARCHAR(255) NULL;
```

## 10. Eventos, circulares y asistencias

El calendario carga eventos desde `superapi.php`, los agrupa por día y permite
crear, editar o borrar según el rol. Cada tipo de evento recibe una clase CSS y
un color diferente.

Los tipos de evento definidos son `reunión de familias`, `sabado`, `festival`,
`excursion` y `otro`. La normalización de clases también admite datos antiguos
como `campamento`, `taller`, `convivencia` y `actividad`.

Cada evento se relaciona con una o varias secciones mediante `eventos_secciones`.
Las secciones disponibles son `colonia`, `manada`, `tropa`, `posta` y `rutas`.
Si no hay filas relacionadas, el evento se considera dirigido a todas. El
formulario ofrece casillas independientes y una opción “Todas las secciones”.
La tabla intermedia permite seleccionar varias secciones sin guardar JSON.

Aunque el campo `seccion` es un `ENUM`, cada fila solo representa una sección.
Un mismo evento puede tener varias filas relacionadas, por ejemplo:

```text
id_evento | seccion
----------|--------
12        | colonia
12        | manada
12        | tropa
```

En este caso, el evento `12` está convocando a colonia, manada y tropa. La
clave primaria compuesta `(id_evento, seccion)` evita repetir una misma sección
en el mismo evento, mientras que permite añadir todas las secciones necesarias.
Se utiliza `ENUM` para limitar los valores a las secciones válidas y evitar
errores de escritura. Esta estructura es preferible a guardar una lista
separada por comas o un JSON porque mantiene los datos normalizados y facilita
las consultas y los filtros de asistencia.

La circular fija se encuentra en:

```text
storage/documentos/biblioteca/circular1.pdf
```

Las entregas se guardan en:

```text
storage/documentos/<ronda>/<seccion>/<educando>/
```

Las secciones se calculan a partir de `naz` al inicio de cada ronda:

- 5-6 años: `colonia`;
- 7-9 años: `manada`;
- 10-12 años: `tropa`;
- 13-15 años: `posta`;
- 16-19 años: `rutas`.

No se guarda la sección en la base de datos porque depende de la edad y cambiaría
al comenzar una nueva ronda. Las filas de educandos muestran un color según la
sección.

La asistencia y las entregas no se pueden registrar después de la fecha de fin
del evento. El visor de documentación muestra tarjetas con previsualización y
permite descargar el archivo original.

## 11. Dashboard, gráficas y exportación

El dashboard usa la ruta `superapi.php?ruta=dashboard`, que devuelve indicadores
y datos ya agrupados para las gráficas. Esto evita cargar todas las tablas cuando
solo se necesitan resúmenes.

También muestra un resumen común con el próximo evento, los sábados del mes,
la próxima acampada y los cumpleaños de educandos de los próximos siete días.
En tutores, el próximo evento y el mini calendario solo incluyen actividades
compatibles con las secciones de sus educandos. Los monitores disponen de un
desglose por sección de las respuestas del próximo sábado. Los tutores ven
además circulares pendientes y asistencias sin confirmar. Los cumpleaños se
calculan exclusivamente desde `educandos`; los usuarios no tienen fecha de
nacimiento para este propósito.

La información depende del rol:

- administrador: usuarios, educandos, eventos, gasto total y usuarios por rol;
- scouter: educandos, eventos próximos, facturas propias y gasto propio;
- tutor: educandos vinculados y estados de asistencia.

`graficas.js` dibuja gráficas de barras, tarta y anillo con SVG. Los tooltips
indican valor y porcentaje.

`exportacion.js` permite exportar los datos visibles a impresión, HTML, JSON o
CSV. Se reutiliza desde tablas y dashboard para no duplicar controles.

## 12. Estilos y vistas

`estilo.css` está organizado por secciones:

- cabecera;
- acceso y asistencias;
- estructura principal;
- menús y navegación;
- contenido y vistas;
- tablas;
- botones;
- formularios y modales;
- calendario;
- dashboard;
- responsive e impresión.

Las vistas usan clases comunes:

- `.vista`: identifica una pantalla;
- `.vista-tabla`, `.vista-dashboard`, `.vista-calendario` y
  `.vista-configuracion`: identifican pantallas concretas;
- `.vista-superficie`: unifica fondo, borde, radio y sombra;
- `.vista-formulario`: identifica formularios reutilizables.

Esta organización permite crear futuras pantallas heredando la superficie y los
controles comunes sin copiar reglas CSS.

## 13. Instalación y configuración

1. Crear la base de datos `ingeriar` y el usuario de aplicación.
2. Configurar las variables de entorno de Apache:

```apache
SetEnv INGERIAR_DB_HOST localhost
SetEnv INGERIAR_DB_PORT 3306
SetEnv INGERIAR_DB_NAME ingeriar
SetEnv INGERIAR_DB_USER ingeriar_app
SetEnv INGERIAR_DB_PASSWORD tu_clave_de_mysql
```

3. Configurar `public/` como `DocumentRoot`.
4. Ejecutar el esquema o usar el instalador con `modeloDeDatos.txt`.
5. Cargar `demo.sql` si se necesitan datos de prueba.
6. Comprobar que existe la carpeta `storage/documentos/biblioteca/` y la
   circular fija.
7. Dar permisos de escritura al servidor web sobre `storage/documentos/` y
   `storage/facturas/`.

No se debe usar `root` desde PHP. En Ubuntu puede fallar por autenticación
`unix_socket`. Si aparece `using password: NO`, Apache no está transmitiendo
`INGERIAR_DB_PASSWORD`; hay que revisar `mod_env`, el VirtualHost y reiniciar
Apache.

## 14. Migraciones para bases antiguas

Añadir las columnas que no existan:

```sql
ALTER TABLE eventos
    ADD COLUMN circular BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS eventos_secciones (
    id_evento INT UNSIGNED NOT NULL,
    seccion ENUM('colonia', 'manada', 'tropa', 'posta', 'rutas') NOT NULL,
    PRIMARY KEY (id_evento, seccion),
    FOREIGN KEY (id_evento) REFERENCES eventos(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE educandos_asistencias
    ADD COLUMN archivo_entrega VARCHAR(255) NULL;

ALTER TABLE facturas
    ADD COLUMN imagen_factura VARCHAR(255) NULL;
```

Si la migración anterior creó `eventos.seccion`, elimínala después de crear la
tabla intermedia:

```sql
ALTER TABLE eventos DROP COLUMN seccion;
```

Si existe la columna antigua, eliminarla:

```sql
ALTER TABLE eventos
    DROP COLUMN circular_archivo;
```

Las sentencias deben ejecutarse solo si las columnas todavía no existen.

## 15. Diario de cambios

### 2026-11-09

- Se amplió la configuración con identidad del grupo, logo subido, colores,
  modo oscuro, información de contacto, nombres de roles, archivos y listas.
- Se eliminó la configuración específica del calendario y se mejoró el contraste
  del modo oscuro.
- Se añadió la selección opcional de sección para los eventos y se filtraron las
  asistencias según la sección calculada de cada educando.
- Se sustituyó la selección única por casillas para convocar una o varias
  secciones, con la opción de convocar a todas.
- Se añadieron colores diferentes para los eventos del calendario según su tipo.
- Se cambió la tabla de facturas para mostrar el nombre del responsable en vez
  de su identificador.
- Se creó un dashboard con indicadores y gráficas específicas para administrador,
  scouter y tutor.
- Se limitó el ancho de una gráfica cuando es la única visible.
- Se agrupó el usuario y el botón de configuración en la cabecera de administrador.
- Se corrigió el selector de tipo de evento al editar un evento.
- Se limpió código no utilizado de las gráficas y se reutilizaron consultas del
  dashboard.
- Se añadió el botón de documentación de educandos para los usuarios autorizados.
- Se creó `storage/facturas/` y se añadió la subida validada de imágenes de facturas.
- Se unificaron las superficies y controles de las vistas mediante las clases
  `.vista` y `.vista-superficie`.
- Se corrigieron los márgenes de modales y del visor de circulares.
- Se reorganizó `estilo.css` con títulos por sección y estilos comunes para
  formularios y selectores.
- Se actualizó esta documentación con la arquitectura, los flujos, los permisos,
  las decisiones técnicas y las migraciones.
