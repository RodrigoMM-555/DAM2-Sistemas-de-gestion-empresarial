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
                ]],
                ["Listas de la aplicación", [
                    ["categorias_facturas", "Categorías de facturas", "textarea"],
                    ["tipos_evento", "Tipos de evento", "textarea"],
                    ["secciones", "Secciones", "textarea"]
                ]]
            ];
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
                this.guardar(datos, evento.target.logo_archivo.files[0]);
            };

            seccion.appendChild(formulario);
        });
    }

    guardar(datos, logo) {
        const formulario = new FormData();
        formulario.append("configuracion", JSON.stringify(datos));
        if (logo) {
            formulario.append("logo", logo);
        }
        return fetch("api/superapi.php?ruta=configuracion", {
            method: "POST",
            body: formulario
        }).then((respuesta) => respuesta.json().then((resultado) => {
            if (!respuesta.ok) {
                throw new Error(resultado.error || "No se pudo guardar");
            }
            return resultado;
        })).then((resultado) => {
            if (!resultado.ok) {
                throw new Error(resultado.error || "No se pudo guardar");
            }
            document.querySelector(this.nombre).textContent =
                datos.nombre_grupo;
            this.aplicarConfiguracion(datos);
            alert("Configuración guardada");
        });
    }
}
