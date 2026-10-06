import { describe, it, beforeAll, afterAll } from "vitest";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { montarEntornoStorage } from "./helpers.js";

let env;

beforeAll(async () => { env = await montarEntornoStorage(); });
afterAll(async () => { await env.cleanup(); });

const imagenChica = () => new Uint8Array(1024);                 // 1 KB
const imagenGrande = () => new Uint8Array(6 * 1024 * 1024);     // 6 MB
const videoMediano = () => new Uint8Array(10 * 1024 * 1024);    // 10 MB

describe("storage products/", () => {
  it("niega que un anónimo suba un archivo", async () => {
    const anon = env.unauthenticatedContext();
    await assertFails(
      uploadBytes(ref(anon.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("niega que un cliente autenticado sin claim admin suba un archivo", async () => {
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(
      uploadBytes(ref(cliente.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("permite que un admin suba una imagen chica", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertSucceeds(
      uploadBytes(ref(admin.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("NIEGA que un admin suba una imagen de 6 MB (límite 5 MB)", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/grande.jpg"), imagenGrande(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("NIEGA un video aunque lo suba el admin y sea chico", async () => {
    // El plan gratuito da 1 GB de descarga por día compartido con todas las
    // imágenes del catálogo: un video visto veinte veces deja la tienda sin
    // fotos. Los videos van por YouTube, en el campo videoUrl del producto.
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/demo.mp4"), videoMediano(), {
        contentType: "video/mp4",
      })
    );
  });

  it("NIEGA un ejecutable aunque lo suba el admin", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/malo.exe"), imagenChica(), {
        contentType: "application/x-msdownload",
      })
    );
  });

  it("NIEGA un PDF disfrazado de nombre de imagen", async () => {
    // El nombre no importa: la regla mira el contentType declarado.
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "products/foto.jpg"), imagenChica(), {
        contentType: "application/pdf",
      })
    );
  });

  it("niega escribir fuera de products/", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await assertFails(
      uploadBytes(ref(admin.storage(), "otracarpeta/foto.jpg"), imagenChica(), {
        contentType: "image/jpeg",
      })
    );
  });

  it("permite la lectura pública de products/ (las fotos se muestran en la tienda)", async () => {
    const admin = env.authenticatedContext("max", { admin: true });
    await uploadBytes(ref(admin.storage(), "products/publica.jpg"), imagenChica(), {
      contentType: "image/jpeg",
    });
    const anon = env.unauthenticatedContext();
    await assertSucceeds(getDownloadURL(ref(anon.storage(), "products/publica.jpg")));
  });
});

// --- Hallazgo de la revision final (Important 6) ---

describe("storage products/ - borrado", () => {
  it("permite que el admin borre un archivo de producto", async () => {
    // En un delete, request.resource es null: evaluar
    // request.resource.contentType revienta y la regla niega. Sin esto, cada
    // imagen reemplazada queda huerfana para siempre.
    const { deleteObject } = await import("firebase/storage");
    const admin = env.authenticatedContext("max", { admin: true });
    await uploadBytes(ref(admin.storage(), "products/borrar.jpg"), imagenChica(), {
      contentType: "image/jpeg",
    });
    await assertSucceeds(deleteObject(ref(admin.storage(), "products/borrar.jpg")));
  });

  it("NIEGA que un cliente borre un archivo de producto", async () => {
    const { deleteObject } = await import("firebase/storage");
    const admin = env.authenticatedContext("max", { admin: true });
    await uploadBytes(ref(admin.storage(), "products/protegida.jpg"), imagenChica(), {
      contentType: "image/jpeg",
    });
    const cliente = env.authenticatedContext("cliente1");
    await assertFails(deleteObject(ref(cliente.storage(), "products/protegida.jpg")));
  });
});
