### a) Herramientas y lenguajes de consulta y manipulación de datos
Ingeriar utiliza PHP, SQLite, SQL y JavaScript. La API consulta las tablas y su
estructura mediante `SELECT` y `PRAGMA`, mientras que los formularios realizan
operaciones de creación, edición y borrado mediante peticiones `POST`.

### b) Formularios
Se han generado formularios dinámicamente a partir de las columnas de SQLite.
Se tienen en cuenta tipos, campos obligatorios, valores por defecto, opciones
`ENUM` y relaciones entre tablas.

### c) Informes
Se ha creado un dashboard con indicadores reales, tablas y gráficas SVG.
Además, la aplicación permite preparar la vista actual para imprimirla como un
informe, conservando sus tablas, indicadores y gráficas.

### d) Exportación de datos e informes
Se ha incorporado una clase de exportación reutilizable. Permite imprimir y
exportar la vista actual en HTML, JSON y CSV. Los formatos tabulares excluyen
los botones y la columna de acciones, y respetan las filas visibles después de
aplicar un filtro.

### e) Automatización de extracciones
La aplicación automatiza la carga de entidades y registros mediante `fetch()`.
El dashboard solicita las entidades y sus datos, y genera automáticamente sus
indicadores y gráficas. La exportación también se genera desde la pantalla sin
tener que copiar los datos manualmente.

### f) Verificación del rendimiento
Se ha comprobado el funcionamiento mediante validación de sintaxis PHP y
JavaScript, peticiones a la API y pruebas en navegador. Las entidades del
dashboard se cargan mediante peticiones asíncronas con `Promise.all()`.

### g) Documentación e incidencias
Se ha documentado la evolución desde una aplicación monolítica hasta una
arquitectura modular basada en clases. También se han recogido decisiones de
diseño, flujo de datos, API, formularios, gráficas, dashboard, exportación e
incidencias corregidas durante la integración.

### h) Información obtenida
El dashboard obtiene información relevante como el número de entidades, el
total de registros, las entidades con datos y la entidad con más registros.
Además, calcula frecuencias de campos y las representa mediante gráficas de
barras, tarta y anillo.