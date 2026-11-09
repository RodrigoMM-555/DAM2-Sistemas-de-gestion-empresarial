class IngeriarFormulario {
    constructor({
        contenedor = "#contenedor-formulario",
        modal = "#modal-formulario",
        utilidades,
        alGuardar
    }) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.modal = typeof modal === "string"
            ? document.querySelector(modal)
            : modal;
        this.utilidades = utilidades;
        this.alGuardar = alGuardar;
        this.tabla = "";
        this.clavePrimaria = "id";
        this.formulario = null;
        this.ultimoElementoActivo = null;
        this.controlEducandos = null;
        this.controlSecciones = null;

        this.modal.querySelector(".modal-cerrar")
            .addEventListener("click", () => this.cerrar());
        this.modal.querySelector(".modal-fondo")
            .addEventListener("click", () => this.cerrar());
        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && !this.modal.hidden) {
                this.cerrar();
            }
        });
    }

    mostrar(registro = null, clavePrimaria = "id") {
        this.modal.classList.remove("modal-asistencia");
        this.tabla = tablaActual;
        this.clavePrimaria = clavePrimaria || "id";
        this.ultimoElementoActivo = document.activeElement;
        this.controlEducandos = null;
        this.controlSecciones = null;
        return this.obtenerColumnas().then((columnas) => {
            const columnasEditables = columnas.filter(
                (columna) => columna.pk === 0 &&
                    !(this.tabla === "facturas" &&
                        columna.name === "imagen_factura") &&
                    !(this.tabla === "eventos" &&
                        columna.name === "seccion")
            );
            this.contenedor.innerHTML = "";
            let titulo = document.createElement("h2");
            titulo.id = "modal-formulario-titulo";
            titulo.textContent = registro === null
                ? "Nuevo " + this.utilidades.capitalizar(this.tabla)
                : "Editar " + this.utilidades.capitalizar(this.tabla);
            this.contenedor.appendChild(titulo);

            this.formulario = document.createElement("form");
            this.formulario.className =
                "formulario vista-superficie vista-formulario";
            const controlEducandos = this.tabla === "usuarios"
                ? this.crearControlEducandos(registro)
                : Promise.resolve(null);
            const controlImagenFactura = this.tabla === "facturas"
                ? this.crearControlImagenFactura()
                : Promise.resolve(null);
            const controlSecciones = this.tabla === "eventos"
                ? this.crearControlSecciones(registro)
                : Promise.resolve(null);
            let acciones = document.createElement("div");
            acciones.className = "acciones-formulario";
            let guardar = document.createElement("button");
            guardar.type = "submit";
            guardar.textContent = "Guardar";
            guardar.className = "boton boton-crear";
            let cancelar = document.createElement("button");
            cancelar.type = "button";
            cancelar.textContent = "Cancelar";
            cancelar.className = "boton boton-cancelar";
            cancelar.onclick = () => this.cerrar();
            acciones.append(guardar, cancelar);

            return Promise.all([
                ...columnasEditables.map((columna) =>
                    this.crearControl(columna, registro)
                ),
                controlEducandos,
                controlImagenFactura,
                controlSecciones
            ]).then((controles) => {
                controles.forEach((control) =>
                    control && this.formulario.appendChild(control)
                );
                this.formulario.appendChild(acciones);
                this.formulario.onsubmit = (evento) =>
                    this.guardar(evento, columnasEditables, registro);
                this.contenedor.appendChild(this.formulario);
                this.modal.hidden = false;
                document.body.classList.add("modal-abierto");
                guardar.focus();
            });
        });
    }

    cerrar() {
        this.modal.hidden = true;
        this.contenedor.replaceChildren();
        document.body.classList.remove("modal-abierto");
        if (this.ultimoElementoActivo instanceof HTMLElement) {
            this.ultimoElementoActivo.focus();
        }
        this.ultimoElementoActivo = null;
    }

    obtenerColumnas() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=columnas&tabla=" +
            encodeURIComponent(this.tabla)
        );
    }

    plantilla(columna) {
        if (
            columna.tipo_formulario === "ENUM" ||
            columna.tipo_formulario === "BOOLEAN" ||
            this.esRelacion(columna)
        ) {
            return document.querySelector("#plantilla-select");
        }
        let tipo = columna.type.toUpperCase();
        if (tipo.includes("DATETIME") || tipo.includes("TIMESTAMP")) {
            return document.querySelector("#plantilla-datetime");
        }
        if (tipo.includes("DATE")) {
            return document.querySelector("#plantilla-date");
        }
        if (
            tipo.includes("INT") || tipo.includes("REAL") ||
            tipo.includes("NUM") || tipo.includes("DEC") ||
            tipo.includes("FLOA") || tipo.includes("DOUB")
        ) {
            return document.querySelector("#plantilla-number");
        }
        return document.querySelector("#plantilla-input");
    }

    crearControl(columna, registro) {
        let instancia = this.plantilla(columna).content.cloneNode(true);
        let etiqueta = instancia.querySelector("label");
        let control = instancia.querySelector("input, select");
        etiqueta.textContent = this.utilidades.capitalizar(columna.name);
        control.name = columna.name;
        control.required = columna.required;

        let limite = this.utilidades.limiteTexto(columna.type);
        if (limite !== null && control.tagName === "INPUT") {
            control.maxLength = limite;
        }

        if (control.tagName !== "SELECT") {
            control.value = registro?.[columna.name]
                ?? columna.defaultValue
                ?? "";
            return Promise.resolve(instancia);
        }

        const relacion = this.obtenerRelacion(columna);
        let opciones = columna.tipo_formulario === "BOOLEAN"
            ? Promise.resolve([
                {valor: "0", etiqueta: "No"},
                {valor: "1", etiqueta: "Sí"}
            ])
            : relacion !== null
            ? this.obtenerOpcionesRelacion(relacion, columna).then((registros) =>
                registros.map((registroRelacionado) => ({
                    valor: registroRelacionado[relacion.campo_valor],
                    etiqueta: this.etiquetaRelacion(registroRelacionado)
                }))
            )
            : Promise.resolve(columna.options.map((valor) => ({
                valor,
                etiqueta: this.utilidades.capitalizar(valor)
            })));

        return opciones.then((valores) => {
            if (!columna.required) {
                valores.unshift({
                    valor: "",
                    etiqueta: this.tabla === "eventos" &&
                        columna.name === "seccion"
                        ? "Todas"
                        : "-- Sin asignar --"
                });
            }

            valores.forEach((opcion) => {
                let elemento = document.createElement("option");
                elemento.value = opcion.valor;
                elemento.textContent = opcion.etiqueta;
                control.appendChild(elemento);
            });
            const valorActual = registro?.[columna.name]
                ?? columna.defaultValue;
            const valorInicial = columna.tipo_formulario === "BOOLEAN"
                ? (["1", 1, true, "true"].includes(valorActual)
                    ? "1" : "0")
                : (valorActual ?? (columna.required
                    ? valores[0]?.valor ?? ""
                    : ""));
            control.value = valorInicial;
            return instancia;
        });
    }

    crearControlImagenFactura() {
        const grupo = document.createElement("div");
        grupo.className = "campo";
        const etiqueta = document.createElement("label");
        etiqueta.textContent = "Imagen de la factura";
        const control = document.createElement("input");
        control.type = "file";
        control.name = "imagen_factura";
        control.accept = "image/jpeg,image/png,image/webp";
        grupo.append(etiqueta, control);
        return Promise.resolve(grupo);
    }

    crearControlSecciones(registro) {
        const secciones = ["colonia", "manada", "tropa", "posta", "rutas"];
        const convocadas = new Set(registro?.convocatorias || []);
        const grupo = document.createElement("fieldset");
        grupo.className = "campo campo-secciones";
        const leyenda = document.createElement("legend");
        leyenda.textContent = "Secciones convocadas";
        grupo.appendChild(leyenda);

        const todas = document.createElement("label");
        todas.className = "opcion-seccion";
        const todasControl = document.createElement("input");
        todasControl.type = "checkbox";
        todasControl.name = "convocatorias_todas";
        todasControl.checked = registro === null || convocadas.size === 0;
        todas.append(todasControl, " Todas las secciones");
        grupo.appendChild(todas);

        secciones.forEach((seccion) => {
            const opcion = document.createElement("label");
            opcion.className = "opcion-seccion";
            const control = document.createElement("input");
            control.type = "checkbox";
            control.name = "convocatorias";
            control.value = seccion;
            control.checked = convocadas.has(seccion);
            control.disabled = todasControl.checked;
            opcion.append(control, " " + this.utilidades.capitalizar(seccion));
            grupo.appendChild(opcion);
        });
        todasControl.addEventListener("change", () => {
            grupo.querySelectorAll('input[name="convocatorias"]')
                .forEach((control) => {
                    control.disabled = todasControl.checked;
                    if (todasControl.checked) {
                        control.checked = false;
                    }
                });
        });
        this.controlSecciones = grupo;
        return Promise.resolve(grupo);
    }

    obtenerRelacion(columna) {
        if (columna.relation !== null) {
            return columna.relation;
        }
        const relaciones = {
            "eventos.id_responsable": {
                tabla: "usuarios",
                campo_valor: "id"
            },
            "facturas.responsable_id": {
                tabla: "usuarios",
                campo_valor: "id"
            }
        };
        return relaciones[this.tabla + "." + columna.name] || null;
    }

    esRelacion(columna) {
        return this.obtenerRelacion(columna) !== null;
    }

    crearControlEducandos(registro) {
        return Promise.all([
            this.obtenerOpcionesTabla("educandos"),
            registro
                ? this.utilidades.obtenerJson(
                    "api/superapi.php?ruta=educandos_usuario&usuario=" +
                    encodeURIComponent(registro.id)
                )
                : Promise.resolve([])
        ]).then(([educandos, seleccionados]) => {
            const grupo = document.createElement("div");
            grupo.className = "campo";
            const etiqueta = document.createElement("label");
            etiqueta.textContent = "Educandos relacionados";
            const control = document.createElement("select");
            control.name = "educandos_relacionados";
            control.multiple = true;
            control.size = Math.min(Math.max(educandos.length, 4), 8);
            const idsSeleccionados = new Set(
                seleccionados.map((educando) => String(educando.id))
            );
            educandos.forEach((educando) => {
                const opcion = document.createElement("option");
                opcion.value = educando.id;
                opcion.textContent = this.etiquetaRelacion(educando);
                opcion.selected = idsSeleccionados.has(String(educando.id));
                control.appendChild(opcion);
            });
            grupo.append(etiqueta, control);
            this.controlEducandos = control;
            return grupo;
        });
    }

    obtenerOpcionesTabla(tabla) {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=tabla&tabla=" + encodeURIComponent(tabla)
        ).then((datos) => datos.registros || []);
    }

    obtenerOpcionesRelacion(relacion, columna) {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=tabla&tabla=" +
            encodeURIComponent(relacion.tabla)
        ).then((datos) => this.filtrarRelaciones(
            datos.registros,
            columna
        ));
    }

    etiquetaRelacion(relacion) {
        const nombreCompleto = [relacion.nombre, relacion.apellidos]
            .filter(Boolean)
            .join(" ");
        return nombreCompleto
            || relacion.descripcion
            || relacion.email
            || relacion.id;
    }

    filtrarRelaciones(registros, columna) {
        let filtros = {
            "eventos.id_responsable": {
                rol: ["scouter", "administrador"]
            },
            "facturas.responsable_id": {
                rol: ["scouter"]
            }
        };
        let filtro = filtros[this.tabla + "." + columna.name];

        if (!filtro) {
            return registros;
        }

        return registros.filter((registro) =>
            Object.entries(filtro).every(([campo, valores]) =>
                valores.includes(registro[campo])
            )
        );
    }

    guardar(evento, columnas, registro) {
        evento.preventDefault();
        let datos = {};
        columnas.forEach((columna) => {
            let valor = this.formulario.elements[columna.name].value;
            datos[columna.name] =
                valor === "" && !columna.required ? null : valor;
        });
        if (this.controlEducandos) {
            datos.educandos_relacionados = Array.from(
                this.controlEducandos.selectedOptions
            ).map((opcion) => Number(opcion.value));
        }
        if (this.controlSecciones) {
            const todas = this.controlSecciones.querySelector(
                '[name="convocatorias_todas"]'
            ).checked;
            const seleccionadas = Array.from(
                this.controlSecciones.querySelectorAll(
                    '[name="convocatorias"]'
                )
            ).filter((control) => control.checked);
            if (!todas && seleccionadas.length === 0) {
                alert("Selecciona al menos una sección o marca Todas.");
                return Promise.resolve();
            }
            datos.convocatorias = todas
                ? []
                : seleccionadas
                    .map((control) => control.value);
        }

        let formData = new FormData();
        formData.append("tabla", this.tabla);
        formData.append("datos", JSON.stringify(datos));
        if (this.tabla === "facturas") {
            const imagen = this.formulario.elements.imagen_factura.files[0];
            if (imagen) {
                formData.append("imagen_factura", imagen);
            }
        }
        let ruta = "crear";
        if (registro !== null) {
            ruta = "editar";
            formData.append(
                "id",
                registro[this.clavePrimaria]
            );
            formData.append("primaryKey", this.clavePrimaria);
        }
        return this.utilidades.enviarFormulario(
            "api/superapi.php?ruta=" + ruta,
            formData
        ).then(() => Promise.resolve(this.alGuardar()))
            .then(() => this.cerrar());
    }

}
