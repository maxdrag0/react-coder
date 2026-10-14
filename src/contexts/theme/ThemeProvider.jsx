import { useEffect, useState } from "react";
import { ThemeContext } from "./ThemeContext.js";

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("app-theme") || "system";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", themeMode);

    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      if (themeMode === "system") {
        const systemPrefersDark = mediaQuery.matches;
        root.setAttribute("data-theme", systemPrefersDark ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", themeMode);
      }
    };

    updateTheme();

    const listener = () => {
      if (themeMode === "system") {
        updateTheme();
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
