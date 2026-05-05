import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLocations, createLocation, updateLocation,
<<<<<<< HEAD
  getLocationCategoriesAssigned, assignCategoryToLocation, removeCategoryFromLocation,createCategory
=======
  getLocationCategoriesAssigned, assignCategoryToLocation, removeCategoryFromLocation,
  getCategories, createCategory
>>>>>>> 7365f062ffd6e891608876ef5c405753cb9b4845
} from '../../api/api';

export default function LocationEdit() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEdit       = Boolean(id);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    async function fetchData() {
      let cats = [];
      if (isEdit) {
        // Load location details
        const r = await getLocations();
        const loc = r.data.find(l => l.id === parseInt(id));
        if (loc) setForm({ name: loc.name, slug: loc.slug, description: loc.description || '' });
        // Load categories with assigned flag
        const catRes = await getLocationCategoriesAssigned(id);
        cats = catRes.data;
      } else {
        // For create, show all categories (none assigned)
        const catRes = await getCategories();
        cats = catRes.data.map(c => ({ ...c, assigned: false }));
      }
      setCategories(cats);
    }
    fetchData();
  }, [id, isEdit]);

  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'name') {
      setForm(prev => ({ ...prev, name: value, slug: slugify(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) await updateLocation(id, form);
    else {
      const { data } = await createLocation(form);
      // Assign categories to new location
      for (const cat of categories) {
        if (cat.assigned) {
          await assignCategoryToLocation(data.id, { category_id: cat.id });
        }
      }
      navigate(`/admin/locations/${data.id}/edit`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleCategory(cat) {
    if (isEdit) {
      if (cat.assigned) {
        await removeCategoryFromLocation(id, cat.id);
      } else {
        await assignCategoryToLocation(id, { category_id: cat.id });
      }
    }
    setCategories(prev =>
      prev.map(c => c.id === cat.id ? { ...c, assigned: !c.assigned } : c)
    );
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    // Create category
    const { data } = await createCategory({ name: newCategory, slug: slugify(newCategory) });
    setCategories(prev => [...prev, { ...data, assigned: true }]);
    setNewCategory('');
    setAddingCategory(false);
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
        {/* Slug field removed from user view */}
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

      {/* Category assignment — shown for both create and edit */}
      <div className="admin-section">
        <h2 className="section-title">Categories for this Location</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Toggle which categories are available at this location. You can also add a new category below.
        </p>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Add new category..."
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={{ width: '220px' }}
          />
          <button type="submit" className="btn btn-secondary">Add Category</button>
        </form>
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
    </div>
  );
}