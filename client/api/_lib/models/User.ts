import mongoose, { Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  profileImage: string
  comparePassword(candidate: string): Promise<boolean>
}

const userSchema = new mongoose.Schema<IUser>({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  profileImage: { type: String, default: '' },
}, { timestamps: true })

userSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = async function (this: IUser, candidate: string) {
  return bcrypt.compare(candidate, this.password)
}

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema)