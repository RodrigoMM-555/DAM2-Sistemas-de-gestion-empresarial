# Resultados de aprendizaje

## a) Se han identificado las posibilidades de adaptación del ERP-CRM.

Antes de programar, se analizaron las necesidades reales de un grupo scout: gestión de educandos, tutores, eventos, asistencias, documentación y gastos. A partir de ese análisis se decidió qué partes de la base genérica vista en clase (el proyecto *darkorange*) se podían reutilizar y cuáles había que adaptar. En Ingeriar se definieron tres roles (administrador, scouter y tutor), cada uno con sus propias pantallas y permisos. Además, la configuración del grupo (logo, colores, catálogos y nombres de los roles) se puede cambiar sin tocar el código.

## b) Se han adaptado definiciones de campos, tablas y vistas de la base de datos del ERP-CRM.

El esquema MySQL (`schema.sql`) se adaptó al dominio scout con tablas como `educandos`, `eventos`, `educandos_asistencias`, `facturas` y las tablas intermedias `usuarios_educandos` y `eventos_secciones`. Se usaron claves foráneas, claves primarias compuestas y campos `ENUM` para mantener la integridad de los datos, por ejemplo en el estado de las facturas. Cuando el modelo cambió, se escribieron migraciones como `ALTER TABLE facturas ADD COLUMN imagen_factura` o la creación de los catálogos `tipos_evento`, `secciones` y `categorias_factura`. Así se pueden actualizar bases ya instaladas sin perder datos.

## c) Se han adaptado consultas.

Todas las consultas pasan por `superapi.php` y usan PDO con sentencias preparadas para evitar la inyección SQL. Se escribieron consultas agregadas (`COUNT`, `SUM`, `GROUP BY`) para el dashboard y consultas con `JOIN` para mostrar nombres legibles en lugar de identificadores, como el responsable de una factura. También se filtran los resultados según el rol: un tutor solo recibe los datos de sus educandos. Esto continúa los ejercicios de consultas y vistas de la unidad (`015 vistas ejemplo.php`, `016 vistas clases.php`).

## d) Se han adaptado interfaces de entrada de datos y de procesos.

`formulario.js` genera los formularios automáticamente leyendo `information_schema`. Cada tipo de columna se convierte en el control adecuado: `DATE` en un selector de fecha, `ENUM` en un `select`, los booleanos en Sí/No y las claves foráneas en selectores con nombres. Esta técnica se aprendió en los ejercicios de formularios personalizados (`002 repaso de los tipos de campo`, `006 tinyint`, `023 darkorange`). También se adaptaron procesos concretos: las facturas suben su imagen con `FormData`, los eventos pueden convocar a varias secciones mediante casillas y la asistencia se bloquea cuando el evento ya ha terminado.

## e) Se han personalizado informes.

`exportacion.js` permite sacar los datos visibles de cualquier tabla o del dashboard en formato de impresión, HTML, JSON o CSV. Se reutiliza en todas las vistas para no repetir código. Esta función parte del ejercicio de extracción CSV de la unidad (`022-extraccion`), donde se exportaban solo las filas visibles, en su orden y en UTF-8. Se añadió una hoja de estilos de impresión para que los informes salgan limpios en papel o en PDF.

## f) Se han creado paneles de control.

El dashboard de Ingeriar muestra indicadores y gráficas distintas según el rol. El administrador ve totales de usuarios, educandos, eventos y gasto; el scouter ve sus facturas y los eventos próximos; el tutor ve sus educandos, las circulares pendientes y las asistencias sin confirmar. Las gráficas (barras, tarta y anillo) se dibujan en SVG con `graficas.js`, sin librerías externas, e incluyen tooltips con valor y porcentaje. La maquetación usa CSS Grid, como en los ejercicios de paneles de control (`001 grid`, `006 filas y columnas`, `007 dashboard3d`).

## g) Se han adaptado procedimientos almacenados de servidor.

La migración `2025-02-catalogos-eventos-secciones.sql` incluye el procedimiento almacenado `migrar_seccion_eventos()`. Este procedimiento pasa los datos del antiguo campo de sección a la nueva tabla `eventos_secciones` y se borra al terminar. Gracias a él, la migración se ejecuta dentro del propio servidor MySQL de forma segura y se puede repetir sin problemas. El resto de la lógica de servidor se reparte en servicios PHP, como `secciones.php`, que calcula la sección de cada educando según su edad.

## h) Se han realizado pruebas.

Se creó `demo.sql`, que carga datos de prueba realistas: 30 usuarios, 100 educandos, 40 eventos, 80 facturas y 160 asistencias. Con ellos se probaron las tablas, los filtros, el calendario y el dashboard con un volumen de datos razonable. Se entró con cada rol para comprobar que los permisos se aplican en el servidor y no solo ocultando botones. También se probaron casos límite: archivos demasiado grandes o con un tipo MIME no válido, asistencias fuera de plazo y la edición de eventos antiguos.

## i) Se han documentado las operaciones realizadas y las incidencias observadas.

El archivo `noteas.md` documenta la arquitectura, el flujo de datos, los roles, la base de datos, la instalación y las migraciones de Ingeriar. Incluye además un diario de cambios con las incidencias resueltas, como el selector de tipo de evento que fallaba al editar, los márgenes de los modales y el contraste del modo oscuro. Para cada decisión técnica se explica el motivo, por ejemplo por qué no se guarda la sección en la base de datos o por qué no se usan frameworks.

## j) Se han realizado integraciones con otro sistema de gestión empresarial.

Ingeriar puede intercambiar datos con otros sistemas mediante su API REST en JSON y la exportación a CSV y JSON. Estos formatos se pueden importar en hojas de cálculo, en otros ERP-CRM o en herramientas de contabilidad. El instalador crea la base de datos a partir de `modeloDeDatos.txt`, de modo que el modelo se puede trasladar a otro entorno. Para mostrar las circulares en PDF se usa la herramienta externa `pdftoppm`. Por último, la separación entre `public/`, `server/` y `storage/` permite conectar otros clientes a la misma API sin exponer las credenciales.
