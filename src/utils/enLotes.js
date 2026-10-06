/*
  Parte una lista en lotes. Firestore acepta como máximo 500 operaciones por
  batch, así que 400 deja margen y es el mismo número que usan los scripts
  de scripts/.
*/
export const enLotes = (items, tamano = 400) => {
  const lotes = [];
  for (let i = 0; i < items.length; i += tamano) {
    lotes.push(items.slice(i, i + tamano));
  }
  return lotes;
};
