/*
  Etiqueta para los productos que no tienen marca asignada. En la carga a
  granel la marca venía dentro del nombre y no todas se pudieron extraer
  (ver scripts/normalizar-marcas.mjs), así que buena parte quedó sin marca.

  Vive acá y no en el componente de filtros para que la página de productos
  pueda agrupar por marca sin importar el componente.
*/
export const SIN_MARCA = "Sin marca";
