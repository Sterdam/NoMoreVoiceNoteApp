const OpenAIService = require('./OpenAIService');
const LogService = require('./LogService');

class SummaryService {
    constructor() {
        this.summaryConfigs = {
            none: null,
            concise: {
                systemPrompt: {
                    fr: `Tu es un assistant expert en résumé de messages vocaux. Tu dois créer des résumés ultra-concis en 2-3 phrases maximum. 
                    
Règles strictes :
- Extraire UNIQUEMENT l'information essentielle
- Format : QUI fait QUOI, QUAND et POURQUOI
- Utiliser des phrases courtes et directes
- Pas de détails superflus
- Si c'est une demande : commencer par "➡️ Demande:"
- Si c'est une information : commencer par "ℹ️ Info:"
- Si c'est urgent : ajouter "🚨 URGENT:" au début`,
                    
                    en: `You are an expert assistant in voice message summarization. You must create ultra-concise summaries in maximum 2-3 sentences.
                    
Strict rules:
- Extract ONLY essential information
- Format: WHO does WHAT, WHEN and WHY
- Use short, direct sentences
- No superfluous details
- If it's a request: start with "➡️ Request:"
- If it's information: start with "ℹ️ Info:"
- If urgent: add "🚨 URGENT:" at the beginning`
                },
                userPrompt: {
                    fr: "Résume ce message vocal en 2-3 phrases MAXIMUM. Sois extrêmement concis :\n\n",
                    en: "Summarize this voice message in MAXIMUM 2-3 sentences. Be extremely concise:\n\n"
                },
                maxTokens: 100
            },
            detailed: {
                systemPrompt: {
                    fr: `Tu es un assistant expert en résumé structuré de messages vocaux. Tu dois créer des résumés détaillés et bien organisés.
                    
Structure obligatoire :
1. **CONTEXTE** (1 phrase) : De quoi parle le message
2. **POINTS CLÉS** (3-5 bullets) : Les éléments importants
3. **ACTIONS** (si applicable) : Ce qui est demandé/à faire
4. **INFOS IMPORTANTES** : Dates, heures, lieux, contacts mentionnés

Règles :
- Être factuel et précis
- Conserver les informations importantes (dates, nombres, noms)
- Structurer clairement l'information
- Maximum 7 phrases au total
- Utiliser des émojis pertinents pour la clarté (📅 pour dates, 📍 pour lieux, etc.)`,
                    
                    en: `You are an expert assistant in structured voice message summarization. You must create detailed and well-organized summaries.
                    
Mandatory structure:
1. **CONTEXT** (1 sentence): What the message is about
2. **KEY POINTS** (3-5 bullets): Important elements
3. **ACTIONS** (if applicable): What is requested/to do
4. **IMPORTANT INFO**: Dates, times, locations, contacts mentioned

Rules:
- Be factual and precise
- Keep important information (dates, numbers, names)
- Clearly structure information
- Maximum 7 sentences total
- Use relevant emojis for clarity (📅 for dates, 📍 for locations, etc.)`
                },
                userPrompt: {
                    fr: "Crée un résumé détaillé et structuré de ce message vocal. Inclus tous les points importants :\n\n",
                    en: "Create a detailed and structured summary of this voice message. Include all important points:\n\n"
                },
                maxTokens: 300
            }
        };
        
        // Templates pour identifier le type de message
        this.messagePatterns = {
            urgent: {
                keywords: {
                    fr: ['urgent', 'urgence', 'important', 'critique', 'tout de suite', 'immédiatement', 'asap'],
                    en: ['urgent', 'emergency', 'important', 'critical', 'right away', 'immediately', 'asap']
                }
            },
            meeting: {
                keywords: {
                    fr: ['réunion', 'rendez-vous', 'meeting', 'rencontre', 'appel', 'visio'],
                    en: ['meeting', 'appointment', 'call', 'conference', 'video call']
                }
            },
            task: {
                keywords: {
                    fr: ['faire', 'tâche', 'action', 'besoin', 'demande', 'pourriez-vous', 'peux-tu'],
                    en: ['do', 'task', 'action', 'need', 'request', 'could you', 'can you']
                }
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
            
            // Analyser le type de message
            const messageType = this.analyzeMessageType(text, lang);
            
            // Adapter le prompt selon le type
            let enhancedUserPrompt = config.userPrompt[lang] + text;
            if (messageType.isUrgent) {
                enhancedUserPrompt = "⚠️ MESSAGE URGENT - " + enhancedUserPrompt;
            }

            const response = await OpenAIService.axiosInstance.post(
                `${OpenAIService.apiUrl}/chat/completions`,
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: config.systemPrompt[lang] },
                        { role: 'user', content: enhancedUserPrompt }
                    ],
                    max_tokens: config.maxTokens,
                    temperature: 0.3, // Plus déterministe pour des résumés cohérents
                    presence_penalty: 0.1,
                    frequency_penalty: 0.1
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OpenAIService.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            let summary = response.data.choices[0].message.content.trim();
            
            // Post-traitement selon le niveau
            if (level === 'concise') {
                summary = this.postProcessConciseSummary(summary, messageType, lang);
            } else if (level === 'detailed') {
                summary = this.postProcessDetailedSummary(summary, messageType, lang);
            }
            
            // Log pour tracking des coûts
            const tokensUsed = response.data.usage.total_tokens;
            const cost = (tokensUsed / 1000) * 0.002;
            
            LogService.info('Summary generated', {
                level,
                tokensUsed,
                cost: cost.toFixed(4),
                language: lang,
                messageType: messageType.type
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
    
    analyzeMessageType(text, language) {
        const lowerText = text.toLowerCase();
        let isUrgent = false;
        let isMeeting = false;
        let isTask = false;
        
        // Vérifier urgence
        this.messagePatterns.urgent.keywords[language].forEach(keyword => {
            if (lowerText.includes(keyword)) {
                isUrgent = true;
            }
        });
        
        // Vérifier réunion
        this.messagePatterns.meeting.keywords[language].forEach(keyword => {
            if (lowerText.includes(keyword)) {
                isMeeting = true;
            }
        });
        
        // Vérifier tâche
        this.messagePatterns.task.keywords[language].forEach(keyword => {
            if (lowerText.includes(keyword)) {
                isTask = true;
            }
        });
        
        let type = 'general';
        if (isUrgent) type = 'urgent';
        else if (isMeeting) type = 'meeting';
        else if (isTask) type = 'task';
        
        return {
            type,
            isUrgent,
            isMeeting,
            isTask
        };
    }
    
    postProcessConciseSummary(summary, messageType, language) {
        // S'assurer que le résumé est vraiment concis
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 3) {
            summary = sentences.slice(0, 3).join('. ') + '.';
        }
        
        // Ajouter des préfixes si pas déjà présents
        if (messageType.isUrgent && !summary.includes('🚨')) {
            summary = '🚨 URGENT: ' + summary;
        }
        
        return summary;
    }
    
    postProcessDetailedSummary(summary, messageType, language) {
        // S'assurer que la structure est respectée
        const hasContext = summary.includes('**CONTEXTE**') || summary.includes('**CONTEXT**');
        const hasKeyPoints = summary.includes('**POINTS CLÉS**') || summary.includes('**KEY POINTS**');
        
        if (!hasContext || !hasKeyPoints) {
            // Reformater si nécessaire
            const lines = summary.split('\n').filter(l => l.trim().length > 0);
            let formattedSummary = '';
            
            if (language === 'fr') {
                formattedSummary = `**CONTEXTE**: ${lines[0]}\n\n**POINTS CLÉS**:\n`;
            } else {
                formattedSummary = `**CONTEXT**: ${lines[0]}\n\n**KEY POINTS**:\n`;
            }
            
            for (let i = 1; i < lines.length && i < 6; i++) {
                formattedSummary += `• ${lines[i]}\n`;
            }
            
            return formattedSummary.trim();
        }
        
        return summary;
    }

    getSummaryLevelInfo(level) {
        const info = {
            none: {
                name: 'Sans résumé',
                description: 'Transcription uniquement',
                icon: '📝',
                nameEn: 'No summary',
                descriptionEn: 'Transcription only'
            },
            concise: {
                name: 'Résumé concis',
                description: '2-3 phrases essentielles',
                icon: '📌',
                nameEn: 'Concise summary',
                descriptionEn: '2-3 essential sentences'
            },
            detailed: {
                name: 'Résumé détaillé',
                description: '5-7 phrases structurées',
                icon: '📋',
                nameEn: 'Detailed summary',
                descriptionEn: '5-7 structured sentences'
            }
        };
        return info[level] || info.none;
    }

    estimateCost(level) {
        const costs = {
            none: 0,
            concise: 0.0002, // ~100 tokens
            detailed: 0.0006  // ~300 tokens
        };
        return costs[level] || 0;
    }
    
    // Méthode pour obtenir des statistiques sur les résumés
    async getSummaryStats(userId, period = 30) {
        try {
            const Transcript = require('../models/Transcript');
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);
            
            const stats = await Transcript.aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: startDate },
                        summary: { $exists: true, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: '$summaryLevel',
                        count: { $sum: 1 },
                        avgLength: { $avg: { $strLen: '$summary' } }
                    }
                }
            ]);
            
            return stats;
        } catch (error) {
            LogService.error('Error getting summary stats:', error);
            return [];
        }
    }
}

module.exports = new SummaryService();