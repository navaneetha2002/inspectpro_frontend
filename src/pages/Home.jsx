import { useEffect, useState } from 'react';
import { getLocationCategories, getCategories } from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = { Cafeteria: '🍳', Washroom: '🚿', Desk: '🖥️', Reception: '🏢', wellness: '🧘', gaming: '🎮' };

export default function Home() {
  const { locationSlug }                 = useParams();
  const { isGlobalAdmin, location_slug } = useAuth();
  const [categories, setCategories] = useState([]);
  const navigate                    = useNavigate();

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
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            {isGlobalAdmin && (
              <li className="breadcrumb-item" role="button" onClick={() => navigate('/')}>
                Locations
              </li>
            )}
            <li className="breadcrumb-item active">Select Category</li>
          </ol>
        </nav>
      </div>

      <div className="hero">
        <h1>Select Category</h1>
        <p className="subtitle">Choose an area to inspect</p>
      </div>

      <div className="category-grid">
        {categories.map(c => (
          <div
            key={c.id}
            className="category-card"
            onClick={() => navigate(effectiveSlug ? `/form/${c.slug}?location=${effectiveSlug}` : `/form/${c.slug}`)}
          >
            <div className="cat-icon">{icons[c.slug] || '📋'}</div>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

