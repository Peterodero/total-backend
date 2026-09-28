const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ----------------------------
// Game Result Schema for individual game submissions
// ----------------------------
const GameResultSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true },
    score: { type: Number, required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ----------------------------
// Main Participant Schema
// ----------------------------
const ParticipantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    iggNumber: {
      type: String,
      required: [true, 'IGG number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    passCode: {
      type: String,
      unique: true,
      index: true,
    },
    // Map of gameId -> GameResult
    results: {
      type: Map,
      of: GameResultSchema,
      default: () => new Map(),
    },
    // Calculated scores per game mode
    scores: {
      this_or_that: { type: Number, default: 0 },
      ten_second_quiz: { type: Number, default: 0 },
      five_second_rapid: { type: Number, default: 0 },
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = doc._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ----------------------------
// Auto-generate passCode before save
// Format: SUST-2026-XXXX (4-digit zero-padded sequential number)
// ----------------------------
ParticipantSchema.pre('save', async function () {
  if (this.isNew) {
    if (!this.id) {
      this.id = uuidv4();
    }
    const count = await this.constructor.countDocuments();
    const paddedNum = String(count + 1).padStart(4, '0');
    this.passCode = `SUST-2026-${paddedNum}`;
  }
});

// ----------------------------
// Backward-compatibility aliases
// ----------------------------
ParticipantSchema.virtual('name').get(function () {
  return this.fullName;
});
ParticipantSchema.virtual('phone').get(function () {
  return this.iggNumber;
});
ParticipantSchema.virtual('region').get(function () {
  return this.location;
});

// Helper to format scores
ParticipantSchema.methods.getScoresObject = function () {
  const result = {};
  if (this.scores.this_or_that > 0 || this.results.has('this_or_that')) {
    result.this_or_that = this.scores.this_or_that || 0;
  }
  if (this.scores.ten_second_quiz > 0 || this.results.has('ten_second_quiz')) {
    result.ten_second_quiz = this.scores.ten_second_quiz || 0;
  }
  if (this.scores.five_second_rapid > 0 || this.results.has('five_second_rapid')) {
    result.five_second_rapid = this.scores.five_second_rapid || 0;
  }
  return result;
};

// Public participant representation
ParticipantSchema.methods.toPublic = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    fullName: this.fullName,
    iggNumber: this.iggNumber,
    location: this.location,
    passCode: this.passCode,
  };
};

module.exports = mongoose.model('Participant', ParticipantSchema);
