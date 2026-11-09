let tablaActual = "";
let vistaActual = "tabla";
let usuarioActual = null;

const entidadesOcultas = ["usuarios_educandos", "educandos_asistencias", "eventos"];

const formulario = new IngeriarFormulario({
    utilidades,
    alGuardar: function () {
        return vistaActual === "calendario"
            ? calendario.cargar("eventos")
            : tabla.cargar(tablaActual);
    }
});
const exportacion = new IngeriarExportacion({contenedor: "section"});
const tabla = new IngeriarTabla({
    utilidades,
    formulario,
    exportacion
});
const configuracion = new IngeriarConfiguracion({
    utilidades,
    cabecera: "#acciones-cabecera"
});
const graficas = DarkorangeGraficas;
const dashboard = new IngeriarDashboard({
    utilidades,
    graficas,
    exportacion
});
const calendario = new IngeriarCalendario({
    utilidades,
    formulario,
    contenedor: "section"
});

function marcarEnlaceActivo(enlace) {
    document.querySelectorAll("#entidades a")
        .forEach(function (elemento) {
            elemento.classList.remove("activo");
        });
    enlace.classList.add("activo");
}

function crearEnlaceDashboard() {
    let enlace = document.createElement("a");
    enlace.href = "#";
    enlace.textContent = "Dashboard";
    enlace.onclick = function (evento) {
        evento.preventDefault();
        marcarEnlaceActivo(enlace);
        vistaActual = "dashboard";
        dashboard.render();
    };
    document.querySelector("#entidades").prepend(enlace);
    return enlace;
}

function crearEnlaceCalendario() {
    let enlace = document.createElement("a");
    enlace.href = "#";
    enlace.textContent = "Calendario";
    enlace.onclick = function (evento) {
        evento.preventDefault();
        marcarEnlaceActivo(enlace);
        vistaActual = "calendario";
        calendario.cargar("eventos").catch((error) => {
            document.querySelector("section").textContent = error.message;
        });
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
                if (!entidadesOcultas.includes(dato)) {
                    let enlace = document.createElement("a");
                    enlace.textContent = utilidades.capitalizar(dato);
                    enlace.href = "#";
                    enlace.onclick = function (evento) {
                        evento.preventDefault();
                        tablaActual = dato;
                        marcarEnlaceActivo(enlace);
                        vistaActual = "tabla";
                        tabla.cargar(tablaActual);
                    };
                    menu.appendChild(enlace);
                }
            });

            if (datos.length > 0) {
                crearEnlaceCalendario();
                const enlaceDashboard = crearEnlaceDashboard();
                tablaActual = datos[0];
                enlaceDashboard.classList.add("activo");
                vistaActual = "dashboard";
                dashboard.render();
            }
        });
}

function crearRedimensionable(elemento) {
    const separador = document.createElement("div");
    separador.classList.add("separador-redimensionable");

    elemento.after(separador);

    separador.addEventListener("mousedown", function (evento) {
        evento.preventDefault();

        const inicioX = evento.clientX;
        const anchoInicial = elemento.offsetWidth;

        function mover(evento) {
            const diferencia = evento.clientX - inicioX;
            const nuevoAncho = anchoInicial + diferencia;

            elemento.style.width = `${Math.max(100, nuevoAncho)}px`;
        }

        function soltar() {
            document.removeEventListener("mousemove", mover);
            document.removeEventListener("mouseup", soltar);
        }

        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup", soltar);
    });
}

function iniciarAplicacion() {
    utilidades.obtenerJson("api/superapi.php?ruta=usuario_actual")
        .then((datos) => {
            usuarioActual = datos.usuario;
            calendario.establecerUsuario(usuarioActual);
            const nombreCompleto = [
                usuarioActual.nombre,
                usuarioActual.apellidos
            ].filter(Boolean).join(" ");
            document.querySelector("#usuario-actual").textContent =
                nombreCompleto;
            document.querySelector("#rol-actual").textContent =
                utilidades.capitalizar(usuarioActual.rol);
            document.querySelector("#avatar-usuario").textContent =
                (usuarioActual.nombre || "?").charAt(0).toUpperCase();
            configuracion.cargar();
            cargarModulos();
            cargarEntidades();
            crearRedimensionable(document.querySelector("#modulos"));
            crearRedimensionable(document.querySelector("#entidades"));
            if (usuarioActual.rol === "administrador") {
                configuracion.crearBoton();
            }
        })
        .catch(() => {
            window.location.href = "login.html";
        });
}

iniciarAplicacion();
