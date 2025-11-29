import "./ItemDetails.css";

function ItemDetails({ item }) {
  return (
    <div className="item-detail-container">
      <div className="item-img">
        <img src={item.pictureUrl} />
      </div>
      <div className="item-detail">
        <div className="item-detail__intro">
          <div className="item-detai__introl__titulo">{item.title}</div>
          <div className="item-detail__intro__rating">
            {item.rating.rate} of {item.rating.count}
          </div>
        </div>

        <div className="item-detail__description">{item.description}</div>
        <div className="item-detail__price">
          $ {item.price} (Stock: {item.stock})
        </div>
      </div>
    </div>
  );
}

export default ItemDetails;
