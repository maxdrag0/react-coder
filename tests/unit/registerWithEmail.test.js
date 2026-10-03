import { describe, it, expect, vi, beforeEach } from "vitest";

const createUserMock = vi.fn();
const updateProfileMock = vi.fn();
const sendEmailVerificationMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...a) => createUserMock(...a),
  updateProfile: (...a) => updateProfileMock(...a),
  sendEmailVerification: (...a) => sendEmailVerificationMock(...a),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db, col, id) => ({ col, id }),
  setDoc: (...a) => setDocMock(...a),
  getDoc: vi.fn(),
}));
vi.mock("@/utils/firebase", () => ({ auth: {}, db: {} }));

const { registerWithEmail } = await import("@/services/firebase/authFirebase");

const USUARIO = { uid: "u1", email: "ana@mail.com" };

beforeEach(() => {
  createUserMock.mockClear().mockResolvedValue({ user: USUARIO });
  updateProfileMock.mockClear().mockResolvedValue(undefined);
  sendEmailVerificationMock.mockClear().mockResolvedValue(undefined);
  setDocMock.mockClear().mockResolvedValue(undefined);
});

describe("registerWithEmail", () => {
  it("crea la cuenta, setea el displayName, el perfil y manda la verificación", async () => {
    const r = await registerWithEmail("ana@mail.com", "contrasenia8", "Ana Pérez");

    expect(r.user).toEqual(USUARIO);
    expect(updateProfileMock).toHaveBeenCalledWith(USUARIO, { displayName: "Ana Pérez" });
    expect(setDocMock).toHaveBeenCalled();
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(USUARIO);
    expect(r.avisos).toEqual([]);
  });

  it("NO tira si falla el mail de verificación: la cuenta ya existe", async () => {
    // Important 8: la cuenta queda creada igual. Si esto tiraba, Register
    // mostraba un error y no navegaba, así que la persona creía que el
    // registro había fallado mientras ya estaba registrada y con sesión.
    // Al reintentar le decía "Ese email ya tiene una cuenta", que se lee
    // como una contradicción.
    const e = new Error("auth/too-many-requests");
    e.code = "auth/too-many-requests";
    sendEmailVerificationMock.mockImplementation(() => Promise.reject(e));

    const r = await registerWithEmail("ana@mail.com", "contrasenia8", "Ana");

    expect(r.user).toEqual(USUARIO);
    expect(r.avisos.join(" ")).toMatch(/verificaci[oó]n/i);
  });

  it("NO tira si falla la escritura del perfil en Firestore", async () => {
    setDocMock.mockImplementation(() => Promise.reject(new Error("offline")));

    const r = await registerWithEmail("ana@mail.com", "contrasenia8", "Ana");

    expect(r.user).toEqual(USUARIO);
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it("NO tira si falla updateProfile", async () => {
    updateProfileMock.mockImplementation(() => Promise.reject(new Error("offline")));

    const r = await registerWithEmail("ana@mail.com", "contrasenia8", "Ana");

    expect(r.user).toEqual(USUARIO);
  });

  it("SÍ propaga el error si falla la creación de la cuenta", async () => {
    // Acá no hay cuenta creada, así que el error es la verdad y tiene que
    // llegar a la interfaz.
    const e = new Error("auth/email-already-in-use");
    e.code = "auth/email-already-in-use";
    createUserMock.mockImplementation(() => Promise.reject(e));

    await expect(
      registerWithEmail("ana@mail.com", "contrasenia8", "Ana")
    ).rejects.toHaveProperty("code", "auth/email-already-in-use");

    expect(setDocMock).not.toHaveBeenCalled();
    expect(sendEmailVerificationMock).not.toHaveBeenCalled();
  });

  it("nunca escribe el campo role en el perfil", async () => {
    await registerWithEmail("ana@mail.com", "contrasenia8", "Ana");

    const [, datos] = setDocMock.mock.calls[0];
    expect(datos).not.toHaveProperty("role");
  });
});
