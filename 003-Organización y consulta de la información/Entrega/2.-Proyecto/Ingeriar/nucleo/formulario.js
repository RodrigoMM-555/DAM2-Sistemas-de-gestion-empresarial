class IngeriarFormulario {
    constructor({contenedor = "section", utilidades, alGuardar}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
        this.utilidades = utilidades;
        this.alGuardar = alGuardar;
        this.tabla = "";
        this.clavePrimaria = "id";
        this.formulario = null;
    }

    mostrar(registro = null, clavePrimaria = "id") {
        this.tabla = tablaActual;
        this.clavePrimaria = clavePrimaria || "id";
        return this.obtenerColumnas().then((columnas) => {
            const columnasEditables = columnas.filter(
                (columna) => columna.pk === 0
            );
            this.contenedor.innerHTML = "";
            let titulo = document.createElement("h2");
            titulo.textContent = registro === null
                ? "Nuevo " + this.utilidades.capitalizar(this.tabla)
                : "Editar " + this.utilidades.capitalizar(this.tabla);
            this.contenedor.appendChild(titulo);

            this.formulario = document.createElement("form");
            this.formulario.className = "formulario";
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
            cancelar.onclick = () => this.alGuardar();
            acciones.append(guardar, cancelar);

            return Promise.all(columnasEditables.map((columna) =>
                this.crearControl(columna, registro)
            )).then((controles) => {
                controles.forEach((control) =>
                    this.formulario.appendChild(control)
                );
                this.formulario.appendChild(acciones);
                this.formulario.onsubmit = (evento) =>
                    this.guardar(evento, columnasEditables, registro);
                this.contenedor.appendChild(this.formulario);
            });
        });
    }

    obtenerColumnas() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=columnas&tabla=" +
            encodeURIComponent(this.tabla)
        );
    }

    plantilla(columna) {
        if (columna.tipo_formulario === "ENUM") {
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

        let opciones = columna.relation !== null
            ? this.obtenerOpcionesRelacion(columna).then((registros) =>
                registros.map((relacion) => ({
                    valor: relacion[columna.relation.campo_valor],
                    etiqueta: [relacion.nombre, relacion.apellidos]
                        .filter(Boolean)
                        .join(" ") || relacion.nombre || relacion.id
                }))
            )
            : Promise.resolve(columna.options.map((valor) => ({
                valor,
                etiqueta: this.utilidades.capitalizar(valor)
            })));

        return opciones.then((valores) => {
            if (!columna.required) {
                valores.unshift({valor: "", etiqueta: "-- Sin asignar --"});
            }
            valores.forEach((opcion) => {
                let elemento = document.createElement("option");
                elemento.value = opcion.valor;
                elemento.textContent = opcion.etiqueta;
                control.appendChild(elemento);
            });
            control.value = registro?.[columna.name]
                ?? columna.defaultValue
                ?? "";
            return instancia;
        });
    }

    obtenerOpcionesRelacion(columna) {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=tabla&tabla=" +
            encodeURIComponent(columna.relation.tabla)
        ).then((datos) => datos.registros);
    }

    guardar(evento, columnas, registro) {
        evento.preventDefault();
        let datos = {};
        columnas.forEach((columna) => {
            let valor = this.formulario.elements[columna.name].value;
            datos[columna.name] =
                valor === "" && !columna.required ? null : valor;
        });

        let formData = new FormData();
        formData.append("tabla", this.tabla);
        formData.append("datos", JSON.stringify(datos));
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
        ).then(() => this.alGuardar());
    }

}
