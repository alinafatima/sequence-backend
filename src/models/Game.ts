import mongoose, { Document, Schema } from 'mongoose';
import { IPlayer } from './Player.js';
import { BoardSlot } from '../types';

export interface IGame extends Document {
  id: string;
  link: string;
  players: IPlayer[];
  host: IPlayer;
  status: 'waiting' | 'in-progress' | 'completed';
  maxPlayers: number;
  gameData?: {
    deck?: {rank: string, suit: string}[];
    board?: BoardSlot[];
    currentTurn?: string;
    score?: { [playerId: string]: number };
    [key: string]: unknown;
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
    default: 6,
    min: 2,
    max: 6
  },
  gameData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

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
