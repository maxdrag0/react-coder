import "./MediaPlaceholder.css";

// Reemplaza el cartel "No Image". La estrella viene del logo: cuando no hay
// foto, lo que se ve es la marca, no un error.
// aria-hidden porque no aporta información: el nombre del producto está al lado.
const MediaPlaceholder = () => (
  <div className="media-vacio" aria-hidden="true">
    <svg viewBox="0 0 100 100" className="media-vacio-estrella">
      <path
        d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default MediaPlaceholder;
