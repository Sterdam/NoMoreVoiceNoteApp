const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  summary: {
    type: String
  },
  audioLength: {
    type: Number,
    required: true // En secondes
  },
  language: {
    type: String,
    default: 'fr'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  segments: [{
    start: Number,
    end: Number,
    text: String,
    confidence: Number
  }],
  metadata: {
    originalFilename: String,
    mimeType: String,
    fileSize: Number,
    processingTime: Number,
    chatId: String,
    fromNumber: String,
    timestamp: Date,
    cost: Number
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    message: String,
    code: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
transcriptSchema.index({ userId: 1, createdAt: -1 });
transcriptSchema.index({ status: 1 });

// Méthodes d'instance
transcriptSchema.methods.getDurationInMinutes = function() {
  return this.audioLength / 60;
};

transcriptSchema.methods.getCost = function() {
  return this.getDurationInMinutes() * 0.006; // $0.006 par minute
};

transcriptSchema.methods.markCompleted = function(text, language, confidence = null) {
  this.text = text;
  this.language = language;
  this.confidence = confidence;
  this.status = 'completed';
  this.metadata.processingTime = Date.now() - this.createdAt;
  return this.save();
};

transcriptSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date()
  };
  return this.save();
};

// Méthodes statiques
transcriptSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.sort !== false) {
    query.sort({ createdAt: -1 });
  }
  
  return query;
};

transcriptSchema.statics.findRecent = function(userId, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return this.find({
    userId,
    createdAt: { $gte: cutoff }
  }).sort({ createdAt: -1 });
};

const Transcript = mongoose.model('Transcript', transcriptSchema);

module.exports = Transcript;