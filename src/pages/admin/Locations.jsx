import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLocations, deleteLocation } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { getLocations().then(r => setLocations(Array.isArray(r.data) ? r.data : [])); }, []);

  async function handleDelete() {
    const id = confirmId;
    setConfirmId(null);
    await deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  }

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item active">Locations Admin</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">Manage Locations</h1>
          <Link to="/admin/locations/new" className="btn btn-primary">+ Add Location</Link>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover table-sm">
          <thead className="table-light">
            <tr><th>Name</th><th>Slug</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {locations.map(l => (
              <tr key={l.id}>
                <td data-label="Name">{l.name}</td>
                <td data-label="Slug"><code>{l.slug}</code></td>
                <td data-label="Description">{l.description}</td>
                <td data-label="Actions" className="d-flex gap-1">
                  <Link to={`/admin/locations/${l.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                  <button onClick={() => setConfirmId(l.id)} className="btn btn-sm btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmId && (
        <ConfirmModal
          title="Delete Location"
          message="Are you sure you want to delete this location? All category assignments will be removed."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

