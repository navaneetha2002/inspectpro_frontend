import { useEffect, useState } from 'react';
import { getLocationCategories } from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';

const icons = { Cafeteria: '🍳', Washroom: '🚿', Desk: '🖥️', Reception: '🏢',  wellness: '🧘', gaming: '🎮'};

export default function Home() {
  const { locationSlug }      = useParams();
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
 
 useEffect(() => {
    getLocationCategories(locationSlug).then(r => setCategories(r.data));
  }, [locationSlug]);

    return (
    <div>
      <div className="hero">
        <div className="breadcrumb" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <a href="/" style={{ color: 'var(--primary)' }}>← Back to Locations</a>
        </div>
        <h1>Select Category</h1>
        <p className="subtitle">Choose an area to inspect</p>
      </div>
      <div className="category-grid">
        {categories.map(c => (
          <div key={c.id} className="category-card"
               onClick={() => navigate(`/form/${c.slug}?location=${locationSlug}`)}>
            <div className="cat-icon">{icons[c.slug] || '📋'}</div>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
            <span className="btn-start">Start Inspection →</span>
          </div>
        ))}
      </div>
    </div>
  );
}