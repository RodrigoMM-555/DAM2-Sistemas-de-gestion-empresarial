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
            document.querySelector(this.nombre).textContent = datos.nombre;
            document.title = "Ingeriar | " +
                (datos.nombre_grupo || datos.nombre);
            this.aplicarColor(datos.color);
            return datos;
        });
    }

    aplicarColor(color) {
        document.documentElement.style.setProperty(
            "--color_corporativo",
            color
        );
    }

    crearBoton() {
        let boton = document.createElement("button");
        boton.textContent = "⚙";
        boton.className = "botonConfiguracion";
        boton.onclick = () => this.mostrar();
        document.querySelector(this.cabecera).appendChild(boton);
    }

    mostrar() {
        return this.utilidades.obtenerJson(
            "api/superapi.php?ruta=configuracion"
        ).then((configuracion) => {
            let seccion = document.querySelector("section");
            seccion.innerHTML = "";

            let titulo = document.createElement("h2");
            titulo.textContent = "Configuración";
            seccion.appendChild(titulo);

            let formulario = document.createElement("form");
            formulario.className = "formulario";

            Object.keys(configuracion).forEach(function (clave) {
                let grupo = document.createElement("div");
                grupo.className = "campo";

                let etiqueta = document.createElement("label");
                etiqueta.textContent = utilidades.capitalizar(clave);

                let entrada = document.createElement("input");
                entrada.name = clave;
                entrada.type = clave === "color" ? "color" : "text";
                entrada.value = configuracion[clave];
                grupo.append(etiqueta, entrada);
                formulario.appendChild(grupo);
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
                this.guardar(datos);
            };

            seccion.appendChild(formulario);
        });
    }

    guardar(datos) {
        return this.utilidades.enviarJson(
            "api/superapi.php?ruta=configuracion",
            datos
        ).then((resultado) => {
            if (!resultado.ok) {
                throw new Error(resultado.error || "No se pudo guardar");
            }
            document.querySelector(this.nombre).textContent = datos.nombre;
            this.aplicarColor(datos.color);
            alert("Configuración guardada");
        });
    }
}
