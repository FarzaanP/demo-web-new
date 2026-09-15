import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

const eventsCol = collection(db, 'events');

export function listenToUpcomingEvents(callback) {
  const q = query(eventsCol, where('dateTime', '>=', new Date()), orderBy('dateTime', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenToClubEvents(clubId, callback) {
  const q = query(eventsCol, where('clubId', '==', clubId), orderBy('dateTime', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createEvent({ clubId, title, description, location, dateTime, createdBy }) {
  await addDoc(eventsCol, {
    clubId,
    title,
    description: description || '',
    location: location || '',
    dateTime: new Date(dateTime),
    status: 'published',
    attendeeCount: 0,
    createdBy,
    createdAt: serverTimestamp()
  });
}

export async function rsvpToEvent(eventId, uid) {
  await setDoc(doc(db, 'events', eventId, 'attendees', uid), {
    uid,
    rsvpStatus: 'going',
    rsvpAt: serverTimestamp()
  });
}

export async function cancelRsvp(eventId, uid) {
  await deleteDoc(doc(db, 'events', eventId, 'attendees', uid));
}
