fetch("api/superapi.php?ruta=entidades")
.then(function(respuesta){return respuesta.json()})
.then(function(datos){
	console.log(datos)
    let menu = document.querySelector("nav")
    datos.array.forEach(function(dato){
        menu.innerHTML = '<a href=""> '+dato+'<a>'
        
    });
})