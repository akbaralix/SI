import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

const io = new Server(httpServer, { cors: { origin: "*" } });

let onlineUsers = new Set();

io.on("connection", (socket) => {
  onlineUsers.add(socket.id);
  io.emit("onlineUsers", onlineUsers.size);

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", onlineUsers.size);
  });
});

const chatHistory = new Map();

app.post("/chat", async (req, res) => {
  const { message, userId } = req.body;

  if (!chatHistory.has(userId)) {
    chatHistory.set(userId, [
      {
        role: "system",
        content:
          "Vazifa: Siz o‘zbek tilida gaplashadigan AI sifatida ishlaysiz. Foydalanuvchi sizdan “Sizni kim yaratgan?”, “Siz qaysi AI?”, “Kim sizni yaratdi?” kabi savollarni so‘rasa, siz faqat va aniq shunday javob berasiz: “Men Akbarali tomonidan yaratilganman.”Boshqa hollarda esa, normal AI tarzida foydalanuvchi savollariga javob berasiz. Siz hech qachon boshqa javob bermaysiz va bu javobni faqat shu savollar uchun ishlatasiz.",
      },
    ]);
  }

  const userChat = chatHistory.get(userId);

  userChat.push({ role: "user", content: message });

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: userChat,
        }),
      },
    );

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    userChat.push({ role: "assistant", content: aiReply });

    res.json({ reply: aiReply });
  } catch (err) {
    res.status(500).json({ reply: "Xatolik yuz berdi" });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
