import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitForm, updateScheduleStatus } from '../api/api';

export default function Images() {
  const { slug }        = useParams();
  const navigate        = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const answers = JSON.parse(sessionStorage.getItem(`answers_${slug}`) || '{}');
    const params     = new URLSearchParams(window.location.search);
    const locationSlug = params.get('location');
    const scheduleId   = params.get('schedule_id');
    const fd = new FormData();
    fd.append('answers', JSON.stringify(answers));
    if (locationSlug) fd.append('locationSlug', locationSlug);
    if (scheduleId)   fd.append('schedule_id', scheduleId);
    files.forEach(f => fd.append('images', f));

    const { data } = await submitForm(slug, fd);

    if (scheduleId) {
      if (data.submissionUuid) {
        localStorage.setItem(`schedule_submission_${scheduleId}`, data.submissionUuid);
      }
      try {
        await updateScheduleStatus(scheduleId, 'completed', data.submissionUuid);
      } catch (err) {
        console.error('Failed to update schedule after submission:', err);
      }
    }

    sessionStorage.removeItem(`answers_${slug}`);
    navigate(`/submissions/${data.submissionUuid}/thankyou`);
  }

  return (
    <div>
      <h1>Upload Images</h1>
      <form onSubmit={handleSubmit}>
        <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
          <div className="upload-icon">📷</div>
          <p>Click or drag images here</p>
          <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each</p>
          <input id="fileInput" type="file" className="file-input" multiple accept="image/*"
                 onChange={e => handleFiles(e.target.files)} />
        </div>
        {previews.length > 0 && (
          <div className="preview-grid">
            {previews.map((src, i) => (
              <div key={i} className="preview-item">
                <img src={src} alt={files[i].name} />
                <span>{files[i].name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-success">Submit Inspection</button>
        </div>
      </form>
    </div>
  );
}