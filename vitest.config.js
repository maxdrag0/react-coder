import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Los tests de reglas corren en Node contra el emulador.
    // Los de componentes declaran jsdom con un docblock en su propio archivo.
    environment: "node",
    // El emulador es un recurso compartido: en paralelo los tests se pisan.
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
