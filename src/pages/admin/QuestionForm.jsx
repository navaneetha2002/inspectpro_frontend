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

  const [categories, setCategories]   = useState([]);
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
      const assignedNames = new Set((Array.isArray(assignedData) ? assignedData : []).map(c => c.name));
      setCategories(allCats.filter(c => assignedNames.has(c.name)));
    };
    loadCategories().catch(() => {});
    getAllQuestions().then(r => setAllQuestions(r.data));
    if (isEdit && id) {
      getQuestion(id).then(r => {
        const q = r.data;
        let options_raw = '';
        if (q.options) {
          try { options_raw = JSON.parse(q.options).join('\n'); } catch {}
        }
       setForm({
  category_id: q.category_id,
  question_text: q.question_text,
  field_type: q.field_type,
  options_raw,
  order_index: q.order_index || 0,
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
    const payload = {
    ...form,
    options_raw: form.options_raw // keep as string
  };
    if (isEdit) await updateQuestion(id, form);
    else await createQuestion(form);
    navigate('/admin/questions');
  }

  const showOptions = form.field_type === 'select' || form.field_type === 'radio';

  return (
  <div>
    <div className="sticky-header">
      <nav className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/admin/questions')}>Questions Admin</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{isEdit ? 'Edit Question' : 'Add New Question'}</span>
      </nav>
      <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
        <h1>{isEdit ? 'Edit Question' : 'Add New Question'}</h1>
      </div>
    </div>
    <form onSubmit={handleSubmit} className="admin-form">

      {/* Category */}
      <div className="form-group">
        <label>Category <span className="required">*</span></label>
        <select
          name="category_id"
          className="form-input"
          value={form.category_id}
          onChange={handleChange}
          required
        >
          <option value="">— Select Category —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Question Text */}
      <div className="form-group">
        <label>Question Text <span className="required">*</span></label>
        <input
          name="question_text"
          className="form-input"
          value={form.question_text}
          onChange={handleChange}
          required
        />
      </div>

      {/* Field Type */}
      <div className="form-group">
        <label>Field Type <span className="required">*</span></label>
        <select name="field_type" className="form-input" value={form.field_type} onChange={handleChange} required>
          <option value="">— Select Type —</option>
          {['text', 'textarea', 'number', 'yesno', 'select', 'radio'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Options — only for select/radio */}
      {showOptions && (
        <div className="form-group">
          <label>Options <small>(one per line)</small></label>
          <textarea
            name="options_raw"
            className="form-input form-textarea"
            rows={4}
            placeholder="Option A&#10;Option B&#10;Option C"
            value={form.options_raw}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Order */}
      <div className="form-row">
        <div className="form-group">
          <label>Order</label>
          <input
            type="number"
            name="order_index"
            className="form-input"
            min="0"
            value={form.order_index}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Conditional logic */}
      <div className="form-row">
        <div className="form-group">
          <label>Show When Question</label>
          <select
            name="conditional_on_question_id"
            className="form-input"
            value={form.conditional_on_question_id}
            onChange={handleChange}
          >
            <option value="">— Always Show —</option>
            {allQuestions.map(q => (
              <option key={q.id} value={q.id}>{q.question_text}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Equals Value</label>
          <input
            name="conditional_on_value"
            className="form-input"
            value={form.conditional_on_value}
            onChange={handleChange}
            placeholder="e.g. Yes, No"
          />
        </div>
      </div>

      {/* Required */}
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="is_required"
            checked={form.is_required}
            onChange={handleChange}
          />
          Required
        </label>
      </div>

      <div className="form-actions">
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
