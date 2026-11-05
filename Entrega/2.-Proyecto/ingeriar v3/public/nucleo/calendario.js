class IngeriarCalendario {
    constructor({contenedor = "section", utilidades, formulario}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.formulario = formulario;
        this.eventos = [];
        this.tabla = "eventos";
        this.fechaActual = new Date();
        this.fechaSeleccionada = this.formatearFecha(this.fechaActual);
    }

    cargar(tabla = "eventos") {
        this.tabla = tabla;
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=tabla&tabla=" +
            encodeURIComponent(tabla)
        ).then((datos) => {
            this.eventos = datos.registros || [];
            this.render();
        });
    }

    formatearFecha(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    obtenerEventos(fecha) {
        return this.eventos.filter((evento) => {
            const inicio = evento.fecha_inicio?.substring(0, 10);
            const final = evento.fecha_fin?.substring(0, 10);
            return inicio && final && inicio <= fecha && fecha <= final;
        });
    }

    render() {
        const año = this.fechaActual.getFullYear();
        const mes = this.fechaActual.getMonth();
        const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;
        const diasMes = new Date(año, mes + 1, 0).getDate();
        const hoy = this.formatearFecha(new Date());

        this.contenedor.replaceChildren();

        const cabecera = document.createElement("div");
        cabecera.className = "cabecera-calendario";
        const anterior = this.crearBoton("Mes anterior", "‹");
        const titulo = document.createElement("h2");
        titulo.textContent = this.fechaActual.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric"
        });
        const siguiente = this.crearBoton("Mes siguiente", "›");
        cabecera.append(anterior, titulo, siguiente);

        const grid = document.createElement("div");
        grid.className = "calendario-grid";
        ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
            .forEach((dia) => {
                const elemento = document.createElement("div");
                elemento.className = "cal-dia-semana";
                elemento.textContent = dia;
                grid.appendChild(elemento);
            });

        for (let i = 0; i < primerDia; i++) {
            const vacio = document.createElement("div");
            vacio.className = "cal-dia-vacio";
            grid.appendChild(vacio);
        }

        for (let dia = 1; dia <= diasMes; dia++) {
            const fecha = this.formatearFecha(new Date(año, mes, dia));
            const celda = document.createElement("div");
            celda.className = "cal-dia";
            celda.dataset.fecha = fecha;
            if (fecha === hoy) {
                celda.classList.add("cal-hoy");
            }
            if (fecha === this.fechaSeleccionada) {
                celda.classList.add("cal-seleccionado");
            }

            const numero = document.createElement("span");
            numero.className = "cal-numero";
            numero.textContent = String(dia);
            celda.appendChild(numero);

            const eventos = document.createElement("div");
            eventos.className = "cal-eventos";
            this.obtenerEventos(fecha).forEach((evento) => {
                const elemento = document.createElement("button");
                elemento.type = "button";
                elemento.className = "cal-evento";
                elemento.textContent = evento.nombre || "Evento";
                elemento.title = "Editar " + (evento.nombre || "evento");
                elemento.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.editarEvento(evento);
                });
                eventos.appendChild(elemento);
            });
            celda.appendChild(eventos);
            celda.addEventListener("click", () => this.seleccionarFecha(fecha));
            grid.appendChild(celda);
        }

        const principal = document.createElement("div");
        principal.className = "calendario-principal";
        principal.append(cabecera, grid);

        const calendario = document.createElement("div");
        calendario.className = "contenedor-calendario";
        calendario.appendChild(principal);
        this.contenedor.appendChild(calendario);
        this.renderizarSeleccion();

        anterior.addEventListener("click", () => {
            this.fechaActual.setDate(1);
            this.fechaActual.setMonth(this.fechaActual.getMonth() - 1);
            this.render();
        });
        siguiente.addEventListener("click", () => {
            this.fechaActual.setDate(1);
            this.fechaActual.setMonth(this.fechaActual.getMonth() + 1);
            this.render();
        });
    }

    crearBoton(etiqueta, texto) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "boton boton-navegacion-calendario";
        boton.setAttribute("aria-label", etiqueta);
        boton.textContent = texto;
        return boton;
    }

    seleccionarFecha(fecha) {
        this.fechaSeleccionada = fecha;
        this.render();
    }

    renderizarSeleccion() {
        const panel = document.createElement("div");
        panel.className = "detalle-calendario";
        const titulo = document.createElement("h3");
        titulo.textContent = new Date(this.fechaSeleccionada + "T12:00:00")
            .toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        panel.appendChild(titulo);

        const nuevo = document.createElement("button");
        nuevo.type = "button";
        nuevo.className = "boton boton-crear";
        nuevo.textContent = "Nuevo evento";
        nuevo.addEventListener("click", () => this.crearEvento());
        panel.appendChild(nuevo);

        this.obtenerEventos(this.fechaSeleccionada).forEach((evento) => {
            const fila = document.createElement("div");
            fila.className = "detalle-evento";
            const nombre = document.createElement("span");
            nombre.textContent = evento.nombre || "Evento";
            const editar = document.createElement("button");
            editar.type = "button";
            editar.className = "boton boton-editar";
            editar.textContent = "Editar";
            editar.addEventListener("click", () => this.editarEvento(evento));
            const borrar = document.createElement("button");
            borrar.type = "button";
            borrar.className = "boton boton-borrar";
            borrar.textContent = "Borrar";
            borrar.addEventListener("click", () => this.borrarEvento(evento));
            fila.append(nombre, editar, borrar);
            panel.appendChild(fila);
        });

        this.contenedor
            .querySelector(".contenedor-calendario")
            .appendChild(panel);
    }

    prepararFormulario() {
        tablaActual = this.tabla;
        vistaActual = "calendario";
    }

    crearEvento() {
        this.prepararFormulario();
        this.formulario.mostrar(null, "id");
    }

    editarEvento(evento) {
        this.prepararFormulario();
        this.formulario.mostrar(evento, "id");
    }

    borrarEvento(evento) {
        if (!confirm("¿Seguro que quieres borrar este evento?")) {
            return;
        }

        const datos = new FormData();
        datos.append("tabla", this.tabla);
        datos.append("id", evento.id);
        datos.append("primaryKey", "id");

        return this.utilidades.enviarFormulario(
            "api/superapi.php?ruta=borrar",
            datos
        ).then(() => this.cargar(this.tabla));
    }
}
