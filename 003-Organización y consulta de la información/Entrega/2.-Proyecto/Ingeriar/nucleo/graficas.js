class DarkorangeGraficas {
    static colores = [
        "#66ff00",
        "#e72222",
        "#155fe8",
        "#ebe710",
        "#f00ed2",
        "#7d07df",
        "#f87917"
    ];

    static crear(contenedor, tipo, etiquetas, valores, titulo = "") {
        const elemento = typeof contenedor === "string"
            ? document.querySelector(contenedor)
            : contenedor;

        if (!elemento) {
            return;
        }

        elemento.innerHTML = "";

        if (titulo) {
            const encabezado = document.createElement("h3");
            encabezado.textContent = titulo;
            elemento.appendChild(encabezado);
        }

        const datos = valores.map((valor, indice) => ({
            label: String(etiquetas[indice] ?? `Elemento ${indice + 1}`),
            valor: Math.max(0, Number(valor) || 0)
        }));

        if (!datos.length || !datos.some((dato) => dato.valor)) {
            elemento.insertAdjacentHTML(
                "beforeend",
                '<p class="vacio">Sin datos para representar</p>'
            );
            return;
        }

        const svg = this.crearSvg(tipo, titulo);
        const tooltip = this.obtenerTooltip();
        const total = datos.reduce(
            (suma, dato) => suma + dato.valor,
            0
        );

        elemento.appendChild(svg);

        if (tipo === "anillo" || tipo === "tarta") {
            this.crearGraficaCircular(svg, datos, total, tipo, tooltip);
        } else {
            this.crearGraficaBarras(svg, datos, total, tooltip);
        }
    }

    static crearSvg(tipo, titulo) {
        const svg = this.crearNodo("svg", {
            viewBox: "0 0 440 260",
            role: "img",
            "aria-label": titulo || tipo
        });

        svg.classList.add("grafica-svg");
        return svg;
    }

    static crearNodo(etiqueta, atributos = {}) {
        const nodo = document.createElementNS(
            "http://www.w3.org/2000/svg",
            etiqueta
        );

        Object.entries(atributos).forEach(([nombre, valor]) => {
            nodo.setAttribute(nombre, valor);
        });

        return nodo;
    }

    static obtenerTooltip() {
        let tooltip = document.querySelector("#grafica-tooltip");

        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.id = "grafica-tooltip";
            tooltip.className = "grafica-tooltip";
            document.body.appendChild(tooltip);
        }

        return tooltip;
    }

    static activarTooltip(figura, dato, total, tooltip) {
        figura.addEventListener("mousemove", (evento) => {
            const numero = new Intl.NumberFormat("es-ES", {
                maximumFractionDigits: 2
            }).format(dato.valor);
            const porcentaje = (dato.valor / total * 100).toFixed(1);

            tooltip.textContent =
                `${dato.label}: ${numero} (${porcentaje}%)`;
            tooltip.style.display = "block";
            tooltip.style.left = Math.min(
                evento.clientX + 12,
                innerWidth - tooltip.offsetWidth - 8
            ) + "px";
            tooltip.style.top = Math.min(
                evento.clientY + 12,
                innerHeight - tooltip.offsetHeight - 8
            ) + "px";
        });

        figura.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });
    }

    static crearGraficaCircular(svg, datos, total, tipo, tooltip) {
        let angulo = -Math.PI / 2;
        const centroX = 145;
        const centroY = 128;
        const radio = 105;
        const radioInterior = tipo === "anillo" ? 62 : 0;

        const punto = (distancia, anguloActual) => [
            centroX + distancia * Math.cos(anguloActual),
            centroY + distancia * Math.sin(anguloActual)
        ];

        datos.forEach((dato, indice) => {
            if (!dato.valor) {
                return;
            }

            const amplitud = dato.valor / total * Math.PI * 2;
            const final = angulo + amplitud;
            const ruta = this.crearRutaCircular(
                centroX,
                centroY,
                radio,
                radioInterior,
                angulo,
                final,
                amplitud,
                punto
            );

            const figura = this.crearNodo("path", {
                d: ruta,
                fill: this.colores[indice % this.colores.length],
                stroke: "#fff",
                "stroke-width": 2,
                "fill-rule": "evenodd"
            });

            svg.appendChild(figura);
            this.activarTooltip(figura, dato, total, tooltip);
            angulo = final;
        });

        if (radioInterior) {
            const texto = this.crearNodo("text", {
                x: centroX,
                y: centroY,
                "text-anchor": "middle",
                "font-size": 24,
                "font-weight": 700,
                fill: "#333"
            });

            texto.textContent = new Intl.NumberFormat("es-ES", {
                notation: total > 9999 ? "compact" : "standard"
            }).format(total);
            svg.appendChild(texto);
        }

        datos.slice(0, 7).forEach((dato, indice) => {
            const y = 38 + indice * 29;
            const color = this.colores[indice % this.colores.length];
            const indicador = this.crearNodo("rect", {
                x: 275,
                y: y - 11,
                width: 12,
                height: 12,
                rx: 3,
                fill: color
            });
            const texto = this.crearNodo("text", {
                x: 293,
                y,
                fill: "#444",
                "font-size": 12
            });

            texto.textContent = `${dato.label.slice(0, 17)} · ${dato.valor}`;
            svg.append(indicador, texto);
        });
    }

    static crearRutaCircular(
        centroX,
        centroY,
        radio,
        radioInterior,
        inicio,
        final,
        amplitud,
        punto
    ) {
        if (amplitud >= Math.PI * 2 - 1e-8) {
            const circuloExterior =
                `M ${centroX - radio} ${centroY} ` +
                `a ${radio} ${radio} 0 1 0 ${2 * radio} 0 ` +
                `a ${radio} ${radio} 0 1 0 ${-2 * radio} 0`;

            if (!radioInterior) {
                return `${circuloExterior} Z`;
            }

            const circuloInterior =
                `M ${centroX - radioInterior} ${centroY} ` +
                `a ${radioInterior} ${radioInterior} 0 1 1 ` +
                `${2 * radioInterior} 0 ` +
                `a ${radioInterior} ${radioInterior} 0 1 1 ` +
                `${-2 * radioInterior} 0 Z`;

            return `${circuloExterior} ${circuloInterior}`;
        }

        const [x1, y1] = punto(radio, inicio);
        const [x2, y2] = punto(radio, final);
        const arcoGrande = amplitud > Math.PI ? 1 : 0;

        if (!radioInterior) {
            return (
                `M ${centroX} ${centroY} ` +
                `L ${x1} ${y1} ` +
                `A ${radio} ${radio} 0 ${arcoGrande} 1 ${x2} ${y2} Z`
            );
        }

        const [x3, y3] = punto(radioInterior, final);
        const [x4, y4] = punto(radioInterior, inicio);

        return (
            `M ${x1} ${y1} ` +
            `A ${radio} ${radio} 0 ${arcoGrande} 1 ${x2} ${y2} ` +
            `L ${x3} ${y3} ` +
            `A ${radioInterior} ${radioInterior} 0 ${arcoGrande} 0 ` +
            `${x4} ${y4} Z`
        );
    }

    static crearGraficaBarras(svg, datos, total, tooltip) {
        const maximo = Math.max(...datos.map((dato) => dato.valor), 1);
        const cantidad = Math.min(datos.length, 12);
        const separacion = 9;
        const ancho = 395 / cantidad - separacion;

        datos.slice(0, cantidad).forEach((dato, indice) => {
            const alto = dato.valor / maximo * 190;
            const x = 25 + indice * (ancho + separacion);
            const y = 216 - alto;
            const barra = this.crearNodo("rect", {
                x,
                y,
                width: ancho,
                height: alto,
                rx: 4,
                fill: this.colores[indice % this.colores.length]
            });

            const etiqueta = this.crearNodo("text", {
                x: x + ancho / 2,
                y: 235,
                "text-anchor": "middle",
                "font-size": 10,
                fill: "#555"
            });

            etiqueta.textContent = dato.label.slice(
                0,
                Math.max(3, Math.floor(ancho / 6))
            );
            svg.append(barra, etiqueta);
            this.activarTooltip(barra, dato, total, tooltip);
        });
    }

    static frecuencia(registros, columna) {
        const mapa = new Map();

        registros.forEach((registro) => {
            const valor = String(registro[columna] ?? "(vacío)");
            mapa.set(valor, (mapa.get(valor) || 0) + 1);
        });

        return [...mapa]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }

    static campo(registros, columnas) {
        const candidatos = columnas.filter((columna) =>
            !columna.pk &&
            !["id", "identificador"].includes(columna.name) &&
            !/_id$/.test(columna.name)
        );

        const campoConCategorias = candidatos.find((columna) => {
            const valores = new Set(
                registros.map((registro) => registro[columna.name])
            );

            return valores.size > 1 &&
                valores.size <= Math.max(12, registros.length * 0.65);
        });

        return campoConCategorias ||
            candidatos.find((columna) => {
                const valores = new Set(
                    registros.map((registro) => registro[columna.name])
                );

                return valores.size > 1;
            }) ||
            candidatos[0];
    }
}
