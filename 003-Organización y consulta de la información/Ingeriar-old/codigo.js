let tablaActual = "";

// Cargar configuración
fetch("api/superapi.php?ruta=configuracion")
.then(function(respuesta){
    return respuesta.json();
})
.then(function(datos){

    document.querySelector("#nombre").textContent = datos.nombre;
    document.title = "Ingeriar | " + datos.nombre_grupo;

    document.documentElement.style.setProperty(
        '--color_corporativo',
        datos.color
    );
});

let botonConfiguracion = document.createElement("button");

botonConfiguracion.textContent = "⚙";
botonConfiguracion.className = "botonConfiguracion"
botonConfiguracion.onclick = mostrarConfiguracion;

document.querySelector("header").appendChild(botonConfiguracion);

function mostrarConfiguracion(){
    fetch("api/superapi.php?ruta=configuracion")
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(configuracion){

        let seccion = document.querySelector("section");
        seccion.innerHTML = "";

        let titulo = document.createElement("h2");
        titulo.textContent = "Configuración";
        seccion.appendChild(titulo);

        let formulario = document.createElement("form");
        formulario.className = "formulario";

        Object.keys(configuracion).forEach(function(clave){
            // el grupo es el el imput y el label en conjunto, se crea un grupo por parametro
            let grupo = document.createElement("div");
            grupo.className = "campo";

            let label = document.createElement("label");
            label.textContent = capitalizarTexto(clave);

            let input = document.createElement("input");
            input.name = clave;

            switch (clave){
                case "color":
                    input.type = "color";
                    break;

                default:
                    input.type = "text";
            }

            input.value = configuracion[clave];

            grupo.appendChild(label);
            grupo.appendChild(input);

            formulario.appendChild(grupo);
        });

        let guardar = document.createElement("button");

        guardar.type = "submit";
        guardar.textContent = "Guardar";

        guardar.className = "boton boton-crear";

        let acciones = document.createElement("div");
        acciones.className = "acciones-formulario";
        acciones.appendChild(guardar);

        formulario.appendChild(acciones);

        //Guardar la configuracion nueva
        formulario.onsubmit = function(evento){
            evento.preventDefault();

            let datos = {};

            new FormData(evento.target).forEach(function(valor, clave){
                datos[clave] = valor;
            });

            fetch("api/superapi.php?ruta=configuracion", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            })
            .then(function(respuesta){
                return respuesta.json();
            })
            .then(function(resultado){

                if(resultado.ok){
                    document.querySelector("#nombre").textContent = datos.nombre;

                    document.documentElement.style.setProperty(
                        "--color_corporativo",
                        datos.color
                    );

                    alert("Configuración guardada");
                }
            });
        };

        seccion.appendChild(formulario);

    })
};


// Cargar módulos
fetch("api/superapi.php?ruta=modulos")
.then(function(respuesta){
    return respuesta.json();
})
.then(function(datos){

    let menu = document.querySelector("#modulos");

    datos.forEach(function(dato){

        let enlace = document.createElement("a");

        enlace.textContent = capitalizarTexto(dato);
        enlace.href = "#";

        enlace.onclick = function(){

            document.querySelectorAll("#modulos a")
                .forEach(function(elemento){
                    elemento.classList.remove("activo");
                });

            enlace.classList.add("activo");
        };

        menu.appendChild(enlace);
    });
});


// Cargar entidades
fetch("api/superapi.php?ruta=entidades")
.then(function(respuesta){
    return respuesta.json();
})
.then(function(datos){

    let menu = document.querySelector("#entidades");

    datos.forEach(function(dato){

        let enlace = document.createElement("a");

        enlace.textContent = capitalizarTexto(dato);
        enlace.href = "#";

        enlace.onclick = function(){

            tablaActual = dato;

            document.querySelectorAll("#entidades a")
                .forEach(function(elemento){
                    elemento.classList.remove("activo");
                });

            enlace.classList.add("activo");

            cargarTabla(dato);
        };

        menu.appendChild(enlace);
    });

    // Seleccionar la primera entidad automáticamente
    if(datos.length > 0){

        tablaActual = datos[0];

        menu.querySelector("a").classList.add("activo");

        cargarTabla(tablaActual);
    }
});

//Primera letra a mayuscula
function capitalizarTexto(texto){
    return texto
        .replaceAll("_", " ")
        .toLowerCase()
        // \b detecta los espacion entre palabras, \w representa un caracter como letra o numero
        // g es global asi ahce los cambios en mas de una coincidencia
        // basicamente busca las letras que estan al inicio de una palbara dentro del string
        // y las reemplaza con esa misma letra en uppercase
        .replace(/\b\w//*g*/, function(letra){
            return letra.toUpperCase();
        });
};

// Cargar una tabla
function cargarTabla(tabla){

    // Pedimos a la API los registros de la entidad seleccionada.
    fetch(
        "api/superapi.php?ruta=tabla&tabla="
        + encodeURIComponent(tabla)
    )
    .then(function(respuesta){
        // Convertimos la respuesta de la API de JSON a datos JavaScript.
        return respuesta.json();
    })
    .then(function(datos){

        // Localizamos la zona principal donde se mostrará la tabla.
        let seccion = document.querySelector("section");

        // Eliminamos el contenido anterior antes de cargar la nueva entidad.
        seccion.innerHTML = "";

        // Creamos la cabecera visual con el nombre de la entidad y el botón Nuevo.
        let cabecera = document.createElement("div");
        cabecera.className = "cabecera-tabla";

        let titulo = document.createElement("h2");
        titulo.textContent = capitalizarTexto(tabla);

        let botonCrear = document.createElement("button");

        botonCrear.textContent = "+ Nuevo";
        botonCrear.className = "boton boton-crear";

        // Al pulsar Nuevo se abre el formulario para crear un registro.
        botonCrear.onclick = function(){
            mostrarFormulario();
        };

        // Añadimos el título y el botón a la cabecera.
        cabecera.appendChild(titulo);
        cabecera.appendChild(botonCrear);

        // Mostramos la cabecera en la sección.
        seccion.appendChild(cabecera);


        if(datos.length === 0){

            // Si la entidad no tiene registros, mostramos un mensaje y terminamos.
            let mensaje = document.createElement("p");

            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay registros en esta entidad.";

            seccion.appendChild(mensaje);

            return;
        }


        // Creamos el elemento tabla que contendrá la cabecera y las filas.
        let tablaHTML = document.createElement("table");

        // Obtenemos los nombres de las columnas a partir del primer registro.
        let columnas = Object.keys(datos[0]);

        // Creamos el contenedor de los controles de búsqueda.
        let filtros = document.createElement("div");
        filtros.className = "filtros-tabla";

        // Creamos el selector que permitirá elegir la columna donde buscar.
        let selectorColumna = document.createElement("select");
        selectorColumna.className = "selector-columna";

        // Creamos el campo donde el usuario escribirá el texto que quiere buscar.
        let buscador = document.createElement("input");
        buscador.type = "search";
        buscador.placeholder = "Buscar...";
        buscador.className = "buscador-tabla";

        // Añadimos una opción al selector por cada columna de la entidad.
        columnas.forEach(function(clave, indice){

            let opcion = document.createElement("option");

            // Guardamos el índice para localizar después la celda correspondiente.
            opcion.value = indice;
            opcion.textContent = capitalizarTexto(clave);

            selectorColumna.appendChild(opcion);
        });

        // Introducimos el selector y el buscador dentro del contenedor de filtros.
        filtros.appendChild(selectorColumna);
        filtros.appendChild(buscador);

        // Mostramos los filtros antes de la tabla.
        seccion.appendChild(filtros);

        // Creamos la cabecera y el cuerpo de la tabla.
        let cabeceraTabla = document.createElement("thead");
        let filaCabecera = document.createElement("tr");
        let cuerpo = document.createElement("tbody");

        // Creamos una cabecera para cada columna y le añadimos el ordenamiento.
        columnas.forEach(function(clave, indice){

            let th = document.createElement("th");

            th.textContent = capitalizarTexto(clave + "  ↕");

            filaCabecera.appendChild(th);

            // Cada columna comienza ordenando de forma ascendente.
            let ascendente = true;

            // Al pulsar la cabecera se ordenan las filas por esa columna.
            th.onclick = function(){

                // Convertimos las filas del tbody en un array para poder ordenarlas.
                let filas = Array.from(
                    cuerpo.querySelectorAll("tr")
                );

                // Comparamos el texto de la celda de la columna seleccionada.
                filas.sort(function(filaA, filaB){

                    let valorA = filaA.children[indice]
                        .textContent;

                    let valorB = filaB.children[indice]
                        .textContent;

                    // Alternamos entre orden ascendente y descendente.
                    if(ascendente){
                        return valorA.localeCompare(valorB);
                    }

                    return valorB.localeCompare(valorA);
                });

                // Volvemos a introducir las filas en el cuerpo ya ordenadas.
                filas.forEach(function(fila){
                    cuerpo.appendChild(fila);
                });

                // La siguiente pulsación ordenará en el sentido contrario.
                ascendente = !ascendente;
            };
        });

        // La última columna contiene los botones de editar y borrar.
        let thAcciones = document.createElement("th");
        thAcciones.textContent = "Acciones";

        // Añadimos la columna de acciones a la cabecera.
        filaCabecera.appendChild(thAcciones);

        // Introducimos la fila de cabeceras dentro del thead.
        cabeceraTabla.appendChild(filaCabecera);

        // Introducimos el thead dentro de la tabla.
        tablaHTML.appendChild(cabeceraTabla);

        // Creamos una fila de la tabla por cada registro recibido.
        datos.forEach(function(registro){

            let fila = document.createElement("tr");

            // Creamos una celda por cada campo del registro.
            Object.keys(registro).forEach(function(clave){

                let td = document.createElement("td");

                // Escribimos en la celda el valor del campo actual.
                td.textContent = registro[clave];

                fila.appendChild(td);
            });

            // Creamos la celda que contendrá los botones de acciones.
            let acciones = document.createElement("td");

            acciones.className = "acciones";

            // Creamos el botón para editar este registro.
            let editar = document.createElement("button");

            editar.textContent = "Editar";
            editar.className = "boton boton-editar";

            // Abrimos el formulario de edición con los datos del registro.
            editar.onclick = function(){

                mostrarFormulario(registro);
            };

            // Creamos el botón para borrar este registro.
            let borrar = document.createElement("button");

            borrar.textContent = "Borrar";
            borrar.className = "boton boton-borrar";

            // Borramos el registro utilizando su identificador.
            borrar.onclick = function(){

                borrarRegistro(registro.id);
            };

            // Añadimos los botones dentro de la celda de acciones.
            acciones.appendChild(editar);
            acciones.appendChild(borrar);

            // Añadimos la celda de acciones al final de la fila.
            fila.appendChild(acciones);

            // Añadimos la fila completa al cuerpo de la tabla.
            cuerpo.appendChild(fila);
        });

        // Añadimos el cuerpo a la tabla y la tabla a la sección.
        tablaHTML.appendChild(cuerpo);

        seccion.appendChild(tablaHTML);

        // Mensaje que se mostrará cuando el filtro no encuentre coincidencias.
        let mensajeSinCoincidencias = document.createElement("p");

        mensajeSinCoincidencias.className = "sin-datos";
        mensajeSinCoincidencias.textContent =
            "No hay coincidencias para la búsqueda.";
        // Se oculta hasta que se compruebe el resultado del filtro.
        mensajeSinCoincidencias.style.display = "none";

        seccion.appendChild(mensajeSinCoincidencias);

        // Filtra las filas usando la columna seleccionada y el texto escrito.
        function filtrar(){

            // Obtenemos el índice de la columna elegida en el selector.
            let indice = Number(selectorColumna.value);

            // Normalizamos el texto para buscar sin distinguir mayúsculas.
            let busqueda = buscador.value
                .toLowerCase()
                .trim();

            // Revisamos todas las filas del cuerpo de la tabla.
            cuerpo.querySelectorAll("tr").forEach(function(fila){

                // Solo comparamos la celda de la columna seleccionada.
                let contenido = fila.children[indice]
                    .textContent
                    .toLowerCase();

                // Mostramos la fila si el filtro está vacío o si encuentra coincidencia.
                if(
                    busqueda === "" ||
                    contenido.includes(busqueda)
                ){
                    fila.style.display = "";
                }else{
                    fila.style.display = "none";
                }
            });

            // Comprobamos si queda al menos una fila visible después de filtrar.
            let filasVisibles = Array.from(
                cuerpo.querySelectorAll("tr")
            ).some(function(fila){
                return fila.style.display !== "none";
            });

            // Mostramos el mensaje solo cuando todas las filas están ocultas.
            mensajeSinCoincidencias.style.display =
                filasVisibles ? "none" : "";
        }

        // Filtramos mientras se escribe en el buscador.
        buscador.oninput = filtrar;

        // Volvemos a aplicar el filtro al cambiar de columna.
        selectorColumna.onchange = filtrar;
    });
}


// Obtiene los metadatos de los campos de la tabla actual.
function obtenerColumnas(){

    return fetch(
        "api/superapi.php?ruta=columnas&tabla="
        + encodeURIComponent(tablaActual)
    )
    .then(function(respuesta){
        return respuesta.json();
    });
}


// Elige la plantilla según el tipo declarado en SQLite.
function obtenerPlantillaColumna(columna){

    if(columna.relacion !== null){
        return document.querySelector("#plantilla-select");
    }

    let tipo = (
        columna.tipo_formulario || columna.tipo
    ).toUpperCase();

    if(tipo.startsWith("ENUM")){
        return document.querySelector("#plantilla-select");
    }

    if(tipo.includes("DATE") && tipo.includes("TIME")){
        return document.querySelector("#plantilla-datetime");
    }

    if(tipo.includes("DATE")){
        return document.querySelector("#plantilla-date");
    }

    if(
        tipo.includes("INT") ||
        tipo.includes("REAL") ||
        tipo.includes("NUM") ||
        tipo.includes("DEC") ||
        tipo.includes("FLOA") ||
        tipo.includes("DOUB")
    ){
        return document.querySelector("#plantilla-number");
    }

    return document.querySelector("#plantilla-input");
}

// Extrae el límite de tipos como VARCHAR(100) o CHAR(9).
function obtenerLimiteTexto(tipo){

    let coincidencia = tipo.match(
        /^(?:VARCHAR|CHAR)\s*\(\s*(\d+)\s*\)/i
    );

    if(coincidencia === null){
        return null;
    }

    return Number(coincidencia[1]);
}

// Carga los registros de la tabla relacionada.
function obtenerOpcionesRelacion(columna){

    return fetch(
        "api/superapi.php?ruta=tabla&tabla="
        + encodeURIComponent(columna.relacion.tabla)
    )
    .then(function(respuesta){
        return respuesta.json();
    });
}

// Crea el control y rellena sus opciones si es una relación.
function crearControlColumna(columna, registro){

    let plantilla = obtenerPlantillaColumna(columna);
    let instancia = plantilla.content.cloneNode(true);
    let label = instancia.querySelector("label");
    let control = instancia.querySelector("input, select");

    label.textContent = capitalizarTexto(columna.nombre);
    control.name = columna.nombre;
    control.required = columna.obligatorio;

    let limiteTexto = obtenerLimiteTexto(columna.tipo);

    if(limiteTexto !== null && control.tagName === "INPUT"){
        control.maxLength = limiteTexto;
    }

    if(control.tagName === "SELECT"){
        let opciones = Promise.resolve(columna.opciones);

        if(columna.relacion !== null){
            opciones = obtenerOpcionesRelacion(columna)
                .then(function(registros){
                    return registros.map(function(relacion){
                        return {
                            valor: relacion[columna.relacion.campo_valor],
                            etiqueta: [relacion.nombre, relacion.apellidos]
                                .filter(Boolean)
                                .join(" ") || relacion.nombre || relacion.id
                        };
                    });
                });
        }else{
            opciones = opciones.then(function(valores){
                return valores.map(function(valor){
                    return {
                        valor: valor,
                        etiqueta: capitalizarTexto(valor)
                    };
                });
            });
        }

        return opciones.then(function(valores){
            if(!columna.obligatorio){
                valores.unshift({
                    valor: "",
                    etiqueta: "-- Sin asignar --"
                });
            }

            valores.forEach(function(opcion){
                let elemento = document.createElement("option");
                elemento.value = opcion.valor;
                elemento.textContent = opcion.etiqueta;
                control.appendChild(elemento);
            });

            control.value =
                registro?.[columna.nombre]
                ?? columna.valor_por_defecto
                ?? "";

            return instancia;
        });
    }

    if(
        registro === null &&
        columna.valor_por_defecto !== null
    ){
        control.value = columna.valor_por_defecto;
    }

    if(registro !== null){
        control.value = registro[columna.nombre] ?? "";
    }

    return Promise.resolve(instancia);
}


// Genera el formulario para crear o editar un registro.
function mostrarFormulario(registro = null){

    obtenerColumnas()
    .then(function(columnas){

        let seccion = document.querySelector("section");

        seccion.innerHTML = "";


        let titulo = document.createElement("h2");

        titulo.textContent =
            registro === null
                ? "Nuevo " + capitalizarTexto(tablaActual)
                : "Editar " + capitalizarTexto(tablaActual);


        seccion.appendChild(titulo);


        let formulario = document.createElement("form");

        formulario.className = "formulario";

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

        cancelar.onclick = function(){

            cargarTabla(tablaActual);
        };


        acciones.appendChild(guardar);
        acciones.appendChild(cancelar);

        Promise.all(
            columnas.map(function(columna){
                return crearControlColumna(columna, registro);
            })
        ).then(function(instancias){

            instancias.forEach(function(instancia){
                formulario.appendChild(instancia);
            });

            formulario.appendChild(acciones);

            formulario.onsubmit = function(evento){

                evento.preventDefault();

                let datos = {};

                // Recoge los valores usando el nombre real de cada columna.
                columnas.forEach(function(columna){

                    let valor =
                        formulario.elements[columna.nombre].value;

                    if(valor === "" && !columna.obligatorio){
                        valor = null;
                    }

                    datos[columna.nombre] = valor;
                });

            let formData = new FormData();

            formData.append(
                "tabla",
                tablaActual
            );

                formData.append(
                    "datos",
                    JSON.stringify(datos)
                );


                let ruta = "crear";


                if(registro !== null){

                ruta = "editar";

                    formData.append(
                        "id",
                        registro.id
                    );
                }


                fetch(
                    "api/superapi.php?ruta=" + ruta,
                    {
                        method: "POST",
                        body: formData
                    }
                )
                .then(function(respuesta){
                    return respuesta.json();
                })
                .then(function(resultado){

                    if(resultado.ok){

                        cargarTabla(tablaActual);

                    }else{

                        alert(
                            resultado.error ||
                            "No se ha podido guardar"
                        );
                    }
                });
            };

        });
        seccion.appendChild(formulario);
    });
}


// Borrar registro
function borrarRegistro(id){

    if(!confirm(
        "¿Seguro que quieres borrar este registro?"
    )){
        return;
    }


    let formData = new FormData();

    formData.append(
        "tabla",
        tablaActual
    );

    formData.append(
        "id",
        id
    );


    fetch(
        "api/superapi.php?ruta=borrar",
        {
            method: "POST",
            body: formData
        }
    )
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(resultado){

        if(resultado.ok){

            cargarTabla(tablaActual);

        }else{

            alert(
                resultado.error ||
                "No se ha podido borrar"
            );
        }
    });
}