import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocations } from '../api/api';

const icons = {
  bangalore: '🏙️',
  indore:    '🌆',
  sweden:    '🏔️',
};

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getLocations().then(r => setLocations(Array.isArray(r.data) ? r.data : []));
  }, []);

  return (
    <div>
      <div className="hero">
        <h1>Tarento Inspection</h1>
        <p className="subtitle">Select your office location to begin</p>
      </div>
      <div className="category-grid">
        {locations.map(l => (
          <div key={l.id} className="category-card"
               onClick={() => navigate(`/location/${l.slug}`)}>
            <div className="cat-icon">{icons[l.slug] || '🏢'}</div>
            <h2>{l.name}</h2>
            <p>{l.description}</p>

          </div>
        ))}
      </div>
    </div>
  );
}

