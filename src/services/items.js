import ITEMS from "../data/items.json";
import { Axios } from "axios";

export function fetchItemsMock(delay = 2000) {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...ITEMS]), delay);
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
