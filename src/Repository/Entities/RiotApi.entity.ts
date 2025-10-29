import mongoose, { Document, Schema } from "mongoose";

export interface IRiotApi extends Document {
  puuid: string;
  matchIds: string[];
  gameName: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  tagLine: string;
}

// Schema definition
const RiotApiSchema = new Schema({
  puuid: {
    type: String,
    required: true,
    trim: true,
  },
  matchIds: {
    type: [String],
    required: true,
    trim: true,
  },
  gameName: {
    type: String,
    required: true,
    trim: true,
  },
  tagLine: {
    type: String,
    required: true,
    trim: true,
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

export const RiotApi = mongoose.model<IRiotApi>("RiotApi", RiotApiSchema);
