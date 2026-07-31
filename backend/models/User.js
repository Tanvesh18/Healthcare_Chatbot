import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  title: String,
  messages: [
    {
      sender: String,
      text: String,
      time: { type: Date, default: Date.now }
    }
  ]
});

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  dosage: { type: String, trim: true, maxlength: 160 },
  frequency: { type: String, trim: true, maxlength: 160 },
  notes: { type: String, trim: true, maxlength: 300 }
}, { _id: false });

const adverseReactionSchema = new mongoose.Schema({
  substance: { type: String, required: true, trim: true, maxlength: 120 },
  reaction: { type: String, trim: true, maxlength: 300 }
}, { _id: false });

const privacyConsentSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  grantedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  policyVersion: { type: String, default: "1.0" }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  googleId: String,
  avatarUrl: String,
  age: Number,
  height: Number,
  weight: Number,
  gender: String,           // male / female / other
  bloodGroup: String,      // O+, A+, B-, etc
  conditions: [String],    // diabetes, asthma, bp...
  allergies: [String],     // dust, pollen, medicine
  medications: { type: [medicationSchema], default: [] },
  adverseReactions: { type: [adverseReactionSchema], default: [] },
  smoking: String,         // yes / no / occasionally
  alcohol: String,         // yes / no / occasionally
  activityLevel: String,   // low / moderate / high
  privacyConsents: {
    aiProfilePersonalization: { type: privacyConsentSchema, default: () => ({}) },
    locationCareSearch: { type: privacyConsentSchema, default: () => ({}) }
  },

  chats: [chatSchema]
});

export default mongoose.model("User", userSchema);
