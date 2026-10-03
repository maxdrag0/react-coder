import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";

const ejecutar = promisify(execFile);

// Corre un script y devuelve { code, stdout, stderr } sin tirar excepción.
async function correr(script, args = [], env = {}) {
  try {
    const r = await ejecutar("node", [script, ...args], {
      env: { ...process.env, ...env },
    });
    return { code: 0, ...r };
  } catch (e) {
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

const RUTA_INEXISTENTE = join("tests", "unit", "__no-existe__.json");
const RUTA_CORRUPTA = join("tests", "unit", "__credencial-corrupta.json");

describe("scripts/set-admin.mjs - rutas de error", () => {
  it("explica el uso cuando no se pasa email, incluso sin credencial", async () => {
    const r = await correr("scripts/set-admin.mjs", [], {
      FIREBASE_SERVICE_ACCOUNT_PATH: RUTA_INEXISTENTE,
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/Uso:/);
    expect(r.stderr).toMatch(/set-admin/);
  });

  it("explica cómo obtener la credencial cuando falta, si el email sí vino", async () => {
    const r = await correr("scripts/set-admin.mjs", ["ana@mail.com"], {
      FIREBASE_SERVICE_ACCOUNT_PATH: RUTA_INEXISTENTE,
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/No se encontró la credencial/);
    expect(r.stderr).toMatch(/Cuentas de servicio/);
  });

  it("da un mensaje legible si la credencial existe pero está corrupta", async () => {
    writeFileSync(RUTA_CORRUPTA, "esto no es json");
    try {
      const r = await correr("scripts/set-admin.mjs", ["ana@mail.com"], {
        FIREBASE_SERVICE_ACCOUNT_PATH: RUTA_CORRUPTA,
      });
      expect(r.code).toBe(1);
      // Lo que NO debe pasar: volcar un stack trace de firebase-admin.
      expect(r.stderr).not.toMatch(/at new ServiceAccount|credential-internal/);
      expect(r.stderr).toMatch(/credencial/i);
    } finally {
      rmSync(RUTA_CORRUPTA, { force: true });
    }
  });
});
