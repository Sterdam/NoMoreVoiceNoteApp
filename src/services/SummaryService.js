const OpenAIService = require('./OpenAIService');
const LogService = require('./LogService');

class SummaryService {
    constructor() {
        this.summaryConfigs = {
            none: null,
            concise: {
                systemPrompt: {
                    fr: "Tu es un assistant qui crée des résumés ultra-concis. Maximum 2-3 phrases courtes. Garde uniquement l'essentiel : QUI, QUOI, QUAND. Sois direct et factuel.",
                    en: "You are an assistant creating ultra-concise summaries. Maximum 2-3 short sentences. Keep only the essential: WHO, WHAT, WHEN. Be direct and factual."
                },
                userPrompt: {
                    fr: "Résume ce message en 2-3 phrases maximum :\n\n",
                    en: "Summarize this message in maximum 2-3 sentences:\n\n"
                },
                maxTokens: 100
            },
            detailed: {
                systemPrompt: {
                    fr: "Tu es un assistant qui crée des résumés détaillés et structurés. Inclus les points principaux, le contexte, et les détails importants. Structure le résumé avec des points clés. Maximum 5-7 phrases.",
                    en: "You are an assistant creating detailed and structured summaries. Include main points, context, and important details. Structure the summary with key points. Maximum 5-7 sentences."
                },
                userPrompt: {
                    fr: "Crée un résumé détaillé et structuré de ce message :\n\n",
                    en: "Create a detailed and structured summary of this message:\n\n"
                },
                maxTokens: 250
            }
        };
    }

    async generateSummary(text, level, language = 'fr') {
        try {
            if (level === 'none' || !this.summaryConfigs[level]) {
                return null;
            }

            const config = this.summaryConfigs[level];
            const lang = ['fr', 'en'].includes(language) ? language : 'fr';

            const response = await OpenAIService.axiosInstance.post(
                `${OpenAIService.apiUrl}/chat/completions`,
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: config.systemPrompt[lang] },
                        { role: 'user', content: config.userPrompt[lang] + text }
                    ],
                    max_tokens: config.maxTokens,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OpenAIService.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const summary = response.data.choices[0].message.content.trim();
            
            // Log pour tracking des coûts
            const tokensUsed = response.data.usage.total_tokens;
            const cost = (tokensUsed / 1000) * 0.002;
            
            LogService.info('Summary generated', {
                level,
                tokensUsed,
                cost: cost.toFixed(4),
                language: lang
            });

            return summary;

        } catch (error) {
            LogService.error('Summary generation error:', {
                error: error.message,
                level,
                language
            });
            return null;
        }
    }

    getSummaryLevelInfo(level) {
        const info = {
            none: {
                name: 'Sans résumé',
                description: 'Transcription uniquement',
                icon: '📝'
            },
            concise: {
                name: 'Résumé concis',
                description: '2-3 phrases essentielles',
                icon: '📌'
            },
            detailed: {
                name: 'Résumé détaillé',
                description: '5-7 phrases structurées',
                icon: '📋'
            }
        };
        return info[level] || info.none;
    }

    estimateCost(level) {
        const costs = {
            none: 0,
            concise: 0.0002, // ~100 tokens
            detailed: 0.0005  // ~250 tokens
        };
        return costs[level] || 0;
    }
}

module.exports = new SummaryService();