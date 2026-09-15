import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { currentUser, profile } = useAuth();
  const [bio, setBio] = useState(profile?.bio || '');
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    await updateDoc(doc(db, 'users', currentUser.uid), { bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="page narrow">
      <h1>{profile?.name}</h1>
      <p className="club-card-category">{profile?.role} &middot; {profile?.ramId}</p>
      <p>{profile?.email}</p>
      <form onSubmit={handleSave} className="inline-form">
        <label>Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell other members a bit about yourself" />
        </label>
        <button type="submit">Save</button>
        {saved && <span className="badge">Saved</span>}
      </form>
    </div>
  );
}
