import mongoose, { Document, Schema } from 'mongoose';

export interface IAIAgent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  aiAgentName: string;
  aiAgentSlug: string;
  agentDescription?: string;
  domainExpertise?: string;
  colorTheme?: string;
  logoFile?: string | null;
  bannerFile?: string | null;
  greeting?: string;
  tone?: string;
  customRules?: string;
  conversationStarters?: string[];
  languages?: string;
  enableFreeText?: boolean;
  enableBranchingLogic?: boolean;
  conversationFlow?: string;
  manualEntry?: Array<{
    question: string;
    answer: string;
    _id: mongoose.Types.ObjectId;
  }>;
  csvFile?: string | null;
  docFiles?: string[];
  createdAt: Date;
  currentStep: number;
  __v: number;
}

const aiAgentSchema = new Schema({
  aiAgentName: { type: String, required: true },
  aiAgentSlug: { type: String, required: true, unique: true },
  agentDescription: { type: String, required: true },
  domainExpertise: { type: String, required: true },
  colorTheme: { type: String, required: true },
  logoFile: { type: String, required: true },
  bannerFile: { type: String, default: null },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  currentStep: { type: Number, default: 1 },
  greeting: { type: String },
  tone: { type: String },
  customRules: { type: String },
  conversationStarters: { type: [String] },
  languages: { type: String },
  enableFreeText: { type: Boolean },
  enableBranchingLogic: { type: Boolean },
  conversationFlow: { type: String },
  configFile: { type: String, default: null }, // Added for Step 2
  manualEntry: [{ question: String, answer: String, _id: Schema.Types.ObjectId }],
  csvFile: { type: String, default: null },
  docFiles: { type: [String], default: [] },
});

export default mongoose.model('AIAgent', aiAgentSchema);