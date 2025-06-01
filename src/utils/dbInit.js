const mongoose = require('mongoose');
const LogService = require('../services/LogService');
const User = require('../models/User');
const { Transcript } = require('../models/Transcript');

async function initializeDatabase() {
  try {
    LogService.info('Début de l\'initialisation de la base de données...');

    // 1. Vérifier la connexion MongoDB
    if (mongoose.connection.readyState !== 1) {
      throw new Error('La connexion MongoDB n\'est pas établie');
    }

    // 2. Créer/Vérifier les collections de manière séquentielle
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    for (const collName of ['users', 'transcripts']) {
      if (!collectionNames.includes(collName)) {
        await db.createCollection(collName);
        LogService.info(`Collection ${collName} créée`);
      }
    }

    // 3. Gérer les index de manière plus sélective
    for (const collection of ['users', 'transcripts']) {
      try {
        // Obtenir les index existants
        const existingIndexes = await db.collection(collection).listIndexes().toArray();
        
        // Supprimer uniquement les index non-_id qui pourraient causer des conflits
        for (const index of existingIndexes) {
          if (index.name !== '_id_') {
            try {
              await db.collection(collection).dropIndex(index.name);
              LogService.info(`Index ${index.name} supprimé pour ${collection}`);
            } catch (dropError) {
              LogService.warn(`Impossible de supprimer l'index ${index.name}:`, dropError.message);
            }
          }
        }
      } catch (error) {
        if (!error.message.includes('ns not found')) {
          LogService.warn(`Avertissement lors de la gestion des index de ${collection}:`, error);
        }
      }
    }

    // 4. Créer les nouveaux index de manière séquentielle avec gestion d'erreur
    LogService.info('Création des index...');
    
    // Index pour Users
    try {
      await db.collection('users').createIndex(
        { email: 1 },
        { 
          unique: true,
          background: true,
          name: 'email_unique'
        }
      );
      LogService.info('Index email créé pour users');
    } catch (error) {
      if (error.code === 85) { // IndexOptionsConflict
        LogService.warn('Index email existe déjà avec des options différentes');
      } else if (error.code !== 11000) { // Pas une erreur de duplication
        throw error;
      }
    }
    
    try {
      await db.collection('users').createIndex(
        { whatsappNumber: 1 },
        { 
          unique: true,
          background: true,
          name: 'whatsapp_unique'
        }
      );
      LogService.info('Index whatsappNumber créé pour users');
    } catch (error) {
      if (error.code === 85) { // IndexOptionsConflict
        LogService.warn('Index whatsappNumber existe déjà avec des options différentes');
      } else if (error.code !== 11000) { // Pas une erreur de duplication
        throw error;
      }
    }

    // Index pour Transcripts
    try {
      await db.collection('transcripts').createIndex(
        { userId: 1, createdAt: -1 },
        { 
          background: true,
          name: 'userId_createdAt'
        }
      );
      LogService.info('Index userId_createdAt créé pour transcripts');
    } catch (error) {
      if (error.code === 85) {
        LogService.warn('Index userId_createdAt existe déjà avec des options différentes');
      } else if (error.code !== 11000) {
        throw error;
      }
    }

    try {
      await db.collection('transcripts').createIndex(
        { messageId: 1 },
        { 
          background: true,
          name: 'messageId'
        }
      );
      LogService.info('Index messageId créé pour transcripts');
    } catch (error) {
      if (error.code === 85) {
        LogService.warn('Index messageId existe déjà avec des options différentes');
      } else if (error.code !== 11000) {
        throw error;
      }
    }

    // 5. Vérification finale des index
    const userIndexes = await db.collection('users').listIndexes().toArray();
    const transcriptIndexes = await db.collection('transcripts').listIndexes().toArray();

    LogService.info('Index actuels:', {
      users: userIndexes.map(i => ({ name: i.name, key: Object.keys(i.key) })),
      transcripts: transcriptIndexes.map(i => ({ name: i.name, key: Object.keys(i.key) }))
    });

    LogService.info('Initialisation de la base de données terminée avec succès');
    return true;

  } catch (error) {
    LogService.error('Erreur lors de l\'initialisation de la base de données:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  initializeDatabase
};