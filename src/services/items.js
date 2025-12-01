import ITEMS from "../data/items.json";
import { Axios } from "axios";

export function fetchItemsMock(category, delay = 2000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 1. Convertir la categoría a mayúsculas para asegurar la comparación,
      //    y asegurarnos de que no sea null o undefined.
      const filterCategory = category ? category : null;

      // 2. Definir los ítems a devolver
      let itemsToReturn = [...ITEMS]; // Inicialmente, todos los ítems

      if (filterCategory) {
        itemsToReturn = itemsToReturn.filter(
          (item) => item.category.toUpperCase() === filterCategory
        );
      }

      // 4. Resolver la promesa con la lista (completa o filtrada)
      resolve(itemsToReturn);
    }, delay);
  });
}

export function fetchItemByIdMock(id, delay = 800) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const found = ITEMS.find((i) => i.id === Number(id));
      if (found) resolve({ ...found });
      else reject(new Error("Item no encontrado"));
    }, delay);
  });
}
