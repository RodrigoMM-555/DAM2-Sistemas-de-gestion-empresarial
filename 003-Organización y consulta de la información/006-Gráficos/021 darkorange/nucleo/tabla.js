// Componente que representa una tabla SQLite como una tabla HTML.
class DarkorangeTabla {
  // Recibe el lugar donde dibujar, la definición de columnas y los registros.
  constructor({contenedor, tabla, columnas, registros}) {
    // Permitimos recibir un selector o un elemento HTML.
    this.contenedor = typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor;
    // Guardamos el nombre para el título.
    this.tabla = tabla;
    // Usamos arrays vacíos si la API no devuelve datos.
    this.columnas = columnas || [];
    this.registros = registros || [];
  }

  // Genera el listado HTML completo.
  render() {
    // Borramos el contenido que pudiera haber antes.
    this.contenedor.innerHTML = "";

    // Creamos el título del listado.
    const titulo = document.createElement("h3");
    titulo.textContent = "Listado de " + this.tabla;
    this.contenedor.appendChild(titulo);

    // Si no hay columnas, no podemos construir una tabla útil.
    if (!this.columnas.length) {
      this.contenedor.innerHTML += '<p class="vacio">No hay columnas.</p>';
      return;
    }

    // Creamos los elementos principales de la tabla.
    const envoltorio = document.createElement("div");
    envoltorio.className = "tabla-contenedor";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Creamos la fila de encabezados.
    const trh = document.createElement("tr");
    // Cada columna se convierte en una celda th.
    this.columnas.forEach(columna => {
      const th = document.createElement("th");
      th.textContent = columna.name;
      trh.appendChild(th);
    });
    // Insertamos los encabezados en thead.
    thead.appendChild(trh);

    // Convertimos cada registro recibido en una fila.
    this.registros.forEach(registro => {
      const tr = document.createElement("tr");
      // Creamos una celda por cada columna, respetando su orden.
      this.columnas.forEach(columna => {
        const td = document.createElement("td");
        // Null y undefined se muestran como texto vacío.
        td.textContent = registro[columna.name] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Montamos encabezado y cuerpo dentro de la tabla.
    table.append(thead, tbody);
    // Envolvemos la tabla para permitir desplazamiento horizontal.
    envoltorio.appendChild(table);
    // Insertamos el resultado en el contenedor.
    this.contenedor.appendChild(envoltorio);

    // Mostramos un mensaje adicional cuando la tabla no tiene filas.
    if (!this.registros.length) {
      const vacio = document.createElement("p");
      vacio.className = "vacio";
      vacio.textContent = "Todavía no hay registros.";
      this.contenedor.appendChild(vacio);
    }
    // Devolvemos la tabla generada.
    return table;
  }
}