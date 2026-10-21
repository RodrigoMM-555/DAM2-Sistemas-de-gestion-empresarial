# Documentación de Ingeriar

## 1. Objetivo de la aplicación

Ingeriar es una aplicación web para consultar y gestionar información
almacenada en una base de datos SQLite. Permite:

- Mostrar la identidad visual de la aplicación.
- Consultar los módulos disponibles.
- Detectar automáticamente las tablas de la base de datos.
- Consultar los registros de una tabla.
- Filtrar y ordenar los registros en el navegador.
- Crear registros.
- Editar registros.
- Eliminar registros.
- Generar controles de formulario según la estructura de cada tabla.
- Detectar valores `ENUM`, valores por defecto y relaciones entre tablas.

La versión que se documenta aquí es:

```text
Entrega/2.-Proyecto/Ingeriar-modular/
```

El proyecto original se conserva en:

```text
Entrega/2.-Proyecto/Ingeriar/
```

Y el respaldo creado antes de la reorganización se conserva en:

```text
Entrega/2.-Proyecto/Ingeriar-respaldo/
```

El respaldo permite comparar la versión anterior con la modular sin perder el
estado original.

---

## 2. Idea general de la aplicación

La aplicación tiene tres capas:

```text
Navegador
    |
    | JavaScript y fetch()
    v
API PHP
    |
    | SQLite3 y SQL
    v
Base de datos SQLite
```

Cada capa tiene una responsabilidad diferente:

### Navegador

El navegador ejecuta los archivos JavaScript. Se encarga de:

- Escuchar los clics del usuario.
- Crear y modificar elementos HTML.
- Mostrar formularios y tablas.
- Enviar peticiones HTTP mediante `fetch()`.
- Recibir respuestas JSON.
- Actualizar la pantalla sin recargar toda la página.

### API PHP

La API recibe peticiones en `api/superapi.php`. Se encarga de:

- Abrir la base de datos.
- Leer la ruta solicitada.
- Consultar la estructura de SQLite.
- Ejecutar `SELECT`, `INSERT`, `UPDATE` y `DELETE`.
- Leer o guardar la configuración.
- Devolver respuestas JSON.

### SQLite

SQLite guarda los datos en:

```text
data/ingeriar.db
```

La base de datos contiene las tablas y los registros permanentes de la
aplicación.

---

## 3. Evolución del código

### 3.1. Primera versión: todo en un archivo

En la versión inicial, representada por `018-darkorange`, el archivo
`codigo.js` reunía todas las responsabilidades:

```text
codigo.js
├── configuración
├── menú de módulos
├── menú de entidades
├── carga de tablas
├── renderizado HTML
├── formularios
├── creación
├── edición
├── borrado
└── consultas fetch()
```

El flujo era sencillo de localizar, pero el archivo crecía cada vez que se
añadía una funcionalidad. La misma función podía conocer a la vez:

- El nombre de la ruta HTTP.
- El formato de los datos recibidos.
- La estructura HTML.
- Los botones de la interfaz.
- La operación CRUD.

Esto produce un archivo difícil de leer y con muchas dependencias implícitas.

### 3.2. Ingeriar original

En el proyecto original de Ingeriar se incorporaron más capacidades:

- Filtros de tabla.
- Ordenación por columnas.
- Configuración editable.
- Campos de distintos tipos.
- Valores por defecto.
- Campos `ENUM`.
- Relaciones entre entidades.
- Formularios de creación y edición.

Todas estas capacidades se fueron añadiendo a `codigo.js`, que llegó a tener
aproximadamente 850 líneas.

El problema no era que cada función no funcionara. El problema era la
concentración de demasiadas responsabilidades en el mismo archivo:

```text
codigo.js
├── peticiones HTTP
├── estado global
├── configuración
├── navegación
├── tabla
├── filtros
├── ordenación
├── formulario
├── relaciones
└── CRUD
```

### 3.3. Primer nivel de separación

En `019-darkorange` se separaron dos componentes:

```text
019-darkorange/
├── codigo.js
└── nucleo/
    ├── formulario.js
    └── tabla.js
```

El archivo principal dejó de generar directamente todos los controles. En su
lugar, creó componentes reutilizables:

```javascript
new DarkorangeFormulario(...).render();
new DarkorangeTabla(...).render();
```

### 3.4. Versión modular actual

La versión actual aplica el mismo patrón a Ingeriar:

```text
Ingeriar-modular/
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
├── nucleo/
│   ├── utilidades.js
│   ├── configuracion.js
│   ├── tabla.js
│   └── formulario.js
└── servicios/
    ├── entrada.php
    └── salida.php
```

La lógica se separa por responsabilidad:

```text
utilidades.js
    funciones comunes y comunicación HTTP

configuracion.js
    nombre, color y pantalla de configuración

tabla.js
    registros, filtros, ordenación y borrado

formulario.js
    creación, edición, tipos, ENUM y relaciones

codigo.js
    creación de objetos y coordinación general
```

---

## 4. Por qué se utilizan clases

Una clase reúne datos y operaciones que pertenecen al mismo objeto.

Por ejemplo, un formulario necesita conservar:

```text
contenedor HTML
tabla actual
columnas
referencia a la API
formulario HTML generado
```

Y también necesita métodos:

```text
mostrar()
obtenerColumnas()
crearControl()
guardar()
```

Una clase reúne ambas cosas:

```javascript
class IngeriarFormulario {
    constructor(...) {
        this.contenedor = ...;
        this.tabla = ...;
    }

    mostrar() {
        ...
    }
}
```

Después se crea una instancia:

```javascript
const formulario = new IngeriarFormulario({
    utilidades,
    alGuardar: ...
});
```

### Ventajas frente a funciones globales

Con funciones y variables globales se podría tener:

```javascript
let tablaActual;
let columnasActuales;
let formularioActual;

function mostrarFormulario() {}
function guardarFormulario() {}
```

Todas las funciones podrían modificar accidentalmente el mismo estado.

Con una clase, el estado pertenece a una instancia:

```javascript
this.tabla
this.formulario
this.contenedor
```

Además, la misma clase podría utilizarse para crear varios objetos
independientes:

```javascript
const formularioClientes = new IngeriarFormulario(...);
const formularioEventos = new IngeriarFormulario(...);
```

La aplicación actual solo necesita una instancia principal de cada componente,
pero la clase deja clara la responsabilidad y permite reutilizarla.

---

## 5. Carga de archivos y dependencias

`index.html` carga los scripts en este orden:

```html
<script src="nucleo/utilidades.js"></script>
<script src="nucleo/configuracion.js"></script>
<script src="nucleo/tabla.js"></script>
<script src="nucleo/formulario.js"></script>
<script src="codigo.js"></script>
```

El orden es importante porque estos scripts no utilizan módulos ES con
`import` y `export`; se cargan como scripts clásicos en el ámbito global de la
página.

La dependencia resultante es:

```text
utilidades.js
    |
    ├── configuracion.js
    ├── tabla.js
    └── formulario.js
            |
            └── codigo.js crea y conecta las instancias
```

Primero se define la clase `IngeriarUtilidades` y se crea `utilidades`.
Después se definen las otras clases. Finalmente `codigo.js` puede utilizarlas.

Si `codigo.js` se cargase antes que `formulario.js`, esta línea fallaría:

```javascript
new IngeriarFormulario(...)
```

porque la clase todavía no existiría.

---

## 6. `index.html`

El archivo [index.html](./2.-Proyecto/Ingeriar-modular/index.html) contiene
la estructura base de la interfaz.

### Elementos principales

```html
<h1 id="nombre">nombre_grupo</h1>
```

Muestra el nombre leído desde `data/config.php`.

```html
<nav id="modulos"></nav>
```

Contiene los enlaces de los módulos devueltos por la API.

```html
<nav id="entidades"></nav>
```

Contiene los nombres de las tablas de SQLite.

```html
<section></section>
```

Es la zona dinámica. Se utiliza para mostrar:

- Una tabla.
- Un formulario.
- La pantalla de configuración.

### Plantillas HTML

El documento contiene cinco plantillas:

```html
<template id="plantilla-input">
<template id="plantilla-number">
<template id="plantilla-date">
<template id="plantilla-datetime">
<template id="plantilla-select">
```

Una plantilla no se muestra por sí sola. Es un molde que JavaScript clona
cuando necesita crear un campo:

```javascript
plantilla.content.cloneNode(true)
```

El resultado es un fragmento nuevo que puede rellenarse con el nombre,
etiqueta, valor y opciones del campo.

---

## 7. `codigo.js`: coordinador de la aplicación

El archivo [codigo.js](./2.-Proyecto/Ingeriar-modular/codigo.js) es
intencionadamente pequeño. No contiene todos los detalles de renderizado.
Coordina las instancias y el arranque.

### Estado `tablaActual`

```javascript
let tablaActual = "";
```

Guarda el nombre de la entidad seleccionada. Se utiliza para saber qué tabla
se debe cargar o qué tabla se debe modificar.

### Creación de instancias

```javascript
const formulario = new IngeriarFormulario({
    utilidades,
    alGuardar: function () {
        return tabla.cargar(tablaActual);
    }
});

const tabla = new IngeriarTabla({
    utilidades,
    formulario
});

const configuracion = new IngeriarConfiguracion({utilidades});
```

Estas líneas conectan los componentes:

```text
codigo.js
├── utilidades
├── configuracion
├── tabla
└── formulario
```

`tabla` recibe `formulario` porque sus botones Nuevo y Editar deben abrirlo.
`formulario` recibe `alGuardar` para pedir a la tabla que se actualice después
de guardar.

### `cargarModulos()`

Hace la petición:

```text
GET api/superapi.php?ruta=modulos
```

Después:

1. Selecciona `#modulos`.
2. Recorre el array recibido.
3. Crea un enlace `<a>` por módulo.
4. Lo añade al menú.
5. Marca el enlace como `activo` cuando se pulsa.

Actualmente los módulos se muestran visualmente, pero no cambian el contenido
de la aplicación.

### `cargarEntidades()`

Hace la petición:

```text
GET api/superapi.php?ruta=entidades
```

Después:

1. Recorre los nombres de tabla recibidos.
2. Crea un enlace para cada entidad.
3. Guarda el nombre en `tablaActual`.
4. Marca el enlace pulsado.
5. Llama a `tabla.cargar(tablaActual)`.

También selecciona y carga automáticamente la primera entidad.

### `iniciarAplicacion()`

```javascript
function iniciarAplicacion() {
    configuracion.cargar();
    cargarModulos();
    cargarEntidades();
    configuracion.crearBoton();
}
```

Es el punto de entrada de la aplicación. Se ejecuta cuando el navegador ya ha
cargado todos los scripts.

---

## 8. `nucleo/utilidades.js`

El archivo [utilidades.js](./2.-Proyecto/Ingeriar-modular/nucleo/utilidades.js)
define `IngeriarUtilidades`.

```javascript
class IngeriarUtilidades {
    ...
}

const utilidades = new IngeriarUtilidades();
```

La instancia se comparte con las demás clases.

### `capitalizar(texto)`

Convierte nombres técnicos en nombres más legibles:

```javascript
utilidades.capitalizar("fecha_nacimiento")
```

Resultado:

```text
Fecha Nacimiento
```

Realiza tres transformaciones:

1. Convierte el valor a texto.
2. Sustituye guiones bajos por espacios.
3. Pasa el texto a minúsculas y capitaliza las palabras.

### `limiteTexto(tipo)`

Detecta límites definidos en tipos como:

```text
VARCHAR(100)
CHAR(9)
```

Devuelve el número:

```javascript
utilidades.limiteTexto("VARCHAR(100)") // 100
```

El formulario utiliza ese resultado para establecer `maxLength`.

### `obtenerJson(url)`

Realiza una petición `GET`:

```javascript
fetch(url)
```

Después:

1. Comprueba `respuesta.ok`.
2. Convierte el cuerpo con `respuesta.json()`.
3. Devuelve una promesa con el objeto o array JavaScript.

Ejemplo:

```javascript
utilidades.obtenerJson(
    "api/superapi.php?ruta=entidades"
).then(function (entidades) {
    ...
});
```

### `enviarFormulario(url, datos)`

Realiza una petición `POST` cuyo cuerpo es un objeto `FormData`.

```javascript
fetch(url, {
    method: "POST",
    body: datos
})
```

Se utiliza para crear, editar y borrar porque la API de Ingeriar recibe esos
datos en `$_POST`.

### `enviarJson(url, datos)`

Realiza una petición `POST` enviando JSON:

```javascript
fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(datos)
})
```

Se utiliza para guardar la configuración.

### Qué es `fetch()`

`fetch()` es una función del navegador para realizar peticiones HTTP. Devuelve
una `Promise`, porque la respuesta llega de forma asíncrona.

Una petición tiene dos momentos:

```javascript
fetch(url)
    .then(function (respuesta) {
        return respuesta.json();
    })
    .then(function (datos) {
        // usar datos
    });
```

El primer `.then()` recibe la respuesta HTTP. El segundo recibe el JSON ya
convertido en un objeto o array.

---

## 9. `nucleo/configuracion.js`

El archivo [configuracion.js](./2.-Proyecto/Ingeriar-modular/nucleo/configuracion.js)
define la clase `IngeriarConfiguracion`.

```javascript
class IngeriarConfiguracion {
    constructor({utilidades, nombre = "#nombre", cabecera = "header"}) {
        ...
    }
}
```

### Constructor

Guarda las dependencias y selectores:

```javascript
this.utilidades
this.nombre
this.cabecera
```

La clase no crea su propia instancia de utilidades; la recibe desde fuera.
Esto permite que todas las partes utilicen el mismo objeto.

### `cargar()`

Consulta:

```text
GET api/superapi.php?ruta=configuracion
```

Después:

- Coloca `datos.nombre` en `#nombre`.
- Modifica el título del documento.
- Llama a `aplicarColor(datos.color)`.

### `aplicarColor(color)`

Modifica una variable CSS:

```javascript
document.documentElement.style.setProperty(
    "--color_corporativo",
    color
);
```

El CSS utiliza esa variable para aplicar el color a la cabecera, menús y
botones.

### `crearBoton()`

Crea el botón de configuración:

```text
⚙
```

Cuando se pulsa, llama al método `mostrar()`.

### `mostrar()`

Vuelve a pedir la configuración y construye un formulario dinámico:

1. Vacía `<section>`.
2. Crea el título `Configuración`.
3. Recorre las propiedades recibidas.
4. Crea un `label` y un `input` para cada propiedad.
5. Usa un selector de color para la propiedad `color`.
6. Añade el botón Guardar.
7. Registra el evento `submit`.

### `guardar(datos)`

Envía la configuración mediante:

```text
POST api/superapi.php?ruta=configuracion
```

El cuerpo es JSON. Si la API responde con `ok: true`, actualiza de inmediato
el nombre y el color visibles.

---

## 10. `nucleo/tabla.js`

El archivo [tabla.js](./2.-Proyecto/Ingeriar-modular/nucleo/tabla.js) define
`IngeriarTabla`.

```javascript
class IngeriarTabla {
    constructor({contenedor = "section", utilidades, formulario}) {
        ...
    }
}
```

### Propiedades de la clase

```javascript
this.contenedor
this.utilidades
this.formulario
this.tabla
```

`this.tabla` guarda la entidad actualmente representada.

### `cargar(tabla)`

Recibe el nombre de una tabla y realiza una única petición:

```text
GET api/superapi.php?ruta=tabla&tabla=...
```

La respuesta contiene la entidad completa:

```json
{
    "tabla": "usuarios",
    "columnas": [],
    "registros": [],
    "primaryKey": "id"
}
```

Cuando llega la respuesta, llama a:

```javascript
this.render(datos);
```

### `render(datos)`

Construye la interfaz de la tabla:

1. Vacía el contenedor.
2. Crea el título.
3. Crea el botón `+ Nuevo`.
4. Muestra un mensaje si no hay registros.
5. Crea el selector de columna.
6. Crea el buscador.
7. Crea las cabeceras.
8. Crea las filas.
9. Añade botones Editar y Borrar.
10. Configura los filtros.

Los valores de las celdas se asignan con `textContent`, no concatenando HTML.
Así se evita interpretar los valores de la base de datos como código HTML.

### Botón Nuevo

El botón utiliza la dependencia recibida:

```javascript
nuevo.onclick = () => this.formulario.mostrar();
```

La tabla no genera el formulario directamente. Solo solicita al objeto
formulario que lo muestre.

### Botón Editar

Cada fila conserva el objeto `registro`. El botón llama a:

```javascript
this.formulario.mostrar(registro);
```

Si se pasa el registro, el formulario funciona en modo edición.

### `configurarFiltros(selector, buscador, cuerpo)`

Conecta el selector y el campo de búsqueda con las filas:

- Lee la columna seleccionada.
- Convierte el texto a minúsculas.
- Comprueba si cada fila contiene la búsqueda.
- Oculta las filas que no coinciden.
- Muestra el mensaje de ausencia de coincidencias si es necesario.

La búsqueda se ejecuta en el evento `input`, por lo que se actualiza mientras
el usuario escribe.

### Ordenación

Cada cabecera tiene un evento `click`. Al pulsarla:

1. Obtiene las filas del `tbody`.
2. Las convierte en un array.
3. Compara los textos de la columna.
4. Reordena las filas.
5. Las vuelve a insertar en el `tbody`.
6. Invierte el sentido para el siguiente clic.

### `borrar(id)`

Primero pregunta al usuario:

```text
¿Seguro que quieres borrar este registro?
```

Si se confirma, crea un `FormData` con:

```text
tabla
id
```

Y envía:

```text
POST api/superapi.php?ruta=borrar
```

Cuando termina, vuelve a llamar a `cargar(this.tabla)`.

---

## 11. `nucleo/formulario.js`

El archivo [formulario.js](./2.-Proyecto/Ingeriar-modular/nucleo/formulario.js)
define `IngeriarFormulario`.

```javascript
class IngeriarFormulario {
    constructor({contenedor = "section", utilidades, alGuardar}) {
        ...
    }
}
```

### Propiedades

```javascript
this.contenedor
this.utilidades
this.alGuardar
this.tabla
this.formulario
```

### `mostrar(registro = null)`

Decide el modo de trabajo:

```text
registro === null       crear
registro no es null     editar
```

El método:

1. Guarda la tabla actual.
2. Pide sus columnas.
3. Vacía la sección.
4. Crea el título.
5. Crea el formulario.
6. Crea los botones Guardar y Cancelar.
7. Genera los controles de cada columna.
8. Registra el evento `submit`.

El botón Cancelar llama a `alGuardar()`. En esta aplicación, esa función
vuelve a cargar la tabla.

### `obtenerColumnas()`

Realiza:

```text
GET api/superapi.php?ruta=columnas&tabla=...
```

La respuesta contiene información de cada columna editable:

```json
{
    "name": "rol",
    "type": "TEXT",
    "pk": 0,
    "tipo_formulario": "ENUM",
    "required": true,
    "defaultValue": null,
    "options": ["tutor", "alumno"],
    "relation": null
}
```

La respuesta incluye también la columna primaria. El formulario la excluye
comprobando `pk`, mientras que la tabla utiliza `primaryKey` para identificar
el registro que debe editar o borrar.

### `plantilla(columna)`

Selecciona la plantilla HTML adecuada:

```text
ENUM                    plantilla-select
DATETIME/TIMESTAMP      plantilla-datetime
DATE                    plantilla-date
INT/REAL/NUM/DECIMAL    plantilla-number
resto                   plantilla-input
```

La API proporciona `tipo_formulario` y `type`, y el método los convierte en
una decisión de interfaz.

### `crearControl(columna, registro)`

Clona la plantilla y configura el campo:

- Texto de la etiqueta.
- Nombre del control.
- Propiedad `required`.
- Longitud máxima.
- Valor actual.
- Valor por defecto.
- Opciones de un `select`.

Para un formulario de creación, se usa el valor por defecto si existe. Para
un formulario de edición, se utiliza el valor del registro.

### Campos `ENUM`

Si la API detecta una restricción `CHECK` del tipo:

```sql
CHECK (rol IN ('tutor', 'alumno'))
```

devuelve:

```json
{
    "tipo_formulario": "ENUM",
    "options": ["tutor", "alumno"]
}
```

El formulario utiliza `plantilla-select` y crea:

```html
<option value="tutor">Tutor</option>
<option value="alumno">Alumno</option>
```

### Relaciones

Si una columna tiene una relación, la API devuelve información como:

```json
{
    "name": "usuario_id",
    "relation": {
        "tabla": "usuarios",
        "campo_valor": "id"
    }
}
```

El método `obtenerOpcionesRelacion()` solicita los registros de la tabla
relacionada:

```text
GET api/superapi.php?ruta=tabla&tabla=usuarios
```

Después crea las opciones del selector. El valor utiliza el campo relacionado
y la etiqueta intenta combinar:

```text
nombre + apellidos
```

Si esos campos no existen, utiliza otros valores disponibles.

### `guardar(evento, columnas, registro)`

Este método se ejecuta al enviar el formulario:

1. Cancela el envío HTML tradicional con `preventDefault()`.
2. Lee los controles.
3. Convierte los campos vacíos opcionales en `null`.
4. Construye un objeto con los datos.
5. Crea un `FormData`.
6. Añade la tabla.
7. Añade los datos convertidos a JSON.
8. Decide si la ruta es `crear` o `editar`.
9. Añade la clave primaria si es una edición.
10. Envía la petición.
11. Ejecuta `alGuardar()` cuando termina correctamente.

Las rutas son:

```text
POST api/superapi.php?ruta=crear
POST api/superapi.php?ruta=editar
```

### Qué es `FormData`

`FormData` es un objeto del navegador para construir datos de un formulario:

```javascript
let formData = new FormData();
formData.append("tabla", this.tabla);
formData.append("datos", JSON.stringify(datos));
```

PHP puede leer esos valores con:

```php
$_POST['tabla']
$_POST['datos']
```

Como `datos` es un texto JSON, PHP lo convierte de nuevo a array con:

```php
json_decode($_POST['datos'], true)
```

---

## 12. API `api/superapi.php`

La API abre SQLite con:

```php
$db = new SQLite3(__DIR__ . '/../data/ingeriar.db');
```

`__DIR__` representa la carpeta `api`. `../data` sube un nivel y entra en la
carpeta de datos.

También activa las claves externas:

```php
$db->exec('PRAGMA foreign_keys = ON');
```

### `responder($datos)`

Esta función:

1. Establece el tipo de contenido JSON.
2. Codifica el valor con `json_encode()`.
3. Lo imprime.
4. Termina la ejecución con `exit`.

Así todas las rutas tienen una forma común de responder.

### `obtenerOpcionesEnum($db, $tabla, $nombre)`

Busca el SQL de creación de una tabla en `sqlite_master`. Después usa una
expresión regular para localizar restricciones `CHECK (... IN (...))`.

Su objetivo es convertir una restricción de base de datos en opciones para un
`select` HTML.

### `limpiarValorPorDefecto($valor)`

SQLite puede devolver un valor por defecto con comillas. Esta función elimina
las comillas externas y deshace comillas simples duplicadas.

### `obtenerRelaciones($db, $tabla)`

Ejecuta:

```sql
PRAGMA foreign_key_list("tabla")
```

Devuelve un mapa de las columnas que apuntan a otras tablas.

### `obtenerColumnas($db, $tabla)`

Ejecuta:

```sql
PRAGMA table_info("tabla")
```

Para cada columna obtiene:

- `name`.
- `type`.
- `pk`.
- `tipo_formulario`.
- `required`.
- `defaultValue`.
- `options`.
- `relation`.

La clave primaria se incluye en los metadatos para que los componentes sepan
identificarla. El formulario la excluye de los campos editables mediante
`pk`.

---

## 13. Rutas HTTP de la API

### `GET configuracion`

Lee `data/config.php`, lo convierte desde JSON y lo devuelve.

Respuesta:

```json
{
    "nombre": "nombre_grupo",
    "color": "darkred"
}
```

### `POST configuracion`

Lee JSON del cuerpo HTTP con:

```php
file_get_contents('php://input')
```

Después sobrescribe `data/config.php` con la nueva configuración.

### `GET modulos`

Devuelve un array definido en PHP:

```json
["ventas", "rrhh", "facturacion", "compras"]
```

### `GET entidades`

Ejecuta una consulta contra `sqlite_master`:

```sql
SELECT name
FROM sqlite_master
WHERE type='table'
AND name NOT LIKE 'sqlite_%'
```

El resultado se utiliza para construir el menú de entidades.

### `GET tabla`

Recibe:

```text
tabla
```

Ejecuta conceptualmente:

```sql
SELECT * FROM "nombre_de_tabla"
```

Devuelve una entidad agrupada:

```json
{
    "tabla": "usuarios",
    "columnas": [
        {
            "name": "nombre",
            "type": "TEXT",
            "pk": 0,
            "required": true,
            "defaultValue": null,
            "options": [],
            "relation": null
        }
    ],
    "registros": [
        {
            "id": 1,
            "nombre": "Ana"
        }
    ],
    "primaryKey": "id"
}
```

Agrupar la información evita que cada consumidor tenga que coordinar una
petición para los registros y otra para las columnas.

### `GET columnas`

Recibe el nombre de la tabla y llama a `obtenerColumnas()`. Devuelve los
metadatos necesarios para generar el formulario.

### `POST crear`

Recibe:

```text
tabla
datos
```

`datos` contiene un objeto JSON. La API:

1. Comprueba que la tabla no esté vacía.
2. Convierte los datos JSON en array.
3. Obtiene las columnas permitidas.
4. Descarta campos que no pertenezcan a la tabla.
5. Construye un `INSERT`.
6. Enlaza valores mediante marcadores `?`.
7. Ejecuta la consulta.

Consulta conceptual:

```sql
INSERT INTO "usuarios" ("nombre", "email")
VALUES (?, ?)
```

### `POST editar`

Recibe:

```text
tabla
id
datos
```

Construye un `UPDATE`:

```sql
UPDATE "usuarios"
SET "nombre" = ?, "email" = ?
WHERE id = ?
```

El `WHERE` identifica únicamente el registro seleccionado.

### `POST borrar`

Recibe:

```text
tabla
id
```

Y ejecuta:

```sql
DELETE FROM "usuarios"
WHERE id = ?
```

---

## 14. `GET`, `POST` y JSON

### GET

`GET` se utiliza principalmente para consultar:

```text
GET ...?ruta=entidades
GET ...?ruta=tabla&tabla=usuarios
GET ...?ruta=columnas&tabla=usuarios
```

Los parámetros aparecen en la URL y PHP los lee con `$_GET`.

### POST

`POST` se utiliza para enviar cambios:

```text
POST ...?ruta=crear
POST ...?ruta=editar
POST ...?ruta=borrar
```

Los datos no forman parte de la URL. PHP los recibe en `$_POST` cuando se
envía `FormData`, o leyendo directamente el cuerpo cuando se envía JSON.

### JSON

JSON es el formato utilizado para intercambiar objetos y arrays:

```json
{
    "nombre": "Ana",
    "email": "ana@example.com"
}
```

En el navegador:

```javascript
JSON.stringify(datos)
```

convierte un objeto a texto JSON. En PHP:

```php
json_decode($texto, true)
```

lo convierte de nuevo a un array.

---

## 15. Flujo completo de la aplicación

### Arranque

```text
index.html
    ↓
carga utilidades.js
    ↓
carga configuracion.js
    ↓
carga tabla.js
    ↓
carga formulario.js
    ↓
carga codigo.js
    ↓
iniciarAplicacion()
```

### Carga de entidades

```text
codigo.js
    ↓
utilidades.obtenerJson()
    ↓
GET api/superapi.php?ruta=entidades
    ↓
PHP consulta sqlite_master
    ↓
JSON con nombres de tablas
    ↓
codigo.js crea enlaces
```

### Consulta de una tabla

```text
usuario pulsa una entidad
    ↓
tabla.cargar(nombre)
    ↓
GET ruta=tabla
GET ruta=columnas
    ↓
IngeriarTabla.render()
    ↓
tabla, filtros, ordenación y botones
```

### Crear

```text
tabla muestra botón Nuevo
    ↓
formulario.mostrar()
    ↓
GET ruta=columnas
    ↓
se crean controles desde templates
    ↓
submit
    ↓
FormData
    ↓
POST ruta=crear
    ↓
INSERT SQLite
    ↓
alGuardar()
    ↓
tabla.cargar()
```

### Editar

```text
tabla muestra botón Editar
    ↓
formulario.mostrar(registro)
    ↓
controles con valores actuales
    ↓
submit
    ↓
POST ruta=editar
    ↓
UPDATE SQLite
    ↓
tabla.cargar()
```

### Borrar

```text
tabla muestra botón Borrar
    ↓
confirm()
    ↓
POST ruta=borrar
    ↓
DELETE SQLite
    ↓
tabla.cargar()
```

---

## 16. Instalación y ejecución

La aplicación necesita un servidor que ejecute PHP. No se debe abrir con
`file://`, porque el navegador no ejecutaría correctamente las rutas PHP.

Desde la raíz del repositorio se puede ejecutar:

```bash
php -S localhost:8000 -t "003-Organización y consulta de la información/Entrega/2.-Proyecto/Ingeriar-modular"
```

Después se abre:

```text
http://localhost:8000/
```

También se puede iniciar el servidor desde la propia carpeta del proyecto:

```bash
cd "Entrega/2.-Proyecto/Ingeriar-modular"
php -S localhost:8000
```

Y abrir:

```text
http://localhost:8000/
```

---

## 17. Resumen de responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura inicial y plantillas HTML |
| `codigo.js` | Arranque y conexión de objetos |
| `nucleo/utilidades.js` | Funciones comunes y `fetch()` |
| `nucleo/configuracion.js` | Configuración visual y su formulario |
| `nucleo/tabla.js` | Registros, filtros, ordenación y borrado |
| `nucleo/formulario.js` | Crear, editar, tipos, ENUM y relaciones |
| `api/superapi.php` | API HTTP y consultas SQLite |
| `api/instalar.php` | Instalación de la base de datos |
| `data/ingeriar.db` | Datos persistentes |
| `data/config.php` | Configuración persistente |
| `data/schema.sql` | Esquema SQL de referencia |
| `data/demo.sql` | Datos de demostración |
| `estilo.css` | Presentación visual |
| `servicios/` | Servicios auxiliares que no forman parte del flujo principal |

La aplicación ha pasado de un archivo monolítico a varias clases conectadas
por dependencias. Las consultas no han desaparecido: ahora cada clase realiza
las peticiones que corresponden a su responsabilidad y `codigo.js` coordina
el flujo general.

---

## 18. Instalador de la base de datos

El archivo [instalar.html](./2.-Proyecto/Ingeriar-modular/instalador.html)
contiene un formulario para introducir un modelo de datos. Ese formulario
envía el modelo mediante `POST` a:

```text
api/instalar.php
```

El modelo utiliza este formato:

```text
usuarios
- nombre TEXT NOT NULL
- email TEXT UNIQUE
- rol ENUM('tutor', 'alumno') NOT NULL
```

Una línea sin guion representa una tabla. Una línea que comienza por `-`
representa una columna de la tabla anterior.

### `identificadorValido($valor)`

Comprueba que un nombre de tabla o columna siga el formato de un identificador
SQL:

```text
letras o guion bajo al principio
letras, números o guion bajo después
```

Esto evita incorporar nombres arbitrarios cuando se construye SQL con
identificadores.

### `convertirEnum($nombre, $definicion)`

SQLite no tiene un tipo `ENUM` nativo. El instalador convierte:

```text
rol ENUM('tutor', 'alumno') NOT NULL
```

en una columna equivalente a:

```sql
"rol" TEXT NOT NULL
CHECK ("rol" IN ('tutor', 'alumno'))
```

Así la base de datos mantiene las opciones válidas y `superapi.php` puede
detectarlas posteriormente.

### `crearSqlTabla($tabla, $columnas)`

Genera una sentencia `CREATE TABLE`. Todas las tablas reciben
automáticamente:

```sql
"id" INTEGER PRIMARY KEY AUTOINCREMENT
```

Después añade las columnas del modelo y conserva sus tipos y restricciones.

### Procesamiento del modelo

`instalar.php`:

1. Lee `$_POST['modelo']`.
2. Separa el texto por líneas.
3. Ignora líneas vacías y comentarios con `#`.
4. Agrupa las columnas debajo de su tabla.
5. Genera una sentencia SQL por tabla.
6. Abre la base de datos.
7. Inicia una transacción.
8. Ejecuta los `CREATE TABLE`.
9. Hace `COMMIT` si todo funciona.
10. Hace `ROLLBACK` si se produce un error.

La sentencia utiliza `CREATE TABLE IF NOT EXISTS`, por lo que no modifica una
tabla que ya exista ni elimina sus datos.

---

## 19. Servicios auxiliares

El flujo principal de la interfaz utiliza `api/superapi.php`, no los archivos
de `servicios/`.

### `servicios/entrada.php`

En la versión modular actual no contiene lógica operativa. Se conserva como
espacio reservado para un posible servicio de entrada de datos.

### `servicios/salida.php`

Es un servicio de exportación. Sus pasos son:

1. Abre `ingeriar.db`.
2. Consulta todas las tablas de `sqlite_master`.
3. Recorre cada tabla.
4. Ejecuta `SELECT *` para obtener sus registros.
5. Guarda los registros en un array agrupado por nombre de tabla.
6. Devuelve toda la base de datos como JSON.

Su respuesta tiene una forma parecida a:

```json
{
    "usuarios": [
        {
            "id": 1,
            "nombre": "Ana"
        }
    ],
    "eventos": []
}
```

Este servicio es independiente de la pantalla principal y puede utilizarse
para exportar los datos completos.

---

## 20. Consideraciones sobre el flujo asíncrono

Las peticiones `fetch()` no bloquean la interfaz. Mientras PHP consulta la
base de datos, el navegador puede seguir respondiendo a otros eventos.

Por eso los métodos que realizan peticiones devuelven promesas:

```javascript
return this.utilidades.obtenerJson(url).then(...);
```

Cuando una operación necesita coordinar varias peticiones se puede utilizar:

```javascript
Promise.all([
    peticionDeRegistros,
    peticionDeColumnas
]).then(function ([registros, columnas]) {
    ...
});
```

En la versión actual la tabla recibe una única respuesta agrupada:

```text
tabla + columnas + registros
        ↓
IngeriarTabla.render()
```

Si una petición falla, la promesa se rechaza. El error debe tratarse en la
interfaz o en el navegador para informar de que la operación no ha terminado.

---

## 21. Resumen para seguir el código

Para estudiar la aplicación de arriba abajo, conviene seguir este orden:

1. Leer `index.html` y localizar los elementos base y las plantillas.
2. Leer `codigo.js` para ver cómo se crean las instancias.
3. Leer `utilidades.js` para entender `fetch`, JSON y `POST`.
4. Leer `configuracion.js` para entender una pantalla sencilla.
5. Leer `tabla.js` para entender registros, filtros y acciones.
6. Leer `formulario.js` para entender creación, edición y relaciones.
7. Leer `superapi.php` para conectar cada petición con su ruta.
8. Leer `instalar.php` para entender cómo se crea el esquema.
9. Consultar `data/schema.sql`, `data/demo.sql` y
   `data/modeloDeDatos.txt` para conocer los datos.

La pregunta que responde cada parte es diferente:

```text
index.html       ¿Qué elementos existen inicialmente?
codigo.js        ¿En qué orden se inicia y se conectan las piezas?
utilidades.js    ¿Cómo se hacen las peticiones comunes?
configuracion.js ¿Cómo se muestra y guarda la configuración?
tabla.js         ¿Cómo se muestran y manipulan los registros?
formulario.js    ¿Cómo se generan y guardan los campos?
superapi.php     ¿Qué hace el servidor con cada petición?
SQLite           ¿Dónde quedan guardados los datos?
```

La conexión completa queda resumida así:

```text
clic del usuario
    ↓
método de una clase JavaScript
    ↓
utilidades.obtenerJson()
o utilidades.enviarFormulario()
    ↓
fetch()
    ↓
superapi.php
    ↓
consulta SQLite
    ↓
respuesta JSON
    ↓
render() o recarga de tabla
```

---

## 22. Módulo de gráficas y preparación del dashboard

La versión modular incorpora el módulo de gráficas de 021 en:

```text
nucleo/graficas.js
```

La clase se llama todavía `DarkorangeGraficas` porque se ha reutilizado el
componente de 021 sin modificar su motor de dibujo. No realiza peticiones
HTTP ni conoce PHP o SQLite: recibe etiquetas y valores y genera un SVG.

### Métodos de `DarkorangeGraficas`

```javascript
DarkorangeGraficas.crear(
    contenedor,
    tipo,
    etiquetas,
    valores,
    titulo
);
```

`crear()` admite:

```text
tipo = barras
tipo = tarta
tipo = anillo
```

También contiene:

```javascript
DarkorangeGraficas.frecuencia(registros, columna);
DarkorangeGraficas.campo(registros, columnas);
```

`frecuencia()` cuenta cuántas veces aparece cada valor de una columna.
`campo()` intenta elegir automáticamente una columna útil para representar,
descartando identificadores y relaciones.

La separación de responsabilidades es:

```text
API y clases de datos
    preparan registros, columnas, etiquetas y valores

DarkorangeGraficas
    dibuja la representación SVG
```

### `IngeriarDashboard`

El dashboard ya está implementado en:

```text
nucleo/dashboard.js
```

Su clase es:

```javascript
class IngeriarDashboard {
    constructor({contenedor, utilidades, graficas}) {}
    render() {}
    cargarDatos() {}
    renderIndicadores(datos) {}
    renderGraficas(datos) {}
}
```

El enlace `Dashboard` del menú carga todas las entidades y sus registros
mediante peticiones a `ruta=entidades` y `ruta=tabla`. A partir de esos datos
se calculan indicadores reales:

- número de entidades;
- número total de registros;
- número de entidades que tienen datos;
- entidad con más registros.

También se genera una gráfica de barras con el número de registros por
entidad. Para algunas entidades con registros se selecciona automáticamente
un campo útil mediante `DarkorangeGraficas.campo()` y se genera una gráfica de
frecuencias con `DarkorangeGraficas.frecuencia()`. De esta forma, el dashboard
no contiene valores simulados ni depende de nombres concretos de tablas.

El flujo de la clase es:

```text
cargarDatos()
    pide entidades y registros mediante fetch

renderIndicadores()
    calcula totales y KPIs reales

renderGraficas()
    prepara etiquetas y valores
    llama a DarkorangeGraficas

render()
    muestra el estado de carga
    pide los datos
    construye la estructura visual
    muestra los errores de forma explícita
```

Las gráficas se representan dentro de tarjetas y utilizan el mismo módulo
`DarkorangeGraficas` que puede reutilizarse en otras pantallas.

---

## 23. Exportación de la vista actual

La versión modular incorpora:

```text
nucleo/exportacion.js
```

La clase `IngeriarExportacion` se conecta tanto con `IngeriarTabla` como con
`IngeriarDashboard`. El selector y el botón de exportación se muestran en la
cabecera de ambas pantallas.

```javascript
const exportacion = new IngeriarExportacion({
    contenedor: "section"
});
```

El método público `exportar(formato)` utiliza un `switch` para seleccionar la
operación:

```text
imprimir
html
json
csv
```

### Impresión

`imprimir()` llama a:

```javascript
window.print();
```

Las reglas `@media print` ocultan los menús, filtros, botones de edición,
borrado y creación. Se conservan las tablas, indicadores y gráficas SVG para
que el navegador pueda imprimirlos o guardarlos como PDF.

### HTML

`exportarHtml()` clona el contenido de `section`, elimina los controles de
interfaz y mantiene:

- títulos;
- indicadores;
- tablas;
- gráficas SVG;
- filas que no están ocultas.

También incorpora las reglas CSS disponibles para que el archivo descargado
sea autocontenido y se pueda abrir sin depender directamente de la página.

### JSON y CSV

Estos formatos se centran actualmente en las tablas visibles de `section`.
`obtenerTablas()`:

1. localiza las tablas;
2. obtiene sus cabeceras;
3. excluye la columna `Acciones`;
4. descarta filas cuyo `display` sea `none`;
5. devuelve los valores visibles.

El CSV utiliza `fputcsv` como referencia conceptual, pero al generarse en el
navegador aplica el mismo escape de comillas, comas y saltos de línea. Incluye
un BOM UTF-8 para facilitar la apertura en Excel.

Las gráficas del dashboard se conservan en HTML e impresión porque son SVG.
No se convierten actualmente a filas artificiales en CSV o JSON: esos formatos
solo exportan tablas. Si el dashboard no contiene tablas, el CSV informa de que
no hay tablas visibles para exportar.

### Filas filtradas

El filtro de `tabla.js` oculta las filas modificando su estilo:

```javascript
fila.style.display = coincide ? "" : "none";
```

El exportador comprueba ese estado antes de construir CSV o JSON y antes de
limpiar la copia HTML. Por ello, la exportación representa la vista filtrada y
no todos los registros originales.
