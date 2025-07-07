// --- INICIO: CÓDIGO DE FIREBASE ---
// Pega aquí el bloque firebaseConfig que copiaste de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBstQPOG6VJfLh1UlCupolbEcpCEF8ip1M",
  authDomain: "chenkotest-a5443.firebaseapp.com",
  projectId: "chenkotest-a5443",
  storageBucket: "chenkotest-a5443.firebasestorage.app",
  messagingSenderId: "764163254493",
  appId: "1:764163254493:web:345dadae256c2005cf1334"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Constantes para acceder a los servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();
// --- FIN: CÓDIGO DE FIREBASE ---

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    const authContainer = document.getElementById('auth-container');
    const userStatusContainer = document.getElementById('user-status-container');
    let todasLasPreguntas = [];
    let timerInterval = null;
    let currentUserData = null;

    // --- LÓGICA DE AUTENTICACIÓN Y GESTIÓN DE DATOS ---

    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUserData = await getUserData(user.uid);
            console.log('Usuario conectado:', user.email);
            // Actualizamos el menú de usuario de la esquina
            userStatusContainer.innerHTML = `
                <span id="user-display">${user.email}</span>
                <button id="logout-btn-main" title="Cerrar Sesión">↪️</button>
            `;
            document.getElementById('logout-btn-main').addEventListener('click', () => auth.signOut());
        } else {
            currentUserData = null;
            console.log('Ningún usuario conectado.');
            userStatusContainer.innerHTML = `
                <span id="user-display">Invitado</span>
                <a href="#" id="auth-link-main" title="Acceder / Registrarse">👤</a>
            `;
            document.getElementById('auth-link-main').addEventListener('click', e => {
                e.preventDefault();
                renderAuthForm(true); // Muestra el login por defecto
            });
        }
        // Siempre mostramos el menú principal al cambiar el estado del usuario
        mostrarMenuPrincipal();
    });

    async function getUserData(userId) {
        if (!userId) return null;
        try {
            const userDoc = await db.collection('usuarios').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data();
            } else {
                const user = auth.currentUser;
                const nuevaFicha = {
                    email: user.email,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    isSubscribed: false,
                    errores: [],
                    marcadas: []
                };
                await db.collection('usuarios').doc(user.uid).set(nuevaFicha);
                return nuevaFicha;
            }
        } catch (error) {
            console.error("Error al obtener datos de usuario:", error);
            return null;
        }
    }

    function renderAuthForm(isLogin = true) {
        const title = isLogin ? 'Iniciar Sesión' : 'Registro de Usuario';
        const buttonText = isLogin ? 'Entrar' : 'Registrarse';
        const toggleText = isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
        const formId = isLogin ? 'login-form' : 'register-form';

        authContainer.innerHTML = `
            <div class="auth-form">
                <button class="close-btn" id="close-auth-btn">&times;</button>
                <h2>${title}</h2>
                <form id="${formId}">
                    <div class="form-group"><label for="auth-email">Correo</label><input type="email" id="auth-email" required></div>
                    <div class="form-group"><label for="auth-password">Contraseña</label><input type="password" id="auth-password" required></div>
                    <button type="submit" class="btn-choice">${buttonText}</button>
                    <p id="auth-message"></p>
                    <p class="toggle-form"><a id="toggle-auth-mode">${toggleText}</a></p>
                </form>
            </div>
        `;
        authContainer.classList.remove('hidden');

        document.getElementById('close-auth-btn').addEventListener('click', () => authContainer.classList.add('hidden'));
        document.getElementById('toggle-auth-mode').addEventListener('click', () => renderAuthForm(!isLogin));
        document.getElementById(formId).addEventListener('submit', (e) => handleAuthSubmit(e, isLogin));
    }

    function handleAuthSubmit(e, isLogin) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const messageP = document.getElementById('auth-message');
        messageP.textContent = 'Procesando...';

        const authPromise = isLogin 
            ? auth.signInWithEmailAndPassword(email, password)
            : auth.createUserWithEmailAndPassword(email, password);

        authPromise.then(userCredential => {
            const user = userCredential.user;
            if (!isLogin) {
                const nuevaFicha = {
                    email: user.email,
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    isSubscribed: false,
                    errores: [],
                    marcadas: []
                };
                db.collection('usuarios').doc(user.uid).set(nuevaFicha)
                    .catch(dbError => console.error('Error al crear la ficha en Firestore:', dbError));
            }
            authContainer.classList.add('hidden');
        }).catch(error => {
            messageP.textContent = getAuthErrorMessage(error.code);
        });
    }

    function getAuthErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/wrong-password': return 'La contraseña es incorrecta.';
            case 'auth/user-not-found': return 'No se encontró ningún usuario con este correo.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/email-already-in-use': return 'Este correo electrónico ya está registrado.';
            default: return 'Ha ocurrido un error. Inténtalo de nuevo.';
        }
    }

    // --- LÓGICA DE TESTS Y DATOS PERSONALES ---

    async function guardarError(preguntaId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const userRef = db.collection('usuarios').doc(userId);
        await userRef.update({
            errores: firebase.firestore.FieldValue.arrayUnion(preguntaId)
        });
        if (currentUserData && !currentUserData.errores.includes(preguntaId)) {
            currentUserData.errores.push(preguntaId);
        }
    }

    async function eliminarError(preguntaId) {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const userRef = db.collection('usuarios').doc(userId);
        await userRef.update({
            errores: firebase.firestore.FieldValue.arrayRemove(preguntaId)
        });
        if (currentUserData) currentUserData.errores = currentUserData.errores.filter(id => id !== preguntaId);
    }

    async function togglePreguntaMarcada(preguntaId) {
        const userId = auth.currentUser?.uid;
        if (!userId || !currentUserData) return;

        const marcadas = currentUserData.marcadas || [];
        if (marcadas.includes(preguntaId)) {
            await db.collection('usuarios').doc(userId).update({ marcadas: firebase.firestore.FieldValue.arrayRemove(preguntaId) });
            currentUserData.marcadas = marcadas.filter(id => id !== preguntaId);
        } else {
            await db.collection('usuarios').doc(userId).update({ marcadas: firebase.firestore.FieldValue.arrayUnion(preguntaId) });
            if (!currentUserData.marcadas) currentUserData.marcadas = [];
            currentUserData.marcadas.push(preguntaId);
        }
    }

    function renderScreen(contentGenerator) {
        if (!appContainer) return;
        appContainer.classList.add('fade-out');
        setTimeout(() => {
            appContainer.innerHTML = '';
            contentGenerator();
            appContainer.classList.remove('fade-out');
        }, 400);
    }

    function startTimer(durationInSeconds, onTimeUp) {
        clearInterval(timerInterval);
        let timeLeft = durationInSeconds;
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        if(appContainer) appContainer.appendChild(timerDisplay);

        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = String(timeLeft % 60).padStart(2, '0');
            timerDisplay.textContent = `${minutes}:${seconds}`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                onTimeUp();
            }
            timeLeft--;
        };
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function mostrarMenuPrincipal() {
        clearInterval(timerInterval);
        renderScreen(() => {
            appContainer.innerHTML = `<h1>ChenkoTests</h1><p>Selecciona una oposición para comenzar:</p>`;
            if (todasLasPreguntas.length === 0) return;
            const temariosUnicos = [...new Set(todasLasPreguntas.map(p => p.temario))];
            const oppositionButtonsContainer = document.createElement('div');

            temariosUnicos.forEach(temario => {
                const boton = document.createElement('button');
                boton.className = 'btn-choice';
                boton.textContent = temario;
                boton.addEventListener('click', () => mostrarPantallaConfiguracion(temario));
                oppositionButtonsContainer.appendChild(boton);
            });
            appContainer.appendChild(oppositionButtonsContainer);
        });
    }

    function mostrarPantallaConfiguracion(temario) {
        if (!auth.currentUser) {
            alert("Debes iniciar sesión para acceder a los tests.");
            renderAuthForm(true);
            return;
        }

        renderScreen(() => {
            appContainer.innerHTML = `<h2>${temario}</h2><div class="config-form"><div class="form-group"><label>Modo de Test:</label><div class="radio-options"><label><input type="radio" name="mode" value="repaso" checked> Repaso</label><label><input type="radio" name="mode" value="examen"> Examen</label><label><input type="radio" name="mode" value="simulacro"> Simulacro</label></div></div><div class="form-group" id="numQuestionsGroup"><label for="numQuestions">Número de preguntas:</label><input type="number" id="numQuestions" value="10" min="1" max="100"></div><div class="form-group" id="infoSimulacro" style="display: none;"><p>El modo simulacro consta de 90 preguntas y dura 90 minutos.</p></div></div><button class="btn-choice" id="comenzarBtn">Comenzar Test Estándar</button>`;

            const preguntasDeErrores = (currentUserData?.errores || []).map(id => todasLasPreguntas.find(p => p.id === id)).filter(p => p && p.temario === temario);
            const botonErrores = document.createElement('button');
            botonErrores.className = 'btn-choice btn-secondary-test';
            botonErrores.textContent = `Test de Errores (${preguntasDeErrores.length})`;

            if (preguntasDeErrores.length === 0) {
                botonErrores.disabled = true;
                botonErrores.title = "No tienes errores guardados para esta oposición.";
            } else {
                botonErrores.addEventListener('click', () => mostrarConfiguracionEspecial(temario, 'errores'));
            }
            appContainer.appendChild(botonErrores);

            const radios = document.querySelectorAll('input[name="mode"]');
            radios.forEach(radio => radio.addEventListener('change', e => {
                const showNumQuestions = e.target.value === 'repaso' || e.target.value === 'examen';
                document.getElementById('numQuestionsGroup').style.display = showNumQuestions ? 'block' : 'none';
                document.getElementById('infoSimulacro').style.display = e.target.value === 'simulacro' ? 'block' : 'none';
            }));
            document.getElementById('comenzarBtn').addEventListener('click', () => {
                const modo = document.querySelector('input[name="mode"]:checked').value;
                const numPreguntas = parseInt(document.getElementById('numQuestions').value);
                iniciarTest(temario, modo, numPreguntas);
            });
        });
    }

    function mostrarConfiguracionEspecial(temario, modoEspecial) {
        const preguntasDisponibles = (currentUserData?.errores || []).map(id => todasLasPreguntas.find(p => p.id === id)).filter(p => p && p.temario === temario);

        renderScreen(() => {
            appContainer.innerHTML = `<h2>Test de Errores</h2><p>${temario}</p><div class="config-form"><div class="form-group"><label for="numQuestions">Número de preguntas (máx. ${preguntasDisponibles.length}):</label><input type="number" id="numQuestions" value="10" min="1" max="${preguntasDisponibles.length}"></div></div><button class="btn-choice" id="comenzarBtn">Comenzar</button>`;
            document.getElementById('comenzarBtn').addEventListener('click', () => {
                const numPreguntas = parseInt(document.getElementById('numQuestions').value);
                iniciarTest(temario, modoEspecial, numPreguntas);
            });
        });
    }

    function iniciarTest(temario, modo, numPreguntas) {
        if (!auth.currentUser) {
            alert("Debes iniciar sesión para realizar un test.");
            renderAuthForm(true);
            return; 
        }

        let preguntasDelTest;
        if (modo === 'errores') {
            preguntasDelTest = (currentUserData?.errores || []).map(id => todasLasPreguntas.find(p => p.id === id)).filter(p => p && p.temario === temario);
        } else {
            preguntasDelTest = todasLasPreguntas.filter(p => p.temario === temario);
        }

        preguntasDelTest.sort(() => Math.random() - 0.5);
        if (modo !== 'simulacro') {
            preguntasDelTest = preguntasDelTest.slice(0, numPreguntas);
        } else {
            preguntasDelTest = preguntasDelTest.slice(0, 90);
        }

        let testDuration = 0;
        if (modo === 'simulacro') testDuration = 90 * 60;
        if (modo === 'examen') testDuration = numPreguntas * 30;

        if (preguntasDelTest.length === 0) {
            alert('No hay preguntas disponibles para este modo.');
            return;
        }

        const userAnswers = new Array(preguntasDelTest.length).fill(null);
        const onTimeUp = () => mostrarResultados(userAnswers, preguntasDelTest.length, true);
        if (modo === 'examen' || modo === 'simulacro') startTimer(testDuration, onTimeUp);

        mostrarPregunta(preguntasDelTest, 0, userAnswers, modo);
    }

    function mostrarPregunta(preguntasDelTest, indice, userAnswers, modo) {
        renderScreen(() => {
            const pregunta = preguntasDelTest[indice];
            const estaMarcada = currentUserData?.marcadas?.includes(pregunta.id);

            appContainer.innerHTML = `<div class="progress-bar-container"><div class="progress-bar-fill"></div></div><div class="question-header"><h2>Pregunta ${indice + 1}</h2><span class="marcador-pregunta ${estaMarcada ? 'marcada' : ''}" data-id="${pregunta.id}"></span></div><div class="question-box"><h3>${pregunta.pregunta}</h3><div class="opciones-container"></div></div>`;

            const marcador = appContainer.querySelector('.marcador-pregunta');
            if(marcador) {
                marcador.addEventListener('click', async () => {
                    await togglePreguntaMarcada(pregunta.id);
                    marcador.classList.toggle('marcada');
                });
            }

            const progressBarFill = appContainer.querySelector('.progress-bar-fill');
            const progressPercent = ((indice + 1) / preguntasDelTest.length) * 100;
            setTimeout(() => { if(progressBarFill) progressBarFill.style.width = `${progressPercent}%`; }, 100);

            const opcionesContainer = appContainer.querySelector('.opciones-container');
            for (const letra in pregunta.opciones) {
                const opcionBoton = document.createElement('button');
                opcionBoton.className = 'option-label';
                opcionBoton.textContent = `${letra.toUpperCase()}) ${pregunta.opciones[letra]}`;
                opcionesContainer.appendChild(opcionBoton);

                opcionBoton.addEventListener('click', () => {
                    const esCorrecta = letra === pregunta.respuesta_correcta;
                    if (userAnswers[indice] === null) {
                        userAnswers[indice] = { preguntaId: pregunta.id, correcta: esCorrecta };
                        if (esCorrecta) {
                            if (modo === 'errores') eliminarError(pregunta.id);
                        } else {
                            guardarError(pregunta.id);
                        }
                    }

                    if (modo === 'repaso' || modo === 'errores') {
                        opcionesContainer.querySelectorAll('.option-label').forEach(btn => btn.classList.add('disabled'));
                        opcionBoton.classList.add(esCorrecta ? 'correct' : 'incorrect');
                        if (!esCorrecta) {
                            const botonCorrecto = [...opcionesContainer.querySelectorAll('.option-label')].find(btn => btn.textContent.startsWith(pregunta.respuesta_correcta.toUpperCase()));
                            if (botonCorrecto) botonCorrecto.classList.add('correct');
                        }
                        const justificacionBox = document.createElement('div');
                        justificacionBox.className = 'justificacion-box';
                        justificacionBox.innerHTML = `<p>${pregunta.justificacion}</p><p class="fuente">${pregunta.fuente || ''}</p>`;
                        appContainer.querySelector('.question-box').appendChild(justificacionBox);
                        renderizarNavegacion(preguntasDelTest, indice, userAnswers, modo);
                    } else {
                        avanzar(preguntasDelTest, indice, userAnswers, modo);
                    }
                });
            }
        });
    }

    function renderizarNavegacion(preguntasDelTest, indice, userAnswers, modo) {
        const navContainer = document.createElement('div');
        navContainer.className = 'navegacion-repaso';
        const botonAnterior = document.createElement('button');
        botonAnterior.textContent = '← Anterior';
        botonAnterior.className = 'btn-nav';
        botonAnterior.disabled = indice === 0;
        botonAnterior.addEventListener('click', () => {
            mostrarPregunta(preguntasDelTest, indice - 1, userAnswers, modo);
        });
        const botonSiguiente = document.createElement('button');
        botonSiguiente.textContent = 'Siguiente →';
        botonSiguiente.className = 'btn-nav';
        if (indice === preguntasDelTest.length - 1) {
            botonSiguiente.textContent = 'Finalizar';
        }
        botonSiguiente.disabled = userAnswers[indice] === null;
        botonSiguiente.addEventListener('click', () => {
            if (indice === preguntasDelTest.length - 1) {
                mostrarResultados(userAnswers, preguntasDelTest.length, false);
            } else {
                mostrarPregunta(preguntasDelTest, indice + 1, userAnswers, modo);
            }
        });
        navContainer.appendChild(botonAnterior);
        navContainer.appendChild(botonSiguiente);
        appContainer.appendChild(navContainer);
    }

    function avanzar(preguntasDelTest, indice, userAnswers, modo) {
        const siguienteIndice = indice + 1;
        if (siguienteIndice < preguntasDelTest.length) {
            mostrarPregunta(preguntasDelTest, siguienteIndice, userAnswers, modo);
        } else {
            mostrarResultados(userAnswers, preguntasDelTest.length, false);
        }
    }

    function mostrarResultados(userAnswers, totalPreguntas, porTiempo) {
        clearInterval(timerInterval);
        const correctas = userAnswers.filter(a => a && a.correcta).length;
        const incorrectas = userAnswers.filter(a => a && !a.correcta).length;
        const puntuacionFinal = correctas - (incorrectas / 3);
        renderScreen(() => {
            let mensajeFinal = porTiempo ? `<h2>¡Tiempo Agotado!</h2>` : `<h2>Test Finalizado</h2>`;
            appContainer.innerHTML = `${mensajeFinal}<p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Aciertos: ${correctas}</p><p style="font-size: 1.2rem; margin-bottom: 2rem;">Fallos: ${incorrectas}</p><p style="font-size: 1.5rem; font-weight: bold;">Puntuación Final: ${puntuacionFinal.toFixed(2)}</p><button class="btn-choice" id="volverMenu">Volver al Menú</button>`;
            document.getElementById('volverMenu').addEventListener('click', mostrarMenuPrincipal);
        });
    }

    // La carga inicial ahora depende del estado de autenticación
    fetch('preguntas.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar preguntas.json');
            }
            return response.json();
        })
        .then(data => {
            todasLasPreguntas = data;
            // La llamada inicial se hace ahora desde onAuthStateChanged
        })
        .catch(error => {
            console.error('Error en el fetch:', error);
            if (appContainer) appContainer.innerHTML = '<h1>Error al cargar la base de datos de preguntas.</h1>';
        });
});
