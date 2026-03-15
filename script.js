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
    const emptyState = document.getElementById('emptyState');

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
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('lg:flex');
        }
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
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('lg:flex');
        }
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
            if (emptyState) {
                emptyState.classList.add('hidden');
                emptyState.classList.remove('lg:flex');
            }
            
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
        
        // Validar si slides viene como string (común al consultar SQL -> JSON)
        let slidesData = postData.slides;
        if (typeof slidesData === 'string') {
            try { slidesData = JSON.parse(slidesData); } catch (e) {}
        }

        if (slidesData && Array.isArray(slidesData)) {
            slidesHtml = slidesData.map((slide) => {
                
                let actionElement = '';
                let imagePreview = '';

                // Validación a prueba de fallos: verificamos booleanos, y cualquier rastro de URL
                const isGenerated = slide.imagen_generada === true || 
                                    String(slide.imagen_generada).toLowerCase() === 'true' || 
                                    (slide.file_url_view != null && String(slide.file_url_view).trim() !== '' && slide.file_url_view !== 'null') ||
                                    (slide.drive_file_id != null && String(slide.drive_file_id).trim() !== '' && slide.drive_file_id !== 'null') ||
                                    (slide.file_url != null && String(slide.file_url).trim() !== '' && slide.file_url !== 'null');

                // Si la imagen ya fue generada, mostramos indicador, link y previsualización
                if (isGenerated) {
                    const viewUrl = (slide.file_url_view && slide.file_url_view !== 'null') ? slide.file_url_view : ((slide.file_url && slide.file_url !== 'null') ? slide.file_url : '#');
                    const downloadUrl = (slide.file_url_download && slide.file_url_download !== 'null') ? slide.file_url_download : '#';
                    
                    actionElement = `
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200 shadow-sm font-semibold flex items-center gap-1">
                                <i class="fa-solid fa-check-circle"></i> Lista
                            </span>
                            <a href="${viewUrl}" target="_blank" title="Ver Imagen" class="bg-white text-gray-500 hover:text-purple-600 border border-gray-200 hover:border-purple-300 py-1 px-2 rounded text-xs transition-colors flex items-center gap-1 shadow-sm ${viewUrl === '#' ? 'hidden' : ''}">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver
                            </a>
                            <a href="${downloadUrl}" target="_blank" title="Descargar Imagen" class="bg-white text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 py-1 px-2 rounded text-xs transition-colors flex items-center gap-1 shadow-sm ${downloadUrl === '#' ? 'hidden' : ''}">
                                <i class="fa-solid fa-download"></i>
                            </a>
                        </div>
                    `;
                    
                    // Extraer ID de Drive de forma robusta (incluso si el campo drive_file_id viene vacío pero sí tenemos file_url)
                    let driveId = (slide.drive_file_id && slide.drive_file_id !== 'null') ? slide.drive_file_id.trim() : null;
                    if (!driveId && slide.file_url && slide.file_url !== 'null') {
                        const match = slide.file_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        if (match) driveId = match[1];
                    }

                    // IMPORTANTE: Nunca usar file_url o file_url_view para el src del <img> porque devuelven HTML (el visor de Drive), no la imagen cruda.
                    let imgSrc = null;
                    if (driveId) {
                        // Usamos lh3.googleusercontent.com ya que es el estándar actual para evadir bloqueos de cookies de terceros en Drive
                        imgSrc = `https://lh3.googleusercontent.com/d/${driveId}=w1200`;
                    }

                    if (imgSrc) {
                        imagePreview = `
                            <div class="mt-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm inline-block w-full max-w-xs">
                                <img src="${imgSrc}" alt="Slide ${slide.numero}" class="w-full rounded object-contain" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');" />
                                <div class="hidden text-xs text-red-500 mt-2 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                                    <i class="fa-solid fa-image-slash text-lg"></i>
                                    <span>La vista previa está bloqueada por permisos de Google Drive. Usa el botón <strong>"Ver"</strong> arriba.</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    const finalPrompt = slide.prompt_visual_final || slide.prompt_visual || '';
                    // Si no está generada, mostramos el botón para solicitarla
                    actionElement = `
                        <button class="request-image-btn bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1 border border-indigo-200"
                                data-id-post="${postData.id_post}"
                                data-slide-number="${slide.numero}"
                                data-id-slide="${slide.id_slide || ''}"
                                data-idea-visual="${(slide.idea_visual || '').replace(/"/g, '&quot;')}"
                                data-prompt-visual="${finalPrompt.replace(/"/g, '&quot;')}">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Solicitar Imagen
                        </button>
                    `;
                }

                const displayPrompt = slide.prompt_visual_final || slide.prompt_visual || slide.idea_visual || '';

                return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="font-bold text-gray-800 text-sm"><span class="text-purple-600">${slide.numero}.</span> ${slide.titulo || 'Slide ' + slide.numero}</h4>
                        ${actionElement}
                    </div>
                    <p class="text-sm text-gray-600 mb-3">${slide.texto || ''}</p>
                    <div class="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100">
                        <strong><i class="fa-solid fa-paintbrush"></i> Prompt Visual:</strong> ${displayPrompt}
                    </div>
                    ${imagePreview}
                </div>
                `;
            }).join('');
        }

        const hashtagsHtml = Array.isArray(postData.hashtags) 
            ? postData.hashtags.join(' ') 
            : (postData.hashtags || '');

        let visualGuideHtml = '';
        if (postData.direccion_visual_general || postData.style_fingerprint || postData.direccion_visual_maestra) {
            visualGuideHtml = `
                <div class="mb-5 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 text-sm">
                    <h4 class="font-bold text-gray-700 mb-2"><i class="fa-solid fa-palette text-pink-500"></i> Guía Visual del Post</h4>
                    ${postData.direccion_visual_general ? `<p class="text-gray-600 mb-2"><strong>Dirección General:</strong> ${postData.direccion_visual_general}</p>` : ''}
                    ${postData.direccion_visual_maestra ? `<p class="text-gray-600 mb-2"><strong>Maestra:</strong> ${postData.direccion_visual_maestra}</p>` : ''}
                    ${postData.style_fingerprint ? `<p class="text-gray-600 mb-2"><strong>Fingerprint:</strong> <span class="font-mono text-xs bg-gray-200 px-1 rounded">${postData.style_fingerprint}</span></p>` : ''}
                    ${postData.reglas_visuales_negativas ? `<p class="text-red-500/80 text-xs mt-2"><strong>Reglas Negativas:</strong> ${postData.reglas_visuales_negativas}</p>` : ''}
                </div>
            `;
        }

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
                    ${visualGuideHtml}
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
            Flujo: "imagen",
            Action: "generar",
            id_post: parseInt(idPost),
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

    function renderHistoryList(items) {
        const getStatusBadge = (status) => {
            switch (status?.toLowerCase()) {
                case 'aprobado':
                    return 'bg-green-100 text-green-800';
                case 'rechazado':
                    return 'bg-red-100 text-red-800';
                case 'pendiente':
                default:
                    return 'bg-yellow-100 text-yellow-800';
            }
        };

        const historyHtml = items.map(item => {
            const formattedDate = new Date(item.fecha_propuesta).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Limpiar comillas dobles al inicio y final si existen
            const cleanMessage = item.mensaje?.replace(/^"|"$/g, '');

            return `
                <div class="history-item bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-id-post="${item.id_post}" title="Haz clic para cargar los detalles de esta idea">
                    <div class="flex justify-between items-start gap-4">
                        <div>
                            <p class="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">${item.hook || item.caption_corto}</p>
                            <p class="text-xs text-gray-500 mt-2 font-mono">ID: ${item.id_post} | ${formattedDate}</p>
                        </div>
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusBadge(item.estatus)}">${item.estatus || 'N/A'}</span>
                    </div>
                    <div class="mt-3 border-t border-gray-100 pt-2">
                         <p class="text-xs text-gray-500 italic line-clamp-1"><strong>Instrucción:</strong> ${cleanMessage}</p>
                    </div>
                </div>
            `;
        }).join('');

        historyContent.innerHTML = `
            <div id="history-list-wrapper" class="w-full">
                <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Historial de Ideas</h3>
                <div class="space-y-3 pb-8">
                    ${historyHtml}
                </div>
            </div>
            <div id="history-back-wrapper" class="hidden mb-4">
                <button id="back-to-history" class="w-full bg-white border border-gray-200 text-purple-600 font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-arrow-left"></i> Volver a la lista
                </button>
            </div>
        `;
    }

    historyContent.addEventListener('click', (e) => {
        const historyCard = e.target.closest('.history-item');
        const backButton = e.target.closest('#back-to-history');

        if (historyCard) {
            // Resaltar visualmente la tarjeta seleccionada
            document.querySelectorAll('.history-item').forEach(card => {
                card.classList.remove('ring-2', 'ring-purple-500', 'bg-purple-50');
            });
            historyCard.classList.add('ring-2', 'ring-purple-500', 'bg-purple-50');

            // En móvil ocultamos la lista, en escritorio la mantenemos
            const listWrapper = document.getElementById('history-list-wrapper');
            const backWrapper = document.getElementById('history-back-wrapper');
            
            if (listWrapper) listWrapper.classList.add('hidden', 'lg:block');
            if (backWrapper) {
                backWrapper.classList.remove('hidden');
                backWrapper.classList.add('lg:hidden'); // Para que nunca salga en escritorio
            }

            const idPost = historyCard.dataset.idPost;
            fetchPostDetails(idPost);
            return;
        }

        if (backButton) {
            const listWrapper = document.getElementById('history-list-wrapper');
            const backWrapper = document.getElementById('history-back-wrapper');
            
            if (listWrapper) listWrapper.classList.remove('hidden', 'lg:block');
            if (backWrapper) {
                backWrapper.classList.add('hidden');
                backWrapper.classList.remove('lg:hidden');
            }

            resultArea.classList.add('hidden'); // Ocultar el resultado al volver
            if (emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('lg:flex');
            }
        }
    });

    async function fetchPostDetails(idPost) {
        console.log(`Consultando detalles para el post ID: ${idPost}`);
        
        resultArea.classList.remove('hidden');
        if (emptyState) {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('lg:flex');
        }

        formattedResult.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <i class="fa-solid fa-circle-notch fa-spin text-4xl text-purple-600 mb-4"></i>
                <p class="text-gray-600 font-medium">Cargando detalles de la idea ID: ${idPost}...</p>
            </div>
        `;
        formattedResult.classList.remove('hidden');
        outputJson.textContent = "Obteniendo datos...";

        const payload = {
            Flujo: "idea",
            Action: "consulta",
            id_post: idPost
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

            const responseText = await response.text();
            const parsedData = JSON.parse(responseText);

            let postData = (Array.isArray(parsedData) && parsedData.length > 0) ? parsedData[0] : parsedData;
            postData = postData.post_json || postData;

            if (postData && (postData.hook || postData.id_post)) {
                renderFormattedResult(postData);
                outputJson.textContent = `✅ Respuesta del Agente (Consulta ID: ${idPost}):\n${JSON.stringify(parsedData, null, 2)}`;
                if (window.innerWidth < 1024) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    resultArea.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                throw new Error("La respuesta de la consulta no tiene el formato de post esperado.");
            }
        } catch (error) {
            console.error('Error al consultar detalles del post:', error);
            alert(`No se pudieron cargar los detalles: ${error.message}`);
            resultArea.classList.add('hidden');
            if (emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('lg:flex');
            }
        }
    }

    async function fetchHistory() {
        console.log("Iniciando consulta de historial...");
        historyContent.innerHTML = '<div class="text-center p-6"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-purple-600"></i><p class="mt-2 text-sm text-gray-500">Cargando historial...</p></div>';
        resultArea.classList.add('hidden'); // Ocultar resultados previos
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('lg:flex');
        }
 
        const payload = {
            Flujo: "idea",
            Action: "historia"
        };
 
        const urlParams = new URLSearchParams(window.location.search);
        const webhookUrl = urlParams.has('test') 
            ? '/api/forward?test=true' 
            : '/api/forward';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Añadir timeout de 60s
 
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
 
            clearTimeout(timeoutId); // Respuesta recibida, limpiar timeout
 
            const responseText = await response.text(); // Leer siempre como texto para más robustez
 
            if (!response.ok) {
                // Si la respuesta no es OK, lanzar error con el cuerpo de la respuesta
                throw new Error(`Error del servidor (${response.status}): ${responseText}`);
            }
 
            const historyData = JSON.parse(responseText); // Intentar parsear el texto
            console.log("Datos del historial recibidos y parseados:", historyData); // LOG para depuración

            // Lógica de normalización robusta para la respuesta del historial
            let dataToRender = [];
            // Caso 1: La respuesta es un array.
            if (Array.isArray(historyData)) {
                // Si los elementos del array están envueltos en 'post_json', los extraemos.
                if (historyData.length > 0 && historyData[0].post_json) {
                    dataToRender = historyData.map(item => item.post_json);
                } else {
                    // Es un array limpio de posts.
                    dataToRender = historyData;
                }
            } 
            // Caso 2: La respuesta es un objeto.
            else if (historyData && typeof historyData === 'object') {
                // Si el array de posts está dentro de la propiedad 'post_json'.
                if (historyData.post_json && Array.isArray(historyData.post_json)) {
                    dataToRender = historyData.post_json;
                } else {
                    // Es un único objeto de post, lo envolvemos en un array.
                    dataToRender = [historyData];
                }
            }

            if (dataToRender.length > 0) {
                renderHistoryList(dataToRender);
            } else {
                historyContent.innerHTML = '<p class="text-gray-600 text-center p-6">No se encontraron ideas previas.</p>';
            }
 
        } catch (error) {
            clearTimeout(timeoutId); // Limpiar timeout también en caso de error
            console.error('Error al cargar el historial:', error);
            
            let errorMessage = `No se pudo cargar el historial: ${error.message}`;
            if (error.name === 'AbortError') {
                errorMessage = 'La consulta del historial tardó demasiado (más de 60s) y fue cancelada.';
            } else if (error instanceof SyntaxError) {
                errorMessage = 'La respuesta del servidor no es un formato JSON válido.';
            }
 
            alert(errorMessage);
            historyContent.innerHTML = `<p class="text-red-500 text-center p-6">${errorMessage} Revisa la consola para más detalles.</p>`;
        }
    }
});