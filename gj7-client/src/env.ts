// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
});

// In Vite, environment variables are exposed through import.meta.env
const processEnv = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
} as const;

// Validate environment variables
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 2),
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;