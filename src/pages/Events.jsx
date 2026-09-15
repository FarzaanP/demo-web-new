import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { listenToUpcomingEvents } from '../services/events';

export default function Events() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [myClubIds, setMyClubIds] = useState(new Set());

  useEffect(() => {
    const unsub = listenToUpcomingEvents(setEvents);
    return unsub;
  }, []);

  // Same "which clubs am I approved in" lookup used on the Home page,
  // so this page can filter down to just those clubs' events.
  useEffect(() => {
    if (!currentUser) return;
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

  const myEvents = events.filter((ev) => myClubIds.has(ev.clubId));

  return (
    <div className="page">
      <h1>Upcoming events</h1>
      <p className="page-subtitle">Events from clubs you've joined. Join more clubs to see their events here.</p>
      {myEvents.length === 0 && (
        <p className="empty-state">No upcoming events from your clubs yet.</p>
      )}
      {myEvents.map((ev) => (
        <Link key={ev.id} to={`/clubs/${ev.clubId}`} className="event-card">
          <h3>{ev.title}</h3>
          <p>{new Date(ev.dateTime.seconds * 1000).toLocaleString()}</p>
          {ev.location && <p>{ev.location}</p>}
        </Link>
      ))}
    </div>
  );
}
