import cors from "cors";
import { env } from "./env";

const origins = env.CLIENT_URL.split(",").map((origin) => origin.trim());

export const corsConfig = cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (origins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
