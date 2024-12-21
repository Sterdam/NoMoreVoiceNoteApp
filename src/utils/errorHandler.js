const winston = require('winston');

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleModelPreloadError = (error) => {
  winston.error('Model Preload Error', {
    message: error.message,
    stack: error.stack
  });

  // Vous pouvez ici implémenter une logique de récupération, comme :
  // - Réessayer le préchargement après un certain délai
  // - Utiliser des modèles par défaut
  // - Dégrader gracieusement les fonctionnalités
};

const handleWhisperInitError = (error) => {
  winston.error('Whisper Initialization Error', {
    message: error.message,
    stack: error.stack
  });

  // Implémentez ici la logique de gestion des erreurs d'initialisation de Whisper
  // Par exemple :
  // - Réessayer l'initialisation
  // - Utiliser un modèle Whisper de remplacement
  // - Désactiver les fonctionnalités nécessitant Whisper
};

const handleAPIError = (error, req, res, next) => {
  winston.error('API Error', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    status: error.statusCode
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message
    });
  }

  // Erreurs non opérationnelles (bugs, erreurs système, etc.)
  res.status(500).json({
    status: 'error',
    message: 'Une erreur interne est survenue'
  });
};

const handleWebError = (error, req, res, next) => {
  winston.error('Web Error', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    status: error.statusCode
  });

  // Renvoyer une page d'erreur personnalisée
  res.status(error.statusCode || 500).render('error', {
    message: error.isOperational ? error.message : 'Une erreur interne est survenue',
    error: process.env.NODE_ENV === 'development' ? error : {}
  });
};

const globalErrorHandler = (err, req, res, next) => {
  // Erreurs d'API
  if (req.path.startsWith('/api/')) {
    return handleAPIError(err, req, res, next);
  }

  // Erreurs de pages Web
  handleWebError(err, req, res, next);
};

module.exports = {
  AppError,
  handleModelPreloadError,
  handleWhisperInitError,
  globalErrorHandler
};