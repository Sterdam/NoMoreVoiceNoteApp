const mongoose = require('mongoose');
const LogService = require('../services/LogService');

const preloadModels = async () => {
  try {
    // Liste de vos modèles
    const models = [
      require('../models/Transcript'),
      require('../models/User')
    ];

    // Préchargement et indexation des modèles
    for (const Model of models) {
      try {
        await Model.createIndexes();
        LogService.info(`Indexes créés pour ${Model.modelName}`);
      } catch (indexError) {
        LogService.error(`Erreur lors de la création des indexes pour ${Model.modelName}`, {
          message: indexError.message,
          stack: indexError.stack
        });
      }
    }
  } catch (error) {
    LogService.error('Erreur de préchargement des modèles', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = { preloadModels };