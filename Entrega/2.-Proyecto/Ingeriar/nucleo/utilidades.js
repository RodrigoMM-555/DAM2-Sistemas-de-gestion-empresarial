class IngeriarUtilidades {
    capitalizar(texto) {
        return String(texto)
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, function (letra) {
                return letra.toUpperCase();
            });
    }

    limiteTexto(tipo) {
        let coincidencia = String(tipo).match(
            /^(?:VARCHAR|CHAR)\s*\(\s*(\d+)\s*\)/i
        );
        return coincidencia === null ? null : Number(coincidencia[1]);
    }

    obtenerJson(url) {
        return fetch(url).then(function (respuesta) {
            if (!respuesta.ok) {
                throw new Error("No se pudo obtener la información");
            }
            return respuesta.json();
        });
    }

    enviarFormulario(url, datos) {
        return fetch(url, {
            method: "POST",
            body: datos
        }).then(function (respuesta) {
            return respuesta.json().then(function (resultado) {
                if (!respuesta.ok || resultado.error) {
                    throw new Error(
                        resultado.error || "No se pudo completar la operación"
                    );
                }
                return resultado;
            });
        });
    }

    enviarJson(url, datos) {
        return fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(datos)
        }).then(function (respuesta) {
            return respuesta.json();
        });
    }
}

const utilidades = new IngeriarUtilidades();
