// src/utils/dbInit.js
const mongoose = require('mongoose');
const LogService = require('../services/LogService');

async function initializeDatabase() {
  try {
    LogService.info('Début de l\'initialisation de la base de données...');

    // 1. Vérifier la connexion MongoDB
    if (mongoose.connection.readyState !== 1) {
      LogService.warn('MongoDB pas encore connecté, attente...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mongoose.connection.readyState !== 1) {
        throw new Error('La connexion MongoDB n\'est pas établie');
      }
    }

    const db = mongoose.connection.db;
    
    // 2. Vérifier que la base de données existe
    if (!db) {
      LogService.error('Base de données non accessible');
      return false;
    }

    // 3. Créer les collections si nécessaire
    try {
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['users', 'transcripts', 'subscriptions', 'usages'];
      
      for (const collName of requiredCollections) {
        if (!collectionNames.includes(collName)) {
          try {
            await db.createCollection(collName);
            LogService.info(`Collection ${collName} créée`);
          } catch (error) {
            LogService.warn(`Impossible de créer la collection ${collName}:`, error.message);
          }
        }
      }
    } catch (error) {
      LogService.warn('Impossible de lister les collections:', error.message);
    }

    // 4. Créer les index de manière sûre
    LogService.info('Création des index...');
    
    // Index pour Users
    try {
      const userIndexes = [
        { key: { email: 1 }, unique: true, name: 'email_1' },
        { key: { whatsappNumber: 1 }, unique: true, name: 'whatsappNumber_1' },
        { key: { apiKey: 1 }, sparse: true, name: 'apiKey_1' },
        { key: { referralCode: 1 }, sparse: true, name: 'referralCode_1' }
      ];

      for (const index of userIndexes) {
        try {
          await db.collection('users').createIndex(index.key, {
            unique: index.unique,
            sparse: index.sparse,
            name: index.name,
            background: true
          });
          LogService.info(`Index ${index.name} créé pour users`);
        } catch (error) {
          if (error.code === 85 || error.code === 86) {
            LogService.info(`Index ${index.name} existe déjà`);
          } else if (error.code !== 11000) {
            LogService.warn(`Erreur création index ${index.name}:`, {
              message: error.message,
              code: error.code,
              codeName: error.codeName
            });
          }
        }
      }
    } catch (error) {
      LogService.error('Erreur lors de la création des index users:', error);
    }

    // Index pour Transcripts
    try {
      const transcriptIndexes = [
        { key: { userId: 1, createdAt: -1 }, name: 'userId_createdAt' },
        { key: { messageId: 1 }, name: 'messageId_1' },
        { key: { status: 1 }, name: 'status_1' }
      ];

      for (const index of transcriptIndexes) {
        try {
          await db.collection('transcripts').createIndex(index.key, {
            name: index.name,
            background: true
          });
          LogService.info(`Index ${index.name} créé pour transcripts`);
        } catch (error) {
          if (error.code === 85 || error.code === 86) {
            LogService.info(`Index ${index.name} existe déjà`);
          } else {
            LogService.warn(`Erreur création index ${index.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      LogService.error('Erreur lors de la création des index transcripts:', error);
    }

    LogService.info('Initialisation de la base de données terminée');
    return true;

  } catch (error) {
    LogService.error('Erreur lors de l\'initialisation de la base de données:', {
      error: error.message,
      stack: error.stack
    });
    // Ne pas lancer l'erreur pour permettre à l'app de continuer
    return false;
  }
}

module.exports = {
  initializeDatabase
};