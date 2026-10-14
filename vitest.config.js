import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // El plugin de React es el que transforma el JSX de los tests de
  // componentes; sin el, fallan con "React is not defined".
  plugins: [react()],
  test: {
    // Los tests de reglas corren en Node contra el emulador.
    // Los de componentes declaran jsdom con un docblock en su propio archivo.
    environment: "node",
    // Necesario para que el auto-cleanup de @testing-library/react se
    // registre: se engancha al afterEach global. Sin esto los renders se
    // acumulan en el DOM y getByTestId falla con "Found multiple elements".
    globals: true,
    // El emulador es un recurso compartido: en paralelo los tests se pisan.
    fileParallelism: false,
    testTimeout: 15000,
    // initializeTestEnvironment() del beforeAll de los tests de reglas sube
    // las reglas al emulador por HTTP. Con los 10s que trae vitest, en una
    // maquina cargada el hook se corta y la suite entera queda "skipped":
    // un rojo que no dice nada del codigo.
    hookTimeout: 60000,
    setupFiles: ["./tests/setup.js"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
