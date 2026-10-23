import { Icon, type IconName } from './Icon';

export function EmptyState(props: { icon: IconName; titulo: string; texto: string; accion?: { label: string; onClick: () => void } }) {
  const { icon, titulo, texto, accion } = props;
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h2>{titulo}</h2>
      <p className="muted">{texto}</p>
      {accion && (
        <button type="button" className="primary" onClick={accion.onClick}>
          {accion.label}
        </button>
      )}
    </div>
  );
}
