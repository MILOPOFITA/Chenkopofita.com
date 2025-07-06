// Espera a que todo el contenido del HTML se cargue antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {

  // Usamos 'fetch' para ir a buscar nuestro archivo de preguntas.
  fetch('preguntas.json')
    .then(response => {
      // Si el servidor no encuentra el archivo, lanzamos un error.
      if (!response.ok) {
        throw new Error('Error al cargar el archivo de preguntas. Código de estado: ' + response.status);
      }
      // Cuando encuentra el archivo, lo convierte a un formato que JavaScript entiende.
      return response.json();
    })
    .then(data => {
      // 'data' es ahora nuestra lista de preguntas, cargada desde el archivo JSON.
      // ¡La magia sucede aquí!
      
      // 1. Para que nosotros lo veamos: Imprimimos los datos en la consola del desarrollador.
      console.log('✅ Preguntas cargadas con éxito:', data);

      // 2. Para que el usuario lo vea: Mostramos un mensaje en la página.
      const appContainer = document.getElementById('app');
      appContainer.textContent = `¡Base de datos conectada! Se han cargado ${data.length} preguntas.`;
    })
    .catch(error => {
      // Si algo sale mal en cualquier punto, lo mostramos en la consola y en la página.
      console.error('❌ Ha ocurrido un error:', error);
      document.getElementById('app').textContent = 'Error al cargar los datos. Revisa la consola para más detalles.';
    });

});
