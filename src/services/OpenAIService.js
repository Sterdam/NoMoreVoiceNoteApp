const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const LogService = require('./LogService');

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1';
        
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is required');
        }
    }

    async transcribe(audioPath, options = {}) {
        try {
            const {
                language = 'fr',
                model = 'whisper-1',
                prompt = null,
                temperature = 0.2,
                response_format = 'json'
            } = options;

            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model', model);
            formData.append('language', language);
            formData.append('temperature', temperature.toString());
            formData.append('response_format', response_format);
            
            if (prompt) {
                formData.append('prompt', prompt);
            }

            const response = await axios.post(
                `${this.apiUrl}/audio/transcriptions`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        ...formData.getHeaders()
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            return {
                text: response.data.text,
                language: response.data.language || language,
                duration: response.data.duration,
                segments: response.data.segments || []
            };

        } catch (error) {
            LogService.error('OpenAI transcription error:', {
                error: error.message,
                response: error.response?.data
            });
            throw new Error('Transcription failed: ' + error.message);
        }
    }

    async summarize(text, options = {}) {
        try {
            const {
                language = 'fr',
                maxTokens = 150,
                model = 'gpt-3.5-turbo'
            } = options;

            const systemPrompt = language === 'fr' 
                ? "Tu es un assistant qui résume des messages vocaux de manière concise et claire. Conserve uniquement les informations essentielles."
                : "You are an assistant that summarizes voice messages concisely and clearly. Keep only essential information.";

            const userPrompt = language === 'fr'
                ? `Résume ce message vocal en quelques phrases courtes et claires:\n\n${text}`
                : `Summarize this voice message in a few short and clear sentences:\n\n${text}`;

            const response = await axios.post(
                `${this.apiUrl}/chat/completions`,
                {
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content.trim();

        } catch (error) {
            LogService.error('OpenAI summarization error:', {
                error: error.message,
                response: error.response?.data
            });
            throw new Error('Summarization failed: ' + error.message);
        }
    }

    async estimateCost(audioSeconds, includeSummary = false) {
        // Coûts OpenAI (approximatifs)
        const whisperCostPerMinute = 0.006; // $0.006 par minute
        const gptCostPer1kTokens = 0.002; // GPT-3.5-turbo
        
        let cost = (audioSeconds / 60) * whisperCostPerMinute;
        
        if (includeSummary) {
            // Estimation : ~200 tokens pour un résumé
            cost += (200 / 1000) * gptCostPer1kTokens;
        }
        
        return {
            whisperCost: (audioSeconds / 60) * whisperCostPerMinute,
            summaryCost: includeSummary ? (200 / 1000) * gptCostPer1kTokens : 0,
            totalCost: cost
        };
    }
}

module.exports = new OpenAIService();