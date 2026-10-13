import { ACTIVO } from "@/constants/estadoProducto";
import { UNIDADES, presentacionesDe } from "@/constants/unidades";
import { modelosDe, idLibre } from "@/constants/modelos";
import { fotosDe } from "@/constants/fotos";

/*
  Traduce entre el producto de Firestore y el formulario del panel.

  Vive aparte del componente porque es la unica logica real del alta y la
  edicion, y porque un bug aca pierde datos en silencio.

  EL BUG QUE HAY QUE TENER PRESENTE: actualizarProducto usa setDoc con
  `merge: true`, y Firestore hace MERGE PROFUNDO de los mapas. Si al destildar
  el bulto se escribiera `presentaciones: {unitario, display}` sin la clave
  `bulto`, el merge CONSERVARIA el bulto que ya estaba en la base. El dueño
  creeria haberlo quitado y la tienda lo seguiria vendiendo.

  Por eso toda clave que no se vende viaja EXPLICITAMENTE en null. Los arrays
  (los modelos) si se reemplazan enteros en un merge, asi que esos no tienen
  el problema.
*/

const OPCIONALES = UNIDADES.filter((u) => u.clave !== "unitario");

export const PRODUCTO_VACIO = {
  codigo: "",
  name: "",
  price: "",
  presentaciones: {},
  conModelos: false,
  modelos: [],
  category: "",
  subcategoria: "",
  marca: "",
  duracion: "",
  description: "",
  fotos: [],
  // Archivos elegidos en el formulario que todavia no se subieron. Se suben
  // al guardar y recien ahi se convierten en urls dentro de `fotos`.
  archivosNuevos: [],
  videoUrl: "",
  estado: ACTIVO,
};

const numeroOpcional = (v) => (v === "" || v == null ? null : Number(v));
const textoOpcional = (v) => v?.trim() || null;

// ---------------------------------------------------------------------------
// De Firestore al formulario
// ---------------------------------------------------------------------------

/*
  Se prellena con presentacionesDe y no con los campos crudos, así el
  formulario muestra lo que la tienda REALMENTE ofrece. Importa: un producto
  con el precio de display repetido del unitario lo tiene ignorado por la
  tienda, así que aparece destildado y se ve que hay que arreglarlo.
*/
const presentacionesAlFormulario = (pres) => {
  const form = {};
  for (const u of OPCIONALES) {
    form[u.clave] = {
      activa: Boolean(pres[u.clave]),
      precio: pres[u.clave]?.precio ?? "",
      unidades: pres[u.clave]?.unidades ?? "",
    };
  }
  return form;
};

/*
  El precio unitario del modelo se sube a un campo propio, igual que el del
  producto, porque no es opcional. El id se conserva tal cual: es lo que ata
  el modelo a los carritos y a los pedidos.
*/
const modelosAlFormulario = (p) =>
  modelosDe(p).map((m) => {
    const pres = presentacionesDe(p, m.id);
    return {
      id: m.id,
      etiqueta: m.etiqueta,
      precio: pres.unitario?.precio ?? "",
      presentaciones: presentacionesAlFormulario(pres),
      foto: m.foto ?? "",
      archivoNuevo: null,
    };
  });

/*
  El catálogo convive con dos esquemas: los productos sembrados usan
  nombre/precioUnitario/fotoUrl/categoria y los creados desde acá usan
  name/price/image/category. Leer solo uno dejaba el formulario vacío en todo
  producto existente, y guardar una foto borraba el precio.
*/
export const aFormulario = (p) => ({
  ...p,
  // Se guarda el original para poder detectar el cambio al guardar.
  codigoOriginal: p.codigo,
  name: p.name ?? p.nombre ?? "",
  price: p.price ?? p.precioUnitario ?? "",
  presentaciones: presentacionesAlFormulario(presentacionesDe(p)),
  fotos: fotosDe(p),
  archivosNuevos: [],
  conModelos: modelosDe(p).length > 0,
  modelos: modelosAlFormulario(p),
  category: p.category ?? p.categoria ?? "",
  description: p.description ?? p.descripcion ?? "",
  image: p.image ?? p.fotoUrl ?? "",
  videoUrl: p.videoUrl ?? "",
  marca: p.marca ?? "",
  subcategoria: p.subcategoria ?? "",
  duracion: p.duracion ?? "",
});

// ---------------------------------------------------------------------------
// Del formulario a Firestore
// ---------------------------------------------------------------------------

/*
  Las claves que no se venden van en null y NO se omiten: ver el comentario de
  arriba sobre el merge profundo.
*/
const presentacionesDeFormulario = (mapa, precioUnitario) => {
  const salida = { unitario: { precio: precioUnitario } };

  for (const u of OPCIONALES) {
    const p = mapa?.[u.clave];
    const precio = p?.activa ? numeroOpcional(p.precio) : null;

    salida[u.clave] =
      precio === null ? null : { precio, unidades: numeroOpcional(p.unidades) };
  }

  return salida;
};

/*
  El id se genera UNA vez, al guardar un modelo que todavía no lo tiene, y
  nunca más cambia: va en la clave del carrito y queda guardado en el pedido,
  así que cambiarlo dejaría huérfano todo lo que lo referencia. Editar el
  nombre del modelo no toca el id.

  Se descartan los modelos sin nombre o sin precio unitario: no se podrían ni
  elegir ni comprar.
*/
const modelosDeFormulario = (form) => {
  const usados = form.modelos
    .map((m) => m.id)
    .filter((id) => typeof id === "string" && id);
  const salida = [];

  for (const m of form.modelos) {
    const etiqueta = (m.etiqueta ?? "").trim();
    const precio = numeroOpcional(m.precio);
    if (!etiqueta || precio === null) continue;

    const id = m.id || idLibre(etiqueta, usados);
    if (!m.id) usados.push(id);

    salida.push({
      id,
      etiqueta,
      presentaciones: presentacionesDeFormulario(m.presentaciones, precio),
      // null y no omitido: igual que las presentaciones, el merge profundo de
      // Firestore conservaria la foto vieja si la clave no viajara.
      foto: (m.foto ?? "").trim() || null,
    });
  }

  return salida;
};

/**
 * @param {object} form el formulario, con las fotos ya resueltas a urls
 */
export const aFirestore = (form) => {
  const presentaciones = presentacionesDeFormulario(
    form.presentaciones,
    Number(form.price)
  );
  const modelos = form.conModelos ? modelosDeFormulario(form) : [];
  const conModelos = modelos.length > 0;

  return {
    name: form.name,
    nombre: form.name,
    presentaciones,
    modelos,
    /*
      Con modelos el precio del producto no significa nada: el precio vive en
      cada modelo. Van en null para que ningún lector del esquema viejo
      muestre un precio que no existe.
    */
    price: conModelos ? null : Number(form.price),
    precioUnitario: conModelos ? null : Number(form.price),
    precioDisplay: conModelos ? null : (presentaciones.display?.precio ?? null),
    precioBulto: conModelos ? null : (presentaciones.bulto?.precio ?? null),
    category: form.category,
    categoria: form.category,
    description: form.description ?? "",
    descripcion: form.description ?? "",
    marca: textoOpcional(form.marca),
    subcategoria: textoOpcional(form.subcategoria),
    duracion: numeroOpcional(form.duracion),
    estado: form.estado ?? ACTIVO,
    videoUrl: textoOpcional(form.videoUrl),
    fotos: form.fotos ?? [],
    /*
      La primera foto se sigue escribiendo en los campos viejos: son los que
      lee cualquier cosa que todavia no conozca `fotos` (los scripts, el
      archivo semilla). En null si no hay ninguna.
    */
    image: form.fotos?.[0] ?? null,
    fotoUrl: form.fotos?.[0] ?? null,
  };
};
