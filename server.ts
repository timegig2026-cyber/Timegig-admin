import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini AI client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API endpoint for AI location insights / travel assistant
  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const { lat, lon, query, address } = req.body;
      
      const prompt = `You are a helpful local guide and travel assistant. The user's current coordinates are Latitude: ${lat}, Longitude: ${lon}. ${address ? `Approximate address: ${address}.` : ''} ${query ? `User question/request: "${query}"` : 'Please provide 4 interesting nearby spots, hidden gems, historical facts, or great food spots around this location.'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are GeoPulse AI, an expert local guide and cartography assistant. Provide engaging, well-structured markdown recommendations with titles, distances/directions, and highlights.',
          temperature: 0.7,
        },
      });

      res.json({ success: true, text: response.text });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate AI recommendations' });
    }
  });

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
