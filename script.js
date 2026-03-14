document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Script versión 2.0 cargado en Vercel"); // Para confirmar que no es caché
    const form = document.getElementById('aiForm');
    const resultArea = document.getElementById('resultArea');
    const outputJson = document.getElementById('outputJson');
    const formattedResult = document.getElementById('formattedResult');
    const tabGenerate = document.getElementById('tab-generate');
    const tabHistory = document.getElementById('tab-history');
    const generateContent = document.getElementById('generate-content');
    const historyContent = document.getElementById('history-content');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Indicador visual de modo BETA / TEST
    const globalParams = new URLSearchParams(window.location.search);
    if (globalParams.has('test')) {
        const title = document.querySelector('h1');
        const badge = document.createElement('span');
        badge.className = 'ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200';
        badge.innerHTML = '<i class="fa-solid fa-flask mr-1"></i> BETA';
        title.appendChild(badge);
    }

    // --- Lógica de Pestañas (Tabs) ---
    tabGenerate.addEventListener('click', () => {
        // Activar tab de generar
        tabGenerate.classList.add('bg-white', 'text-purple-600', 'shadow-sm');
        tabGenerate.classList.remove('text-gray-500', 'hover:bg-gray-200');
        
        // Desactivar tab de historial
        tabHistory.classList.add('text-gray-500', 'hover:bg-gray-200');
        tabHistory.classList.remove('bg-white', 'text-purple-600', 'shadow-sm');

        // Mostrar/Ocultar contenido
        generateContent.classList.remove('hidden');
        historyContent.classList.add('hidden');
        resultArea.classList.add('hidden'); // Ocultar resultados al cambiar de tab
    });

    tabHistory.addEventListener('click', () => {
        // Activar tab de historial
        tabHistory.classList.add('bg-white', 'text-purple-600', 'shadow-sm');
        tabHistory.classList.remove('text-gray-500', 'hover:bg-gray-200');
        
        // Desactivar tab de generar
        tabGenerate.classList.add('text-gray-500', 'hover:bg-gray-200');
        tabGenerate.classList.remove('bg-white', 'text-purple-600', 'shadow-sm');

        // Mostrar/Ocultar contenido
        historyContent.classList.remove('hidden');
        generateContent.classList.add('hidden');
        resultArea.classList.add('hidden'); // Ocultar resultados al cambiar de tab
        fetchHistory();
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Capturar datos
        const instruction = document.getElementById('instruction').value;
        const context = document.getElementById('context').value;
        const style = document.getElementById('style').value;
        const useHashtags = document.getElementById('useHashtags').checked;

        // Crear objeto JSON
        const promptData = {
            Flujo: "idea",
            Action: "Genera",
            role: "system",
            task: "generate_instagram_post", // Se mantiene por compatibilidad si es necesario
            parameters: {
                user_instruction: instruction,
                context_data: context,
                tone_style: style,
                include_hashtags: useHashtags
            },
            timestamp: new Date().toISOString()
        };

        // Determinar URL del Webhook (Prod vs Test)
        const urlParams = new URLSearchParams(window.location.search);
        const webhookUrl = urlParams.has('test') 
            ? '/api/forward?test=true' 
            : '/api/forward';

        // Simulación visual de carga
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando...';
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-75');

        // Configurar un tiempo de espera (timeout) de 60 segundos (60000 ms)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        // Enviar datos reales al Webhook
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(promptData),
            signal: controller.signal
        })
        .then(async response => {
            clearTimeout(timeoutId); // Limpiamos el temporizador si responde a tiempo
            if (response.ok) {
                console.log("Enviado exitosamente a:", webhookUrl);
                return response.text(); // O .json() si el webhook responde con JSON
            }
            // Obtener el detalle del error si está disponible
            const errorDetails = await response.text();
            throw new Error(`Falló la API (${response.status}): ${errorDetails.substring(0, 100) || 'Sin detalles del servidor'}`);
        })
        .then(data => {
            // Mostrar éxito
            resultArea.classList.remove('hidden');
            
            // Formatear respuesta para mostrarla limpia
            let formattedResponse = data;
            try {
                const parsedData = JSON.parse(data);
                formattedResponse = JSON.stringify(parsedData, null, 2);
                
                // Detectar la nueva estructura que viene de la base de datos (post_json)
                let postData = parsedData;
                if (Array.isArray(parsedData) && parsedData[0]?.post_json) {
                    postData = parsedData[0].post_json;
                } else if (parsedData.post_json) {
                    postData = parsedData.post_json;
                } else if (Array.isArray(parsedData) && parsedData.length > 0) {
                    postData = parsedData[0];
                }

                if (postData && (postData.hook || postData.id_post)) {
                    renderFormattedResult(postData);
                } else {
                    formattedResult.classList.add('hidden');
                }
            } catch (e) {
                // Si es texto plano, se queda igual
                formattedResult.classList.add('hidden');
            }

            outputJson.textContent = `✅ Respuesta del Agente:\n${formattedResponse}\n\n================\n\n📤 Datos Enviados:\n${JSON.stringify(promptData, null, 2)}`;
            resultArea.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            clearTimeout(timeoutId); // Limpiamos el temporizador si falla
            console.error('Error:', error);
            if (error.name === 'AbortError') {
                alert('⚠️ Error: El Agente de IA está tardando demasiado en generar las imágenes y se canceló la espera (Timeout de 60s).');
            } else {
                alert(`⚠️ Error: ${error.message}`);
            }
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75');
        });
    });

    // Función para renderizar el post bonito en la interfaz
    function renderFormattedResult(postData) {
        
        let slidesHtml = '';
        if (postData.slides && Array.isArray(postData.slides)) {
            slidesHtml = postData.slides.map((slide) => {
                return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="font-bold text-gray-800 text-sm"><span class="text-purple-600">${slide.numero}.</span> ${slide.titulo || 'Slide ' + slide.numero}</h4>
                        <button class="request-image-btn bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1 border border-indigo-200"
                                data-id-post="${postData.id_post}"
                                data-slide-number="${slide.numero}">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Solicitar Imagen
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mb-3">${slide.texto || ''}</p>
                    <div class="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100">
                        <strong><i class="fa-solid fa-paintbrush"></i> Prompt Visual:</strong> ${slide.prompt_visual || slide.idea_visual || ''}
                    </div>
                </div>
                `;
            }).join('');
        }

        const hashtagsHtml = Array.isArray(postData.hashtags) 
            ? postData.hashtags.join(' ') 
            : (postData.hashtags || '');

        formattedResult.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fa-brands fa-instagram text-white text-xl"></i>
                        <h3 class="text-white font-bold">Post Propuesto (ID: ${postData.id_post || 'N/A'})</h3>
                    </div>
                    <span class="bg-white/20 text-white text-xs px-2 py-1 rounded border border-white/30 capitalize">${postData.estatus || 'nuevo'}</span>
                </div>
                <div class="p-6">
                    <div class="mb-4">
                        <span class="text-xs font-bold text-purple-500 uppercase tracking-wide">Hook (Gancho)</span>
                        <p class="text-gray-900 font-semibold text-lg mt-1">${postData.hook}</p>
                    </div>
                    <div class="mb-4">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Caption / Texto del Post</span>
                        <p class="text-gray-700 text-sm mt-1 whitespace-pre-wrap">${postData.caption || ''}</p>
                        <p class="text-blue-500 text-sm mt-2 font-medium">${hashtagsHtml}</p>
                    </div>
                    <hr class="my-5 border-gray-100">
                    <h4 class="text-sm font-bold text-gray-800 mb-4"><i class="fa-solid fa-layer-group text-pink-500"></i> Diapositivas del Carrusel</h4>
                    ${slidesHtml}
                </div>
            </div>
        `;
        formattedResult.classList.remove('hidden');
    }

    // --- Lógica para solicitar imágenes ---

    // Usamos delegación de eventos para manejar los clics en los botones que se crean dinámicamente
    formattedResult.addEventListener('click', function(e) {
        const button = e.target.closest('.request-image-btn');
        if (button && !button.disabled) {
            requestImage(button);
        }
    });

    async function requestImage(button) {
        const idPost = button.dataset.idPost;
        const slideNumber = button.dataset.slideNumber;

        const originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        button.classList.remove('hover:bg-indigo-200');
        button.classList.add('opacity-75', 'cursor-not-allowed');

        const imageData = {
            Flujo: "Imagene",
            Action: "Generar",
            id_post: idPost,
            numero_slide: parseInt(slideNumber)
        };

        const urlParams = new URLSearchParams(window.location.search);
        const webhookUrl = urlParams.has('test') 
            ? '/api/forward?test=true' 
            : '/api/forward';

        try {
            console.log("Solicitando imagen con payload:", imageData);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imageData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor (${response.status}): ${errorText}`);
            }

            // Suponemos que la respuesta contiene info de la imagen generada
            const result = await response.json(); 
            console.log('Respuesta de generación de imagen:', result);

            // Cambiamos el estado del botón a "Generada"
            button.innerHTML = '<i class="fa-solid fa-check-circle"></i> Generada';
            button.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-200', 'opacity-75');
            button.classList.add('bg-green-100', 'text-green-800', 'border-green-200');
            // El botón queda deshabilitado para no volver a generar
            
        } catch (error) {
            console.error('Error solicitando la imagen:', error);
            alert(`No se pudo generar la imagen: ${error.message}`);
            // Restauramos el botón en caso de error
            button.disabled = false;
            button.innerHTML = originalHtml;
            button.classList.add('hover:bg-indigo-200');
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    async function fetchHistory() {
        console.log("Iniciando consulta de historial...");
        historyContent.innerHTML = '<div class="text-center p-6"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-purple-600"></i><p class="mt-2 text-sm text-gray-500">Cargando historial...</p></div>';
        resultArea.classList.add('hidden'); // Ocultar resultados previos

        const payload = {
            Flujo: "idea",
            Action: "historia"
        };

        const urlParams = new URLSearchParams(window.location.search);
        const webhookUrl = urlParams.has('test') 
            ? '/api/forward?test=true' 
            : '/api/forward';

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor (${response.status}): ${errorText}`);
            }

            const data = await response.text();
            
            resultArea.classList.remove('hidden');
            formattedResult.classList.add('hidden'); // Ocultamos la vista de post individual
            outputJson.textContent = `✅ Respuesta del Historial:\n${JSON.stringify(JSON.parse(data), null, 2)}`;
            historyContent.innerHTML = '<p class="text-gray-600 text-center">El historial se muestra en el área de resultados de abajo.</p>';
            resultArea.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error al cargar el historial:', error);
            alert(`No se pudo cargar el historial: ${error.message}`);
            historyContent.innerHTML = '<p class="text-red-500 text-center p-6">Error al cargar el historial. Intenta de nuevo.</p>';
        }
    }
});