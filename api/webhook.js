const axios = require('axios');
const { OpenAI } = require('openai');

module.exports = async (req, res) => {
    // Só aceita chamadas do tipo POST (que é o que a Z-API envia)
    if (req.method !== 'POST') {
        return res.status(405).send('Método Não Permitido');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        // Extraindo os dados que a Z-API envia
        const { text, phone } = req.body; 

        // 1. Pergunta para a OpenAI (GPT-4o-mini)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é o Therasoul, um assistente inteligente e empático." },
                { role: "user", content: text }
            ],
        });

        const respostaIA = completion.choices[0].message.content;

        // 2. Envia a resposta de volta para o WhatsApp via Z-API
        await axios.post(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
            phone: phone,
            text: respostaIA
        });

        res.status(200).send('Mensagem processada com sucesso!');
    } catch (error) {
        console.error('Erro no Webhook:', error.message);
        res.status(500).json({ error: 'Erro interno ao processar mensagem' });
    }
};
