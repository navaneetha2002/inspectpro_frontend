import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLocations, createLocation, updateLocation,
  getLocationCategoriesAssigned, assignCategoryToLocation, removeCategoryFromLocation,
  getCategories, createCategory
} from '../../api/api';

export default function LocationEdit() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEdit       = Boolean(id);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchData() {
      let cats = [];
      if (isEdit) {
        const r = await getLocations();
        const loc = r.data.find(l => l.id === parseInt(id));
        if (loc) setForm({ name: loc.name, slug: loc.slug, description: loc.description || '' });
        const catRes = await getLocationCategoriesAssigned(id);
        cats = catRes.data;
      } else {
        const catRes = await getCategories();
        cats = catRes.data.map(c => ({ ...c, assigned: false }));
      }
      setCategories(cats);
    }
    fetchData();
  }, [id, isEdit]);

  function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'name') setForm(prev => ({ ...prev, name: value, slug: slugify(value) }));
    else setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) await updateLocation(id, form);
    else {
      const { data } = await createLocation(form);
      for (const cat of categories) {
        if (cat.assigned) await assignCategoryToLocation(data.id, { category_id: cat.id });
      }
      navigate(`/admin/locations/${data.id}/edit`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleCategory(cat) {
    if (isEdit) {
      if (cat.assigned) await removeCategoryFromLocation(id, cat.id);
      else await assignCategoryToLocation(id, { category_id: cat.id });
    }
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, assigned: !c.assigned } : c));
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const { data } = await createCategory({ name: newCategory, slug: slugify(newCategory) });
    setCategories(prev => [...prev, { ...data, assigned: true }]);
    setNewCategory('');
  }

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item" role="button" onClick={() => navigate('/admin/locations')}>
              Locations Admin
            </li>
            <li className="breadcrumb-item active">
              {isEdit ? 'Edit Location' : 'Add New Location'}
            </li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">{isEdit ? 'Edit Location' : 'Add New Location'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card card-body mb-4">
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Location Name <span className="text-danger">*</span>
          </label>
          <input name="name" className="form-control" value={form.name}
            onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Description</label>
          <input name="description" className="form-control" value={form.description}
            onChange={handleChange} />
        </div>
        <div className="d-flex gap-3 mt-2">
          <button type="submit" className="btn btn-primary">
            {isEdit ? (saved ? '✓ Saved!' : 'Update Location') : 'Create Location'}
          </button>
        </div>
      </form>

      <div className="mb-4">
        <h2 className="fs-6 fw-bold text-primary border-bottom border-2 border-primary pb-1 mb-3">
          Categories for this Location
        </h2>
        <p className="text-muted small mb-3">
          Toggle which categories are available at this location. You can also add a new category below.
        </p>

        <form onSubmit={handleAddCategory} className="d-flex gap-2 mb-3">
          <input type="text" className="form-control" style={{ maxWidth: '260px' }}
            placeholder="Add new category..."
            value={newCategory} onChange={e => setNewCategory(e.target.value)} />
          <button type="submit" className="btn btn-secondary">Add Category</button>
        </form>

        <div className="table-responsive">
          <table className="table table-bordered table-hover table-sm">
            <thead className="table-light">
              <tr><th>Category</th><th>Slug</th><th>Assigned</th></tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td><code>{cat.slug}</code></td>
                  <td>
                    <div className="form-check d-flex align-items-center gap-2 mb-0">
                      <input type="checkbox" className="form-check-input"
                        checked={cat.assigned} onChange={() => toggleCategory(cat)} />
                      <label className="form-check-label">
                        {cat.assigned
                          ? <span className="text-success fw-semibold">Assigned</span>
                          : <span className="text-muted">Not assigned</span>}
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

