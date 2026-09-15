// Firestore access layer for clubs, memberships, and announcements.
// Kept separate from components so the data model can change without
// touching the UI. See /firestore.rules for the matching security rules.
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

const clubsCol = collection(db, 'clubs');

export function listenToClubs(callback) {
  const q = query(clubsCol, where('status', '==', 'active'), orderBy('memberCount', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getClub(clubId) {
  const snap = await getDoc(doc(db, 'clubs', clubId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createClub({ name, description, category, meetingTimes, contactInfo, requiresApproval, creatorUid }) {
  const clubRef = await addDoc(clubsCol, {
    name,
    description,
    category: category || 'General',
    meetingTimes: meetingTimes || '',
    contactInfo: contactInfo || '',
    requiresApproval: !!requiresApproval,
    status: 'active',
    memberCount: 1,
    chatEnabled: true,
    createdAt: serverTimestamp()
  });
  // Creator becomes the first officer (president) of the club.
  await setDoc(doc(db, 'clubs', clubRef.id, 'members', creatorUid), {
    uid: creatorUid,
    role: 'president',
    status: 'approved',
    joinedAt: serverTimestamp()
  });
  return clubRef.id;
}

export function listenToMembers(clubId, callback) {
  const membersCol = collection(db, 'clubs', clubId, 'members');
  return onSnapshot(membersCol, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  });
}

export async function getMembership(clubId, uid) {
  const snap = await getDoc(doc(db, 'clubs', clubId, 'members', uid));
  return snap.exists() ? snap.data() : null;
}

// Joins immediately if the club doesn't require approval, otherwise
// creates a pending membership an officer must approve.
export async function joinClub(clubId, uid, requiresApproval) {
  await setDoc(doc(db, 'clubs', clubId, 'members', uid), {
    uid,
    role: 'member',
    status: requiresApproval ? 'pending' : 'approved',
    joinedAt: serverTimestamp()
  });
  if (!requiresApproval) {
    await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(1) });
  }
}

export async function approveMembership(clubId, uid) {
  await updateDoc(doc(db, 'clubs', clubId, 'members', uid), { status: 'approved' });
  await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(1) });
}

export async function leaveClub(clubId, uid, wasApproved) {
  await deleteDoc(doc(db, 'clubs', clubId, 'members', uid));
  if (wasApproved) {
    await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(-1) });
  }
}

// Hands club leadership to another member, per Sprint 6's "assign or
// promote successors" use case. Officer titles are club-scoped: this
// only ever writes to this club's members subcollection.
export async function promoteToOfficer(clubId, uid, title = 'officer') {
  await updateDoc(doc(db, 'clubs', clubId, 'members', uid), { role: title });
}

export async function updateClub(clubId, updates) {
  await updateDoc(doc(db, 'clubs', clubId), updates);
}

export function listenToAnnouncements(clubId, callback) {
  const q = query(
    collection(db, 'clubs', clubId, 'announcements'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function postAnnouncement(clubId, authorId, title, body) {
  await addDoc(collection(db, 'clubs', clubId, 'announcements'), {
    title,
    body,
    authorId,
    createdAt: serverTimestamp()
  });
}

export async function getAllClubsOnce() {
  const snap = await getDocs(clubsCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
