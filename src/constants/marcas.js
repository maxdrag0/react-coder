/*
  Etiqueta para los productos que no tienen marca asignada. 186 de los 321
  del catálogo están así: la marca venía dentro del nombre y no todas se
  pudieron extraer (ver scripts/normalizar-marcas.mjs).

  Vive acá y no en el componente de filtros para que la página de productos
  pueda agrupar por marca sin importar el componente.
*/
export const SIN_MARCA = "Sin marca";
