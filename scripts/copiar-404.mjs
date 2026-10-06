import { copyFileSync } from "node:fs";

/*
  GitHub Pages es un servidor estático: no sabe que /products/Cohetes lo
  resuelve React Router, así que devuelve 404 si alguien recarga ahí.

  Pages sirve 404.html cuando no encuentra la ruta. Si ese archivo es el
  mismo index.html, el router arranca igual y la ruta funciona.

  En Vercel esto no hace falta: lo resuelve con un rewrite en vercel.json.
*/

copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html creado (rutas profundas en GitHub Pages)");
