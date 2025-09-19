import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the base interface (excluding Document for now)
export interface IUser {
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
}

// Extend Document and add methods, including _id
export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId; // Explicitly define _id
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// Define static methods if needed later
export interface IUserModel extends Model<IUserDocument> {}

// Schema definition
const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'Password must be at least 8 characters long'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'admin',
  },
});

// Hash password before save
userSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Add method to schema
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Export properly typed model
const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);

export default User;