import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLocations, createLocation, updateLocation,
  getLocationCategoriesAssigned, assignCategoryToLocation, removeCategoryFromLocation,createCategory
} from '../../api/api';

export default function LocationEdit() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEdit       = Boolean(id);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [categories, setCategories] = useState([]);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    if (isEdit) {
      // Load location details
      getLocations().then(r => {
        const loc = r.data.find(l => l.id === parseInt(id));
        if (loc) setForm({ name: loc.name, slug: loc.slug, description: loc.description || '' });
      });
      // Load categories with assigned flag
      getLocationCategoriesAssigned(id).then(r => setCategories(r.data));
    }
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) await updateLocation(id, form);
    else {
      const { data } = await createLocation(form);
      navigate(`/admin/locations/${data.id}/edit`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleCategory(cat) {
    if (cat.assigned) {
      await removeCategoryFromLocation(id, cat.id);
    } else {
      await assignCategoryToLocation(id, { category_id: cat.id });
    }
    setCategories(prev =>
      prev.map(c => c.id === cat.id ? { ...c, assigned: !c.assigned } : c)
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Location' : 'Add New Location'}</h1>
        <button onClick={() => navigate('/admin/locations')} className="btn btn-secondary">← Back</button>
      </div>

      {/* Location details form */}
      <form onSubmit={handleSubmit} className="admin-form" style={{ marginBottom: '2rem' }}>
        <div className="form-group">
          <label>Location Name <span className="required">*</span></label>
          <input name="name" className="form-input" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Slug <span className="required">*</span> <small>(used in URL e.g. bangalore)</small></label>
          <input name="slug" className="form-input" value={form.slug} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input name="description" className="form-input" value={form.description} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {isEdit ? (saved ? '✓ Saved!' : 'Update Location') : 'Create Location'}
          </button>
        </div>
      </form>

      {/* Category assignment — only shown when editing */}
      {isEdit && (
        <div className="admin-section">
          <h2 className="section-title">Categories for this Location</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Toggle which categories are available at this location.
          </p>
          <table className="data-table">
            <thead>
              <tr><th>Category</th><th>Slug</th><th>Assigned</th></tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td><code>{cat.slug}</code></td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={cat.assigned}
                        onChange={() => toggleCategory(cat)}
                        style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                      />
                      {cat.assigned
                        ? <span style={{ color: 'var(--success)', fontWeight: '600' }}>Assigned</span>
                        : <span style={{ color: 'var(--muted)' }}>Not assigned</span>}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}