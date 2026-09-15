// Runs on a schedule via .github/workflows/scrape-news.yml (GitHub Actions),
// never in the browser. It is the only part of this project that holds
// admin-level Firebase access and an Anthropic API key - both come from
// GitHub Actions secrets at runtime and are never committed to the repo.
//
// What it does, in order:
//  1. Fetches Farmingdale's public News Room page and Academic Calendar page.
//  2. Parses out headline/date/link (news) and date/title/description (calendar).
//  3. Categorizes each news item as 'academic' | 'clubs' | 'campus' by keyword match.
//  4. Calls Claude to write a short, original-words summary for each item
//     (never stores the original article's full text - see README notes on
//     why, under "Known simplifications").
//  5. Writes everything to Firestore: schoolNews, academicCalendar, and a
//     single campusDigest doc for today combining both sources.
//
// Run locally with: node scripts/scrape-news.js
// Requires env vars: FIREBASE_SERVICE_ACCOUNT_JSON, ANTHROPIC_API_KEY

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

const NEWS_ROOM_URL = 'https://www.farmingdale.edu/news/feed.shtml?type=news-room';
const ACADEMIC_CALENDAR_URL = 'https://www.farmingdale.edu/calendar/academic/index.shtml';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLUB_KEYWORDS = ['club', 'fair', 'involvement', 'student org', 'society', 'fraternity', 'sorority'];
const CAMPUS_KEYWORDS = ['rams', 'soccer', 'basketball', 'volleyball', 'sports', 'athletics', 'award', 'anniversary'];

function categorize(title) {
  const lower = title.toLowerCase();
  if (CLUB_KEYWORDS.some((k) => lower.includes(k))) return 'clubs';
  if (CAMPUS_KEYWORDS.some((k) => lower.includes(k))) return 'campus';
  return 'academic';
}

async function fetchNewsRoom() {
  const res = await fetch(NEWS_ROOM_URL);
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];
  $('h3 a, h2 a').each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    if (!title || !href) return;
    const dateText = $(el).closest('div').text().match(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
    items.push({
      title,
      url: href.startsWith('http') ? href : `https://www.farmingdale.edu${href}`,
      date: dateText ? dateText[0] : null,
    });
  });
  return items.slice(0, 15); // most recent batch only
}

async function fetchAcademicCalendar() {
  const res = await fetch(ACADEMIC_CALENDAR_URL);
  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length >= 2 && cells[1]) {
      rows.push({ title: cells[0], dateText: cells[1], note: cells[2] || '' });
    }
  });
  return rows;
}

async function summarize(prompt) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content.find((b) => b.type === 'text')?.text?.trim() || '';
}

async function run() {
  const [newsItems, calendarRows] = await Promise.all([fetchNewsRoom(), fetchAcademicCalendar()]);

  // News items -> schoolNews, each with its own AI summary.
  for (const item of newsItems) {
    const category = categorize(item.title);
    const summary = await summarize(
      `In 2-3 plain sentences, summarize what this Farmingdale State College news headline is ` +
      `probably about, for a student browsing a campus app. Do not invent specifics you can't ` +
      `know from the title alone - keep it general if needed. Headline: "${item.title}"`
    );
    await db.collection('schoolNews').doc(Buffer.from(item.url).toString('base64url')).set({
      title: item.title,
      url: item.url,
      date: item.date,
      category,
      summary,
      scrapedAt: Timestamp.now(),
    });
  }

  // Calendar rows -> academicCalendar, keyed by a normalized date so the
  // client's Calendar component can look them up by day.
  for (const row of calendarRows) {
    const parsed = Date.parse(`${row.dateText} 2026`);
    if (Number.isNaN(parsed)) continue;
    const d = new Date(parsed);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    await db.collection('academicCalendar').doc(key).set({
      date: key,
      title: row.title,
      description: row.note || row.title,
    });
  }

  // One combined "today" digest, written once per run.
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const todayHeadlines = newsItems.slice(0, 5).map((n) => n.title).join('; ');
  const digestText = await summarize(
    `Write a friendly 2-3 sentence "today at a glance" overview for a college club-management ` +
    `app, combining today's academic calendar notes and recent headlines. Calendar notes: ` +
    `${calendarRows.map((r) => `${r.title} (${r.dateText})`).join('; ') || 'none'}. Recent ` +
    `headlines: ${todayHeadlines || 'none'}. If nothing stands out, say it's a quiet day.`
  );
  await db.collection('campusDigest').doc(todayKey).set({
    date: todayKey,
    type: 'daily',
    text: digestText,
    generatedAt: Timestamp.now(),
  });

  console.log(`Wrote ${newsItems.length} news items, ${calendarRows.length} calendar rows, 1 digest.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
