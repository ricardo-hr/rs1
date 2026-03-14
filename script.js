document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Script versión 2.0 cargado en Vercel"); // Para confirmar que no es caché
    const form = document.getElementById('aiForm');
    const resultArea = document.getElementById('resultArea');
    const outputJson = document.getElementById('outputJson');
    const formattedResult = document.getElementById('formattedResult');
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

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Capturar datos
        const instruction = document.getElementById('instruction').value;
        const context = document.getElementById('context').value;
        const style = document.getElementById('style').value;
        const useHashtags = document.getElementById('useHashtags').checked;

        // Crear objeto JSON
        const promptData = {
            role: "system",
            task: "generate_instagram_post",
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

        // Enviar datos reales al Webhook
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(promptData)
        })
        .then(async response => {
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
                
                // Detectar si el JSON tiene la estructura de post de IA
                if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].hook) {
                    renderFormattedResult(parsedData);
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
            console.error('Error:', error);
            alert(`⚠️ Error: ${error.message}`);
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75');
        });
    });

    // Función para renderizar el post bonito en la interfaz
    function renderFormattedResult(parsedData) {
        const postData = parsedData[0];
        const imagesData = parsedData.slice(1); // El resto son imágenes
        
        let slidesHtml = '';
        if (postData.slides && Array.isArray(postData.slides)) {
            slidesHtml = postData.slides.map((slide, index) => {
                const imgInfo = imagesData[index];
                const imgSize = imgInfo ? imgInfo.fileSize : 'No generada';
                
                return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-bold text-gray-800 text-sm"><span class="text-purple-600">${slide.numero}.</span> ${slide.titulo}</h4>
                        <span class="text-[10px] bg-purple-100 text-purple-800 px-2 py-1 rounded-full"><i class="fa-solid fa-image"></i> Archivo: ${imgSize}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-3">${slide.texto}</p>
                    <div class="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100">
                        <strong><i class="fa-solid fa-paintbrush"></i> Prompt Visual:</strong> ${slide.prompt_visual}
                    </div>
                </div>
                `;
            }).join('');
        }

        formattedResult.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 flex items-center gap-2">
                    <i class="fa-brands fa-instagram text-white text-xl"></i>
                    <h3 class="text-white font-bold">Post Generado Listo</h3>
                </div>
                <div class="p-6">
                    <div class="mb-4">
                        <span class="text-xs font-bold text-purple-500 uppercase tracking-wide">Hook (Gancho)</span>
                        <p class="text-gray-900 font-semibold text-lg mt-1">${postData.hook}</p>
                    </div>
                    <div class="mb-4">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Caption / Texto del Post</span>
                        <p class="text-gray-700 text-sm mt-1 whitespace-pre-wrap">${postData.caption}</p>
                        <p class="text-blue-500 text-sm mt-2 font-medium">${postData.hashtags.join(' ')}</p>
                    </div>
                    <hr class="my-5 border-gray-100">
                    <h4 class="text-sm font-bold text-gray-800 mb-4"><i class="fa-solid fa-layer-group text-pink-500"></i> Diapositivas del Carrusel</h4>
                    ${slidesHtml}
                </div>
            </div>
        `;
        formattedResult.classList.remove('hidden');
    }
});