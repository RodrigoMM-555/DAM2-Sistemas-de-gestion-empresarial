let tablaActual = "";

const formulario = new IngeriarFormulario({
    utilidades,
    alGuardar: function () {
        return tabla.cargar(tablaActual);
    }
});
const exportacion = new IngeriarExportacion({contenedor: "section"});
const tabla = new IngeriarTabla({
    utilidades,
    formulario,
    exportacion
});
const configuracion = new IngeriarConfiguracion({utilidades});
const graficas = DarkorangeGraficas;
const dashboard = new IngeriarDashboard({
    utilidades,
    graficas,
    exportacion
});

function crearEnlaceDashboard() {
    let enlace = document.createElement("a");
    enlace.href = "#";
    enlace.textContent = "Dashboard";
    enlace.onclick = function (evento) {
        evento.preventDefault();
        document.querySelectorAll("#entidades a")
            .forEach(function (elemento) {
                elemento.classList.remove("activo");
            });
        enlace.classList.add("activo");
        dashboard.render();
    };
    document.querySelector("#entidades").prepend(enlace);
}

function cargarModulos() {
    utilidades.obtenerJson("api/superapi.php?ruta=modulos")
        .then(function (datos) {
            let menu = document.querySelector("#modulos");

            datos.forEach(function (dato) {
                let enlace = document.createElement("a");
                let icono = document.createElement("span")
                icono.classList.add("icono-modulos")
                let texto = document.createElement("span")
                texto.textContent = utilidades.capitalizar(dato);
                icono.textContent = utilidades.capitalizar(dato).charAt(0)
                enlace.href = "#";
                enlace.onclick = function (evento) {
                    evento.preventDefault();
                    document.querySelectorAll("#modulos a")
                        .forEach(function (elemento) {
                            elemento.classList.remove("activo");
                        });
                    enlace.classList.add("activo");
                };
                enlace.appendChild(icono);
                enlace.appendChild(texto)
                menu.appendChild(enlace);
            });
        });
}

function cargarEntidades() {
    utilidades.obtenerJson("api/superapi.php?ruta=entidades")
        .then(function (datos) {
            let menu = document.querySelector("#entidades");

            datos.forEach(function (dato) {
                let enlace = document.createElement("a");
                enlace.textContent = utilidades.capitalizar(dato);
                enlace.href = "#";
                enlace.onclick = function (evento) {
                    evento.preventDefault();
                    tablaActual = dato;
                    document.querySelectorAll("#entidades a")
                        .forEach(function (elemento) {
                            elemento.classList.remove("activo");
                        });
                    enlace.classList.add("activo");
                    tabla.cargar(tablaActual);
                };
                menu.appendChild(enlace);
            });

            if (datos.length > 0) {
                crearEnlaceDashboard();
                tablaActual = datos[0];
                menu.querySelector("a").classList.add("activo");
                dashboard.render();
            }
        });
}

function iniciarAplicacion() {
    configuracion.cargar();
    cargarModulos();
    cargarEntidades();
    configuracion.crearBoton();
}

iniciarAplicacion();
