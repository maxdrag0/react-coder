import { auth, db } from "./_lib/firebaseAdmin.js";
import { validarCuerpo } from "./_lib/validarCuerpo.js";
import { validarOrden } from "./_lib/validarOrden.js";
import { errorDeTelefono, soloDigitos } from "../src/utils/telefono.js";

/*
  Crea una orden.

  El cliente manda codigos y cantidades; el precio y el total los decide este
  handler leyendo el catalogo. El `precioVisto` que viaja en cada renglon NO
  entra en el total: solo sirve para poder decirle al cliente QUE cambio.

  El documento se escribe con el id de idempotencia que manda el cliente, asi
  que un doble click o un reintento de red sobrescriben en vez de generar dos
  pedidos iguales.
*/

const tokenDe = (req) => {
  const cabecera = req.headers?.authorization ?? "";
  return cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Solo POST." });
  }

  // 1. Token. El uid y el email salen de aca y nunca del cuerpo.
  const token = tokenDe(req);
  if (!token) return res.status(401).json({ error: "Falta la sesion." });

  let usuario;
  try {
    usuario = await auth.verifyIdToken(token);
  } catch {
    // Un token vencido tambien cae aca: el cliente lo refresca y reintenta.
    return res.status(401).json({ error: "La sesion no es valida." });
  }

  // 2. Forma del cuerpo, antes de tocar la base.
  const forma = validarCuerpo(req.body);
  if (!forma.ok) return res.status(400).json({ error: forma.error });

  const { idempotencia, items, telefono } = forma.datos;

  try {
    // 3. Telefono: el del perfil manda, y si no hay se acepta el del cuerpo.
    const perfilRef = db.collection("users").doc(usuario.uid);
    const perfil = await perfilRef.get();
    const guardado = perfil.exists ? (perfil.data()?.telefono ?? "") : "";

    let telefonoFinal = guardado;
    if (!telefonoFinal) {
      if (errorDeTelefono(telefono) !== null) {
        return res.status(422).json({ error: "sin_telefono" });
      }
      telefonoFinal = soloDigitos(telefono);
      await perfilRef.set({ telefono: telefonoFinal }, { merge: true });
    }

    /*
      4. Los productos, en un solo viaje.

      El mismo producto puede venir en dos renglones (una unidad suelta y un
      bulto). Se pide una sola vez: dos refs iguales serian dos lecturas
      cobradas por el mismo documento, y el comportamiento de getAll con
      referencias repetidas no esta documentado.
    */
    const codigos = [...new Set(items.map((i) => i.codigo))];
    const refs = codigos.map((c) => db.collection("products").doc(c));
    const docs = await db.getAll(...refs);

    const porCodigo = new Map();
    for (const d of docs) {
      if (d.exists) porCodigo.set(d.id, { codigo: d.id, ...d.data() });
    }

    // 5. Validacion y cotizacion.
    const { problemas, renglones, total } = validarOrden(items, porCodigo);
    if (problemas.length > 0) return res.status(409).json({ problemas });

    // 6. La orden.
    const orden = {
      buyer: {
        uid: usuario.uid,
        email: usuario.email ?? "",
        name: usuario.name ?? "Usuario",
        telefono: telefonoFinal,
      },
      items: renglones,
      total,
      // La fecha la pone el servidor: un reloj mal puesto del cliente ensucia
      // el orden con el que el dueno lee los pedidos.
      date: new Date().toISOString(),
      estado: "nuevo",
    };

    await db.collection("compras").doc(idempotencia).set(orden);

    return res.status(201).json({ id: idempotencia, total });
  } catch (error) {
    // El detalle va a los logs de Vercel y nunca al cliente: un error de
    // Firestore filtrado cuenta mas de la estructura de la base de lo que
    // conviene.
    console.error("Error creando la orden:", error);
    return res.status(500).json({ error: "No se pudo registrar el pedido." });
  }
}
