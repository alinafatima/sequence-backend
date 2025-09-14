import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  id: string;
  name: string;
  role: 'host' | 'player';
  gameId: string;
  team: 'red' | 'blue' | 'green' | null;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['host', 'player'],
    required: true
  },
  gameId: {
    type: String,
    required: true,
    ref: 'Game'
  },
  team: {
    type: String,
    enum: ['red', 'blue', 'green'],
    default: null
  }
}, {
  timestamps: true
});

// Create a virtual id field that returns the _id as a string
PlayerSchema.virtual('id').get(function(this: any) {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
PlayerSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
