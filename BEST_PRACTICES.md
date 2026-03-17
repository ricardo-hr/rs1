# 🏆 Mejores Prácticas del Proyecto (Cheat Sheet)

Este documento sirve como referencia rápida de las soluciones técnicas y "mejores prácticas" implementadas en este proyecto, para que puedan ser reutilizadas fácilmente en futuros desarrollos.

## 1. Cargar Imágenes directamente desde Google Drive (Bypass de Cookies de Terceros)

**El Problema:** 
Usar la URL clásica `drive.google.com/uc?id=...` ya no funciona bien de forma directa en etiquetas `<img>` porque navegadores modernos (Safari, Chrome) bloquean fuertemente las cookies de terceros por seguridad. Esto provoca que la imagen se rompa (Error 403). Además, usar los campos `file_url` o `file_url_view` de la API de Drive devuelve el visor HTML, no la imagen cruda.

**La Solución (Implementado en `script.js`):**
Extraer el ID del archivo y utilizar el servidor de imágenes de Googleusercontent (`lh3`). Es la forma oficial interna en que Google sirve imágenes sin depender de cookies de sesión.

```javascript
// 1. Extraer el ID (Ejemplo asumiendo una URL directa de visualización de Drive)
let driveId = null;
const urlDrive = "https://drive.google.com/file/d/1A2b3C4d5E6f7G8h9I0j/view";
const match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/);
if (match) driveId = match[1];

// 2. Construir la URL segura para el atributo src del <img>
// NOTA: El parámetro "=w1200" o "=w800" formatea el ancho deseado y optimiza la carga.
const imgSrc = `https://lh3.googleusercontent.com/d/${driveId}=w1200`;

document.getElementById('mi-imagen').src = imgSrc;
```

---

## 2. Proxy Serverless (Vercel) para pasar Imágenes Binarias sin Corromperlas

**El Problema:** 
Al consultar un Webhook de n8n o un Agente de IA que devuelve una imagen directamente (un binario, como un `image/png`), si el backend (Next.js/Vercel) lee la respuesta como `.text()` o `.json()` antes de mandarla al frontend, el archivo se corrompe.

**La Solución (Implementado en `api/forward.js`):**
Manejar explícitamente la respuesta con `ArrayBuffer` y transformarla a un `Buffer` de Node.js antes de responder.

```javascript
// api/forward.js (Función Serverless)
const response = await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(req.body) });

// ⚠️ CLAVE: Leer la respuesta como ArrayBuffer para no alterar los bytes originales de la imagen
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// Mantener el Content-Type original (ej: image/png)
const contentType = response.headers.get('content-type');
if (contentType) {
    res.setHeader('Content-Type', contentType);
}

res.status(response.status).send(buffer);
```