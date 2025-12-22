import { useEffect, useState } from "react";
import { Button } from "../common/Button/Button";
import "./CarritoCard.css";

const CarritoCard = ({ item, callback }) => {
  const subtotal = item.price * item.cantidad;
  return (
    <div className="carrito-card-container">
      <div className="item">
        <div className="item__imagen">
          <img src={item.pictureUrl} />
          {/* <p>placeholder</p> */}
        </div>
        <div className="item__detalle">
          <div className="item__detalle__titulo-boton">
            <h3>{item.title}</h3>
            {/* <Button callback={callback}></Button> */}
          </div>
          <span>Unidades: {item.cantidad}</span>
          <p className="precio-unitario">Precio unidad: ${item.price}</p>
        </div>
      </div>
      <div className="total-a-pagar">$ {subtotal}</div>
    </div>
  );
};

export default CarritoCard;
