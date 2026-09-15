import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  getClub,
  listenToMembers,
  getMembership,
  joinClub,
  leaveClub,
  approveMembership,
  promoteToOfficer,
  updateClub,
  listenToAnnouncements,
  postAnnouncement
} from '../services/clubs';
import { listenToClubEvents, createEvent, rsvpToEvent } from '../services/events';

const OFFICER_ROLES = ['president', 'officer'];

export default function ClubDetail() {
  const { clubId } = useParams();
  const { currentUser, profile } = useAuth();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', dateTime: '' });
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState(null);
  const [memberNames, setMemberNames] = useState({});

  useEffect(() => {
    getClub(clubId).then((c) => { setClub(c); setInfoForm(c); });
  }, [clubId]);

  useEffect(() => {
    const unsub = listenToMembers(clubId, setMembers);
    return unsub;
  }, [clubId]);

  useEffect(() => {
    const unsub = listenToAnnouncements(clubId, setAnnouncements);
    return unsub;
  }, [clubId]);

  useEffect(() => {
    const unsub = listenToClubEvents(clubId, setEvents);
    return unsub;
  }, [clubId]);

  useEffect(() => {
    if (!currentUser) return;
    getMembership(clubId, currentUser.uid).then(setMyMembership);
  }, [clubId, currentUser, members]);

  // Members subcollection only stores uid + role, so this resolves
  // display names from the top-level users collection. Fine at club
  // scale; if member lists grow large, denormalize name onto the
  // membership doc when it's created instead.
  useEffect(() => {
    const missing = members.filter((m) => !(m.uid in memberNames));
    if (missing.length === 0) return;
    missing.forEach(async (m) => {
      const snap = await getDoc(doc(db, 'users', m.uid));
      setMemberNames((prev) => ({ ...prev, [m.uid]: snap.exists() ? snap.data().name : m.uid }));
    });
  }, [members]);

  const isOfficer = myMembership && OFFICER_ROLES.includes(myMembership.role);
  const isApprovedMember = myMembership?.status === 'approved';
  const pendingMembers = members.filter((m) => m.status === 'pending');

  async function handleJoinLeave() {
    if (myMembership) {
      await leaveClub(clubId, currentUser.uid, myMembership.status === 'approved');
      setMyMembership(null);
    } else {
      await joinClub(clubId, currentUser.uid, club.requiresApproval);
      setMyMembership(await getMembership(clubId, currentUser.uid));
    }
  }

  async function handlePostAnnouncement(e) {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.body) return;
    await postAnnouncement(clubId, currentUser.uid, announcementForm.title, announcementForm.body);
    setAnnouncementForm({ title: '', body: '' });
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!eventForm.title || !eventForm.dateTime) return;
    await createEvent({ clubId, createdBy: currentUser.uid, ...eventForm });
    setEventForm({ title: '', description: '', location: '', dateTime: '' });
  }

  async function handleSaveInfo(e) {
    e.preventDefault();
    await updateClub(clubId, {
      description: infoForm.description,
      meetingTimes: infoForm.meetingTimes,
      contactInfo: infoForm.contactInfo,
      requiresApproval: infoForm.requiresApproval
    });
    setClub((c) => ({ ...c, ...infoForm }));
    setEditingInfo(false);
  }

  if (!club) return <div className="page">Loading club...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{club.name}</h1>
          <p className="club-card-category">{club.category} &middot; {club.memberCount} members</p>
        </div>
        {isApprovedMember || myMembership?.status === 'pending' ? (
          <button className="secondary" onClick={handleJoinLeave}>
            {myMembership.status === 'pending' ? 'Cancel request' : 'Leave club'}
          </button>
        ) : (
          <button onClick={handleJoinLeave}>{club.requiresApproval ? 'Request to join' : 'Join club'}</button>
        )}
      </div>

      <section className="detail-section">
        <h2>About</h2>
        {!editingInfo ? (
          <>
            <p>{club.description}</p>
            {club.meetingTimes && <p><strong>Meets:</strong> {club.meetingTimes}</p>}
            {club.contactInfo && <p><strong>Contact:</strong> {club.contactInfo}</p>}
            {isOfficer && <button className="link-button" onClick={() => setEditingInfo(true)}>Edit club info</button>}
          </>
        ) : (
          <form onSubmit={handleSaveInfo} className="inline-form">
            <label>Description
              <textarea value={infoForm.description} onChange={(e) => setInfoForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label>Meeting times
              <input value={infoForm.meetingTimes} onChange={(e) => setInfoForm((f) => ({ ...f, meetingTimes: e.target.value }))} />
            </label>
            <label>Contact info
              <input value={infoForm.contactInfo} onChange={(e) => setInfoForm((f) => ({ ...f, contactInfo: e.target.value }))} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={infoForm.requiresApproval} onChange={(e) => setInfoForm((f) => ({ ...f, requiresApproval: e.target.checked }))} />
              Require officer approval to join
            </label>
            <div className="form-actions">
              <button type="submit">Save</button>
              <button type="button" className="secondary" onClick={() => setEditingInfo(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="detail-section">
        <h2>Announcements</h2>
        {isOfficer && (
          <form onSubmit={handlePostAnnouncement} className="inline-form">
            <input
              placeholder="Announcement title"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              placeholder="What's happening with the club?"
              value={announcementForm.body}
              onChange={(e) => setAnnouncementForm((f) => ({ ...f, body: e.target.value }))}
            />
            <button type="submit">Post announcement</button>
          </form>
        )}
        {announcements.length === 0 && <p className="empty-state">No announcements yet.</p>}
        {announcements.map((a) => (
          <div key={a.id} className="announcement">
            <h3>{a.title}</h3>
            <p>{a.body}</p>
          </div>
        ))}
      </section>

      <section className="detail-section">
        <h2>Events</h2>
        {isOfficer && (
          <form onSubmit={handleCreateEvent} className="inline-form">
            <input
              placeholder="Event title"
              value={eventForm.title}
              onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              type="datetime-local"
              value={eventForm.dateTime}
              onChange={(e) => setEventForm((f) => ({ ...f, dateTime: e.target.value }))}
            />
            <input
              placeholder="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
            />
            <textarea
              placeholder="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
            />
            <button type="submit">Create event</button>
          </form>
        )}
        {events.length === 0 && <p className="empty-state">No upcoming events.</p>}
        {events.map((ev) => (
          <div key={ev.id} className="event-card">
            <h3>{ev.title}</h3>
            <p>{new Date(ev.dateTime.seconds ? ev.dateTime.seconds * 1000 : ev.dateTime).toLocaleString()}</p>
            {ev.location && <p>{ev.location}</p>}
            {isApprovedMember && (
              <button className="secondary" onClick={() => rsvpToEvent(ev.id, currentUser.uid)}>RSVP</button>
            )}
          </div>
        ))}
      </section>

      <section className="detail-section">
        <h2>Members ({members.filter((m) => m.status === 'approved').length})</h2>
        {isOfficer && pendingMembers.length > 0 && (
          <div>
            <h3>Pending requests</h3>
            {pendingMembers.map((m) => (
              <div key={m.uid} className="member-row">
                <span>{memberNames[m.uid] || m.uid}</span>
                <button onClick={() => approveMembership(clubId, m.uid)}>Approve</button>
              </div>
            ))}
          </div>
        )}
        {members.filter((m) => m.status === 'approved').map((m) => (
          <div key={m.uid} className="member-row">
            <span>{m.uid === currentUser.uid ? `${profile?.name} (you)` : (memberNames[m.uid] || m.uid)}</span>
            <span className="badge">{m.role}</span>
            {isOfficer && m.role === 'member' && (
              <button className="link-button" onClick={() => promoteToOfficer(clubId, m.uid)}>Promote to officer</button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
