import mongoose, { Document, Schema } from 'mongoose';
import { IPlayer } from './Player.js';

export interface IGame extends Document {
  id: string;
  link: string;
  players: IPlayer[];
  host: IPlayer;
  status: 'waiting' | 'in-progress' | 'completed';
  maxPlayers: number;
  // Future extensible fields - these can be added without breaking existing data
  gameSettings?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    customRules?: string;
    [key: string]: any; // Allows for future custom settings
  };
  gameData?: {
    board?: any;
    currentTurn?: string;
    score?: { [playerId: string]: number };
    [key: string]: any; // Allows for future game-specific data
  };
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGame>({
  link: {
    type: String,
    required: true,
    unique: true
  },
  players: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  host: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed'],
    default: 'waiting'
  },
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 8
  },
  // Flexible game settings for future requirements
  gameSettings: {
    type: Schema.Types.Mixed,
    default: {}
  },
  // Flexible game data for future requirements
  gameData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create a virtual id field that returns the _id as a string
GameSchema.virtual('id').get(function(this: any) {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
GameSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Indexes for better performance
GameSchema.index({ status: 1 });
GameSchema.index({ 'host': 1 });

export const Game = mongoose.model<IGame>('Game', GameSchema);
