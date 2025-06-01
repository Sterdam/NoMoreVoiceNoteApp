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
        
        // Configuration axios avec retry
        this.axiosInstance = axios.create({
            timeout: 300000, // 5 minutes
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
    }

    async transcribe(audioPath, options = {}) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const {
                    language = 'fr',
                    model = 'whisper-1',
                    prompt = null,
                    temperature = 0.2,
                    response_format = 'json'
                } = options;

                // Vérifier la taille du fichier
                const stats = fs.statSync(audioPath);
                const fileSizeMB = stats.size / (1024 * 1024);
                
                if (fileSizeMB > 25) {
                    throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max 25MB)`);
                }

                const formData = new FormData();
                formData.append('file', fs.createReadStream(audioPath));
                formData.append('model', model);
                formData.append('language', language);
                formData.append('temperature', temperature.toString());
                formData.append('response_format', response_format);
                
                if (prompt) {
                    formData.append('prompt', prompt);
                }

                const response = await this.axiosInstance.post(
                    `${this.apiUrl}/audio/transcriptions`,
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            ...formData.getHeaders()
                        }
                    }
                );

                // Log pour tracking des coûts
                LogService.info('OpenAI transcription successful', {
                    duration: response.data.duration,
                    cost: (response.data.duration / 60 * 0.006).toFixed(4)
                });

                return {
                    text: response.data.text,
                    language: response.data.language || language,
                    duration: response.data.duration,
                    segments: response.data.segments || []
                };

            } catch (error) {
                lastError = error;
                
                LogService.error(`OpenAI transcription error (attempt ${attempt}/${maxRetries}):`, {
                    error: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                
                // Ne pas retry si c'est une erreur client (4xx)
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    throw error;
                }
                
                // Attendre avant de retry (backoff exponentiel)
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                }
            }
        }
        
        throw new Error(`Transcription failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    async summarize(text, options = {}) {
        try {
            const {
                language = 'fr',
                maxTokens = 150,
                model = 'gpt-3.5-turbo'
            } = options;

            const systemPrompt = language === 'fr' 
                ? "Tu es un assistant qui résume des messages vocaux de manière concise et claire. Conserve uniquement les informations essentielles. Maximum 3 phrases."
                : "You are an assistant that summarizes voice messages concisely and clearly. Keep only essential information. Maximum 3 sentences.";

            const userPrompt = language === 'fr'
                ? `Résume ce message vocal en maximum 3 phrases courtes:\n\n${text}`
                : `Summarize this voice message in maximum 3 short sentences:\n\n${text}`;

            const response = await this.axiosInstance.post(
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

            const summary = response.data.choices[0].message.content.trim();
            
            // Log pour tracking des coûts
            const tokensUsed = response.data.usage.total_tokens;
            const cost = (tokensUsed / 1000) * 0.002; // GPT-3.5 pricing
            
            LogService.info('OpenAI summary successful', {
                tokensUsed,
                cost: cost.toFixed(4)
            });

            return summary;

        } catch (error) {
            LogService.error('OpenAI summarization error:', {
                error: error.message,
                response: error.response?.data
            });
            
            // Ne pas faire échouer la transcription si le résumé échoue
            return null;
        }
    }

    async estimateCost(audioSeconds, includeSummary = false) {
        // Coûts OpenAI actuels
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