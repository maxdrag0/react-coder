import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages sirve el sitio bajo /react-coder/; Vercel y el dominio
  // propio lo sirven en la raiz. Vercel inyecta VERCEL=1 en el build, asi que
  // el mismo repo puede ir a los dos lados sin tocar nada a mano.
  base: process.env.VERCEL ? "/" : "/react-coder/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
