document.addEventListener('DOMContentLoaded', () => {
    const listaPreguntasContainer = document.getElementById('lista-preguntas');
    const searchInput = document.getElementById('searchInput');
    const filterControls = document.getElementById('filter-controls');
    let todasLasPreguntas = [];

    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
    const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    function aplicarFiltros() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filtroActivo = filterControls.querySelector('input[name="filter"]:checked').value;

        let preguntasAMostrar = todasLasPreguntas;

        if (filtroActivo === 'marcadas') {
            const preguntasMarcadasIds = getFromStorage('chenkoTestMarcadas');
            preguntasAMostrar = todasLasPreguntas.filter(p => p && preguntasMarcadasIds.includes(p.id));
        }

        if (searchTerm !== '') {
            preguntasAMostrar = preguntasAMostrar.filter(p => {
                if (!p) return false;
                const textoOpciones = Object.values(p.opciones || {}).join(' ').toLowerCase();
                const textoFuente = (p.fuente || '').toLowerCase();
                const textoTema = (p.tema || '').toLowerCase();
                return (p.pregunta && p.pregunta.toLowerCase().includes(searchTerm)) ||
                       textoOpciones.includes(searchTerm) ||
                       (p.justificacion && p.justificacion.toLowerCase().includes(searchTerm)) ||
                       textoFuente.includes(searchTerm) ||
                       textoTema.includes(searchTerm);
            });
        }

        renderPreguntas(preguntasAMostrar);
    }

    function renderPreguntas(preguntas) {
        listaPreguntasContainer.innerHTML = '';
        if (!preguntas || preguntas.length === 0) {
            listaPreguntasContainer.innerHTML = '<p class="no-results">No se encontraron preguntas con los filtros seleccionados.</p>';
            return;
        }

        preguntas.forEach(pregunta => {
            if (!pregunta || !pregunta.id) return;
            let estaMarcada = getFromStorage('chenkoTestMarcadas').includes(pregunta.id);
            const preguntaCard = document.createElement('div');
            preguntaCard.className = 'pregunta-card';

            let opcionesHTML = '';
            for (const letra in pregunta.opciones) {
                const esCorrecta = letra === pregunta.respuesta_correcta;
                opcionesHTML += `<li class="${esCorrecta ? 'correcta' : ''}">${letra.toUpperCase()}) ${pregunta.opciones[letra]}</li>`;
            }

            preguntaCard.innerHTML = `
                <div class="card-header">
                    <p class="card-temario">${pregunta.temario || 'Sin temario'} - Tema: ${pregunta.tema || 'Sin tema'}</p>
                    <span class="marcador-pregunta ${estaMarcada ? 'marcada' : ''}" data-id="${pregunta.id}"></span>
                </div>
                <h3>${pregunta.id}. ${pregunta.pregunta}</h3>
                <ul>${opcionesHTML}</ul>
                <div class="card-justificacion">
                    <p><strong>Justificación:</strong> ${pregunta.justificacion || 'No disponible.'}</p>
                    <p class="card-fuente"><em>Fuente: ${pregunta.fuente || 'No especificada'}</em></p>
                </div>
            `;
            listaPreguntasContainer.appendChild(preguntaCard);

            preguntaCard.querySelector('.marcador-pregunta').addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                let marcadas = getFromStorage('chenkoTestMarcadas');
                if (marcadas.includes(id)) {
                    marcadas = marcadas.filter(mId => mId !== id);
                } else {
                    marcadas.push(id);
                }
                saveToStorage('chenkoTestMarcadas', marcadas);
                e.target.classList.toggle('marcada');
            });
        });
    }

    searchInput.addEventListener('input', aplicarFiltros);
    filterControls.addEventListener('change', aplicarFiltros);

    fetch('preguntas.json')
        .then(response => response.json())
        .then(data => {
            todasLasPreguntas = data;
            aplicarFiltros();
        })
        .catch(error => {
            console.error('Error al cargar el banco de preguntas:', error);
            listaPreguntasContainer.innerHTML = '<p class="no-results">Error grave al cargar el banco de preguntas.</p>';
        });
});
