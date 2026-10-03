export const PASSWORD_MINIMO = 8;

// Firebase acepta 6 caracteres, asi que sin esto "123456" pasa.
// El trim evita que ocho espacios cuenten como contrasenia.
export const validarPassword = (password) => {
  const valor = (password ?? "").trim();

  if (valor.length < PASSWORD_MINIMO) {
    return `La contraseña debe tener al menos ${PASSWORD_MINIMO} caracteres.`;
  }

  return null;
};
