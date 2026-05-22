export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="modal d-block" onClick={onCancel}>
      <div
        className="profile-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '360px' }}
      >
        <button className="profile-modal-close" onClick={onCancel} aria-label="Close">
          &times;
        </button>
        <h3 className="profile-modal-name mb-2">{title}</h3>
        {message && (
          <p className="text-muted small text-center mb-3">{message}</p>
        )}
        <div className="d-flex gap-2 w-100">
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'} flex-fill`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="btn btn-secondary flex-fill" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

