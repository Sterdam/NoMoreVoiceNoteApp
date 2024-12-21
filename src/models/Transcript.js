const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  audioLength: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    default: 'fr'
  },
  confidence: {
    type: Number
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
    processingTime: Number
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

const Transcript = mongoose.model('Transcript', transcriptSchema);

module.exports = { Transcript };