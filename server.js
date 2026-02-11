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

let chatHistory = [
  {
    role: "system",
    content: `Siz professional AI chatbot siz, foydalanuvchi bilan do‘stona va tushunarli tarzda muloqot qilasiz. Foydalanuvchi savollarini qisqa, aniq va o‘zbek tilida javoblaysiz. Siz foydalanuvchi bilan hurmat bilan suhbat qilasiz va har doim muloyim bo‘lasiz. 

Maxsus qoidalar:
1. Agar foydalanuvchi “Seni kim yaratdi?” yoki shunga o‘xshash savol bersa, faqat “Akbarali” deb javob berasiz. 
2. Boshqa barcha savollarga: tushunarli, aniq va professional javob bering.  
3. Har doim foydalanuvchi uchun foydali maslahatlar berishga harakat qiling.  
4. Javoblaringiz qisqa va muloqotga mos bo‘lsin, ortiqcha gap yozmang.  
5. Javoblar faqat O‘zbek tilida bo‘lsin.`,
  },
];

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  chatHistory.push({ role: "user", content: userMessage });

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
          messages: chatHistory,
        }),
      },
    );

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    chatHistory.push({ role: "assistant", content: aiReply });
    res.json({ reply: aiReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "AI bilan bog‘liq xatolik yuz berdi" });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
