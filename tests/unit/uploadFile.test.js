import { describe, it, expect, vi, beforeEach } from "vitest";

const uploadBytesMock = vi.fn();
const getDownloadURLMock = vi.fn();
vi.mock("firebase/storage", () => ({
  ref: (_s, path) => ({ path }),
  uploadBytes: (...a) => uploadBytesMock(...a),
  getDownloadURL: (...a) => getDownloadURLMock(...a),
  deleteObject: vi.fn(),
}));
vi.mock("@/utils/firebase", () => ({ storage: {} }));

const { uploadFile, LIMITE_IMAGEN, LIMITE_VIDEO } = await import(
  "@/services/firebase/storageFirebase"
);

const MB = 1024 * 1024;
const archivo = (type, size, name = "foto.jpg") => ({ type, size, name });

beforeEach(() => {
  uploadBytesMock.mockClear();
  getDownloadURLMock.mockClear();
  uploadBytesMock.mockResolvedValue({});
  getDownloadURLMock.mockResolvedValue("https://ejemplo/foto.jpg");
});

describe("uploadFile - validación antes de subir", () => {
  it("rechaza una imagen de 6 MB con un mensaje que dice el límite", async () => {
    // Important 5: las fotos de un celular moderno pesan 3-8 MB. Antes la
    // regla de Storage la rechazaba y AdminDashboard mostraba
    // "Error al guardar el producto", sin decir por qué.
    await expect(uploadFile(archivo("image/jpeg", 6 * MB))).rejects.toThrow(/5 MB/);
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("acepta una imagen de 4 MB", async () => {
    await expect(uploadFile(archivo("image/jpeg", 4 * MB))).resolves.toBe(
      "https://ejemplo/foto.jpg"
    );
  });

  it("acepta una imagen de exactamente el límite menos un byte", async () => {
    await expect(uploadFile(archivo("image/jpeg", 5 * MB - 1))).resolves.toBeTruthy();
  });

  it("rechaza una imagen de exactamente 5 MB (la regla usa <, no <=)", async () => {
    // Tiene que coincidir con storage.rules o el rechazo ocurre en el
    // servidor con un mensaje inútil.
    await expect(uploadFile(archivo("image/jpeg", 5 * MB))).rejects.toThrow(/5 MB/);
  });

  it("rechaza un video de 60 MB con un mensaje que dice el límite", async () => {
    await expect(
      uploadFile(archivo("video/mp4", 60 * MB, "demo.mp4"))
    ).rejects.toThrow(/50 MB/);
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("acepta un video de 20 MB", async () => {
    await expect(uploadFile(archivo("video/mp4", 20 * MB, "demo.mp4"))).resolves.toBeTruthy();
  });

  it("rechaza un PDF explicando qué tipos se aceptan", async () => {
    await expect(
      uploadFile(archivo("application/pdf", 1024, "manual.pdf"))
    ).rejects.toThrow(/imagen|video/i);
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("rechaza un archivo sin tipo detectable (algunos .heic) en vez de fallar en el servidor", async () => {
    await expect(uploadFile(archivo("", 1024, "foto.heic"))).rejects.toThrow(/tipo/i);
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("devuelve null si no hay archivo, sin tocar el storage", async () => {
    await expect(uploadFile(null)).resolves.toBeNull();
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("expone los límites para que la interfaz pueda mostrarlos", () => {
    expect(LIMITE_IMAGEN).toBe(5 * MB);
    expect(LIMITE_VIDEO).toBe(50 * MB);
  });
});
