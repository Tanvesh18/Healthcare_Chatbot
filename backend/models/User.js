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

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  age: Number,
  height: Number,
  weight: Number,

  gender: String,           // male / female / other
  bloodGroup: String,      // O+, A+, B-, etc
  conditions: [String],    // diabetes, asthma, bp...
  allergies: [String],     // dust, pollen, medicine
  smoking: String,         // yes / no / occasionally
  alcohol: String,         // yes / no / occasionally
  activityLevel: String,   // low / moderate / high

  chats: [chatSchema]
});

export default mongoose.model("User", userSchema);
