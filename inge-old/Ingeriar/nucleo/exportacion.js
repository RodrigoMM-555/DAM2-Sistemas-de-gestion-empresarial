class IngeriarExportacion {
    constructor({contenedor = "section"}) {
        this.contenedor = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;
    }

    exportar(formato) {
        switch (formato) {
            case "imprimir":
                this.imprimir();
                break;
            case "html":
                this.exportarHtml();
                break;
            case "json":
                this.exportarJson();
                break;
            case "csv":
                this.exportarCsv();
                break;
            default:
                throw new Error("Selecciona un formato de exportación");
        }
    }

    conectarControles(selector, boton) {
        boton.addEventListener("click", () => {
            try {
                this.exportar(selector.value);
            } catch (error) {
                alert(error.message);
            }
        });
    }

    imprimir() {
        window.print();
    }

    exportarHtml() {
        const contenido = this.crearContenidoExportable();
        const documento = `<!doctype html>
            <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>Informe de Ingeriar</title>
                <style>${this.obtenerEstilos()}
                    main{
                        margin: 20px;
                        flex-direction: column;
                    }
                </style>
            </head>
            <body>
                <main class="informe-exportado">
                    ${contenido.innerHTML}
                </main>
            </body>
            </html>`;

        this.descargar(
            documento,
            "ingeriar-informe.html",
            "text/html;charset=utf-8"
        );
    }

    exportarJson() {
        const datos = {
            generado: new Date().toISOString(),
            tablas: this.obtenerTablas()
        };

        this.descargar(
            JSON.stringify(datos, null, 4),
            "ingeriar-datos.json",
            "application/json;charset=utf-8"
        );
    }

    exportarCsv() {
        const tablas = this.obtenerTablas();

        if (!tablas.length) {
            throw new Error("No hay tablas visibles para exportar");
        }

        const lineas = [];
        tablas.forEach((tabla, indice) => {
            if (indice > 0) {
                lineas.push("");
            }
            lineas.push(this.escaparCsv(tabla.titulo));
            lineas.push(tabla.columnas.map((columna) =>
                this.escaparCsv(columna)
            ).join(","));
            tabla.registros.forEach((registro) => {
                lineas.push(tabla.columnas.map((columna) =>
                    this.escaparCsv(registro[columna])
                ).join(","));
            });
        });

        this.descargar(
            "\ufeff" + lineas.join("\r\n"),
            "ingeriar-datos.csv",
            "text/csv;charset=utf-8"
        );
    }

    obtenerTablas() {
        return Array.from(this.contenedor.querySelectorAll("table"))
            .map((tabla) => {
                const cabeceras = Array.from(
                    tabla.querySelectorAll("thead th")
                );
                const indices = cabeceras
                    .map((cabecera, indice) => ({
                        nombre: cabecera.textContent
                            .replace("↕", "")
                            .trim(),
                        indice
                    }))
                    .filter((columna) => columna.nombre !== "Acciones");
                const registros = Array.from(
                    tabla.querySelectorAll("tbody tr")
                )
                    .filter((fila) =>
                        getComputedStyle(fila).display !== "none"
                    )
                    .map((fila) => {
                        const celdas = fila.querySelectorAll("td");
                        return Object.fromEntries(indices.map((columna) => [
                            columna.nombre,
                            celdas[columna.indice]?.textContent.trim() || ""
                        ]));
                    });

                return {
                    titulo: this.obtenerTituloTabla(tabla),
                    columnas: indices.map((columna) => columna.nombre),
                    registros
                };
            });
    }

    obtenerTituloTabla(tabla) {
        return this.contenedor.querySelector("h2")?.textContent || "Tabla";
    }

    crearContenidoExportable() {
        const copia = this.contenedor.cloneNode(true);
        copia.querySelectorAll(
            ".controles-exportacion, .filtros-tabla, .acciones, " +
            ".boton-crear, .boton-editar, .boton-borrar"
        ).forEach((elemento) => elemento.remove());
        copia.querySelectorAll("tbody tr").forEach((fila) => {
            if (getComputedStyle(fila).display === "none") {
                fila.remove();
            }
        });
        return copia;
    }

    obtenerEstilos() {
        return Array.from(document.styleSheets).flatMap((hoja) => {
            try {
                return Array.from(hoja.cssRules).map((regla) => regla.cssText);
            } catch (error) {
                return [];
            }
        }).join("\n");
    }

    escaparCsv(valor) {
        const texto = String(valor ?? "");
        return /[",\r\n]/.test(texto)
            ? `"${texto.replaceAll('"', '""')}"`
            : texto;
    }

    descargar(contenido, nombre, tipo) {
        const enlace = document.createElement("a");
        const url = URL.createObjectURL(
            new Blob([contenido], {type: tipo})
        );
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(url);
    }
}
