import { presentacionesDe } from "../src/constants/unidades.js";

/*
  El precio del producto vivia en cuatro campos sueltos: `price` y
  `precioUnitario` (el mismo dato, uno por panel), `precioDisplay` y
  `precioBulto`. El esquema bueno es `presentaciones`, un mapa donde la clave
  existe solo si el producto se vende asi y que ademas guarda cuantas unidades
  trae cada forma.

  Esto decide, documento por documento, que presentaciones hay que escribir y
  que campos borrar. Es puro: no toca Firestore, asi que se puede probar
  entero.

  LA INVARIANTE: ningun precio que la tienda muestre hoy puede cambiar. Por
  eso deriva con `presentacionesDe`, el mismo modulo que usa la tienda, y no
  con una copia de su logica. Lo que la tienda ya ignora —el display repetido
  del unitario, los ceros de la carga a granel— se queda afuera.
*/

/** Los cuatro campos que se van. */
export const LEGADOS = [
  "price",
  "precioUnitario",
  "precioDisplay",
  "precioBulto",
];

/** Que presentacion pretendia ser cada campo suelto. */
const REPRESENTA = {
  price: "unitario",
  precioUnitario: "unitario",
  precioDisplay: "display",
  precioBulto: "bulto",
};

const esPrecio = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const tiene = (datos, campo) =>
  Object.prototype.hasOwnProperty.call(datos, campo);

/**
 * Aplica un plan sobre un objeto comun. Lo usa el seed, que escribe
 * documentos nuevos; la migracion aplica el mismo plan con FieldValue.delete
 * porque borra campos de documentos que ya existen.
 */
export const aplicarPlan = (datos, plan) => {
  const salida = { ...datos, ...plan.asignar };
  for (const campo of plan.borrar) delete salida[campo];
  return salida;
};

/**
 * Que hacer con un documento.
 *
 * @returns {{asignar: object, borrar: string[], discrepancias: object[], hayCambios: boolean}}
 */
export const planDe = (datos) => {
  const borrar = LEGADOS.filter((campo) => tiene(datos, campo));
  const muestra = presentacionesDe(datos);
  const asignar = {};

  /*
    Solo se derivan las presentaciones del producto que no las tiene. Un
    producto con modelos tampoco: su precio vive en cada modelo, y
    `presentacionesDe` devuelve vacio a proposito —"cuanto sale un mortero" no
    tiene respuesta sin el tamaño—. Darle un precio propio haria que la card
    muestre uno que no se puede comprar.
  */
  if (!datos.presentaciones && Object.keys(muestra).length > 0) {
    asignar.presentaciones = muestra;
  }

  /*
    El suelto que no coincide con lo que la tienda muestra se reporta pero no
    frena nada: la tienda lee `presentaciones` desde que existen, asi que ese
    valor nunca se mostro y borrarlo no cambia ningun precio. Se avisa por si
    alguien lo edito a mano esperando que aplicara.
  */
  const discrepancias = [];
  for (const campo of borrar) {
    const suelto = datos[campo];
    if (!esPrecio(suelto)) continue;
    const visible = muestra[REPRESENTA[campo]]?.precio ?? null;
    if (visible !== suelto)
      discrepancias.push({ campo, suelto, muestra: visible });
  }

  return {
    asignar,
    borrar,
    discrepancias,
    hayCambios: borrar.length > 0 || Object.keys(asignar).length > 0,
  };
};
