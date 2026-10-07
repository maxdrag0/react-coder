import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarEstados,
  eliminarProductos,
  renombrarProducto,
} from "../../services/firebase/productosFirebase";
import {
  obtenerTodasLasCompras,
  actualizarCompra,
} from "../../services/firebase/comprasFirebase";
import {
  obtenerMensajes,
  marcarMensajeComoLeido,
  eliminarMensaje,
  actualizarMensaje,
} from "../../services/firebase/contactoFirebase";
import { uploadFile } from "../../services/firebase/storageFirebase";
import { invalidarCatalogo } from "../../services/firebase/cacheCatalogo";
import { ACTIVO } from "../../constants/estadoProducto";
import { UNIDADES, presentacionesDe } from "../../constants/unidades";
import { modelosDe, idLibre } from "../../constants/modelos";
import { estaAbierto } from "../../constants/estadoPedido";
import ProductoModal from "./ProductoModal";
import TablaProductos from "./TablaProductos";
import TablaPedidos from "./TablaPedidos";
import TablaMensajes from "./TablaMensajes";
import BarraSeleccion from "./BarraSeleccion";
import FiltrosPedidos from "./FiltrosPedidos";
import { filtrarPedidos, contarPorEstado, ABIERTOS } from "./filtrarPedidos";
import { descargarCsv } from "./exportarProductos";
import FiltrosProductosAdmin from "./FiltrosProductosAdmin";
import {
  filtrarProductos,
  contarEstadosProducto,
  categoriasPresentes,
  marcasPresentes,
  FILTROS_VACIOS,
} from "./filtrarProductos";
import "./AdminDashboard.css";

const PESTANAS = [
  { clave: "productos", etiqueta: "Productos" },
  { clave: "pedidos", etiqueta: "Pedidos" },
  { clave: "mensajes", etiqueta: "Mensajes" },
];

const OPCIONALES = UNIDADES.filter((u) => u.clave !== "unitario");

const PRODUCTO_VACIO = {
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
  image: "",
  videoUrl: "",
  estado: ACTIVO,
};

/*
  Se prellena con presentacionesDe y no con los campos crudos, así el
  formulario muestra lo que la tienda REALMENTE ofrece. Importa: 171
  productos tienen precioDisplay igual al unitario y la tienda los ignora,
  así que esos aparecen destildados y se ve que hay que arreglarlos.
*/
const presentacionesAlFormulario = (p) => {
  const actuales = presentacionesDe(p);
  const form = {};
  for (const u of OPCIONALES) {
    const pres = actuales[u.clave];
    form[u.clave] = {
      activa: Boolean(pres),
      precio: pres?.precio ?? "",
      unidades: pres?.unidades ?? "",
    };
  }
  return form;
};

/* El catálogo convive con dos esquemas: los productos sembrados usan
   nombre/precioUnitario/fotoUrl/categoria y los creados desde acá usan
   name/price/image/category. Leer solo uno dejaba el formulario vacío en
   todo producto existente, y guardar una foto borraba el precio.
   Unificarlos exige migrar los datos y es el subproyecto E. */
/*
  Los modelos al formulario: el precio unitario se saca del mapa y se sube a
  un campo propio, igual que el del producto, porque no es opcional. El id se
  conserva tal cual: es lo que ata el modelo a los carritos y a los pedidos.
*/
const modelosAlFormulario = (p) =>
  modelosDe(p).map((m) => {
    const pres = presentacionesDe(p, m.id);
    const form = {};
    for (const u of OPCIONALES) {
      form[u.clave] = {
        activa: Boolean(pres[u.clave]),
        precio: pres[u.clave]?.precio ?? "",
        unidades: pres[u.clave]?.unidades ?? "",
      };
    }
    return {
      id: m.id,
      etiqueta: m.etiqueta,
      precio: pres.unitario?.precio ?? "",
      presentaciones: form,
    };
  });

const aFormulario = (p) => ({
  ...p,
  // Se guarda el original para poder detectar el cambio al guardar.
  codigoOriginal: p.codigo,
  name: p.name ?? p.nombre ?? "",
  price: p.price ?? p.precioUnitario ?? "",
  presentaciones: presentacionesAlFormulario(p),
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

const numeroOpcional = (v) => (v === "" || v == null ? null : Number(v));
const textoOpcional = (v) => v?.trim() || null;

/*
  Se escriben los dos esquemas en paralelo para que la tienda lea lo mismo
  sin importar cual mire. El viejo se escribe en null cuando la presentacion
  se destilda: si no, un lector del esquema viejo la seguiria ofreciendo.
*/
const aPresentaciones = (form) => {
  const presentaciones = { unitario: { precio: Number(form.price) } };

  for (const u of OPCIONALES) {
    const p = form.presentaciones?.[u.clave];
    if (!p?.activa) continue;
    const precio = numeroOpcional(p.precio);
    if (precio === null) continue;
    presentaciones[u.clave] = { precio, unidades: numeroOpcional(p.unidades) };
  }

  return presentaciones;
};

/*
  Los modelos del formulario a Firestore.

  El id se genera UNA vez, al guardar un modelo que todavia no lo tiene, y
  nunca mas cambia: va en la clave del carrito y queda guardado en el pedido,
  asi que cambiarlo dejaria huerfano todo lo que lo referencia. Editar el
  nombre del modelo no toca el id.

  Se descartan los modelos sin nombre o sin precio unitario: no se podrian ni
  elegir ni comprar.
*/
const aModelos = (form) => {
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

    const presentaciones = { unitario: { precio } };
    for (const u of OPCIONALES) {
      const p = m.presentaciones?.[u.clave];
      if (!p?.activa) continue;
      const precioP = numeroOpcional(p.precio);
      if (precioP === null) continue;
      presentaciones[u.clave] = {
        precio: precioP,
        unidades: numeroOpcional(p.unidades),
      };
    }

    salida.push({ id, etiqueta, presentaciones });
  }

  return salida;
};

const aFirestore = (form, imagen) => {
  const presentaciones = aPresentaciones(form);
  const modelos = form.conModelos ? aModelos(form) : [];

  return {
    name: form.name,
    nombre: form.name,
    price: modelos.length > 0 ? null : Number(form.price),
    presentaciones,
    modelos,
    // Con modelos el precio del producto no significa nada: el precio vive en
    // cada modelo. Se escriben en null para que ningun lector del esquema
    // viejo muestre un precio que no existe.
    precioUnitario: modelos.length > 0 ? null : Number(form.price),
    precioDisplay: modelos.length > 0 ? null : (presentaciones.display?.precio ?? null),
    precioBulto: modelos.length > 0 ? null : (presentaciones.bulto?.precio ?? null),
    category: form.category,
    categoria: form.category,
    description: form.description ?? "",
    descripcion: form.description ?? "",
    marca: textoOpcional(form.marca),
    subcategoria: textoOpcional(form.subcategoria),
    duracion: numeroOpcional(form.duracion),
    estado: form.estado ?? ACTIVO,
    videoUrl: textoOpcional(form.videoUrl),
    image: imagen,
    fotoUrl: imagen,
  };
};

const AdminDashboard = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pestana, setPestana] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(PRODUCTO_VACIO);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const [seleccion, setSeleccion] = useState(new Set());
  const [enLote, setEnLote] = useState(false);

  // "Abiertos" por defecto: al entrar, lo que importa es que falta hacer.
  const [filtroEstado, setFiltroEstado] = useState(ABIERTOS);
  const [filtroTexto, setFiltroTexto] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [authLoading, isAdmin, navigate]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [prods, compras, msgs] = await Promise.all([
        obtenerProductos(null, null, 500),
        obtenerTodasLasCompras(),
        obtenerMensajes(),
      ]);
      setProductos(prods.items);
      setPedidos(compras);
      setMensajes(msgs);
    } catch (error) {
      console.error("Error cargando los datos del panel:", error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) cargar();
  }, [isAdmin, cargar]);

  const cerrarModal = useCallback(() => {
    setModalAbierto(false);
    setArchivo(null);
    setErrorModal("");
  }, []);

  // El modal se escribió a mano y no cerraba con Escape.
  useEffect(() => {
    if (!modalAbierto) return;
    const alTeclear = (e) => e.key === "Escape" && cerrarModal();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [modalAbierto, cerrarModal]);

  const abrirModal = (producto = null) => {
    setEditando(Boolean(producto));
    setFormulario(producto ? aFormulario(producto) : PRODUCTO_VACIO);
    setArchivo(null);
    setErrorModal("");
    setModalAbierto(true);
  };

  const cambiarCampo = (campo, valor) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const cambiarModelo = (indice, campo, valor) =>
    setFormulario((actual) => ({
      ...actual,
      modelos: actual.modelos.map((m, i) =>
        i === indice ? { ...m, [campo]: valor } : m
      ),
    }));

  const cambiarModeloPresentacion = (indice, clave, campo, valor) =>
    setFormulario((actual) => ({
      ...actual,
      modelos: actual.modelos.map((m, i) =>
        i === indice
          ? {
              ...m,
              presentaciones: {
                ...m.presentaciones,
                [clave]: { ...m.presentaciones?.[clave], [campo]: valor },
              },
            }
          : m
      ),
    }));

  // id en null: se genera al guardar, a partir del nombre que se escriba.
  const agregarModelo = () =>
    setFormulario((actual) => ({
      ...actual,
      modelos: [
        ...actual.modelos,
        { id: null, etiqueta: "", precio: "", presentaciones: {} },
      ],
    }));

  const borrarModelo = (indice) =>
    setFormulario((actual) => ({
      ...actual,
      modelos: actual.modelos.filter((_, i) => i !== indice),
    }));

  const cambiarPresentacion = (clave, campo, valor) =>
    setFormulario((actual) => ({
      ...actual,
      presentaciones: {
        ...actual.presentaciones,
        [clave]: { ...actual.presentaciones?.[clave], [campo]: valor },
      },
    }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorModal("");
    try {
      const imagen = archivo
        ? await uploadFile(archivo)
        : formulario.image || formulario.fotoUrl || "";

      const datos = aFirestore(formulario, imagen);
      const codigo = formulario.codigo?.trim();
      const original = formulario.codigoOriginal;
      const cambioElCodigo = editando && codigo !== original;

      if (cambioElCodigo) {
        // El codigo es el id del documento: cambiarlo mueve el producto y
        // deja atras los pedidos y los links que apuntaban al viejo.
        const cuantos = pedidos.filter((p) =>
          p.items?.some((i) => i.codigo === original)
        ).length;

        const aviso = [
          `Vas a mover el producto de "${original}" a "${codigo}".`,
          "",
          "El codigo es el identificador en la base, asi que:",
          "- cualquier link al producto con el codigo viejo deja de andar",
          cuantos > 0
            ? `- ${cuantos} pedido${cuantos === 1 ? "" : "s"} ya hecho${cuantos === 1 ? "" : "s"} guarda el codigo viejo`
            : "- ningun pedido hecho lo referencia",
          "",
          "¿Seguis?",
        ].join("\n");

        if (!window.confirm(aviso)) {
          setGuardando(false);
          return;
        }

        await renombrarProducto(original, codigo, datos);
      } else if (editando) {
        await actualizarProducto(codigo, datos);
      } else {
        await crearProducto(datos, codigo || null);
      }

      invalidarCatalogo();
      await cargar();
      cerrarModal();
    } catch (error) {
      console.error("Error guardando el producto:", error);
      setErrorModal(
        error.code === "codigo-ocupado"
          ? "Ya existe un producto con ese código. Elegí otro."
          : "No se pudo guardar. Revisá la conexión y probá de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  };

  const borrarUno = async (codigo) => {
    if (!window.confirm("¿Eliminar este producto? No se puede deshacer."))
      return;
    try {
      await eliminarProducto(codigo);
      invalidarCatalogo();
      setSeleccion(new Set());
      await cargar();
    } catch (error) {
      console.error("Error eliminando el producto:", error);
    }
  };

  const filtrados = useMemo(
    () => filtrarProductos(productos, filtros),
    [productos, filtros]
  );

  const cuentaProductos = useMemo(
    () => contarEstadosProducto(productos),
    [productos]
  );
  const categorias = useMemo(() => categoriasPresentes(productos), [productos]);
  const marcas = useMemo(() => marcasPresentes(productos), [productos]);

  const cambiarFiltro = (campo, valor) =>
    setFiltros((actual) => ({ ...actual, [campo]: valor }));

  // Al cambiar un filtro, lo que estaba seleccionado puede dejar de estar a
  // la vista. Limpiar la seleccion evita aplicar una accion en lote a
  // productos que el dueno ya no ve.
  const cambiarFiltroYLimpiar = (campo, valor) => {
    setSeleccion(new Set());
    cambiarFiltro(campo, valor);
  };

  const alternar = (codigo) =>
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (nueva.has(codigo)) nueva.delete(codigo);
      else nueva.add(codigo);
      return nueva;
    });

  // Selecciona los que se están viendo, no los 321: si hay una búsqueda
  // activa, "todos" significa los que coinciden.
  const alternarTodos = (elegirTodos) =>
    setSeleccion(
      elegirTodos ? new Set(filtrados.map((p) => p.codigo)) : new Set(),
    );

  const aplicarEstado = async (estado) => {
    setEnLote(true);
    try {
      await actualizarEstados([...seleccion], estado);
      invalidarCatalogo();
      setSeleccion(new Set());
      await cargar();
    } catch (error) {
      console.error("Error actualizando los estados:", error);
    } finally {
      setEnLote(false);
    }
  };

  const borrarSeleccion = async () => {
    const cuantos = seleccion.size;
    const mensaje =
      cuantos === 1
        ? "¿Eliminar 1 producto? No se puede deshacer."
        : `¿Eliminar ${cuantos} productos? No se puede deshacer.`;
    if (!window.confirm(mensaje)) return;

    setEnLote(true);
    try {
      await eliminarProductos([...seleccion]);
      invalidarCatalogo();
      setSeleccion(new Set());
      await cargar();
    } catch (error) {
      console.error("Error eliminando los productos:", error);
    } finally {
      setEnLote(false);
    }
  };

  /*
    Las tres de abajo actualizan el estado local primero y escriben despues.

    Recargar todo tras cada cambio tardaria y, peor, le volaria al dueno lo
    que esta escribiendo en otra nota: cada fila guarda su texto en estado
    local. Si la escritura falla se recarga, que es la unica forma de volver
    a la verdad.
  */
  const cambiarEstadoPedido = async (id, estado) => {
    setPedidos((actual) =>
      actual.map((p) => (p.id === id ? { ...p, estado } : p)),
    );
    try {
      await actualizarCompra(id, { estado });
    } catch {
      await cargar();
    }
  };

  const guardarNotaPedido = async (id, nota) => {
    setPedidos((actual) =>
      actual.map((p) => (p.id === id ? { ...p, nota } : p)),
    );
    try {
      await actualizarCompra(id, { nota });
    } catch {
      await cargar();
    }
  };

  const guardarNotaMensaje = async (id, nota) => {
    setMensajes((actual) =>
      actual.map((m) => (m.id === id ? { ...m, nota } : m)),
    );
    try {
      await actualizarMensaje(id, { nota });
    } catch {
      await cargar();
    }
  };

  const alternarLeido = async (id, leido) => {
    try {
      await marcarMensajeComoLeido(id, !leido);
      await cargar();
    } catch (error) {
      console.error("Error cambiando el estado del mensaje:", error);
    }
  };

  const borrarMensaje = async (id) => {
    if (!window.confirm("¿Eliminar este mensaje?")) return;
    try {
      await eliminarMensaje(id);
      await cargar();
    } catch (error) {
      console.error("Error eliminando el mensaje:", error);
    }
  };

  const pedidosFiltrados = useMemo(
    () => filtrarPedidos(pedidos, { estado: filtroEstado, texto: filtroTexto }),
    [pedidos, filtroEstado, filtroTexto]
  );
  const cuentaPedidos = useMemo(() => contarPorEstado(pedidos), [pedidos]);

  const sinLeer = mensajes.filter((m) => !m.leido).length;
  // Pedidos que todavia piden algo: nuevo, contactado o pagado.
  const abiertos = pedidos.filter(estaAbierto).length;

  if (authLoading || cargando) {
    return <div className="loader-container">Cargando panel...</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Panel de administración</h2>
        <div className="admin-tabs">
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              type="button"
              className={`admin-tab ${pestana === p.clave ? "active" : ""}`}
              onClick={() => setPestana(p.clave)}
            >
              {p.etiqueta}
              {p.clave === "mensajes" && sinLeer > 0 && ` (${sinLeer})`}
              {p.clave === "pedidos" && abiertos > 0 && ` (${abiertos})`}
            </button>
          ))}
        </div>
      </div>

      {pestana === "productos" && (
        <>
          <div className="admin-actions-bar">
            {/* Exporta los activos con los precios que la tienda ofrece de
                verdad, no los campos crudos. */}
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => descargarCsv(productos)}
              disabled={productos.length === 0}
              title="Descargar los productos activos en CSV"
            >
              <Download size={18} />
              Descargar CSV
            </button>
            <button
              type="button"
              className="boton boton-primario"
              onClick={() => abrirModal()}
            >
              <Plus size={18} />
              Agregar producto
            </button>
          </div>

          <FiltrosProductosAdmin
            filtros={filtros}
            onFiltro={cambiarFiltroYLimpiar}
            onLimpiar={() => {
              setSeleccion(new Set());
              setFiltros(FILTROS_VACIOS);
            }}
            cuenta={cuentaProductos}
            categorias={categorias}
            marcas={marcas}
            visibles={filtrados.length}
          />

          <div className="admin-products">
            <TablaProductos
              productos={filtrados}
              seleccion={seleccion}
              onAlternar={alternar}
              onAlternarTodos={alternarTodos}
              onEditar={abrirModal}
              onEliminar={borrarUno}
            />
          </div>

          <BarraSeleccion
            cantidad={seleccion.size}
            trabajando={enLote}
            onEstado={aplicarEstado}
            onEliminar={borrarSeleccion}
            onLimpiar={() => setSeleccion(new Set())}
          />
        </>
      )}

      {pestana === "pedidos" && (
        <>
          <FiltrosPedidos
            estado={filtroEstado}
            onEstado={setFiltroEstado}
            texto={filtroTexto}
            onTexto={setFiltroTexto}
            cuenta={cuentaPedidos}
            visibles={pedidosFiltrados.length}
          />
          <div className="admin-products">
            <TablaPedidos
              pedidos={pedidosFiltrados}
              onEstado={cambiarEstadoPedido}
              onNota={guardarNotaPedido}
            />
          </div>
        </>
      )}

      {pestana === "mensajes" && (
        <div className="admin-products">
          <TablaMensajes
            mensajes={mensajes}
            onAlternarLeido={alternarLeido}
            onNota={guardarNotaMensaje}
            onEliminar={borrarMensaje}
          />
        </div>
      )}

      {modalAbierto && (
        <ProductoModal
          producto={formulario}
          onCampo={cambiarCampo}
          onPresentacion={cambiarPresentacion}
          onModelo={cambiarModelo}
          onModeloPresentacion={cambiarModeloPresentacion}
          onAgregarModelo={agregarModelo}
          onBorrarModelo={borrarModelo}
          onArchivo={setArchivo}
          archivo={archivo}
          esEdicion={editando}
          guardando={guardando}
          error={errorModal}
          onGuardar={guardar}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
