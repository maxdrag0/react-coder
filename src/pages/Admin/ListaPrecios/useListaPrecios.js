import { useCallback, useMemo, useState } from "react";
import { filasDePdf } from "../../../utils/pdf/leerPdf";
import { interpretarLista } from "../../../constants/listaPrecios";
import {
  cruzarConCatalogo,
  accionDe,
  idDeCodigo,
} from "../../../constants/cruzarLista";
import {
  aProductoNuevo,
  aActualizacion,
  modelosActualizados,
} from "../../../constants/desdeLista";
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  renombrarProducto,
} from "../../../services/firebase/productosFirebase";

/*
  Toda la logica de subir la lista del proveedor: leer el PDF, cruzarlo con
  lo publicado, y escribir lo elegido.

  El PDF se lee ENTERO EN EL NAVEGADOR. No se sube a ningun lado: son precios
  de costo y no tienen por que salir de la maquina.
*/

const TIPOS = ["unidad", "display", "bulto"];

/*
  El valor por defecto de cada campo es el PUBLICADO cuando el producto ya
  existe, y el de la lista cuando es nuevo. Dejar una fila sin tocar no tiene
  que cambiar nada de lo que ya esta bien cargado: los nombres de la tienda
  estan curados ("Candela De 5 Tiros") y los de la lista son largos y con
  erratas ("CANDELA DE 5 TIROS - perlas de colores surtidos c/tiro PUNTO
  AUSTRAL").
*/
const porDefecto = (fila) => ({
  codigo: fila.web?.id ?? fila.codigo,
  nombre: fila.web?.nombre ?? fila.nombre,
  marca: fila.web ? (fila.web.marca ?? "") : (fila.marca ?? ""),
  categoria: fila.web?.categoria ?? fila.categoria,
});

const inicial = (fila) => ({
  unidad: fila.pre.unidad,
  display: fila.pre.display,
  bulto: fila.pre.bulto,
  borrar: false,
  ...porDefecto(fila),
});

/** Que campos toco una persona. El resto del producto publicado no se toca. */
const editado = (fila, elegido) => {
  const base = porDefecto(fila);
  return {
    codigo: elegido.codigo !== base.codigo,
    nombre: elegido.nombre !== base.nombre,
    marca: elegido.marca !== base.marca,
    categoria: elegido.categoria !== base.categoria,
  };
};

/** La fila, en la forma que entienden los mapeos a Firestore. */
const aItem = (fila, elegido) => ({
  codigo: elegido.codigo,
  idDoc: idDeCodigo(elegido.codigo),
  webId: fila.web?.id ?? null,
  nombre: elegido.nombre,
  nombreLista: fila.nombre,
  marca: elegido.marca,
  categoria: elegido.categoria,
  subcategoria: fila.subcategoria ?? null,
  duracion: fila.duracion ?? null,
  unidad: elegido.unidad ? fila.pUnidad : null,
  display: elegido.display
    ? { precio: fila.pDisplay, unidades: fila.porDisplay }
    : null,
  bulto: elegido.bulto
    ? { precio: fila.pBulto, unidades: fila.porBulto }
    : null,
  modelos: null,
  editado: editado(fila, elegido),
});

export const useListaPrecios = (publicados, { alTerminar } = {}) => {
  const [archivo, setArchivo] = useState(null);
  const [filas, setFilas] = useState([]);
  const [sueltas, setSueltas] = useState([]);
  const [sinCruce, setSinCruce] = useState([]);
  const [elegidos, setElegidos] = useState(new Map());
  const [leyendo, setLeyendo] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const publicadosPorId = useMemo(() => {
    const mapa = new Map();
    // Por el ID DEL DOCUMENTO, no por el campo `codigo`: "2302/AR" vive en
    // el documento "2302-AR" porque la barra no es valida en un id.
    for (const doc of publicados ?? []) {
      mapa.set(idDeCodigo(doc.codigo ?? doc._id), doc);
    }
    return mapa;
  }, [publicados]);

  const leerArchivo = useCallback(
    async (file) => {
      if (!file) return;
      setLeyendo(true);
      setError(null);
      setResultado(null);

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { productos, sueltas: huerfanas } = interpretarLista(
          await filasDePdf(bytes),
        );

        if (productos.length === 0) {
          setError(
            "No encontré productos en ese archivo. Tiene que ser el PDF de la " +
              "lista del proveedor, con el texto adentro: un PDF escaneado es " +
              "una foto y no tiene texto que leer.",
          );
          setFilas([]);
          return;
        }

        const cruzado = cruzarConCatalogo(productos, publicados ?? []);
        setFilas(cruzado.filas);
        setSinCruce(cruzado.sinCruce);
        setSueltas(huerfanas);
        setElegidos(new Map(cruzado.filas.map((f) => [f.id, inicial(f)])));
        setArchivo(file.name);
      } catch (e) {
        console.error("No se pudo leer la lista:", e);
        setError("No se pudo leer el archivo. ¿Es el PDF de la lista?");
        setFilas([]);
      } finally {
        setLeyendo(false);
      }
    },
    [publicados],
  );

  const cambiar = useCallback((id, cambios) => {
    setElegidos((previo) => {
      const copia = new Map(previo);
      copia.set(id, { ...copia.get(id), ...cambios });
      return copia;
    });
  }, []);

  const alternar = useCallback(
    (id, tipo) => {
      const actual = elegidos.get(id);
      cambiar(id, { [tipo]: !actual[tipo], borrar: false });
    },
    [elegidos, cambiar],
  );

  const alternarFila = useCallback(
    (fila, prendido) => {
      const cambios = { borrar: false };
      cambios.unidad = prendido && Boolean(fila.pUnidad);
      cambios.display = prendido && Boolean(fila.pDisplay);
      cambios.bulto = prendido && Boolean(fila.pBulto);
      cambiar(fila.id, cambios);
    },
    [cambiar],
  );

  const alternarBorrar = useCallback(
    (id) => {
      const actual = elegidos.get(id);
      // Borrar y subir a la vez no significa nada: borrar gana y limpia.
      cambiar(id, {
        borrar: !actual.borrar,
        ...(actual.borrar
          ? {}
          : { unidad: false, display: false, bulto: false }),
      });
    },
    [elegidos, cambiar],
  );

  const editar = useCallback(
    (id, campo, valor) => cambiar(id, { [campo]: valor }),
    [cambiar],
  );

  const acciones = useMemo(() => {
    const mapa = new Map();
    for (const fila of filas) {
      const elegido = elegidos.get(fila.id);
      if (elegido) mapa.set(fila.id, accionDe(fila, elegido, publicadosPorId));
    }
    return mapa;
  }, [filas, elegidos, publicadosPorId]);

  const resumen = useMemo(() => {
    const cuenta = { crear: 0, actualizar: 0, renombrar: 0, borrar: 0 };
    const destinos = new Map();

    for (const fila of filas) {
      const accion = acciones.get(fila.id);
      if (!accion || accion === "nada") continue;
      cuenta[accion]++;
      if (accion === "borrar") continue;

      const id = idDeCodigo(elegidos.get(fila.id).codigo);
      destinos.set(id, (destinos.get(id) ?? 0) + 1);
    }

    /*
      Dos filas que escriben el mismo documento: la segunda pisa a la primera.
      Con 34 codigos repetidos en la lista pasa facil, asi que frena el envio
      en vez de perder un producto en silencio.
    */
    const choques = [...destinos.entries()]
      .filter(([, n]) => n > 1)
      .map(([id, n]) => ({ id, cuantas: n }));

    return {
      ...cuenta,
      choques,
      total: Object.values(cuenta).reduce((a, b) => a + b, 0),
    };
  }, [filas, acciones, elegidos]);

  const aplicar = useCallback(
    async ({ activos = false } = {}) => {
      if (resumen.choques.length > 0 || resumen.total === 0) return;
      setAplicando(true);
      setError(null);

      const hechas = { crear: 0, actualizar: 0, renombrar: 0, borrar: 0 };
      const fallaron = [];

      for (const fila of filas) {
        const accion = acciones.get(fila.id);
        if (!accion || accion === "nada") continue;

        const elegido = elegidos.get(fila.id);
        const item = aItem(fila, elegido);

        try {
          if (accion === "borrar") {
            await eliminarProducto(fila.web.id);
          } else if (accion === "crear") {
            await crearProducto(
              aProductoNuevo(item, { activo: activos }),
              item.idDoc,
            );
          } else if (accion === "actualizar") {
            const previo = publicadosPorId.get(item.webId ?? item.idDoc);
            const campos = aActualizacion(item);
            if (previo?.modelos?.length) {
              // Con modelos el precio vive en cada uno, con su id y su foto.
              campos.modelos = modelosActualizados(
                previo.modelos,
                previo.modelos.map((m) => m.etiqueta),
                campos.presentaciones,
              );
              campos.presentaciones = {
                unitario: null,
                display: null,
                bulto: null,
              };
            }
            await actualizarProducto(item.idDoc, campos);
          } else if (accion === "renombrar") {
            const previo = publicadosPorId.get(item.webId) ?? {};
            await renombrarProducto(item.webId, item.idDoc, {
              ...previo,
              ...aActualizacion(item),
              codigo: item.codigo,
            });
          }
          hechas[accion]++;
        } catch (e) {
          console.error("Falló", accion, item.codigo, e);
          fallaron.push({
            codigo: item.codigo,
            accion,
            motivo: e?.message ?? "",
          });
        }
      }

      setAplicando(false);
      setResultado({ ...hechas, fallaron });
      alTerminar?.();
    },
    [filas, acciones, elegidos, publicadosPorId, resumen, alTerminar],
  );

  const limpiar = useCallback(() => {
    setArchivo(null);
    setFilas([]);
    setSueltas([]);
    setSinCruce([]);
    setElegidos(new Map());
    setError(null);
    setResultado(null);
  }, []);

  return {
    archivo,
    filas,
    sueltas,
    sinCruce,
    elegidos,
    acciones,
    resumen,
    leyendo,
    aplicando,
    error,
    resultado,
    leerArchivo,
    alternar,
    alternarFila,
    alternarBorrar,
    editar,
    aplicar,
    limpiar,
    TIPOS,
  };
};
