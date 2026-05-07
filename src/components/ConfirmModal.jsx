export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="profile-modal-overlay" onClick={onCancel}>
      <div className="profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
        <h3 className="profile-modal-name" style={{ marginBottom: '0.5rem' }}>{title}</h3>
        {message && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
        </div>
        <button className="profile-modal-close" onClick={onCancel} aria-label="Close">
          &times;
        </button>
      </div>
    </div>
  );
}
