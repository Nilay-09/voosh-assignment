import express from 'express';
import axios from 'axios';

const router = express.Router();

// Test Jina embeddings API
router.post('/jina', async (req, res) => {
  try {
    const { text = "Hello world" } = req.body;
    
    const response = await axios.post(
      'https://api.jina.ai/v1/embeddings',
      {
        model: 'jina-embeddings-v2-base-en',
        input: [text]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    res.json({
      success: true,
      text,
      embeddingLength: response.data.data[0].embedding.length,
      model: response.data.model,
      usage: response.data.usage
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Test Gemini API
router.post('/gemini', async (req, res) => {
  try {
    const { prompt = "Hello! How are you?" } = req.body;
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      prompt,
      response: generatedText,
      model: 'gemini-pro'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

export default router;
