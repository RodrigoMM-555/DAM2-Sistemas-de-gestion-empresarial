// Guarda el nombre de la entidad seleccionada actualmente.
let tablaActual = "";

// Pedimos la configuración visual y el nombre de la aplicación al servidor.
fetch("data/config.php")
.then(r => r.json())
.then(datos => {
  // Sustituimos el título inicial por el nombre configurado.
  document.querySelector("h1").textContent = datos.nombre;
  // Aplicamos el color corporativo a la variable CSS global.
  document.documentElement.style.setProperty("--color_corporativo", datos.color);
});

// Solicitamos los módulos fijos que aparecen en el menú izquierdo.
fetch("api/superapi.php?ruta=modulos")
.then(r => r.json())
.then(datos => {
  // Localizamos el contenedor del menú de módulos.
  const menu = document.querySelector("#modulos");
  // Creamos un enlace visual para cada módulo recibido.
  datos.forEach(dato => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = dato;
    menu.appendChild(a);
  });
});

// Solicitamos a la API las tablas disponibles en SQLite.
fetch("api/superapi.php?ruta=entidades")
.then(r => r.json())
.then(datos => {
  // Localizamos el segundo menú, donde aparecerán las tablas.
  const menu = document.querySelector("#entidades");
  // Generamos un enlace por cada tabla.
  datos.forEach(tabla => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = tabla;
    // Al pulsar una tabla, evitamos navegar y cargamos sus datos.
    a.onclick = evento => {
      evento.preventDefault();
      // Quitamos la selección visual de las demás tablas.
      document.querySelectorAll("#entidades a").forEach(x => x.classList.remove("activo"));
      // Marcamos como activa la tabla pulsada.
      a.classList.add("activo");
      // Pedimos y mostramos la estructura y los registros.
      cargarEntidad(tabla);
    };
    menu.appendChild(a);
  });
});

// Carga una tabla concreta y monta sus componentes de formulario y listado.
async function cargarEntidad(tabla) {
  // Guardamos la tabla actual para futuras operaciones.
  tablaActual = tabla;
  // encodeURIComponent permite enviar correctamente nombres con espacios o símbolos.
  const respuesta = await fetch("api/superapi.php?ruta=tabla&tabla=" + encodeURIComponent(tabla));
  // Convertimos la respuesta JSON en un objeto JavaScript.
  const datos = await respuesta.json();

  // Localizamos la zona principal de contenido.
  const seccion = document.querySelector("section");
  // Reemplazamos el contenido anterior por las zonas de esta entidad.
  seccion.innerHTML = `
    <div class="barra">
      <div><small>ENTIDAD</small><h2></h2></div>
    </div>
    <div id="zona-formulario"></div>
    <div id="zona-tabla"></div>
  `;
  // Escribimos el nombre de la tabla en el encabezado.
  seccion.querySelector("h2").textContent = tabla;

  // Creamos el formulario de alta usando las columnas recibidas.
  new DarkorangeFormulario({
    contenedor: "#zona-formulario",
    tabla,
    columnas: datos.columnas,
    alGuardar: () => cargarEntidad(tabla)
  }).render();

  // Creamos el listado usando las mismas columnas y los registros recibidos.
  new DarkorangeTabla({
    contenedor: "#zona-tabla",
    tabla,
    columnas: datos.columnas,
    registros: datos.registros
  }).render();
}

// Al pulsar Reporting se sustituyen las entidades por el informe completo.
document.querySelector("#boton-reporting").onclick = function(){
  // Quitamos la selección visual de las tablas.
  document.querySelectorAll("#entidades a").forEach(x => x.classList.remove("activo"));
  // Montamos el componente de informes dentro de la sección principal.
  new DarkorangeReporting({contenedor:"section"}).render();
};
