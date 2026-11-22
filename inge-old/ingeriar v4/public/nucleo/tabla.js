class IngeriarTabla {
    constructor({contenedor = "section", utilidades, formulario, exportacion}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.formulario = formulario;
        this.exportacion = exportacion;
        this.tabla = "";
    }

    cargar(tabla) {
        this.tabla = tabla;
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=tabla&tabla=" +
            encodeURIComponent(tabla)
        ).then((datos) => {
            this.render(datos);
        });
    }

    nombreSeccion(codigo) {
        try {
            const secciones = JSON.parse(
                document.documentElement.dataset.secciones || "[]"
            );
            return secciones.find((seccion) => seccion.codigo === codigo)
                ?.nombre || codigo;
        } catch (error) {
            return codigo;
        }
    }

    render(datos) {
        const registros = datos.registros || [];
        const columnas = datos.columnas || [];
        this.contenedor.className = "vista vista-tabla";
        this.contenedor.innerHTML = "";

        let cabecera = document.createElement("div");
        cabecera.className = "cabecera-tabla";
        let titulo = document.createElement("h2");
        titulo.textContent = this.utilidades.capitalizar(this.tabla);
        if (usuarioActual?.rol === "administrador") {
            let exportacion = document.createElement("div");
            exportacion.className = "controles-exportacion";
            let formato = document.createElement("select");
            formato.className = "selector-exportacion";
            formato.setAttribute("aria-label", "Formato de exportación");
            [
                ["", "Exportar como..."],
                ["imprimir", "Imprimir"],
                ["html", "HTML"],
                ["json", "JSON"],
                ["csv", "CSV"]
            ].forEach(([valor, texto]) => {
                let opcion = document.createElement("option");
                opcion.value = valor;
                opcion.textContent = texto;
                formato.appendChild(opcion);
            });
            let botonExportar = document.createElement("button");
            botonExportar.textContent = "Exportar";
            botonExportar.className = "boton boton-exportar";
            exportacion.append(formato, botonExportar);
            this.exportacion.conectarControles(formato, botonExportar);
            cabecera.append(titulo, exportacion);
        } else {
            cabecera.appendChild(titulo);
        }
        this.contenedor.appendChild(cabecera);

        let filtros = document.createElement("div");
        filtros.className = "filtros-tabla";
        let controlesFiltro = document.createElement("div");
        controlesFiltro.className = "controles-filtro";
        let nuevo = document.createElement("button");
        nuevo.textContent = "+ Nuevo";
        nuevo.className = "boton boton-crear";
        nuevo.onclick = () => this.formulario.mostrar(
            null,
            datos.primaryKey
        );
        if (usuarioActual?.rol === "tutor") {
            nuevo.hidden = true;
        }

        if (registros.length === 0) {
            filtros.appendChild(nuevo);
            this.contenedor.appendChild(filtros);
            let mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay registros en esta entidad.";
            this.contenedor.appendChild(mensaje);
            return;
        }

        let nombres = Object.keys(registros[0]).filter((nombre) =>
            (nombre !== "id" || usuarioActual?.rol === "administrador") &&
            !(this.tabla === "facturas" &&
                ["responsable_id", "imagen_factura"].includes(nombre))
        );
        let selector = document.createElement("select");
        selector.className = "selector-columna";
        let buscador = document.createElement("input");
        buscador.type = "search";
        buscador.placeholder = "Buscar...";
        buscador.className = "buscador-tabla";

        nombres.forEach((nombre, indice) => {
            let opcion = document.createElement("option");
            opcion.value = indice;
            opcion.textContent = nombre === "responsable_nombre"
                ? "Responsable"
                : this.utilidades.capitalizar(nombre);
            selector.appendChild(opcion);
        });
        controlesFiltro.append(selector, buscador);
        filtros.append(controlesFiltro, nuevo);
        this.contenedor.appendChild(filtros);

        let tabla = document.createElement("table");
        let cabeceraTabla = document.createElement("thead");
        let filaCabecera = document.createElement("tr");
        let cuerpo = document.createElement("tbody");

        nombres.forEach((nombre, indice) => {
            let th = document.createElement("th");
            th.textContent = (nombre === "responsable_nombre"
                ? "Responsable"
                : this.utilidades.capitalizar(nombre)) + "  ↕";
            let ascendente = true;
            th.onclick = () => {
                let filas = Array.from(cuerpo.querySelectorAll("tr"));
                filas.sort((filaA, filaB) => {
                    let valorA = filaA.children[indice].textContent;
                    let valorB = filaB.children[indice].textContent;
                    if (this.tabla === "educandos" && nombre === "seccion") {
                        const ordenSecciones = [
                            "colonia",
                            "manada",
                            "tropa",
                            "posta",
                            "rutas"
                        ];
                        const posicionA = ordenSecciones.indexOf(
                            valorA.toLowerCase()
                        );
                        const posicionB = ordenSecciones.indexOf(
                            valorB.toLowerCase()
                        );
                        const finalA = posicionA === -1
                            ? ordenSecciones.length
                            : posicionA;
                        const finalB = posicionB === -1
                            ? ordenSecciones.length
                            : posicionB;
                        return ascendente
                            ? finalA - finalB
                            : finalB - finalA;
                    }
                    return ascendente
                        ? valorA.localeCompare(valorB)
                        : valorB.localeCompare(valorA);
                });
                filas.forEach((fila) => cuerpo.appendChild(fila));
                ascendente = !ascendente;
            };
            filaCabecera.appendChild(th);
        });

        let acciones = document.createElement("th");
        acciones.textContent = "Acciones";
        filaCabecera.appendChild(acciones);
        cabeceraTabla.appendChild(filaCabecera);
        tabla.append(cabeceraTabla, cuerpo);

        registros.forEach((registro) => {
            let fila = document.createElement("tr");
            if (this.tabla === "educandos" && registro.seccion) {
                fila.className = "fila-seccion-" + registro.seccion;
            }
            nombres.forEach((nombre, indice) => {
                let celda = document.createElement("td");
                celda.textContent = registro[nombre] ?? "";
                if (this.tabla === "facturas" && nombre === "categoria") {
                    try {
                        const categorias = JSON.parse(
                            document.documentElement.dataset.categoriasFactura || "[]"
                        );
                        celda.textContent = categorias.find(
                            (categoria) => categoria.codigo === registro[nombre]
                        )?.nombre || registro[nombre] || "";
                    } catch (error) {
                        celda.textContent = registro[nombre] ?? "";
                    }
                }
                const columnaDestacada = usuarioActual?.rol === "tutor"
                    ? 0
                    : 1;
                if (this.tabla === "educandos" &&
                    indice === columnaDestacada) {
                    celda.classList.add("celda-destacada");
                }
                if (nombre === "seccion" && registro.seccion) {
                    celda.classList.add("celda-seccion");
                    celda.textContent = this.nombreSeccion(registro.seccion);
                }
                fila.appendChild(celda);
            });

            let celdaAcciones = document.createElement("td");
            celdaAcciones.className = "acciones";
            if (this.tabla === "educandos") {
                let info = document.createElement("button");
                info.textContent = "Ver documentación";
                info.className = "boton boton-editar";
                info.onclick = () => this.mostrarDocumentosEducando(registro);
                celdaAcciones.appendChild(info);
            }
            if (usuarioActual?.rol === "tutor") {
                fila.appendChild(celdaAcciones);
                cuerpo.appendChild(fila);
                return;
            }
            let editar = document.createElement("button");
            editar.textContent = "Editar";
            editar.className = "boton boton-editar";
            editar.onclick = () => this.formulario.mostrar(
                registro,
                datos.primaryKey
            );
            let borrar = document.createElement("button");
            borrar.textContent = "Borrar";
            borrar.className = "boton boton-borrar";
            borrar.onclick = () => this.borrar(
                registro[datos.primaryKey],
                datos.primaryKey
            );
            celdaAcciones.append(editar, borrar);
            fila.appendChild(celdaAcciones);
            cuerpo.appendChild(fila);
        });

        tabla.classList.add("vista-superficie");
        this.contenedor.appendChild(tabla);
        this.configurarFiltros(selector, buscador, cuerpo);
    }

    mostrarDocumentosEducando(educando) {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=educando_documentos&educando=" +
            encodeURIComponent(educando.id)
        ).then((documentos) => {
            const modal = document.querySelector("#modal-formulario");
            const contenedor = document.querySelector("#contenedor-formulario");
            contenedor.replaceChildren();
            const titulo = document.createElement("h2");
            titulo.textContent = "Circulares: " + educando.nombre + " " +
                educando.apellidos;
            contenedor.appendChild(titulo);
            const rejilla = document.createElement("div");
            rejilla.className = "rejilla-documentos";
            contenedor.appendChild(rejilla);
            if (!documentos.length) {
                const mensaje = document.createElement("p");
                mensaje.textContent = "No hay circulares subidas.";
                rejilla.appendChild(mensaje);
            }
            documentos.forEach((documento) => {
                const fila = document.createElement("article");
                fila.className = "documento-circular vista-superficie";
                const vista = document.createElement("div");
                vista.className = "documento-vista";
                const enlace = document.createElement("a");
                enlace.href = "api/archivo.php?tipo=entrega&evento=" +
                    documento.evento_id + "&educando=" + educando.id;
                enlace.target = "_blank";
                enlace.rel = "noopener";
                enlace.textContent = documento.evento + " (" +
                    documento.fecha_inicio.substring(0, 10) + ")";
                enlace.className = "documento-enlace";
                fila.append(vista, enlace);
                rejilla.appendChild(fila);
                this.crearVistaPrevia(
                    enlace.href.replace("tipo=entrega", "tipo=preview"),
                    vista
                );
            });
            modal.hidden = false;
            document.body.classList.add("modal-abierto");
        });
    }

    crearVistaPrevia(url, contenedor) {
        if (!window.Worker) {
            contenedor.textContent = "Vista previa no disponible";
            return;
        }
        const trabajador = new Worker("nucleo/documento-preview-worker.js");
        trabajador.onmessage = (evento) => {
            const resultado = evento.data;
            trabajador.terminate();
            if (resultado.kind === "image") {
                const imagen = document.createElement("img");
                imagen.src = URL.createObjectURL(resultado.blob);
                imagen.alt = "Vista previa del documento";
                contenedor.appendChild(imagen);
            } else if (resultado.kind === "pdf") {
                const marco = document.createElement("iframe");
                marco.src = url;
                marco.title = "Vista previa del PDF";
                contenedor.appendChild(marco);
            } else {
                contenedor.textContent = "Vista previa no disponible";
            }
        };
        trabajador.postMessage({url});
    }

    configurarFiltros(selector, buscador, cuerpo) {
        let mensaje = document.createElement("p");
        mensaje.className = "sin-datos";
        mensaje.textContent = "No hay coincidencias para la búsqueda.";
        mensaje.style.display = "none";
        this.contenedor.appendChild(mensaje);

        let filtrar = () => {
            let indice = Number(selector.value);
            let busqueda = buscador.value.toLowerCase().trim();
            let visibles = false;
            cuerpo.querySelectorAll("tr").forEach((fila) => {
                let coincide = fila.children[indice].textContent
                    .toLowerCase()
                    .includes(busqueda);
                fila.style.display = coincide ? "" : "none";
                visibles = visibles || coincide;
            });
            mensaje.style.display = visibles ? "none" : "";
        };
        buscador.addEventListener("input", filtrar);
        selector.addEventListener("change", filtrar);
    }

    borrar(id, primaryKey = "id") {
        if (!confirm("¿Seguro que quieres borrar este registro?")) {
            return;
        }
        let datos = new FormData();
        datos.append("tabla", this.tabla);
        datos.append("id", id);
        datos.append("primaryKey", primaryKey);
        return this.utilidades.enviarFormulario(
            "api/superapi.php?ruta=borrar",
            datos
        ).then(() => this.cargar(this.tabla));
    }
}
