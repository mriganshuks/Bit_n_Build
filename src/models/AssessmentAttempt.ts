import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const assessmentAttemptSchema = new Schema({
  assessmentId: { type: String, required: true, unique: true },
  userIdOrDemoProfileId: { type: String, required: true },
  skill: { type: String, required: true },
  state: { type: String, required: true },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  submittedAt: { type: Date },
  answers: { type: Schema.Types.Mixed },
  codingSubmission: { type: String },
  mcqScore: { type: Number },
  codingScore: { type: Number },
  integrityScore: { type: Number },
  finalScore: { type: Number },
  riskLevel: { type: String },
  verificationStatus: { type: String },
}, { timestamps: true });

export type AssessmentAttemptDocument = InferSchemaType<typeof assessmentAttemptSchema> & { _id: mongoose.Types.ObjectId };
export const AssessmentAttempt: Model<AssessmentAttemptDocument> =
  (mongoose.models.AssessmentAttempt as Model<AssessmentAttemptDocument>) ||
  mongoose.model<AssessmentAttemptDocument>("AssessmentAttempt", assessmentAttemptSchema);
