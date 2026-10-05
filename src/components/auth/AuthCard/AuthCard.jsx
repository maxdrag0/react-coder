import "./AuthCard.css";

const AuthCard = ({ titulo, subtitulo, children }) => (
  <div className="auth">
    <div className="auth-card">
      <h2>{titulo}</h2>
      {subtitulo && <p className="auth-subtitulo">{subtitulo}</p>}
      {children}
    </div>
  </div>
);

export default AuthCard;
