import { useState, useEffect } from "react";
import { errorDeTelefono, soloDigitos } from "@/utils/telefono";
import {
  errorDeCiudad,
  errorDeDireccion,
  faltaEnvio,
  limpiarTexto,
} from "@/utils/envio";

/*
  Los datos con los que se atiende un pedido: teléfono, dirección y ciudad.

  Vive acá y no en el carrito porque son tres campos, tres validaciones y un
  guardado, y el carrito ya tiene bastante con el carrito. Lo usa el panel de
  la derecha, que solo muestra lo que falta.

  Quién decide es el servidor: el perfil manda sobre lo que escriba el
  cliente, y sin estos datos el pedido no entra. Esto es para que la persona
  se entere ANTES de apretar, no con un error después.

  La dirección y la ciudad van juntas: media dirección no sirve para
  despachar, y mezclar la calle guardada con la ciudad nueva daría una
  dirección que nadie escribió.
*/

const VACIO = { telefono: "", direccion: "", ciudad: "" };
const CAMPOS = Object.keys(VACIO);

export const useDatosEnvio = ({ perfil, activo, guardarPerfil }) => {
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState({});

  /*
    Campos que hay que pedir aunque el perfil los tenga. Pasa cuando el
    servidor rechaza el pedido por uno de ellos: el perfil se pudo editar en
    otra pestaña, o quedó con un dato que no sirve. Sin esto el aviso no
    tenía dónde aparecer —el campo no se dibujaba— y la persona veía un
    pedido que no entra y ningún lugar donde arreglarlo.
  */
  const [forzado, setForzado] = useState({});

  /*
    Lo guardado prellena el formulario, pero NUNCA pisa lo que la persona
    está escribiendo: el perfil llega de forma asincrónica.

    Si no cambia nada devuelve el MISMO objeto, para que React corte el
    re-render. Con uno nuevo siempre, un padre que arme el perfil al vuelo
    —`usePerfil: () => ({ perfil: {...} })`— entra en render → efecto →
    render para siempre: la página se cuelga y el proceso se come la
    memoria.
  */
  useEffect(() => {
    if (!perfil) return;
    setValores((actual) => {
      const siguiente = {
        telefono: actual.telefono || perfil.telefono || "",
        direccion: actual.direccion || perfil.direccion || "",
        ciudad: actual.ciudad || perfil.ciudad || "",
      };
      const igual = CAMPOS.every((c) => siguiente[c] === actual[c]);
      return igual ? actual : siguiente;
    });
  }, [perfil]);

  const faltaTelefono = activo && (!perfil?.telefono || forzado.telefono);
  const faltaDireccion = activo && (faltaEnvio(perfil) || forzado.direccion);
  const falta = faltaTelefono || faltaDireccion;

  const cambiar = (campo, valor) => {
    setValores((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: "" }));
  };

  const marcarError = (campo, mensaje) => {
    setErrores((actual) => ({ ...actual, [campo]: mensaje }));
    // La ciudad y la dirección se piden juntas, así que alcanza con una.
    const grupo = campo === "ciudad" ? "direccion" : campo;
    setForzado((actual) => ({ ...actual, [grupo]: true }));
  };

  /**
   * Valida lo que falta y lo guarda en el perfil para no volver a pedirlo.
   * @returns {Promise<boolean>} si se puede mandar el pedido
   */
  const confirmar = async () => {
    const encontrados = {};
    if (faltaTelefono) encontrados.telefono = errorDeTelefono(valores.telefono);
    if (faltaDireccion) {
      encontrados.direccion = errorDeDireccion(valores.direccion);
      encontrados.ciudad = errorDeCiudad(valores.ciudad);
    }

    const malos = Object.fromEntries(
      Object.entries(encontrados).filter(([, mensaje]) => mensaje),
    );
    setErrores(malos);
    if (Object.keys(malos).length > 0) return false;

    const aGuardar = {};
    if (faltaTelefono) aGuardar.telefono = soloDigitos(valores.telefono);
    if (faltaDireccion) {
      aGuardar.direccion = limpiarTexto(valores.direccion);
      aGuardar.ciudad = limpiarTexto(valores.ciudad);
    }
    if (Object.keys(aGuardar).length > 0) await guardarPerfil(aGuardar);

    return true;
  };

  /*
    Lo que viaja en el pedido: SOLO lo que el perfil no tiene. Mandar lo que
    ya está guardado sería darle al cliente un campo del pedido que no le
    corresponde, igual que el uid y el email salen del token.

    Va tal cual se escribió: limpiarlo es trabajo del servidor, que es el que
    decide qué queda guardado en el pedido.
  */
  const paraEnviar = () => ({
    telefono: faltaTelefono ? valores.telefono : undefined,
    direccion: faltaDireccion ? valores.direccion : undefined,
    ciudad: faltaDireccion ? valores.ciudad : undefined,
  });

  return {
    valores,
    errores,
    faltaTelefono,
    faltaDireccion,
    falta,
    cambiar,
    marcarError,
    confirmar,
    paraEnviar,
  };
};
