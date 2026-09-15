import { Link } from 'react-router-dom';

export default function ClubCard({ club }) {
  return (
    <Link to={`/clubs/${club.id}`} className="club-card">
      <div className="club-card-header">
        <h3>{club.name}</h3>
        <span className="club-card-count">{club.memberCount || 0} members</span>
      </div>
      <span className="category-dot" style={{ color: 'var(--forest)' }}>{club.category}</span>
      <p className="club-card-desc">{club.description}</p>
      {club.requiresApproval && <span className="badge">Requires approval to join</span>}
    </Link>
  );
}
