const email = process.argv[2];
const quitar = process.argv.includes("--quitar");

// Se valida el argumento ANTES de cargar el Admin SDK: los imports de ES
// modules se evalúan antes del cuerpo, así que un `import` arriba haría que
// el chequeo de la credencial tape siempre el mensaje de uso. De ahí el
// import dinámico más abajo.
if (!email) {
  console.error(`
Uso:
  npm run set-admin -- correo@ejemplo.com            asigna admin
  npm run set-admin -- correo@ejemplo.com --quitar   lo revoca
`);
  process.exit(1);
}

const { auth } = await import("./firebaseAdmin.mjs");

try {
  const usuario = await auth.getUserByEmail(email);

  // setCustomUserClaims REEMPLAZA el objeto entero: preservar los demás
  // claims en vez de sobrescribirlos.
  const claims = { ...(usuario.customClaims ?? {}) };

  if (quitar) {
    delete claims.admin;
  } else {
    claims.admin = true;
  }

  await auth.setCustomUserClaims(usuario.uid, claims);

  // Releer para confirmar que quedó escrito y no asumirlo.
  const confirmado = await auth.getUser(usuario.uid);
  const esAdmin = confirmado.customClaims?.admin === true;

  console.log(`
${quitar ? "Revocado" : "Asignado"} el claim admin.
  email: ${email}
  uid:   ${usuario.uid}
  admin: ${esAdmin}

IMPORTANTE: el token que ese usuario ya tiene en el navegador NO incluye
el cambio. Los tokens de Firebase duran una hora. Para verlo aplicado:
cerrar sesión y volver a iniciarla (o esperar hasta una hora).
Si entrás a /admin y te rebota, es esto, no un error del script.
`);
} catch (error) {
  if (error.code === "auth/user-not-found") {
    console.error(`No existe ningún usuario con el email ${email}.`);
    console.error("Registrate primero en la app con ese email y volvé a correr esto.");
  } else {
    console.error("Error al asignar el claim:", error.message);
  }
  process.exit(1);
}
