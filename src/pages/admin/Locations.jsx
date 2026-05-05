import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLocations, deleteLocation } from '../../api/api';

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);

  useEffect(() => { getLocations().then(r => setLocations(r.data)); }, []);

  async function handleDelete(id) {
    if (!window.confirm('Delete this location? All category assignments will be removed.')) return;
    await deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manage Locations</h1>
        <Link to="/admin/locations/new" className="btn btn-primary">+ Add Location</Link>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Slug</th><th>Description</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {locations.map(l => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td><code>{l.slug}</code></td>
              <td>{l.description}</td>
              <td className="action-cell">
                <Link to={`/admin/locations/${l.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                <button onClick={() => handleDelete(l.id)} className="btn btn-sm btn-danger">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}