import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  title: String,
  messages: [
    {
      sender: String,   // "user" or "assistant"
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

  chats: [chatSchema]   // 🔥 chat history saved per user
});

export default mongoose.model("User", userSchema);
