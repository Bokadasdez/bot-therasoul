export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método Não Permitido' });
  }

  try {
    const { text, connectedPhone, data } = req.body;
    
    // Captura o texto de diferentes formatos que a Z-API pode enviar
    let userMessage = "";
    if (text && typeof text === 'object') {
      userMessage = text.message || "";
    } else if (typeof text === 'string') {
      userMessage = text;
    } else if (data && data.text) {
      userMessage = data.text;
    }

    // Se a mensagem ainda estiver vazia, define um padrão para não dar erro 400
    if (!userMessage || userMessage === "") {
      userMessage = "Olá";
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: String(userMessage) }],
      }),
    });

    const openAiData = await response.json();
    
    if (!openAiData.choices) {
      throw new Error(JSON.stringify(openAiData));
    }

    const botReply = openAiData.choices[0].message.content;

  // Envia de volta para o WhatsApp via Z-API
    // Tentamos pegar o telefone de onde quer que ele esteja no pacote
    const targetPhone = req.body.phone || req.body.connectedPhone || (req.body.data && req.body.data.phone);

    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone: targetPhone, 
        message: botReply 
      }),
    });
    res.status(200).json({ status: 'Sucesso' });
  } catch (error) {
    console.error('Erro detalhado:', error.message);
    res.status(500).json({ error: error.message });
  }
}
