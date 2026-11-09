class IngeriarDashboard {
    constructor({contenedor = "section", utilidades, graficas, exportacion}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.graficas = graficas;
        this.exportacion = exportacion;
    }

    async render() {
        this.contenedor.innerHTML =
            '<p class="vacio">Cargando dashboard...</p>';

        try {
            const datos = await this.cargarDatos();
            this.contenedor.className = "vista vista-dashboard";
            this.contenedor.innerHTML = "";
            this.renderCabecera(datos.rol);
            this.contenedor.appendChild(this.renderIndicadores(datos.indicadores));
            this.contenedor.appendChild(this.renderResumen(datos.resumen));
            if (datos.rol === "scouter") {
                this.contenedor.appendChild(
                    this.renderAsistenciasSabado(datos.asistencias_sabado)
                );
            }
            if (datos.rol === "tutor") {
                this.contenedor.appendChild(this.renderPanelTutor(
                    datos.tutor,
                    datos.mini_calendario
                ));
            }
            this.contenedor.appendChild(this.renderGraficas(datos.graficas));
        } catch (error) {
            this.contenedor.innerHTML = "";

            const mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent =
                "No se pudo cargar el dashboard: " + error.message;
            this.contenedor.appendChild(mensaje);
        }
    }

    cargarDatos() {
        return this.utilidades.obtenerJson("api/superapi.php?ruta=dashboard");
    }

    renderCabecera(rol) {
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
        descripcion.textContent = {
            administrador: "Visión general de la gestión y los recursos.",
            scouter: "Resumen de tus actividades y gastos registrados.",
            tutor: "Información importante sobre tus educandos y actividades."
        }[rol] || "Resumen de la actividad.";

        const textos = document.createElement("div");
        textos.append(titulo, descripcion);
        cabecera.append(textos, exportacion);
        this.contenedor.appendChild(cabecera);
    }

    renderIndicadores(indicadores) {
        const zona = document.createElement("div");
        zona.className = "dashboard-indicadores";

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

    renderGraficas(graficas) {
        const zona = document.createElement("div");
        zona.className = "dashboard-graficas";

        if (!graficas.length) {
            const mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay datos para representar.";
            zona.appendChild(mensaje);
            return zona;
        }

        graficas.forEach((grafica) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "grafica-card vista-superficie";
            zona.appendChild(tarjeta);
            this.graficas.crear(
                tarjeta,
                grafica.tipo,
                grafica.etiquetas,
                grafica.valores,
                grafica.titulo
            );
        });

        return zona;
    }

    renderResumen(resumen = {}) {
        const zona = document.createElement("section");
        zona.className = "dashboard-bloque dashboard-resumen";
        const titulo = document.createElement("h3");
        titulo.textContent = "Próximas actividades";
        zona.appendChild(titulo);
        const tarjetas = [
            [
                "Próximo evento",
                resumen.proximo_evento
                    ? resumen.proximo_evento.nombre
                    : "No hay eventos",
                resumen.proximo_evento
                    ? this.formatearFecha(resumen.proximo_evento.fecha_inicio)
                    : ""
            ],
            [
                "Sábados este mes",
                resumen.sabados_mes?.length || 0,
                "Actividades tipo sábado"
            ],
            [
                "Próxima acampada",
                resumen.proxima_acampada?.nombre || "No hay acampadas",
                resumen.proxima_acampada
                    ? this.formatearFecha(resumen.proxima_acampada.fecha_inicio)
                    : ""
            ],
            [
                "Cumpleaños esta semana",
                resumen.cumpleanos?.length || 0,
                resumen.cumpleanos?.map((cumple) =>
                    `${cumple.nombre} (${this.formatearFecha(cumple.fecha)})`
                ).join(", ") || "Ninguno"
            ]
        ];
        tarjetas.forEach(([nombre, valor, detalle]) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "dashboard-info-tarjeta";
            tarjeta.innerHTML = `<strong></strong><b></b><span></span>`;
            tarjeta.querySelector("strong").textContent = nombre;
            tarjeta.querySelector("b").textContent = valor;
            tarjeta.querySelector("span").textContent = detalle;
            zona.appendChild(tarjeta);
        });
        if (resumen.proxima_acampada) {
            const acampada = zona.querySelectorAll(
                ".dashboard-info-tarjeta"
            )[2];
            acampada.querySelector("span").textContent =
                this.tiempoHasta(resumen.proxima_acampada.fecha_inicio);
        }
        return zona;
    }

    renderAsistenciasSabado(datos = {}) {
        const zona = document.createElement("section");
        zona.className = "dashboard-bloque";
        const titulo = document.createElement("h3");
        titulo.textContent = datos.evento
            ? `Asistencias: ${datos.evento.nombre}`
            : "Asistencias del próximo sábado";
        zona.appendChild(titulo);
        if (!datos.evento) {
            const mensaje = document.createElement("p");
            mensaje.textContent = "No hay un sábado próximo configurado.";
            zona.appendChild(mensaje);
            return zona;
        }
        const tabla = document.createElement("table");
        tabla.className = "tabla-dashboard";
        tabla.innerHTML = "<thead><tr><th>Sección</th><th>Sí</th>" +
            "<th>No</th><th>Pendientes</th></tr></thead>";
        const cuerpo = document.createElement("tbody");
        Object.entries(datos.secciones || {}).forEach(([seccion, estados]) => {
            const fila = document.createElement("tr");
            fila.innerHTML = "<td></td><td></td><td></td><td></td>";
            fila.children[0].textContent = seccion;
            fila.children[1].textContent = estados.si || 0;
            fila.children[2].textContent = estados.no || 0;
            fila.children[3].textContent = estados.pendiente || 0;
            cuerpo.appendChild(fila);
        });
        tabla.appendChild(cuerpo);
        zona.appendChild(tabla);
        return zona;
    }

    renderPanelTutor(datos = {}, eventos = []) {
        const zona = document.createElement("section");
        zona.className = "dashboard-bloque dashboard-tutor";
        const titulo = document.createElement("h3");
        titulo.textContent = "Pendientes y calendario";
        zona.appendChild(titulo);
        const pendientes = document.createElement("div");
        pendientes.className = "dashboard-pendientes";
        [
            ["Circulares sin rellenar", datos.circulares_pendientes || 0],
            ["Asistencias sin confirmar", datos.asistencias_pendientes || 0]
        ].forEach(([nombre, valor]) => {
            const elemento = document.createElement("article");
            elemento.innerHTML = "<strong></strong><b></b>";
            elemento.querySelector("strong").textContent = nombre;
            elemento.querySelector("b").textContent = valor;
            pendientes.appendChild(elemento);
        });
        zona.appendChild(pendientes);
        const calendario = document.createElement("div");
        calendario.className = "mini-calendario";
        eventos.forEach((evento) => {
            const dia = document.createElement("div");
            dia.innerHTML = "<b></b><span></span>";
            dia.querySelector("b").textContent =
                this.formatearFecha(evento.fecha);
            dia.querySelector("span").textContent = evento.nombre;
            calendario.appendChild(dia);
        });
        if (!eventos.length) {
            calendario.textContent = "No hay eventos próximos.";
        }
        zona.appendChild(calendario);
        return zona;
    }

    formatearFecha(valor) {
        return new Date(String(valor).replace(" ", "T"))
            .toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
    }

    tiempoHasta(valor) {
        const diferencia = new Date(String(valor).replace(" ", "T")) - new Date();
        if (diferencia <= 0) {
            return "Ya ha comenzado";
        }
        const dias = Math.ceil(diferencia / 86400000);
        return `Faltan ${dias} día${dias === 1 ? "" : "s"} (${this.formatearFecha(valor)})`;
    }
}
