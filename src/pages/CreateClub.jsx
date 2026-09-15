import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createClub } from '../services/clubs';

export default function CreateClub() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', category: '', meetingTimes: '', contactInfo: '', requiresApproval: false
  });
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const clubId = await createClub({ ...form, creatorUid: currentUser.uid });
    navigate(`/clubs/${clubId}`);
  }

  return (
    <div className="page narrow">
      <h1>Start a new club</h1>
      <p className="page-subtitle">
        You'll be the club's first officer, per your team's use case for club officers &mdash; you
        can promote members to officer roles once the club is live. In production this would route
        through Office of Student Affairs for approval; that workflow isn't wired up in this scaffold.
      </p>
      <form onSubmit={handleSubmit} className="inline-form">
        <label>Club name
          <input value={form.name} onChange={update('name')} required />
        </label>
        <label>Category
          <input value={form.category} onChange={update('category')} placeholder="e.g. Academic, Cultural, Sports" />
        </label>
        <label>Description
          <textarea value={form.description} onChange={update('description')} required />
        </label>
        <label>Meeting times
          <input value={form.meetingTimes} onChange={update('meetingTimes')} placeholder="e.g. Thursdays 5pm, Room 201" />
        </label>
        <label>Contact info
          <input value={form.contactInfo} onChange={update('contactInfo')} />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={form.requiresApproval} onChange={update('requiresApproval')} />
          Require officer approval for new members
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create club'}</button>
      </form>
    </div>
  );
}
