// Componente encargado de crear y enviar el formulario de alta de registros.
class DarkorangeFormulario {
  // Recibe el contenedor, la tabla, sus columnas y la URL de la API.
  constructor({contenedor, tabla, columnas, api="api/superapi.php", alGuardar=null}) {
    // Aceptamos tanto un selector CSS como un elemento ya existente.
    this.contenedor = typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor;
    // Guardamos el nombre de la tabla donde se insertará el registro.
    this.tabla = tabla;
    // Si no llegan columnas, trabajamos con un array vacío.
    this.columnas = columnas || [];
    // Guardamos la dirección de la API.
    this.api = api;
    // Esta función se ejecuta después de guardar correctamente.
    this.alGuardar = alGuardar;
    // Aquí se guardará la referencia al formulario creado.
    this.formulario = null;
  }

  // Decide qué tipo de control HTML corresponde a una columna.
  tipoInput(columna) {
    // Normalizamos el nombre para poder compararlo sin distinguir mayúsculas.
    const nombre = columna.name.toLowerCase();
    // Normalizamos el tipo SQLite y evitamos errores si no existe.
    const tipo = (columna.type || "").toUpperCase();
    // Los campos cuyo nombre contiene email usan validación de correo.
    if (nombre.includes("email")) return "email";
    // Los teléfonos usan el teclado numérico apropiado en algunos dispositivos.
    if (nombre.includes("telefono") || nombre.includes("teléfono")) return "tel";
    // Las columnas de fecha usan el selector de fecha del navegador.
    if (nombre.includes("fecha") || tipo.includes("DATE")) return "date";
    // Los tipos numéricos se representan mediante un input number.
    if (tipo.includes("INT") || tipo.includes("REAL") || tipo.includes("NUM") ||
        tipo.includes("DECIMAL") || tipo.includes("FLOAT") || tipo.includes("DOUBLE")) return "number";
    // El resto de columnas se tratan como texto.
    return "text";
  }

  // Construye el formulario y lo inserta en la página.
  render() {
    // Eliminamos el formulario anterior si el componente se vuelve a renderizar.
    this.contenedor.innerHTML = "";

    // Creamos el título del formulario.
    const titulo = document.createElement("h3");
    titulo.textContent = "Nuevo registro";
    this.contenedor.appendChild(titulo);

    // Creamos el elemento form que contendrá los controles.
    const form = document.createElement("form");
    form.className = "componente-formulario";

    // Creamos un control para cada columna de la tabla.
    this.columnas.forEach(columna => {
      // La clave primaria autogenerada no debe pedir datos al usuario.
      if (columna.pk || columna.name === "id") return;

      // Envoltorio visual de etiqueta y campo.
      const control = document.createElement("div");
      control.className = "control";

      // Creamos la etiqueta visible del campo.
      const label = document.createElement("label");
      label.textContent = columna.name;
      label.htmlFor = "campo_" + columna.name;

      // Creamos el campo donde el usuario escribirá el valor.
      const input = document.createElement("input");
      input.type = this.tipoInput(columna);
      input.name = columna.name;
      input.id = "campo_" + columna.name;
      input.placeholder = columna.name;
      // Permitimos decimales en los campos numéricos.
      if (input.type === "number") input.step = "any";

      // Agrupamos etiqueta y campo dentro del control.
      control.append(label, input);
      // Añadimos el control al formulario.
      form.appendChild(control);
    });

    // Creamos el botón que dispara el envío.
    const boton = document.createElement("button");
    boton.type = "submit";
    boton.textContent = "Guardar";
    form.appendChild(boton);

    // Interceptamos el envío normal para usar fetch sin recargar la página.
    form.addEventListener("submit", evento => this.guardar(evento));
    // Insertamos el formulario terminado en el contenedor.
    this.contenedor.appendChild(form);
    // Guardamos la referencia para leer sus campos al guardar.
    this.formulario = form;
    // Devolvemos el formulario por si quien llama necesita reutilizarlo.
    return form;
  }

  // Convierte los campos del formulario en JSON y los envía a la API.
  async guardar(evento) {
    // Evitamos que el navegador recargue la página.
    evento.preventDefault();
    // FormData lee todos los controles y Object.fromEntries crea un objeto normal.
    const datos = Object.fromEntries(new FormData(this.formulario).entries());

    // Enviamos el nombre de tabla y los datos mediante una petición POST.
    const respuesta = await fetch(this.api + "?ruta=crear", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({tabla: this.tabla, datos})
    });
    // Convertimos la respuesta de la API en un objeto.
    const resultado = await respuesta.json();
    // Tratamos como error tanto un HTTP fallido como una respuesta ok=false.
    if (!respuesta.ok || resultado.ok === false) {
      throw new Error(resultado.error || "No se pudo guardar el registro");
    }

    // Limpiamos los campos después de guardar.
    this.formulario.reset();
    // Avisamos al componente padre para que refresque el listado.
    if (this.alGuardar) await this.alGuardar(resultado);
  }
}