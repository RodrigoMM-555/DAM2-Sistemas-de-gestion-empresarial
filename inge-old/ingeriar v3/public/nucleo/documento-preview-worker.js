self.onmessage = async (evento) => {
    try {
        const respuesta = await fetch(evento.data.url, {credentials: "include"});
        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el documento");
        }
        const blob = await respuesta.blob();
        if (!blob.type.startsWith("image/") || !self.createImageBitmap) {
            self.postMessage({kind: "document"});
            return;
        }

        const imagen = await self.createImageBitmap(blob);
        const escala = Math.min(1, 320 / imagen.width, 240 / imagen.height);
        const canvas = new OffscreenCanvas(
            Math.max(1, Math.round(imagen.width * escala)),
            Math.max(1, Math.round(imagen.height * escala))
        );
        canvas.getContext("2d").drawImage(
            imagen, 0, 0, canvas.width, canvas.height
        );
        const vista = await canvas.convertToBlob({type: "image/jpeg", quality: 0.82});
        self.postMessage({kind: "image", blob: vista});
        imagen.close();
    } catch (error) {
        self.postMessage({kind: "error", message: error.message});
    }
};
