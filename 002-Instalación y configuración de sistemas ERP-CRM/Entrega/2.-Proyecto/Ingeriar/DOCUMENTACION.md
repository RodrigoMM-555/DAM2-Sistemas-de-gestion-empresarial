# Documentación de Ingeriar

## 1. Qué es Ingeriar

Ingeriar es una aplicación web sencilla para consultar y gestionar datos de una
base de datos SQLite. La aplicación permite:

- Mostrar el nombre y el color corporativo de la aplicación.
- Consultar los módulos disponibles.
- Detectar las tablas de la base de datos.
- Ver los registros de una tabla.
- Crear registros.
- Editar registros.
- Eliminar registros.

La aplicación está dividida en tres partes principales:

```text
Navegador
    |
    | JavaScript mediante fetch()
    v
API PHP
    |
    | SQLite3
    v
Base de datos SQLite
```

El navegador muestra la interfaz y recoge los datos del usuario. La API PHP
recibe las peticiones, ejecuta consultas SQL y devuelve respuestas JSON. La
base de datos guarda la información de forma permanente en
`data/ingeriar.db`.

---

## 2. Estructura del proyecto

```text
Ingeriar/
├── index.html
├── codigo.js
├── estilo.css
├── instalador.html
├── api/
│   ├── instalar.php
│   └── superapi.php
├── data/
│   ├── config.php
│   ├── demo.sql
│   ├── ingeriar.db
│   ├── modeloDeDatos.txt
│   └── schema.sql
└── servicios/
    ├── entrada.php
    └── salida.php
```

### `index.html`

Es la página principal. Contiene los elementos vacíos que JavaScript rellena:

- `<h1>`: nombre de la aplicación.
- `#modulos`: menú de módulos.
- `#entidades`: menú de tablas.
- `<section>`: contenido de la tabla o del formulario.

Al final carga `codigo.js`.

### `codigo.js`

Es la parte cliente de la aplicación. Se ejecuta en el navegador y:

1. Carga la configuración visual.
2. Pide los módulos.
3. Pide las entidades o tablas.
4. Carga los registros de la tabla seleccionada.
5. Construye los botones de crear, editar y borrar.
6. Envía los formularios a la API.

### `api/superapi.php`

Es la API principal. Recibe una ruta mediante `$_GET['ruta']` y decide qué
operación realizar:

```text
superapi.php?ruta=modulos
superapi.php?ruta=entidades
superapi.php?ruta=tabla&tabla=usuarios
superapi.php?ruta=columnas&tabla=usuarios
superapi.php?ruta=crear
superapi.php?ruta=editar
superapi.php?ruta=borrar
```

Las operaciones de consulta usan normalmente `GET`. Las operaciones que
modifican datos usan `POST`.

### `api/instalar.php`

Recibe un modelo de datos desde `instalador.html`, lo interpreta línea por
línea y crea tablas SQLite. Cada tabla obtiene automáticamente una columna:

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
```

### `data/ingeriar.db`

Es el archivo físico de SQLite. En la copia actual contiene las tablas:

- `usuarios`
- `educandos`
- `eventos`

Cada una utiliza `id` como clave primaria.

### `data/schema.sql`

Es una descripción SQL del modelo de datos. Sirve como referencia o como
guion para crear una base de datos, pero no se ejecuta automáticamente al
abrir `index.html`.

### `data/config.php`

Aunque tiene extensión `.php`, actualmente devuelve directamente un objeto
JSON:

```json
{
    "nombre": "ingeriar | documentacion",
    "color": "darkred"
}
```

### `servicios/entrada.php` y `servicios/salida.php`

Actualmente están vacíos. No participan en el flujo principal de Ingeriar.

---

## 3. Cómo se inicia la aplicación

Ingeriar necesita un servidor que ejecute PHP. No debe abrirse haciendo doble
clic sobre `index.html` con una dirección `file://`, porque en ese caso el
navegador no puede ejecutar correctamente los archivos PHP.

Desde la carpeta que contiene `Ingeriar`, se puede iniciar un servidor de
desarrollo con:

```bash
php -S localhost:8000
```

Después se abre:

```text
http://localhost:8000/Ingeriar/
```

La relación de rutas es importante:

```text
index.html
    └── codigo.js
          ├── data/config.php
          └── api/superapi.php
                                   └── data/ingeriar.db
```

En `superapi.php`, la conexión se realiza con:

```php
$db = new SQLite3(__DIR__ . '/../data/ingeriar.db');
```

`__DIR__` representa la carpeta `api`, por lo que la ruta siempre apunta a la
base de datos que está dentro de este proyecto, independientemente de la
carpeta desde la que se arranque PHP.

---

## 4. Arranque de la interfaz

Cuando se carga `index.html`, `codigo.js` ejecuta varias peticiones.

### 4.1 Cargar configuración

```text
codigo.js
    └── GET data/config.php
```

La respuesta se convierte en JSON. Después:

- El valor `nombre` se coloca dentro del `<h1>`.
- El valor `color` se asigna a la variable CSS
  `--color_corporativo`.

### 4.2 Cargar módulos

```text
codigo.js
    └── GET api/superapi.php?ruta=modulos
```

La API responde:

```json
["ventas", "rrhh", "facturacion", "compras"]
```

`codigo.js` crea un enlace por cada módulo y lo añade a `#modulos`. En el
estado actual esos enlaces solo cambian visualmente a la clase `activo`; no
cargan datos diferentes.

### 4.3 Cargar entidades

```text
codigo.js
    └── GET api/superapi.php?ruta=entidades
```

La API consulta `sqlite_master`, que es una tabla interna de SQLite donde se
guarda información sobre las tablas. Ignora las tablas cuyo nombre comienza
por `sqlite_` y devuelve los nombres restantes.

Ejemplo:

```json
["educandos", "usuarios", "eventos"]
```

Por cada nombre recibido, `codigo.js` crea un enlace en `#entidades`.
También selecciona automáticamente la primera entidad y llama a
`cargarTabla()`.

---

## 5. Consulta y visualización de una tabla

Cuando se selecciona una entidad, JavaScript ejecuta:

```text
GET api/superapi.php?ruta=tabla&tabla=usuarios
```

El nombre de la tabla se codifica con `encodeURIComponent()` antes de
enviarse.

La API realiza:

```sql
SELECT * FROM "usuarios"
```

Y devuelve un array JSON. Por ejemplo:

```json
[
  {
    "id": 1,
    "nombre": "Ana",
    "apellidos": "García",
    "email": "ana@example.com",
    "rol": "tutor"
  }
]
```

Después `cargarTabla()`:

1. Vacía `<section>`.
2. Crea el título de la tabla.
3. Crea el botón `+ Nuevo`.
4. Usa las claves del primer registro para crear las cabeceras.
5. Crea una fila por registro.
6. Añade los botones `Editar` y `Borrar`.

El campo `id` no lo escribe el usuario, porque es la clave primaria generada
por SQLite. Sin embargo, sí se utiliza internamente para identificar el
registro que se quiere editar o borrar.

---

## 6. Cómo se obtienen las columnas

Antes de construir un formulario, `codigo.js` llama a:

```text
GET api/superapi.php?ruta=columnas&tabla=usuarios
```

La función PHP `obtenerColumnas()` ejecuta:

```sql
PRAGMA table_info("usuarios")
```

SQLite devuelve información sobre todas las columnas. La función recorre esa
información y excluye la columna cuya propiedad `pk` vale `1`, es decir, la
clave primaria `id`.

Respuesta de ejemplo:

```json
["nombre", "apellidos", "email", "rol"]
```

De esta manera, el formulario solo muestra campos editables y no muestra el
identificador automático.

---

## 7. Flujo de creación

El flujo completo para crear un registro es:

```text
Usuario pulsa "+ Nuevo"
    ↓
mostrarFormulario(null)
    ↓
GET ruta=columnas
    ↓
Se crean los inputs
    ↓
Usuario rellena el formulario
    ↓
evento submit
    ↓
FormData con tabla y datos JSON
    ↓
POST ruta=crear
    ↓
INSERT en SQLite
    ↓
Respuesta {"ok": true}
    ↓
cargarTabla(tablaActual)
```

### En el navegador

Cuando `mostrarFormulario()` recibe `null`, entiende que se quiere crear un
registro nuevo. Al enviar el formulario, recoge cada input:

```javascript
datos[columna] = formulario.elements[columna].value;
```

Después construye un objeto `FormData`:

```text
tabla = usuarios
datos = {"nombre":"...","apellidos":"...","email":"...","rol":"..."}
```

La petición es:

```text
POST api/superapi.php?ruta=crear
```

### En la API

`superapi.php` lee:

```php
$tabla = $_POST['tabla'] ?? '';
$datos = json_decode($_POST['datos'] ?? '{}', true);
```

Luego obtiene las columnas válidas con `obtenerColumnas()`. Solo añade al
`INSERT` los campos que realmente existen y que no son la clave primaria.

La consulta generada conceptualmente es:

```sql
INSERT INTO "usuarios" ("nombre","apellidos","email","rol")
VALUES (?,?,?,?)
```

Los signos `?` son marcadores para enlazar valores. Finalmente responde:

```json
{"ok": true}
```

El `id` lo genera SQLite automáticamente.

---

## 8. Flujo de edición

El flujo completo para editar es:

```text
Usuario pulsa "Editar"
    ↓
mostrarFormulario(registro)
    ↓
GET ruta=columnas
    ↓
Se crean los inputs con los valores actuales
    ↓
Usuario cambia los datos
    ↓
evento submit
    ↓
FormData con tabla, id y datos JSON
    ↓
POST ruta=editar
    ↓
UPDATE ... WHERE id = ?
    ↓
Respuesta {"ok": true}
    ↓
cargarTabla(tablaActual)
```

### Identificación del registro

El registro completo recibido por JavaScript contiene su `id`:

```javascript
registro.id
```

Al editar, el formulario envía:

```text
tabla = usuarios
id = 1
datos = {"nombre":"Nuevo nombre", ...}
```

### Consulta SQL

La API genera una consulta equivalente a:

```sql
UPDATE "usuarios"
SET "nombre" = ?, "apellidos" = ?, "email" = ?, "rol" = ?
WHERE id = ?
```

Primero se enlazan los nuevos valores y después se enlaza el `id` del
registro que se quiere modificar. El `WHERE id = ?` es lo que evita cambiar
todos los registros de la tabla.

---

## 9. Flujo de eliminación

El flujo completo para borrar es:

```text
Usuario pulsa "Borrar"
    ↓
confirmación del navegador
    ↓
FormData con tabla e id
    ↓
POST ruta=borrar
    ↓
DELETE ... WHERE id = ?
    ↓
Respuesta {"ok": true}
    ↓
cargarTabla(tablaActual)
```

Cuando se pulsa el botón, JavaScript obtiene:

```javascript
borrarRegistro(registro.id);
```

Antes de hacer la petición muestra:

```text
¿Seguro que quieres borrar este registro?
```

Si el usuario cancela, no se realiza ninguna petición.

Si confirma, se envía:

```text
tabla = usuarios
id = 1
```

La API ejecuta conceptualmente:

```sql
DELETE FROM "usuarios"
WHERE id = ?
```

Después recarga la tabla para que el registro desaparezca visualmente.

---

## 10. Rutas de `superapi.php`

### `modulos`

**Petición:**

```text
GET superapi.php?ruta=modulos
```

**Origen de los datos:** array escrito directamente en PHP.

**Respuesta:**

```json
["ventas","rrhh","facturacion","compras"]
```

No consulta SQLite.

### `entidades`

**Petición:**

```text
GET superapi.php?ruta=entidades
```

**Origen de los datos:** `sqlite_master`.

**Respuesta:** array con nombres de tablas.

### `tabla`

**Petición:**

```text
GET superapi.php?ruta=tabla&tabla=usuarios
```

**Entrada:** nombre de tabla mediante `$_GET['tabla']`.

**Respuesta:** array de registros.

Si falta el nombre de tabla:

```json
{"error":"No se ha indicado ninguna tabla"}
```

### `columnas`

**Petición:**

```text
GET superapi.php?ruta=columnas&tabla=usuarios
```

**Entrada:** nombre de tabla mediante `$_GET['tabla']`.

**Respuesta:** array de columnas editables, excluyendo `id`.

### `crear`

**Petición:** `POST`.

**Campos recibidos:**

- `tabla`
- `datos`, que contiene un objeto JSON serializado

**Respuesta correcta:**

```json
{"ok":true}
```

### `editar`

**Petición:** `POST`.

**Campos recibidos:**

- `tabla`
- `id`
- `datos`, objeto JSON serializado

**Consulta:** `UPDATE ... WHERE id = ?`.

**Respuesta correcta:**

```json
{"ok":true}
```

### `borrar`

**Petición:** `POST`.

**Campos recibidos:**

- `tabla`
- `id`

**Consulta:** `DELETE ... WHERE id = ?`.

**Respuesta correcta:**

```json
{"ok":true}
```

### Ruta desconocida

Si el valor de `ruta` no coincide con ningún caso:

```json
{"error":"Ruta no encontrada"}
```

---

## 11. Funciones principales de PHP

### `responder($datos)`

Está definida en `superapi.php`.

1. Indica que la respuesta es JSON mediante la cabecera HTTP.
2. Convierte el valor PHP a JSON con `json_encode()`.
3. Lo imprime.
4. Termina la ejecución con `exit`.

Se utiliza para centralizar todas las respuestas de la API.

### `obtenerColumnas($db, $tabla)`

Está definida en `superapi.php`.

1. Ejecuta `PRAGMA table_info()`.
2. Recorre las columnas.
3. Descarta la clave primaria.
4. Devuelve los nombres de las columnas editables.

### `cargarTabla(tabla)`

Está definida en `codigo.js`.

1. Solicita los registros a la API.
2. Borra el contenido anterior de `<section>`.
3. Construye título, cabeceras, filas y botones.
4. Asocia cada botón al registro correspondiente.

### `obtenerColumnas()`

Está definida en `codigo.js`. Solicita las columnas de la entidad guardada
en `tablaActual` y devuelve la promesa de la respuesta JSON.

### `mostrarFormulario(registro)`

Está definida en `codigo.js`.

- Si `registro` es `null`, prepara un formulario de creación.
- Si `registro` contiene un objeto, prepara un formulario de edición.
- Solicita las columnas.
- Crea los campos.
- Rellena los valores existentes cuando se está editando.
- Decide entre las rutas `crear` y `editar`.

### `borrarRegistro(id)`

Está definida en `codigo.js`.

1. Pide confirmación.
2. Construye un `FormData`.
3. Envía `tablaActual` e `id`.
4. Llama a la ruta `borrar`.
5. Recarga la tabla si la respuesta contiene `ok`.

---

## 12. Instalación de la base de datos

La instalación visual comienza en `instalador.html`. El formulario contiene
un `textarea` llamado `modelo` y envía sus datos mediante `POST` a:

```text
api/instalar.php
```

El modelo tiene este formato:

```text
educandos
-nombre
-apellidos

usuarios
-nombre
-apellidos
-email
-rol
```

El instalador interpreta:

- Una línea sin `-` como nombre de tabla.
- Una línea que empieza por `-` como nombre de columna.
- Una línea vacía como separador ignorado.

Para cada tabla genera una consulta similar a:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellidos TEXT,
    email TEXT,
    rol TEXT
);
```

La base de datos se crea o se abre con SQLite3. Si ya existe una tabla,
`CREATE TABLE IF NOT EXISTS` evita crearla de nuevo, pero tampoco modifica su
estructura existente.

Esto es importante: cambiar el modelo o `schema.sql` no cambia
automáticamente una base de datos que ya existe.

---

## 13. Diferencia entre el modelo, `schema.sql` y `ingeriar.db`

Hay tres conceptos distintos:

### Modelo de datos

Es el texto que el instalador interpreta. Está en
`data/modeloDeDatos.txt` y también se puede escribir en el formulario.

### `schema.sql`

Es un guion SQL escrito manualmente. Describe tablas, tipos, restricciones y
relaciones. No se ejecuta automáticamente por la interfaz.

### `ingeriar.db`

Es la base de datos real que está usando la aplicación en ese momento. La
aplicación consulta y modifica este archivo.

La regla práctica es:

```text
La aplicación funciona con ingeriar.db,
no directamente con schema.sql ni con modeloDeDatos.txt.
```

Si estos tres elementos no tienen la misma estructura, pueden aparecer
errores. Actualmente la base y el instalador utilizan `id` como clave
primaria, y la API y JavaScript también utilizan `id`.

---

## 14. Qué devuelve la aplicación ante un error

La API comprueba explícitamente algunos datos:

- Si falta `tabla` en `tabla` o `columnas`, devuelve un objeto con `error`.
- Si faltan `tabla`, `id` o `datos` en las operaciones correspondientes,
  devuelve `{"error":"Datos incorrectos"}`.
- Si la ruta no existe, devuelve `{"error":"Ruta no encontrada"}`.

En el navegador, las operaciones de guardar y borrar comprueban la propiedad
`resultado.ok`. Si es verdadera, recargan la tabla. Si no, muestran
`resultado.error` o un mensaje genérico.

---

## 15. Flujo completo resumido

### Al abrir la aplicación

```text
Navegador abre index.html
    ↓
index.html carga codigo.js
    ↓
codigo.js pide config.php
    ↓
codigo.js pide modulos a superapi.php
    ↓
codigo.js pide entidades a superapi.php
    ↓
codigo.js selecciona la primera tabla
    ↓
codigo.js pide sus registros
    ↓
Se dibuja la tabla HTML
```

### Al crear

```text
Nuevo → formulario → FormData → POST crear → INSERT → JSON ok → recarga
```

### Al editar

```text
Editar → formulario con id → FormData → POST editar
→ UPDATE WHERE id → JSON ok → recarga
```

### Al borrar

```text
Borrar → confirmación → FormData con id → POST borrar
→ DELETE WHERE id → JSON ok → recarga
```

---

## 16. Puntos importantes para entender y mantener el programa

1. **El navegador no accede directamente a SQLite.** Siempre pasa por
   `superapi.php`.
2. **`id` identifica cada registro.** Se genera automáticamente y se utiliza
   en `UPDATE` y `DELETE`.
3. **`tablaActual` es el estado principal de JavaScript.** Indica sobre qué
   tabla se ejecutan los formularios y las operaciones.
4. **`FormData` transporta los datos POST.** El campo `datos` no es un array
   PHP directamente: es texto JSON que PHP debe decodificar.
5. **Las respuestas de la API son JSON.** JavaScript siempre usa
   `respuesta.json()`.
6. **Después de cambiar datos se recarga la tabla.** La interfaz no modifica
   manualmente la fila; vuelve a consultar SQLite.
7. **El instalador y la API son independientes.** El instalador crea tablas;
   `superapi.php` las consulta y modifica.
8. **Los módulos son actualmente visuales.** Se muestran, pero no filtran ni
   cambian las entidades.
9. **La tabla se incorpora dinámicamente.** No hay una tabla HTML fija en
   `index.html`.
10. **La base de datos real es `data/ingeriar.db`.** Es el archivo que hay que
    revisar cuando los datos no coinciden con el código.

---

## 17. Ejemplo completo de una edición

Supongamos que existe este registro:

```json
{
  "id": 3,
  "nombre": "Luis",
  "apellidos": "Pérez",
  "email": "luis@example.com",
  "rol": "scouter"
}
```

El usuario pulsa `Editar`. JavaScript conserva el objeto completo en la
función `mostrarFormulario(registro)`. Después de cambiar el nombre, envía:

```text
tabla=usuarios
id=3
datos={"nombre":"Luis García","apellidos":"Pérez","email":"luis@example.com","rol":"scouter"}
```

PHP recibe esos tres campos, construye:

```sql
UPDATE "usuarios"
SET "nombre" = ?, "apellidos" = ?, "email" = ?, "rol" = ?
WHERE id = ?
```

Los valores se enlazan en este orden:

```text
1. Luis García
2. Pérez
3. luis@example.com
4. scouter
5. 3
```

SQLite modifica únicamente el registro cuyo `id` es `3`. PHP devuelve
`{"ok":true}` y JavaScript vuelve a pedir la tabla para mostrar el valor
actualizado.

