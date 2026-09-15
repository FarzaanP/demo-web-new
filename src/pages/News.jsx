import { useEffect, useState } from 'react';
import Calendar from '../components/Calendar';
import LoadingSpinner from '../components/LoadingSpinner';
import { listenToNewsByCategory, listenToAcademicCalendar, getDigest } from '../services/news';

const ACADEMIC_CALENDAR_URL = 'https://www.farmingdale.edu/calendar/academic/index.shtml';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Firestore only gives us an error code + message, not something a
// non-dev teammate can act on - translate the couple of codes we
// actually expect to hit while this feature is still being wired up.
function describeNewsError(err) {
  if (!err) return null;
  if (err.code === 'failed-precondition') {
    return "Firestore needs a composite index for this query and doesn't have one yet. " +
      'Open the browser console (F12) - Firestore prints a direct "create index" link there, ' +
      'or run `firebase deploy --only firestore:indexes` from the repo (see README setup step 4).';
  }
  if (err.code === 'permission-denied') {
    return "Firestore rejected this read (permission-denied). Make sure you're signed in, and " +
      'that firestore.rules has been deployed (`firebase deploy --only firestore:rules`).';
  }
  return `Couldn't load news/calendar data (${err.code || 'unknown error'}): ${err.message}`;
}

function FeedItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="feed-item">
      <button type="button" className="feed-item-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="feed-item-title">{item.title}</span>
        <span className="feed-item-date">{item.date}</span>
      </button>
      {open && (
        <div className="feed-item-detail">
          <span className="overview-label">Overview</span>
          <p>{item.summary || 'No overview available for this story yet.'}</p>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="feed-item-link">
              Read the full article &#8599;
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// One bullet per thing happening that day - a calendar note, or a news
// item published that date. No AI call needed here: each bullet just
// shows the real scraped title/description directly, which is more
// trustworthy for "is there a governance meeting today" than a
// paraphrased summary would be.
function DayBullet({ color, title, detail, linkLabel, linkUrl }) {
  return (
    <div className="day-bullet">
      <span className="day-bullet-dot" style={{ background: color }} />
      <div>
        <div className="day-bullet-text"><strong>{title}</strong>{detail ? ` — ${detail}` : ''}</div>
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="day-bullet-link">
            {linkLabel} &#8599;
          </a>
        )}
      </div>
    </div>
  );
}

export default function News() {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [academic, setAcademic] = useState([]);
  const [clubsFairs, setClubsFairs] = useState([]);
  const [campus, setCampus] = useState([]);
  const [todayDigest, setTodayDigest] = useState(null);
  const [dayPanel, setDayPanel] = useState(null); // { label, calendarEvents, newsForDay }
  const [loadError, setLoadError] = useState(null);

  useEffect(
    () => listenToAcademicCalendar(setCalendarEvents, (err) => setLoadError(describeNewsError(err))),
    []
  );
  useEffect(
    () => listenToNewsByCategory('academic', setAcademic, (err) => setLoadError(describeNewsError(err))),
    []
  );
  useEffect(
    () => listenToNewsByCategory('clubs', setClubsFairs, (err) => setLoadError(describeNewsError(err))),
    []
  );
  useEffect(
    () => listenToNewsByCategory('campus', setCampus, (err) => setLoadError(describeNewsError(err))),
    []
  );

  useEffect(() => {
    getDigest(todayKey()).then(setTodayDigest);
  }, []);

  function handleDayClick(dateKey, dateLabel, eventsForDay) {
    const allNews = [...academic, ...clubsFairs, ...campus];
    const newsForDay = allNews.filter((n) => n.date === dateKey);
    setDayPanel({ label: dateLabel, calendarEvents: eventsForDay, newsForDay });
  }

  const dayHasNothing = dayPanel && dayPanel.calendarEvents.length === 0 && dayPanel.newsForDay.length === 0;

  return (
    <div className="page news-page">
      {loadError && (
        <div className="day-panel-empty" style={{ marginBottom: '1rem', border: '1px solid #c99a3c', padding: '0.75rem', borderRadius: '6px' }}>
          {loadError}
        </div>
      )}

      <div className="news-top-row">
        <div className="news-calendar-col">
          <div className="section-label">Calendar</div>
          <Calendar events={calendarEvents} onDayClick={handleDayClick} />
        </div>
        <div className="news-today-col">
          <div className="section-label">Today</div>
          <div className="today-card">
            <span className="overview-label">Overview</span>
            <p>
              {todayDigest?.text ||
                "Nothing scheduled today, and no notable headlines yet - check back later."}
            </p>
          </div>
        </div>
      </div>

      {dayPanel && (
        <div className="day-panel">
          <div className="day-panel-date">{dayPanel.label}</div>
          {dayHasNothing && (
            <p className="day-panel-empty">
              Nothing on the academic calendar for this day, and no news from this date.
            </p>
          )}
          {dayPanel.calendarEvents.map((ev, i) => (
            <DayBullet
              key={`cal-${i}`}
              color="#c99a3c"
              title={ev.title}
              detail={ev.description !== ev.title ? ev.description : ''}
              linkLabel="View academic calendar"
              linkUrl={ACADEMIC_CALENDAR_URL}
            />
          ))}
          {dayPanel.newsForDay.map((item) => (
            <DayBullet
              key={item.id}
              color={item.category === 'clubs' ? '#72243e' : item.category === 'campus' ? '#27500a' : '#0c447c'}
              title={item.title}
              linkLabel="Read full article"
              linkUrl={item.url}
            />
          ))}
        </div>
      )}

      <div className="section-label" style={{ marginTop: '1.2rem' }}>Academic news</div>
      <div className="feed-box feed-box-large">
        {academic.length === 0 && <LoadingSpinner label="Loading academic news..." />}
        {academic.map((item) => <FeedItem key={item.id} item={item} />)}
      </div>

      <div className="news-bottom-row">
        <div>
          <div className="section-label">Clubs &amp; fairs</div>
          <div className="feed-box feed-box-small">
            {clubsFairs.length === 0 && <LoadingSpinner label="Loading..." />}
            {clubsFairs.map((item) => <FeedItem key={item.id} item={item} />)}
          </div>
        </div>
        <div>
          <div className="section-label">Campus news</div>
          <div className="feed-box feed-box-small">
            {campus.length === 0 && <LoadingSpinner label="Loading..." />}
            {campus.map((item) => <FeedItem key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
