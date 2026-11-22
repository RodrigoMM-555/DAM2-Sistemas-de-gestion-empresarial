class IngeriarDashboard {
    constructor({contenedor = "section", utilidades, graficas, exportacion}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.graficas = graficas;
        this.exportacion = exportacion;
    }

    // Coordina todo el flujo: carga los datos y después construye la pantalla.
    async render() {
        // Informamos al usuario mientras terminan las peticiones a la API.
        this.contenedor.innerHTML =
            '<p class="vacio">Cargando dashboard...</p>';

        try {
            const datos = await this.cargarDatos();

            // La pantalla se construye cuando ya disponemos de los datos.
            this.contenedor.innerHTML = "";
            this.renderCabecera();
            this.contenedor.appendChild(this.renderIndicadores(datos));
            this.contenedor.appendChild(this.renderGraficas(datos));
        } catch (error) {
            // Mostramos el error en la interfaz en lugar de dejarla vacía.
            this.contenedor.innerHTML = "";

            const mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent =
                "No se pudo cargar el dashboard: " + error.message;
            this.contenedor.appendChild(mensaje);
        }
    }

    // Obtiene primero los nombres de las entidades y después sus datos.
    cargarDatos() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=entidades"
        ).then((nombres) => {
            if (!Array.isArray(nombres)) {
                throw new Error("La API no devolvió una lista de entidades");
            }

            // Promise.all permite solicitar los datos de todas las entidades.
            return Promise.all(nombres.map((nombre) =>
                this.utilidades.obtenerJson(
                    "api/superapi.php?ruta=tabla&tabla=" +
                    encodeURIComponent(nombre)
                ).then((datos) => ({
                    tabla: datos.tabla || nombre,
                    columnas: Array.isArray(datos.columnas)
                        ? datos.columnas
                        : [],
                    registros: Array.isArray(datos.registros)
                        ? datos.registros
                        : []
                }))
            ));
        });
    }

    // Crea el título y la descripción situados encima de los indicadores.
    renderCabecera() {
        const cabecera = document.createElement("div");
        cabecera.className = "cabecera-dashboard";

        const exportacion = document.createElement("div");
        exportacion.className = "controles-exportacion";
        const formato = document.createElement("select");
        formato.className = "selector-exportacion";
        formato.setAttribute("aria-label", "Formato de exportación");
        [
            ["", "Exportar como..."],
            ["imprimir", "Imprimir"],
            ["html", "HTML"],
            ["json", "JSON"],
            ["csv", "CSV"]
        ].forEach(([valor, texto]) => {
            const opcion = document.createElement("option");
            opcion.value = valor;
            opcion.textContent = texto;
            formato.appendChild(opcion);
        });
        const botonExportar = document.createElement("button");
        botonExportar.textContent = "Exportar";
        botonExportar.className = "boton boton-exportar";
        exportacion.append(formato, botonExportar);
        this.exportacion.conectarControles(formato, botonExportar);

        const titulo = document.createElement("h2");
        titulo.textContent = "Dashboard";

        const descripcion = document.createElement("p");
        descripcion.textContent =
            "Resumen de los datos disponibles en las entidades.";

        const textos = document.createElement("div");
        textos.append(titulo, descripcion);
        cabecera.append(textos, exportacion);
        this.contenedor.appendChild(cabecera);
    }

    // Calcula los valores resumidos que se muestran en las tarjetas superiores.
    renderIndicadores(datos) {
        const totalRegistros = datos.reduce(
            (total, entidad) => total + entidad.registros.length,
            0
        );
        const entidadConMasRegistros = datos.reduce(
            (anterior, entidad) =>
                !anterior || entidad.registros.length > anterior.registros.length
                    ? entidad
                    : anterior,
            null
        );
        const indicadores = [
            {
                nombre: "Entidades",
                valor: datos.length,
                detalle: "Entidades disponibles"
            },
            {
                nombre: "Registros",
                valor: totalRegistros,
                detalle: "Registros almacenados"
            },
            {
                nombre: "Con datos",
                valor: datos.filter((entidad) => entidad.registros.length > 0)
                    .length,
                detalle: "Entidades con registros"
            },
            {
                nombre: "Mayor entidad",
                valor: entidadConMasRegistros
                    ? this.utilidades.capitalizar(
                        entidadConMasRegistros.tabla
                    )
                    : "-",
                detalle: entidadConMasRegistros
                    ? `${entidadConMasRegistros.registros.length} registros`
                    : "Sin registros"
            }
        ];
        const zona = document.createElement("div");
        zona.className = "dashboard-indicadores";

        // Cada indicador se transforma en una tarjeta HTML.
        indicadores.forEach((indicador) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "indicador";

            const nombre = document.createElement("small");
            nombre.textContent = indicador.nombre;

            const valor = document.createElement("strong");
            valor.textContent = indicador.valor;

            const detalle = document.createElement("span");
            detalle.textContent = indicador.detalle;

            tarjeta.append(nombre, valor, detalle);
            zona.appendChild(tarjeta);
        });

        return zona;
    }

    // Prepara las gráficas y decide qué datos representa cada una.
    renderGraficas(datos) {
        const zona = document.createElement("div");
        zona.className = "dashboard-graficas";

        if (!datos.length) {
            const mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay entidades para representar.";
            zona.appendChild(mensaje);
            return zona;
        }

        const resumen = document.createElement("article");
        resumen.className = "grafica-card";
        zona.appendChild(resumen);
        this.graficas.crear(
            resumen,
            "barras",
            datos.map((entidad) => this.utilidades.capitalizar(entidad.tabla)),
            datos.map((entidad) => entidad.registros.length),
            "Registros por entidad"
        );

        // Solo usamos entidades con registros y metadatos de columnas.
        // Se limita a tres para evitar saturar visualmente el dashboard.
        const entidadesGraficables = datos
            .filter((entidad) =>
                entidad.registros.length > 0 && entidad.columnas.length > 0
            )
            .slice(0, 3);

        entidadesGraficables.forEach((entidad, indice) => {
            // El módulo de gráficas escoge un campo categórico adecuado.
            const columna = this.graficas.campo(
                entidad.registros,
                entidad.columnas
            );

            if (!columna) {
                return;
            }

            // Convertimos los valores del campo en pares [valor, cantidad].
            const frecuencia = this.graficas.frecuencia(
                entidad.registros,
                columna.name
            );

            if (!frecuencia.length) {
                return;
            }

            const tarjeta = document.createElement("article");
            tarjeta.className = "grafica-card";
            zona.appendChild(tarjeta);

            // Alternamos entre tarta, anillo y barras para las entidades.
            this.graficas.crear(
                tarjeta,
                ["tarta", "anillo", "barras"][indice],
                frecuencia.map(([valor]) => valor),
                frecuencia.map(([, cantidad]) => cantidad),
                `${this.utilidades.capitalizar(entidad.tabla)} por ` +
                this.utilidades.capitalizar(columna.name)
            );
        });

        return zona;
    }
}
