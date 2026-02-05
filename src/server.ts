import app from "./app";
import { config } from "dotenv";
import { connectDB } from "./config/db";

config();
connectDB();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});