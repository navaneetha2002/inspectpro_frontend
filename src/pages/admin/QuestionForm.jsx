import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, getAllQuestions, getCategories, createQuestion, updateQuestion, getLocationCategoriesAssigned, getLocations } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export default function QuestionForm() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEdit       = Boolean(id);
  const { role, location_id, location_slug, user } = useAuth();
  const isLocalAdmin = role === 'local_admin';

  const [categories, setCategories]     = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [form, setForm] = useState({
    category_id: '', question_text: '', field_type: '',
    options_raw: '', order_index: 0,
    conditional_on_question_id: '', conditional_on_value: '', is_required: true,
  });

  useEffect(() => {
    const loadCategories = async () => {
      const catsData = (await getCategories()).data;
      const allCats = Array.isArray(catsData) ? catsData : [];
      if (!isLocalAdmin) { setCategories(allCats); return; }

      let locId = location_id;
      if (!locId) {
        const locsData = (await getLocations()).data;
        const locs = Array.isArray(locsData) ? locsData : [];
        const found = locs.find(l => l.slug === location_slug || l.name === user?.location);
        locId = found?.id;
      }
      if (!locId) { setCategories([]); return; }

      const assignedData = (await getLocationCategoriesAssigned(locId)).data;
      const assignedNames = new Set(
        (Array.isArray(assignedData) ? assignedData : [])
          .filter(c => c.assigned).map(c => c.name)
      );
      setCategories(allCats.filter(c => assignedNames.has(c.name)));
    };
    loadCategories().catch(() => {});
    getAllQuestions().then(r => setAllQuestions(r.data));
    if (isEdit && id) {
      getQuestion(id).then(r => {
        const q = r.data;
        let options_raw = '';
        if (q.options) { try { options_raw = JSON.parse(q.options).join('\n'); } catch {} }
        setForm({
          category_id: q.category_id, question_text: q.question_text,
          field_type: q.field_type, options_raw, order_index: q.order_index || 0,
          conditional_on_question_id: q.conditional_on_question_id || '',
          conditional_on_value: q.conditional_on_value || '',
          is_required: q.is_required ?? true,
        });
      });
    }
  }, [id, user]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) await updateQuestion(id, form);
    else await createQuestion(form);
    navigate('/admin/questions');
  }

  const showOptions = form.field_type === 'select' || form.field_type === 'radio';

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item" role="button" onClick={() => navigate('/admin/questions')}>
              Questions Admin
            </li>
            <li className="breadcrumb-item active">
              {isEdit ? 'Edit Question' : 'Add New Question'}
            </li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">{isEdit ? 'Edit Question' : 'Add New Question'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card card-body">

        <div className="mb-3">
          <label className="form-label fw-semibold">
            Category <span className="text-danger">*</span>
          </label>
          <select name="category_id" className="form-select"
            value={form.category_id} onChange={handleChange} required>
            <option value="">— Select Category —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            Question Text <span className="text-danger">*</span>
          </label>
          <input name="question_text" className="form-control"
            value={form.question_text} onChange={handleChange} required />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            Field Type <span className="text-danger">*</span>
          </label>
          <select name="field_type" className="form-select"
            value={form.field_type} onChange={handleChange} required>
            <option value="">— Select Type —</option>
            {['text', 'textarea', 'number', 'yesno', 'select', 'radio'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {showOptions && (
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Options <small className="text-muted fw-normal">(one per line)</small>
            </label>
            <textarea name="options_raw" className="form-control" rows={4}
              placeholder="Option A&#10;Option B&#10;Option C"
              value={form.options_raw} onChange={handleChange} />
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Order</label>
            <input type="number" name="order_index" className="form-control"
              min="0" value={form.order_index} onChange={handleChange} />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Show When Question</label>
            <select name="conditional_on_question_id" className="form-select"
              value={form.conditional_on_question_id} onChange={handleChange}>
              <option value="">— Always Show —</option>
              {allQuestions.map(q => (
                <option key={q.id} value={q.id}>{q.question_text}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Equals Value</label>
            <input name="conditional_on_value" className="form-control"
              value={form.conditional_on_value} onChange={handleChange}
              placeholder="e.g. Yes, No" />
          </div>
        </div>

        <div className="mb-3">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="is_required"
              name="is_required" checked={form.is_required} onChange={handleChange} />
            <label className="form-check-label fw-semibold" htmlFor="is_required">
              Required
            </label>
          </div>
        </div>

        <div className="d-flex gap-3 mt-2">
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Update Question' : 'Create Question'}
          </button>
          <button type="button" onClick={() => navigate('/admin/questions')} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

