import { useEffect, useState } from 'react';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { listenToClubs } from '../services/clubs';
import { useAuth } from '../context/AuthContext';
import ClubCard from '../components/ClubCard';

export default function Home() {
  const { currentUser } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [myClubIds, setMyClubIds] = useState(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = listenToClubs(setClubs);
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Collection group query across every club's "members" subcollection,
    // filtered to this user, so we can badge "my clubs" without denormalizing.
    const q = query(
      collectionGroup(db, 'members'),
      where('uid', '==', currentUser.uid),
      where('status', '==', 'approved')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyClubIds(new Set(snap.docs.map((d) => d.ref.parent.parent.id)));
    });
    return unsub;
  }, [currentUser]);

  const filtered = clubs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const myClubs = filtered.filter((c) => myClubIds.has(c.id));
  const otherClubs = filtered.filter((c) => !myClubIds.has(c.id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clubs</h1>
        <input
          className="search-input"
          placeholder="Search clubs by name or category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {myClubs.length > 0 && (
        <section>
          <h2>My clubs</h2>
          <div className="club-grid">
            {myClubs.map((c) => <ClubCard key={c.id} club={c} />)}
          </div>
        </section>
      )}

      <section>
        <h2>{myClubs.length > 0 ? 'Browse more clubs' : 'Browse clubs'}</h2>
        {otherClubs.length === 0 && <p className="empty-state">No clubs match yet. Try a different search.</p>}
        <div className="club-grid">
          {otherClubs.map((c) => <ClubCard key={c.id} club={c} />)}
        </div>
      </section>
    </div>
  );
}
