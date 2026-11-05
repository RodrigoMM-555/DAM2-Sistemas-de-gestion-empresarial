class IngeriarCalendario {
    constructor({contenedor = "section", utilidades, formulario}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.formulario = formulario;
        this.usuario = null;
        this.eventos = [];
        this.tabla = "eventos";
        this.fechaActual = new Date();
        this.fechaSeleccionada = this.formatearFecha(this.fechaActual);
    }

    establecerUsuario(usuario) {
        this.usuario = usuario;
    }

    esTutor() {
        return this.usuario?.rol === "tutor";
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

    obtenerEventosMes() {
        const año = this.fechaActual.getFullYear();
        const mes = this.fechaActual.getMonth();
        const inicio = this.formatearFecha(new Date(año, mes, 1));
        const fin = this.formatearFecha(new Date(año, mes + 1, 0));
        return this.eventos.filter((evento) => {
            const fechaInicio = evento.fecha_inicio?.substring(0, 10);
            const fechaFin = evento.fecha_fin?.substring(0, 10);
            return fechaInicio && fechaFin && fechaInicio <= fin && fechaFin >= inicio;
        }).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
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
                elemento.title = this.esTutor()
                    ? "Indicar asistencia"
                    : "Editar " + (evento.nombre || "evento");
                elemento.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.esTutor()
                        ? this.mostrarAsistencias(evento)
                        : this.editarEvento(evento);
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
        titulo.textContent = this.fechaActual.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric"
        });
        panel.appendChild(titulo);

        if (!this.esTutor()) {
            const nuevo = document.createElement("button");
            nuevo.type = "button";
            nuevo.className = "boton boton-crear";
            nuevo.textContent = "Nuevo evento";
            nuevo.addEventListener("click", () => this.crearEvento());
            panel.appendChild(nuevo);
        }

        this.obtenerEventosMes().forEach((evento) => {
            const fila = document.createElement("div");
            fila.className = "detalle-evento";
            const nombre = document.createElement("span");
            nombre.textContent = evento.nombre || "Evento";
            const accion = document.createElement("button");
            accion.type = "button";
            accion.className = "boton " + (this.esTutor()
                ? "boton-crear" : "boton-editar");
            accion.textContent = this.esTutor() ? "+ Asistencia" : "Editar";
            accion.addEventListener("click", () => this.esTutor()
                ? this.mostrarAsistencias(evento)
                : this.editarEvento(evento));
            fila.append(nombre, accion);
            if (!this.esTutor()) {
                const borrar = document.createElement("button");
                borrar.type = "button";
                borrar.className = "boton boton-borrar";
                borrar.textContent = "Borrar";
                borrar.addEventListener("click", () => this.borrarEvento(evento));
                fila.appendChild(borrar);
            }
            panel.appendChild(fila);
        });

        this.contenedor
            .querySelector(".contenedor-calendario")
            .appendChild(panel);
    }

    eventoPasado(evento) {
        return evento.fecha_fin && new Date(evento.fecha_fin.replace(" ", "T")) < new Date();
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

    mostrarAsistencias(evento) {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=asistencia_tutor&evento=" + evento.id
        ).then((asistencias) => {
            this.formulario.modal.hidden = false;
            document.body.classList.add("modal-abierto");
            this.formulario.contenedor.replaceChildren();

            const titulo = document.createElement("h2");
            titulo.id = "modal-formulario-titulo";
            titulo.textContent = "Asistencia: " + evento.nombre;
            this.formulario.contenedor.appendChild(titulo);

            const tabla = document.createElement("table");
            tabla.className = "tabla-asistencias";
            const cabecera = document.createElement("thead");
            cabecera.innerHTML = `
                <tr>
                    <th>Educando</th>
                    <th>Sección</th>
                    <th>Estado</th>
                    <th>Asistencia</th>
                    <th>Circular / entrega</th>
                </tr>`;
            tabla.appendChild(cabecera);
            const cuerpo = document.createElement("tbody");
            tabla.appendChild(cuerpo);
            this.formulario.contenedor.appendChild(tabla);
            const eventoPasado = this.eventoPasado(evento);
            if (eventoPasado) {
                const aviso = document.createElement("p");
                aviso.textContent = "Este evento ya ha terminado; solo puedes consultar la información.";
                aviso.className = "aviso-asistencia";
                this.formulario.contenedor.insertBefore(aviso, tabla);
            }

            asistencias.forEach((asistencia) => {
                const fila = document.createElement("tr");
                if (asistencia.seccion) {
                    fila.className = "fila-seccion-" + asistencia.seccion;
                }
                const nombre = document.createElement("td");
                nombre.textContent = asistencia.nombre + " " + asistencia.apellidos;
                const seccion = document.createElement("td");
                seccion.className = "celda-seccion";
                seccion.textContent = asistencia.seccion || "Sin determinar";
                const estado = document.createElement("td");
                const estadoTexto = document.createElement("span");
                estadoTexto.className = "estado-asistencia";
                estadoTexto.textContent = asistencia.estado === "pendiente"
                    ? "Pendiente"
                    : asistencia.estado === "si" ? "Confirmada" : "No asiste";
                estado.appendChild(estadoTexto);

                const respuesta = document.createElement("td");
                ["si", "no"].forEach((valor) => {
                    const etiqueta = document.createElement("label");
                    etiqueta.className = "opcion-asistencia";
                    const radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = "asistencia-" + asistencia.educando_id;
                    radio.value = valor;
                    radio.checked = asistencia.estado === valor;
                    radio.disabled = eventoPasado;
                    radio.addEventListener("change", () => {
                        asistencia.estado = valor;
                        estadoTexto.textContent = valor === "si"
                            ? "Confirmada" : "No asiste";
                        this.utilidades.enviarJson(
                            "api/superapi.php?ruta=asistencia_tutor",
                            {
                                evento: evento.id,
                                educando: asistencia.educando_id,
                                estado: valor
                            }
                        ).catch((error) => {
                            estadoTexto.textContent = error.message;
                        });
                        actualizarEntrega();
                    });
                    etiqueta.append(radio, valor === "si" ? " Sí" : " No");
                    respuesta.appendChild(etiqueta);
                });

                const entrega = document.createElement("td");
                const actualizarEntrega = () => {
                    entrega.replaceChildren();
                    if (!evento.circular || asistencia.estado !== "si") {
                        entrega.textContent = evento.circular
                            ? "No requiere entrega" : "Sin circular";
                        return;
                    }
                    if (evento.circular) {
                        const descarga = document.createElement("a");
                        descarga.href = "api/archivo.php?tipo=circular&evento=" + evento.id;
                        descarga.textContent = "Descargar circular";
                        descarga.target = "_blank";
                        entrega.appendChild(descarga);
                    }
                    const subida = document.createElement("input");
                    subida.type = "file";
                    subida.accept = ".pdf,.jpg,.jpeg,.png,.docx";
                    subida.disabled = eventoPasado;
                    subida.addEventListener("change", () => {
                        if (!subida.files[0]) {
                            return;
                        }
                        const datos = new FormData();
                        datos.append("archivo", subida.files[0]);
                        fetch(
                            "api/archivo.php?tipo=entrega&evento=" +
                            evento.id + "&educando=" + asistencia.educando_id,
                            {method: "POST", body: datos}
                        ).then((respuesta) => {
                            if (!respuesta.ok) {
                                return respuesta.text().then((mensaje) => {
                                    throw new Error(mensaje);
                                });
                            }
                            asistencia.archivo_entrega = true;
                            actualizarEntrega();
                        }).catch((error) => {
                            entrega.append(" " + error.message);
                        });
                    });
                    entrega.append(subida);
                    if (asistencia.archivo_entrega) {
                        const archivo = document.createElement("a");
                        archivo.href = "api/archivo.php?tipo=entrega&evento=" +
                            evento.id + "&educando=" + asistencia.educando_id;
                        archivo.textContent = " Ver entrega";
                        archivo.target = "_blank";
                        entrega.appendChild(archivo);
                    }
                };
                actualizarEntrega();
                fila.append(nombre, seccion, estado, respuesta, entrega);
                cuerpo.appendChild(fila);
            });
        });
    }
}
