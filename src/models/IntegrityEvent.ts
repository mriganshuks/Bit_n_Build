import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const integrityEventSchema = new Schema({
  attemptId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  timestamp: { type: Date, required: true },
  durationMs: { type: Number },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

export type IntegrityEventDocument = InferSchemaType<typeof integrityEventSchema> & { _id: mongoose.Types.ObjectId };
export const IntegrityEvent: Model<IntegrityEventDocument> =
  (mongoose.models.IntegrityEvent as Model<IntegrityEventDocument>) ||
  mongoose.model<IntegrityEventDocument>("IntegrityEvent", integrityEventSchema);
