import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateDeploymentApi } from "./src/config/deployment.ts";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, ".", ["ARION_", "VITE_", "VERCEL"]);
  if (command === "build" && env.VERCEL === "1") validateDeploymentApi(env.VITE_API_URL);
  const proxy = { "/api": { target: env.ARION_API_TARGET || "http://127.0.0.1:8080", changeOrigin: true } };
  return { plugins: [react(), tailwindcss()], server: { proxy }, preview: { proxy } };
});
