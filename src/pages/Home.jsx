import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/api';

const icons = { Cafeteria: '🍳', Washroom: '🚿', Desk: '🖥️', Reception: '🏢' };

export default function Home() {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then(r => setCategories(r.data));
  }, []);

  return (
    <div>
      <div className="hero">
        <h1>Inspection Forms</h1>
        <p className="subtitle">Select an area to begin your inspection</p>
      </div>
      <div className="category-grid">
        {categories.map(c => (
          <div key={c.id} className="category-card"
               onClick={() => navigate(`/form/${c.slug}`)}>
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