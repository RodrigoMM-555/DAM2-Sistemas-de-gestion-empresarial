document.querySelector("#formulario-login").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const error = document.querySelector("#error-login");
    error.hidden = true;

    fetch("api/login.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            email: formulario.get("email"),
            contrasena: formulario.get("contrasena")
        })
    }).then((respuesta) => respuesta.text().then((texto) => {
        let datos;
        try {
            datos = JSON.parse(texto);
        } catch {
            throw new Error(
                texto.trim() || "El servidor no devolvió una respuesta válida"
            );
        }
        if (!respuesta.ok || datos.error) {
            throw new Error(datos.error || "No se pudo iniciar sesión");
        }
        window.location.href = "index.html";
    })).catch((fallo) => {
        error.textContent = fallo.message;
        error.hidden = false;
    });
});
