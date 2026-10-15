let tablaActual = "";

// Cargar configuración
fetch("api/superapi.php?ruta=configuracion")
.then(function(respuesta){
    return respuesta.json();
})
.then(function(datos){

    document.querySelector("h1").textContent = datos.nombre;

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
                    document.querySelector("h1").textContent = datos.nombre;

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

    fetch(
        "api/superapi.php?ruta=tabla&tabla="
        + encodeURIComponent(tabla)
    )
    .then(function(respuesta){
        return respuesta.json();
    })
    .then(function(datos){

        let seccion = document.querySelector("section");

        seccion.innerHTML = "";

        let cabecera = document.createElement("div");
        cabecera.className = "cabecera-tabla";

        let titulo = document.createElement("h2");
        titulo.textContent = capitalizarTexto(tabla);

        let botonCrear = document.createElement("button");

        botonCrear.textContent = "+ Nuevo";
        botonCrear.className = "boton boton-crear";

        botonCrear.onclick = function(){
            mostrarFormulario();
        };

        cabecera.appendChild(titulo);
        cabecera.appendChild(botonCrear);

        seccion.appendChild(cabecera);


        if(datos.length === 0){

            let mensaje = document.createElement("p");

            mensaje.className = "sin-datos";
            mensaje.textContent = "No hay registros en esta entidad.";

            seccion.appendChild(mensaje);

            return;
        }


        let tablaHTML = document.createElement("table");

        let cabeceraTabla = document.createElement("thead");
        let filaCabecera = document.createElement("tr");

        //Obtiene el nombre del dato del json nombre: "Ana" -> obtiene nombre
        //entonces del objeto 0 obtiene el nombre de cada una de sus propiedades
        Object.keys(datos[0]).forEach(function(clave){

            let th = document.createElement("th");

            th.textContent = capitalizarTexto(clave);

            filaCabecera.appendChild(th);
        });


        let thAcciones = document.createElement("th");
        thAcciones.textContent = "Acciones";

        //Añadimos acciones a la lista de elementos de la cabecera de la tabla
        filaCabecera.appendChild(thAcciones);

        //Metemos la lista de elementos de la cabecera en la cabecera
        cabeceraTabla.appendChild(filaCabecera);

        //Metemos la cabecera en la tabla
        tablaHTML.appendChild(cabeceraTabla);


        let cuerpo = document.createElement("tbody");


        datos.forEach(function(registro){

            let fila = document.createElement("tr");

            // sacamos la clave de cada uno de los datos de cada uno de los registros
            // de esta forma ahcemos como con un array registro[clave]
            Object.keys(registro).forEach(function(clave){

                let td = document.createElement("td");

                td.textContent = registro[clave];

                fila.appendChild(td);
            });

            //Creamos los botones de acciones y los conectamos a sus funciones
            let acciones = document.createElement("td");

            acciones.className = "acciones";

            //editar
            let editar = document.createElement("button");

            editar.textContent = "Editar";
            editar.className = "boton boton-editar";

            editar.onclick = function(){

                mostrarFormulario(registro);
            };

            //borrar
            let borrar = document.createElement("button");

            borrar.textContent = "Borrar";
            borrar.className = "boton boton-borrar";

            borrar.onclick = function(){

                borrarRegistro(registro.id);
            };

            //añadimos los botones
            acciones.appendChild(editar);
            acciones.appendChild(borrar);

            fila.appendChild(acciones);

            cuerpo.appendChild(fila);
        });


        tablaHTML.appendChild(cuerpo);

        seccion.appendChild(tablaHTML);
    });
}


// Obtener columnas
function obtenerColumnas(){

    return fetch(
        "api/superapi.php?ruta=columnas&tabla="
        + encodeURIComponent(tablaActual)
    )
    .then(function(respuesta){
        return respuesta.json();
    });
}


// Mostrar formulario
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


        columnas.forEach(function(columna){

            let grupo = document.createElement("div");

            grupo.className = "campo";


            let label = document.createElement("label");

            label.textContent = capitalizarTexto(columna);


            let input = document.createElement("input");

            input.name = columna;
            input.type = "text";

            if(registro !== null){

                input.value =
                    registro[columna] ?? "";
            }


            grupo.appendChild(label);
            grupo.appendChild(input);

            formulario.appendChild(grupo);
        });


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

        formulario.appendChild(acciones);


        formulario.onsubmit = function(evento){

            evento.preventDefault();

            let datos = {};

            columnas.forEach(function(columna){

                datos[columna] =
                    formulario.elements[columna].value;
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