import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import route from "./src/routes/index.js";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from "url";

// Tạo __filename và __dirname từ import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(cors());

app.use(bodyParser.json());
route(app);


const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("Server is running on http://localhost:" + port);
});

export default app;