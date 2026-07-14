import mongoose, { Document, Model, Types } from 'mongoose'

export interface IAiMessage {
  role: 'user' | 'assistant'
  content: any   // raw Anthropic content-block array (text / tool_use / tool_result)
  createdAt: Date
}

export interface IAiConversation extends Document {
  userId: Types.ObjectId
  messages: IAiMessage[]
}

const aiMessageSchema = new mongoose.Schema<IAiMessage>({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const aiConversationSchema = new mongoose.Schema<IAiConversation>({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: [aiMessageSchema],
}, { timestamps: true })

export default (mongoose.models.AiConversation as Model<IAiConversation>) ||
  mongoose.model<IAiConversation>('AiConversation', aiConversationSchema)