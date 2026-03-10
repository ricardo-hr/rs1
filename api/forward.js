export default async function handler(req, res) {
    // Configurar CORS para permitir peticiones desde el frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        console.log('Proxying request to webhook...');
        
        // Determinar URL del Webhook basado en el parámetro query 'test'
        const isTest = req.query.test === 'true';
        const webhookUrl = isTest 
            ? 'https://pandits.duckdns.org/webhook-test/rs1' 
            : 'https://pandits.duckdns.org/webhook/rs1';

        // Reenviar la petición al webhook real
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        // Devolver la respuesta del webhook al frontend
        const data = await response.text();
        res.status(response.status).send(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Error forwarding request', details: error.message });
    }
}