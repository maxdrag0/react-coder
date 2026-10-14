import { useContext } from "react";
import { ThemeContext } from "./ThemeContext.js";

/** El tema elegido: `{ themeMode, setThemeMode }`. */
export const useTheme = () => useContext(ThemeContext);
