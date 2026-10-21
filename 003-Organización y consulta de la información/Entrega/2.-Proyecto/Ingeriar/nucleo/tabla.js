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

    render(datos) {
        const registros = datos.registros || [];
        const columnas = datos.columnas || [];
        this.contenedor.innerHTML = "";

        let cabecera = document.createElement("div");
        cabecera.className = "cabecera-tabla";
        let titulo = document.createElement("h2");
        titulo.textContent = this.utilidades.capitalizar(this.tabla);
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

        if (registros.length === 0) {
            filtros.appendChild(nuevo);
            this.contenedor.appendChild(filtros);
            let mensaje = document.createElement("p");
            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay registros en esta entidad.";
            this.contenedor.appendChild(mensaje);
            return;
        }

        let nombres = Object.keys(registros[0]);
        let selector = document.createElement("select");
        selector.className = "selector-columna";
        let buscador = document.createElement("input");
        buscador.type = "search";
        buscador.placeholder = "Buscar...";
        buscador.className = "buscador-tabla";

        nombres.forEach((nombre, indice) => {
            let opcion = document.createElement("option");
            opcion.value = indice;
            opcion.textContent = this.utilidades.capitalizar(nombre);
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
            th.textContent = this.utilidades.capitalizar(nombre) + "  ↕";
            let ascendente = true;
            th.onclick = () => {
                let filas = Array.from(cuerpo.querySelectorAll("tr"));
                filas.sort((filaA, filaB) => {
                    let valorA = filaA.children[indice].textContent;
                    let valorB = filaB.children[indice].textContent;
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
            nombres.forEach((nombre) => {
                let celda = document.createElement("td");
                celda.textContent = registro[nombre] ?? "";
                fila.appendChild(celda);
            });

            let celdaAcciones = document.createElement("td");
            celdaAcciones.className = "acciones";
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

        this.contenedor.appendChild(tabla);
        this.configurarFiltros(selector, buscador, cuerpo);
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
