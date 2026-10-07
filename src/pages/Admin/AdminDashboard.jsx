import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarEstados,
  eliminarProductos,
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
import { estaAbierto } from "../../constants/estadoPedido";
import ProductoModal from "./ProductoModal";
import TablaProductos from "./TablaProductos";
import TablaPedidos from "./TablaPedidos";
import TablaMensajes from "./TablaMensajes";
import BarraSeleccion from "./BarraSeleccion";
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
const aFormulario = (p) => ({
  ...p,
  name: p.name ?? p.nombre ?? "",
  price: p.price ?? p.precioUnitario ?? "",
  presentaciones: presentacionesAlFormulario(p),
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

const aFirestore = (form, imagen) => {
  const presentaciones = aPresentaciones(form);

  return {
    name: form.name,
    nombre: form.name,
    price: Number(form.price),
    precioUnitario: Number(form.price),
    presentaciones,
    precioDisplay: presentaciones.display?.precio ?? null,
    precioBulto: presentaciones.bulto?.precio ?? null,
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
  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(PRODUCTO_VACIO);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const [seleccion, setSeleccion] = useState(new Set());
  const [enLote, setEnLote] = useState(false);

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

      if (editando) {
        await actualizarProducto(formulario.codigo, datos);
      } else {
        await crearProducto(datos, formulario.codigo || null);
      }

      invalidarCatalogo();
      await cargar();
      cerrarModal();
    } catch (error) {
      console.error("Error guardando el producto:", error);
      setErrorModal("No se pudo guardar. Revisá la conexión y probá de nuevo.");
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

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter((p) =>
      (p.name || p.nombre || "").toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

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
            <input
              type="search"
              placeholder="Buscar por nombre..."
              aria-label="Buscar productos en el panel"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button
              type="button"
              className="boton boton-primario"
              onClick={() => abrirModal()}
            >
              <Plus size={18} />
              Agregar producto
            </button>
          </div>

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
        <div className="admin-products">
          <TablaPedidos
            pedidos={pedidos}
            onEstado={cambiarEstadoPedido}
            onNota={guardarNotaPedido}
          />
        </div>
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
