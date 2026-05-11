import { useEffect, useState } from 'react';
import { getLocationCategories, getCategories } from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = { Cafeteria: '🍳', Washroom: '🚿', Desk: '🖥️', Reception: '🏢', wellness: '🧘', gaming: '🎮' };

export default function Home() {
  const { locationSlug }                 = useParams();
  const { isGlobalAdmin, location_slug } = useAuth();
  const [categories, setCategories]      = useState([]);
  const navigate                         = useNavigate();

  const effectiveSlug = locationSlug || location_slug;

  useEffect(() => {
    if (effectiveSlug) {
      getLocationCategories(effectiveSlug).then(r => setCategories(Array.isArray(r.data) ? r.data : []));
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
        {categories.map(c => (
          <div key={c.id} className="category-card"
               onClick={() => navigate(effectiveSlug ? `/form/${c.slug}?location=${effectiveSlug}` : `/form/${c.slug}`)}>
            <div className="cat-icon">{icons[c.slug] || '📋'}</div>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}