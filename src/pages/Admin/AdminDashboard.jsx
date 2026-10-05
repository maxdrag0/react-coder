import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { obtenerProductos, crearProducto, actualizarProducto, eliminarProducto } from "../../services/firebase/productosFirebase";
import { obtenerTodasLasCompras } from "../../services/firebase/comprasFirebase";
import { obtenerMensajes, marcarMensajeComoLeido, eliminarMensaje } from "../../services/firebase/contactoFirebase";
import { uploadFile } from "../../services/firebase/storageFirebase";
import "./AdminDashboard.css";
import { CheckCircle, Circle, Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("productos"); // "productos", "pedidos", or "mensajes"
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    codigo: "",
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
    stock: 0,
    ventas: 0
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, isAdmin, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, ordersData, messagesData] = await Promise.all([
        obtenerProductos(null, null, 100),
        obtenerTodasLasCompras(),
        obtenerMensajes()
      ]);
      setProducts(productsData.items);
      setOrders(ordersData);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleOpenModal = (product = null) => {
    if (product) {
      setIsEditing(true);
      setCurrentProduct({
        ...product,
        name: product.name || product.nombre || "",
        ventas: product.ventas || 0
      });
    } else {
      setIsEditing(false);
      setCurrentProduct({
        codigo: "",
        name: "",
        price: "",
        category: "",
        description: "",
        image: "",
        stock: 0,
        ventas: 0
      });
    }
    setFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let imageUrl = currentProduct.image || currentProduct.fotoUrl;
      
      if (file) {
        imageUrl = await uploadFile(file);
      }
      
      const productData = {
        ...currentProduct,
        name: currentProduct.name, // ensure name is saved uniformly
        nombre: currentProduct.name, // keep backwards compatibility
        price: Number(currentProduct.price),
        precioUnitario: Number(currentProduct.price),
        stock: Number(currentProduct.stock),
        ventas: Number(currentProduct.ventas) || 0,
        image: imageUrl,
        fotoUrl: imageUrl,
      };
      
      if (isEditing) {
        await actualizarProducto(currentProduct.codigo, productData);
      } else {
        await crearProducto(productData, currentProduct.codigo || null);
      }
      
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error al guardar el producto");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await eliminarProducto(id);
        await loadData();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error al eliminar el producto");
      }
    }
  };

  const handleToggleRead = async (id, currentStatus) => {
    try {
      await marcarMensajeComoLeido(id, !currentStatus);
      await loadData();
    } catch (error) {
      console.error("Error toggling message status:", error);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este mensaje?")) {
      try {
        await eliminarMensaje(id);
        await loadData();
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    }
  };

  const filteredProducts = products.filter(prod => {
    const prodName = (prod.name || prod.nombre || "").toLowerCase();
    return prodName.includes(searchTerm.toLowerCase());
  });

  if (authLoading || loading) return <div className="loader-container">Cargando dashboard...</div>;
  if (!isAdmin) return null;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Panel de Administración</h2>
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === "productos" ? "active" : ""}`}
            onClick={() => setActiveTab("productos")}
          >
            Productos
          </button>
          <button 
            className={`admin-tab ${activeTab === "pedidos" ? "active" : ""}`}
            onClick={() => setActiveTab("pedidos")}
          >
            Pedidos
          </button>
          <button 
            className={`admin-tab ${activeTab === "mensajes" ? "active" : ""}`}
            onClick={() => setActiveTab("mensajes")}
          >
            Mensajes {messages.filter(m => !m.leido).length > 0 && `(${messages.filter(m => !m.leido).length})`}
          </button>
        </div>
      </div>

      {activeTab === "productos" && (
        <>
          <div className="admin-actions-bar">
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="boton boton-primario" onClick={() => handleOpenModal()}>
              + Agregar Producto
            </button>
          </div>

          <div className="admin-products">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Categoría</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => (
                  <tr key={prod.codigo}>
                    <td>
                      <img src={prod.image || prod.fotoUrl} alt={prod.name || prod.nombre} className="admin-prod-img" />
                    </td>
                    <td>{prod.codigo}</td>
                    <td>{prod.name || prod.nombre}</td>
                    <td>${prod.price || prod.precioUnitario}</td>
                    <td>{prod.category || prod.categoria}</td>
                    <td>
                      <button className="btn-action edit" onClick={() => handleOpenModal(prod)}>Editar</button>
                      <button className="btn-action delete" onClick={() => handleDelete(prod.codigo)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "pedidos" && (
        <div className="admin-products">
          <table className="admin-table">
            <thead>
              <tr>
                <th>N° de Orden</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Total</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{new Date(order.date).toLocaleString()}</td>
                  <td>{order.buyer?.name || 'N/A'}</td>
                  <td>{order.buyer?.email || 'N/A'}</td>
                  <td>${order.total}</td>
                  <td>
                    <ul>
                      {order.items?.map((item, idx) => (
                        <li key={idx}>
                          {item.cantidad}x {item.nombre || item.name}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">No hay pedidos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "mensajes" && (
        <div className="admin-products">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Mensaje</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className={!msg.leido ? 'msg-unread' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="msg-action-btn"
                      onClick={() => handleToggleRead(msg.id, msg.leido)}
                      title={msg.leido ? "Marcar como no leído" : "Marcar como leído"}
                      style={{ color: msg.leido ? 'var(--success-color)' : 'var(--text-secondary)' }}
                    >
                      {msg.leido ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>
                  </td>
                  <td>{new Date(msg.date).toLocaleString()}</td>
                  <td>{msg.nombre}</td>
                  <td>{msg.email}</td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap' }}>{msg.mensaje}</td>
                  <td>
                    <button 
                      className="msg-action-btn"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Eliminar mensaje"
                      style={{ color: 'var(--danger-color)' }}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">No hay mensajes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{isEditing ? "Editar Producto" : "Nuevo Producto"}</h3>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-group">
                <label>Código (ID único)</label>
                <input 
                  type="text" 
                  value={currentProduct.codigo}
                  onChange={(e) => setCurrentProduct({...currentProduct, codigo: e.target.value})}
                  disabled={isEditing}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre</label>
                <input 
                  type="text" 
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input 
                  type="number" 
                  value={currentProduct.price}
                  onChange={(e) => setCurrentProduct({...currentProduct, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input 
                  type="text" 
                  value={currentProduct.category}
                  onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input 
                  type="number" 
                  value={currentProduct.stock}
                  onChange={(e) => setCurrentProduct({...currentProduct, stock: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ventas (Popularidad)</label>
                <input 
                  type="number" 
                  value={currentProduct.ventas}
                  onChange={(e) => setCurrentProduct({...currentProduct, ventas: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  value={currentProduct.description}
                  onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Imagen / Video</label>
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {currentProduct.image && !file && (
                  <div className="current-image-preview">
                    <img src={currentProduct.image} alt="Preview" width="100" />
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="boton boton-secundario" onClick={handleCloseModal} disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="boton boton-primario" disabled={uploading}>
                  {uploading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
