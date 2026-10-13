// Componente que genera un informe imprimible con todas las tablas de la base de datos.
class DarkorangeReporting {
  // Recibe el contenedor del informe y la URL de la API.
  constructor({contenedor="section", api="api/superapi.php"} = {}) {
    // Aceptamos tanto un selector CSS como un elemento HTML.
    this.contenedor = typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor;
    this.api = api;
  }

  // Indica si el tipo de una columna permite calcular sumas y promedios.
  esNumerica(columna) {
    const tipo = (columna.type || "").toUpperCase();
    return ["INT","REAL","NUM","DECIMAL","FLOAT","DOUBLE"].some(t => tipo.includes(t));
  }

  // Formatea números con el formato habitual español.
  formatoNumero(valor) {
    return new Intl.NumberFormat("es-ES", {maximumFractionDigits:2}).format(valor);
  }

  // Descarga la lista de tablas y después los datos de cada una.
  async cargarTodo() {
    const tablas = await fetch(this.api + "?ruta=entidades").then(r => r.json());
    return Promise.all(tablas.map(tabla =>
      fetch(this.api + "?ruta=tabla&tabla=" + encodeURIComponent(tabla)).then(r => r.json())
    ));
  }

  // Construye la pantalla completa del informe.
  async render() {
    // Mostramos un aviso mientras se completan las peticiones.
    this.contenedor.innerHTML = '<div class="vacio">Generando informe completo…</div>';
    // Esperamos a tener los datos de todas las entidades.
    const entidades = await this.cargarTodo();
    // Sumamos la cantidad de registros de todas las tablas.
    const totalRegistros = entidades.reduce((s,e) => s + e.registros.length, 0);
    // Generamos la fecha y hora que aparecerán en el documento.
    const fecha = new Intl.DateTimeFormat("es-ES", {dateStyle:"long", timeStyle:"short"}).format(new Date());

    // Creamos la estructura del informe, incluyendo su barra de herramientas.
    this.contenedor.innerHTML = `
      <div class="reporting-toolbar">
        <div><strong>Reporting</strong><small> ${entidades.length} tablas · ${totalRegistros} registros</small></div>
        <button type="button" id="reporting-imprimir">Imprimir / PDF</button>
      </div>
      <div class="reporting-documento">
        <article class="reporting-a4">
          <header class="reporting-cabecera">
            <div><small>JOCARSA · DARKORANGE</small><h1>Reporte general</h1></div>
            <div class="reporting-fecha">${fecha}</div>
          </header>
          <div class="reporting-resumen">
            <div><strong>${entidades.length}</strong><span>tablas</span></div>
            <div><strong>${totalRegistros}</strong><span>registros</span></div>
          </div>
          <div id="reporting-tablas"></div>
        </article>
      </div>`;

    // Localizamos el contenedor donde se insertarán las tablas.
    const zona = this.contenedor.querySelector("#reporting-tablas");
    // Generamos un bloque visual por cada entidad.
    entidades.forEach(entidad => zona.appendChild(this.crearTabla(entidad)));
    // El botón utiliza la función de impresión del navegador, que permite guardar como PDF.
    this.contenedor.querySelector("#reporting-imprimir").onclick = () => window.print();
  }

  // Crea una sección del informe para una tabla concreta.
  crearTabla(datos) {
    // Creamos el bloque que contendrá título, filtros y tabla.
    const bloque = document.createElement("section");
    bloque.className = "reporting-bloque";
    // Guardamos los índices de las columnas que admiten operaciones numéricas.
    const numericas = datos.columnas.map((c,i) => this.esNumerica(c) ? i : -1).filter(i => i >= 0);

    // Insertamos la estructura base de la tabla del informe.
    bloque.innerHTML = `
      <div class="reporting-titulo-tabla">
        <div><small>TABLA</small><h2>${this.esc(datos.tabla)}</h2></div>
        <span class="reporting-contador">${datos.registros.length} filas</span>
      </div>
      <div class="reporting-tabla-scroll"><table><thead></thead><tbody></tbody><tfoot></tfoot></table></div>`;

    // Preparamos el encabezado y sus dos filas: filtros y nombres.
    const thead = bloque.querySelector("thead");
    const filtros = document.createElement("tr");
    filtros.className = "reporting-filtros";
    const nombres = document.createElement("tr");
    // Creamos un buscador y un encabezado ordenable por cada columna.
    datos.columnas.forEach((columna, indice) => {
      const thf = document.createElement("th");
      const input = document.createElement("input");
      input.type = "search";
      input.placeholder = "Filtrar";
      input.dataset.indice = indice;
      thf.appendChild(input); filtros.appendChild(thf);

      const th = document.createElement("th");
      th.textContent = columna.name;
      th.dataset.indice = indice;
      th.dataset.asc = "1";
      nombres.appendChild(th);
    });
    // Añadimos las dos filas al encabezado.
    thead.append(filtros, nombres);

    // Rellenamos el cuerpo con todos los registros recibidos.
    const tbody = bloque.querySelector("tbody");
    datos.registros.forEach(registro => {
      const tr = document.createElement("tr");
      datos.columnas.forEach(c => {
        const td = document.createElement("td");
        td.textContent = registro[c.name] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Aplica los filtros actuales y recalcula el contador y el resumen.
    const actualizar = () => {
      const inputs = [...bloque.querySelectorAll("thead input")];
      // Una fila es visible si coincide con todos los filtros.
      const visibles = [...tbody.rows].filter(fila => {
        const ok = inputs.every((input,i) =>
          fila.cells[i].textContent.toLowerCase().includes(input.value.toLowerCase().trim())
        );
        fila.style.display = ok ? "" : "none";
        return ok;
      });
      // Actualizamos el número de filas visibles.
      bloque.querySelector(".reporting-contador").textContent = visibles.length + " filas";
      // Actualizamos suma y promedio usando solo las filas visibles.
      this.resumen(bloque, datos.columnas, visibles, numericas);
    };

    // Cada cambio en un filtro vuelve a calcular las filas visibles.
    bloque.querySelectorAll("thead input").forEach(i => i.oninput = actualizar);
    // Cada nombre de columna permite ordenar sus filas.
    nombres.querySelectorAll("th").forEach(th => th.onclick = () => {
      const i = +th.dataset.indice;
      const asc = th.dataset.asc === "1";
      [...tbody.rows].sort((a,b) => {
        let A = a.cells[i].textContent.trim();
        let B = b.cells[i].textContent.trim();
        if (numericas.includes(i)) {
          A = parseFloat(A) || 0;
          B = parseFloat(B) || 0;
          return asc ? A - B : B - A;
        }
        return asc
          ? A.localeCompare(B, "es", {numeric:true})
          : B.localeCompare(A, "es", {numeric:true});
      }).forEach(fila => tbody.appendChild(fila));
      // Alternamos el sentido para el siguiente clic.
      th.dataset.asc = asc ? "0" : "1";
    });
    // Calculamos el estado inicial sin filtros.
    actualizar();
    // Devolvemos el bloque para insertarlo en el documento.
    return bloque;
  }

  // Calcula y dibuja la suma y el promedio de las columnas numéricas.
  resumen(bloque, columnas, filas, numericas) {
    const tfoot = bloque.querySelector("tfoot");
    tfoot.innerHTML = "";
    // Si no hay columnas numéricas, no hay resumen que mostrar.
    if (!numericas.length) return;
    // Generamos dos filas: una para suma y otra para promedio.
    for (const [etiqueta, promedio] of [["Suma",false],["Promedio",true]]) {
      const tr = document.createElement("tr");
      columnas.forEach((c,i) => {
        const td = document.createElement("td");
        if (i === 0) {
          td.textContent = etiqueta;
          td.className = "reporting-resumen-label";
        }
        if (numericas.includes(i)) {
          const valores = filas
            .map(fila => parseFloat(fila.cells[i].textContent))
            .filter(Number.isFinite);
          const suma = valores.reduce((a,b) => a + b, 0);
          const resultado = promedio
            ? (valores.length ? suma / valores.length : 0)
            : suma;
          td.textContent = this.formatoNumero(resultado);
          td.classList.add("numero");
        }
        tr.appendChild(td);
      });
      tfoot.appendChild(tr);
    }
  }

  // Escapa el nombre de tabla antes de introducirlo dentro de innerHTML.
  esc(v) {
    const d = document.createElement("div");
    d.textContent = v;
    return d.innerHTML;
  }
}
