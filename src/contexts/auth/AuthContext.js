import { createContext } from "react";

/*
  El objeto de contexto, solo. Vive aparte del provider porque un archivo que
  exporta un componente Y otra cosa rompe el Fast Refresh de Vite: editar el
  provider recarga la pagina entera en vez de intercambiarlo en caliente.
*/
export const AuthContext = createContext(null);
