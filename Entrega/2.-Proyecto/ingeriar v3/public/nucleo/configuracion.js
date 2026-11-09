class IngeriarConfiguracion {
    constructor({utilidades, nombre = "#nombre", cabecera = "header"}) {
        this.utilidades = utilidades;
        this.nombre = nombre;
        this.cabecera = cabecera;
    }

    cargar() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=configuracion"
        ).then((datos) => {
            document.querySelector(this.nombre).textContent =
                datos.nombre_grupo || "Nombre del grupo";
            document.title = "Ingeriar | " +
                (datos.nombre_grupo || "Ingeriar");
            this.aplicarConfiguracion(datos);
            return datos;
        });
    }

    aplicarConfiguracion(configuracion) {
        document.documentElement.style.setProperty(
            "--color_corporativo",
            configuracion.color || "#8b0000"
        );
        document.documentElement.style.setProperty(
            "--color_secundario",
            configuracion.color_secundario || "#000000"
        );
        document.documentElement.dataset.modoOscuro =
            configuracion.modo_oscuro ? "true" : "false";
        document.documentElement.dataset.nombresTiposEvento = JSON.stringify(
            Object.fromEntries((configuracion.catalogos?.tipos_evento || [])
                .map((tipo) => [tipo.codigo, tipo.nombre]))
        );
        document.documentElement.dataset.secciones = JSON.stringify(
            configuracion.catalogos?.secciones || []
        );
        document.documentElement.dataset.categoriasFactura = JSON.stringify(
            configuracion.catalogos?.categorias_factura || []
        );
        const rol = document.querySelector("#rol-actual");
        if (rol && typeof usuarioActual !== "undefined" && usuarioActual) {
            rol.textContent = configuracion[
                "nombre_rol_" + usuarioActual.rol
            ] || utilidades.capitalizar(usuarioActual.rol);
        }
        const logo = document.querySelector("#logo-grupo");
        if (logo) {
            logo.hidden = !configuracion.logo_archivo;
            logo.src = configuracion.logo_archivo
                ? "api/superapi.php?ruta=configuracion_logo"
                : "";
        }
    }

    crearBoton() {
        let boton = document.createElement("button");
        boton.textContent = "⚙";
        boton.className = "botonConfiguracion";
        boton.type = "button";
        boton.onclick = () => this.mostrar().catch((error) => {
            const seccion = document.querySelector("main > section");
            if (seccion) {
                seccion.className = "vista vista-configuracion";
                seccion.textContent =
                    "No se pudo cargar la configuración: " + error.message;
            }
        });
        document.querySelector(this.cabecera).appendChild(boton);
    }

    mostrar() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=configuracion"
        ).then((configuracion) => {
            let seccion = document.querySelector("main > section");
            if (!seccion) {
                throw new Error("No se encontró el contenedor principal");
            }
            seccion.className = "vista vista-configuracion";
            seccion.innerHTML = "";

            let titulo = document.createElement("h2");
            titulo.textContent = "Configuración";
            seccion.appendChild(titulo);

            let formulario = document.createElement("form");
            formulario.className = "formulario vista-superficie vista-formulario";

            const campos = [
                ["Identidad del grupo", [
                    ["nombre_grupo", "Nombre del grupo", "text"],
                    ["logo_archivo", "Logo del grupo", "file"]
                ]],
                ["Apariencia", [
                    ["color", "Color principal", "color"],
                    ["color_secundario", "Color secundario", "color"],
                    ["modo_oscuro", "Modo oscuro", "checkbox"]
                ]],
                ["Información del grupo", [
                    ["cif", "CIF", "text"], ["direccion", "Dirección", "text"],
                    ["municipio", "Municipio", "text"],
                    ["provincia", "Provincia", "text"],
                    ["telefono", "Teléfono", "tel"],
                    ["correo", "Correo", "email"],
                    ["coordinador", "Coordinador", "text"]
                ]],
                ["Usuarios y educandos", [
                    ["nombre_rol_administrador", "Nombre del rol administrador", "text"],
                    ["nombre_rol_scouter", "Nombre del rol monitor", "text"],
                    ["nombre_rol_tutor", "Nombre del rol tutor", "text"],
                    ["formato_nombre", "Formato del nombre", "select"],
                    ["mostrar_educandos_sin_seccion", "Mostrar educandos sin sección", "checkbox"]
                ]],
                ["Asistencias y archivos", [
                    ["permitir_asistencia_pasada", "Permitir asistencia en eventos pasados", "checkbox"],
                    ["tamano_maximo_archivos_mb", "Tamaño máximo de archivos (MB)", "number"],
                    ["formatos_entrega", "Formatos de entrega", "text"]
                ]]
            ];
            const catalogos = configuracion.catalogos || {
                tipos_evento: [],
                secciones: [],
                categorias_factura: []
            };
            campos.forEach(([nombreGrupo, definiciones]) => {
                let grupoTitulo = document.createElement("h3");
                grupoTitulo.className = "titulo-configuracion";
                grupoTitulo.textContent = nombreGrupo;
                formulario.appendChild(grupoTitulo);
                definiciones.forEach(([clave, texto, tipo]) => {
                let grupo = document.createElement("div");
                grupo.className = "campo";

                let etiqueta = document.createElement("label");
                etiqueta.textContent = texto;

                let entrada = document.createElement(
                    tipo === "textarea" ? "textarea" : "input"
                );
                entrada.name = clave;
                if (entrada.tagName === "INPUT") {
                    entrada.type = tipo;
                }
                if (tipo === "select") {
                    entrada = document.createElement("select");
                    entrada.name = clave;
                    const opciones = clave === "formato_nombre"
                        ? [["nombre_apellidos", "Nombre Apellidos"],
                            ["apellidos_nombre", "Apellidos, Nombre"]]
                        : [];
                    opciones.forEach(([valor, texto]) => {
                        let opcion = document.createElement("option");
                        opcion.value = valor;
                        opcion.textContent = texto;
                        entrada.appendChild(opcion);
                    });
                }
                if (tipo === "checkbox") {
                    entrada.checked = Boolean(configuracion[clave]);
                } else if (tipo !== "file") {
                    entrada.value = configuracion[clave] ?? "";
                }
                if (tipo === "file") {
                    entrada.accept = "image/jpeg,image/png,image/webp";
                }
                grupo.append(etiqueta, entrada);
                formulario.appendChild(grupo);
                });
            });
            const tiposTitulo = document.createElement("h3");
            tiposTitulo.className = "titulo-configuracion";
            tiposTitulo.textContent = "Configuración de tipos de listas";
            formulario.appendChild(tiposTitulo);
            const tipos = this.crearEditorCatalogo(
                "Tipos de evento", catalogos.tipos_evento, false
            );
            const secciones = this.crearEditorCatalogo(
                "Secciones", catalogos.secciones, true
            );
            const categoriasFactura = this.crearEditorCatalogo(
                "Categorías de facturas",
                catalogos.categorias_factura,
                false
            );
            formulario.append(tipos, secciones, categoriasFactura);

            let guardar = document.createElement("button");
            guardar.type = "submit";
            guardar.textContent = "Guardar";
            guardar.className = "boton boton-crear";
            formulario.appendChild(guardar);

            formulario.onsubmit = (evento) => {
                evento.preventDefault();
                let datos = Object.fromEntries(
                    new FormData(evento.target).entries()
                );
                datos.modo_oscuro = evento.target.modo_oscuro.checked;
                datos.mostrar_educandos_sin_seccion =
                    evento.target.mostrar_educandos_sin_seccion.checked;
                datos.permitir_asistencia_pasada =
                    evento.target.permitir_asistencia_pasada.checked;
                const catalogosActualizados = {
                    tipos_evento: this.leerEditorCatalogo(tipos),
                    secciones: this.leerEditorCatalogo(secciones),
                    categorias_factura: this.leerEditorCatalogo(categoriasFactura)
                };
                this.guardar(
                    datos,
                    evento.target.logo_archivo.files[0],
                    catalogosActualizados
                );
            };

            seccion.appendChild(formulario);
        });
    }

    crearEditorCatalogo(titulo, elementos, incluyeEdades) {
        const bloque = document.createElement("section");
        bloque.className = "bloque-catalogo";
        const encabezado = document.createElement("h3");
        encabezado.className = "titulo-configuracion";
        encabezado.textContent = titulo;
        const lista = document.createElement("div");
        lista.className = "lista-catalogo";
        lista.dataset.edades = incluyeEdades ? "true" : "false";
        const añadir = (elemento = {}) => {
            const fila = document.createElement("div");
            fila.className = "fila-catalogo";
            fila.innerHTML = `
                <input data-campo="codigo" placeholder="Código interno">
                <input data-campo="nombre" placeholder="Nombre visible">
                ${incluyeEdades ? `
                    <input data-campo="edad_minima" type="number" min="0"
                        placeholder="Edad mín.">
                    <input data-campo="edad_maxima" type="number" min="0"
                        placeholder="Edad máx.">` : ""}
                <label><input data-campo="activo" type="checkbox"> Activo</label>
                <button type="button" class="boton boton-borrar">Quitar</button>`;
            Object.entries(elemento).forEach(([clave, valor]) => {
                const control = fila.querySelector(`[data-campo="${clave}"]`);
                if (!control) {
                    return;
                }
                if (control.type === "checkbox") {
                    control.checked = Boolean(Number(valor) || valor === true);
                } else {
                    control.value = valor ?? "";
                }
            });
            fila.querySelector(".boton-borrar").onclick = () => {
                fila.querySelector('[data-campo="activo"]').checked = false;
                fila.hidden = true;
            };
            lista.appendChild(fila);
        };
        elementos.forEach(añadir);
        const nuevo = document.createElement("button");
        nuevo.type = "button";
        nuevo.className = "boton";
        nuevo.textContent = "Añadir";
        nuevo.onclick = () => añadir();
        bloque.append(encabezado, lista, nuevo);
        return bloque;
    }

    crearCampoLista(clave, titulo, valor) {
        const grupo = document.createElement("div");
        grupo.className = "campo campo-lista-simple";
        const etiqueta = document.createElement("label");
        etiqueta.textContent = titulo;
        const ayuda = document.createElement("small");
        ayuda.textContent = "Separados por comas";
        const entrada = document.createElement("textarea");
        entrada.name = clave;
        entrada.value = valor || "";
        entrada.rows = 3;
        grupo.append(etiqueta, ayuda, entrada);
        return grupo;
    }

    leerEditorCatalogo(bloque) {
        return Array.from(bloque.querySelectorAll(".fila-catalogo"))
            .map((fila, orden) => {
                const valor = (campo) => fila.querySelector(
                    `[data-campo="${campo}"]`
                );
                return {
                    codigo: valor("codigo").value.trim(),
                    nombre: valor("nombre").value.trim(),
                    edad_minima: valor("edad_minima")?.value || null,
                    edad_maxima: valor("edad_maxima")?.value || null,
                    activo: valor("activo").checked,
                    orden
                };
            })
            .filter((elemento) => elemento.codigo && elemento.nombre);
    }

    guardar(datos, logo, catalogos) {
        const formulario = new FormData();
        formulario.append("configuracion", JSON.stringify(datos));
        if (logo) {
            formulario.append("logo", logo);
        }
        const guardarConfiguracion = fetch("api/superapi.php?ruta=configuracion", {
            method: "POST",
            body: formulario
        }).then((respuesta) => respuesta.json().then((resultado) => {
            if (!respuesta.ok) {
                throw new Error(resultado.error || "No se pudo guardar");
            }
            return resultado;
        }));
        return guardarConfiguracion.then((resultado) => {
            if (!resultado.ok) {
                throw new Error(resultado.error || "No se pudo guardar");
            }
            return fetch("api/superapi.php?ruta=catalogos", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(catalogos)
            }).then((respuesta) => respuesta.json().then((catalogosResultado) => {
                if (!respuesta.ok || !catalogosResultado.ok) {
                    throw new Error(
                        catalogosResultado.error || "No se pudieron guardar los catálogos"
                    );
                }
                datos.catalogos = catalogosResultado.catalogos;
                document.querySelector(this.nombre).textContent =
                    datos.nombre_grupo;
                this.aplicarConfiguracion(datos);
                window.dispatchEvent(new CustomEvent("configuracion-actualizada"));
                alert("Configuración guardada");
            }));
        });
    }
}
