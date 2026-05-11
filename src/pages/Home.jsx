import { useEffect, useState } from 'react';
import { getLocationCategories, getCategories, getMySubmittedForms } from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = { Cafeteria: '🍳', Washroom: '🚿', Desk: '🖥️', Reception: '🏢', wellness: '🧘', gaming: '🎮' };

export default function Home() {
  const { locationSlug }                 = useParams();
  const { isGlobalAdmin, location_slug } = useAuth();
  const [categories, setCategories]      = useState([]);
  const [submittedSlugs, setSubmittedSlugs] = useState(new Set());
  const navigate                         = useNavigate();

  const effectiveSlug = locationSlug || location_slug;

  useEffect(() => {
    if (effectiveSlug) {
      getLocationCategories(effectiveSlug).then(r => setCategories(Array.isArray(r.data) ? r.data : []));
      // Fetch which forms this user has already submitted at this location
      getMySubmittedForms(effectiveSlug)
        .then(r => {
          const slugs = Array.isArray(r.data) ? r.data.map(s => s.slug) : [];
          setSubmittedSlugs(new Set(slugs));
        })
        .catch(() => {});
    } else if (isGlobalAdmin) {
      getCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : []));
    }
  }, [effectiveSlug, isGlobalAdmin]);

  return (
    <div>
      <div className="sticky-header">
        <nav className="breadcrumb">
          {isGlobalAdmin && (
            <>
              <span className="breadcrumb-link" onClick={() => navigate('/')}>Locations</span>
              <span className="breadcrumb-sep">›</span>
            </>
          )}
          <span className="breadcrumb-current">Select Category</span>
        </nav>
      </div>
      <div className="hero">
        <h1>Select Category</h1>
        <p className="subtitle">Choose an area to inspect</p>
      </div>
      <div className="category-grid">
        {categories.map(c => {
          const done = submittedSlugs.has(c.slug);
          return (
            <div
              key={c.id}
              className="category-card"
              style={{ position: 'relative' }}
              onClick={() => navigate(effectiveSlug ? `/form/${c.slug}?location=${effectiveSlug}` : `/form/${c.slug}`)}
            >
              {done && (
                <span style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.75rem',
                  background: '#16a34a',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  letterSpacing: '0.02em',
                }}>
                  Submitted
                </span>
              )}
              <div className="cat-icon">{icons[c.slug] || '📋'}</div>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
