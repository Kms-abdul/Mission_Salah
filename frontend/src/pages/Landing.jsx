import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import "./Landing.css";

const START = dayjs("2026-11-04");
const TOTAL_DAYS = 40;
const ARCH = "M0 64V28C0 14 14 8 20 0C26 8 40 14 40 28V64Z";
const PLEDGE_KEY = "mission-fajr-pledge";
const DATE_KEY = "YYYY-MM-DD";

const HADITHS = [
  {
    arabic: "رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا",
    english: "The two Sunnah rak'ahs of Fajr are better than the world and everything in it.",
    reference: "Sahih Muslim 725a",
  },
  {
    arabic: "مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ",
    english: "Whoever performs the Fajr prayer is under the protection of Allah.",
    reference: "Sahih Muslim 657",
  },
  {
    arabic: "مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ",
    english: "Whoever prays the two cool prayers (Asr and Fajr) will go to Paradise.",
    reference: "Sahih al-Bukhari 574",
  },
];

const FOR_STUDENTS = [
  { title: "Build real discipline", text: "Every early morning proves you can do what you said you would do." },
  { title: "Own the first hour", text: "Start with prayer and a clear mind before the day starts pulling at you." },
  { title: "Finish what you start", text: "Forty mornings can show you what steady effort makes possible." },
];

const FOR_PARENTS = [
  { title: "Protect the night", text: "Agree on an earlier bedtime and put screens away in good time." },
  { title: "Wake with kindness", text: "A gentle reminder, and praying together when you can, makes the habit easier to keep." },
  { title: "Praise the effort", text: "Encourage them after a missed morning, so they return the next day." },
];

const COMMITMENTS = [
  { no: "1", title: "Sleep early", text: "Finish the day early enough to wake for Fajr with a clear mind." },
  { no: "2", title: "Rise for Fajr", text: "Leave sleep behind and offer the prayer on time." },
  { no: "3", title: "Start early", text: "Use the morning well, then return tomorrow. A missed day is not the end." },
];

function mix(start, end, amount) {
  return start.map((value, i) => Math.round(value + (end[i] - value) * amount));
}

function getProgress() {
  const day = dayjs().startOf("day").diff(START, "day") + 1;
  if (day < 1) {
    const left = 1 - day;
    return { day: 0, text: `Begins in ${left} ${left === 1 ? "day" : "days"}` };
  }
  if (day > TOTAL_DAYS) return { day: TOTAL_DAYS + 1, text: "All 40 days completed" };
  return { day, text: `Day ${day} of ${TOTAL_DAYS}` };
}

function getDailyHadith() {
  const index = Math.abs(dayjs().startOf("day").diff(dayjs("2026-01-01"), "day")) % HADITHS.length;
  return HADITHS[index];
}

function readPledge() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLEDGE_KEY));
    return { pledged: !!saved?.pledged, days: Array.isArray(saved?.days) ? saved.days : [] };
  } catch {
    return { pledged: false, days: [] };
  }
}

function savePledge(value) {
  try {
    localStorage.setItem(PLEDGE_KEY, JSON.stringify(value));
  } catch {
    // The page still works if browser storage is unavailable.
  }
}

function getStreak(days) {
  const marked = new Set(days);
  let cursor = dayjs();
  if (!marked.has(cursor.format(DATE_KEY))) cursor = cursor.subtract(1, "day");
  let streak = 0;
  while (marked.has(cursor.format(DATE_KEY))) {
    streak += 1;
    cursor = cursor.subtract(1, "day");
  }
  return streak;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".mf [data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function MissionLogo() {
  const [missing, setMissing] = useState(false);
    if (missing) return null;
  return (
        <img className="mf-logo" src="/mission-tarbiyah.png" alt="Mission Tarbiyah: Build Courage. Shape Character."
      onError={() => setMissing(true)} />
  );
}

function Emblem() {
  const side = (
    <>
      <rect x="61" y="304" width="2" height="20" />
      <path d="M52 350Q62 316 72 350Z" />
      <rect x="56" y="350" width="12" height="46" />
      <rect x="47" y="396" width="30" height="6" />
      <rect x="52" y="402" width="20" height="198" />
      <path d="M92 510C92 485 112 480 120 462C128 480 148 485 148 510Z" />
    </>
  );

  return (
    <svg className="mf-emblem" viewBox="0 0 400 400" role="img" aria-label="Mosque at dawn under a crescent moon">
      <defs>
        <linearGradient id="mf-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8DD94" />
          <stop offset="0.5" stopColor="#B9852A" />
          <stop offset="1" stopColor="#F4C766" />
        </linearGradient>
        <linearGradient id="mf-emblem-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0F3B63" />
          <stop offset="0.42" stopColor="#2E70A8" />
          <stop offset="0.72" stopColor="#9CB8BE" />
          <stop offset="1" stopColor="#FFE3A8" />
        </linearGradient>
        <radialGradient id="mf-emblem-sun" cx="0.5" cy="0.84" r="0.46">
          <stop offset="0" stopColor="#FFF0C4" />
          <stop offset="1" stopColor="#FFF0C4" stopOpacity="0" />
        </radialGradient>
        <clipPath id="mf-emblem-clip"><circle cx="200" cy="200" r="170" /></clipPath>
      </defs>

      <circle cx="200" cy="200" r="199" fill="#fff" />
      <circle cx="200" cy="200" r="192" fill="none" stroke="url(#mf-ring)" strokeWidth="3" />
      <circle cx="200" cy="200" r="183" fill="#082440" />
      <circle cx="200" cy="200" r="175" fill="none" stroke="url(#mf-ring)" strokeWidth="2" />

      <g clipPath="url(#mf-emblem-clip)">
        <rect width="400" height="400" fill="url(#mf-emblem-sky)" />
        <rect width="400" height="400" fill="url(#mf-emblem-sun)" />

        <g fill="#FFF7E2">
          <circle cx="104" cy="104" r="1.8" />
          <circle cx="148" cy="66" r="1.4" />
          <circle cx="282" cy="74" r="1.6" />
          <circle cx="318" cy="128" r="1.4" />
          <circle cx="80" cy="150" r="1.2" />
        </g>

        <g transform="translate(-74 2)" fill="#F4C766">
          <path d="M270 72A57 57 0 1 0 330 140A46 46 0 1 1 270 72Z" />
          <polygon points="318,74 323,87 337,87 326,96 330,110 318,102 306,110 310,96 299,87 313,87" />
        </g>

        <g transform="translate(24 -80) scale(0.8)">
          <g fill="#082440">
            {side}
            <g transform="translate(440 0) scale(-1 1)">{side}</g>
            <rect x="219" y="336" width="2" height="36" />
            <path d="M140 470C140 420 195 405 220 370C245 405 300 420 300 470Z" />
            <rect x="150" y="470" width="140" height="32" />
            <rect x="92" y="502" width="256" height="98" />
          </g>
          <g fill="#F8DD94">
            <path d="M204 600V552Q220 526 236 552V600Z" />
            <path d="M116 574V546Q126 530 136 546V574Z" />
            <path d="M156 574V546Q166 530 176 546V574Z" />
            <path d="M264 574V546Q274 530 284 546V574Z" />
            <path d="M304 574V546Q314 530 324 546V574Z" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function Pledge({ day }) {
  const [pledge, setPledge] = useState(readPledge);
  const today = dayjs().format(DATE_KEY);
  const markedToday = pledge.days.includes(today);

  const update = (value) => {
    setPledge(value);
    savePledge(value);
  };

  let action;
  if (day === 0) {
    action = pledge.pledged ? (
      <p className="mf-note" role="status">Your pledge is saved. Your first morning is 4 November.</p>
    ) : (
      <button type="button" className="mf-cta" onClick={() => update({ ...pledge, pledged: true })}>
        Take the pledge
      </button>
    );
  } else if (day > TOTAL_DAYS) {
    action = <p className="mf-note">You marked {pledge.days.length} of {TOTAL_DAYS} mornings. Keep the habit going.</p>;
  } else if (markedToday) {
    action = <p className="mf-note" role="status">Today's Fajr is marked. See you tomorrow morning.</p>;
  } else {
    action = (
      <button type="button" className="mf-cta"
        onClick={() => update({ pledged: true, days: [...pledge.days, today] })}>
        I offered Fajr today
      </button>
    );
  }

  return (
    <section className="mf-section mf-section--peach" id="pledge">
      <div className="mf-wrap mf-pledge">
        <div data-reveal>
          <h2>Make this promise your own.</h2>
          <p className="mf-lead">Mark each morning and watch your streak grow. Your progress stays only on this device.</p>
          <div className="mf-pledge__action">{action}</div>
        </div>
        <div className="mf-stats" data-reveal>
          <div><strong>{pledge.days.length}</strong><span>of {TOTAL_DAYS} mornings</span></div>
          <div><strong>{getStreak(pledge.days)}</strong><span>day streak</span></div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { day, text } = getProgress();
  const hadith = getDailyHadith();
  const appLink = user ? homeFor(user.role) : "/login";
  useReveal();

  return (
    <main className="mf">
      <section className="mf-hero">
                <nav className="mf-wrap mf-nav">
          <Link to={appLink}>{user ? "Open app" : "Staff login"}</Link>
        </nav>

        <div className="mf-wrap mf-hero__grid">
          <div className="mf-hero__brand">
            <Emblem />
            <h1>Mission Fajr</h1>
            <p>Sleep early, start early</p>
          </div>

          <div className="mf-hero__message">
            <h2>40-Day Commitment</h2>
            <p className="mf-hero__dates">4 November to 13 December 2026</p>

            <figure className="mf-hadith mf-hadith--hero">
              <blockquote>
                <p className="mf-arabic" lang="ar" dir="rtl">{hadith.arabic}</p>
                <p className="mf-translation">"{hadith.english}"</p>
              </blockquote>
              <figcaption>{hadith.reference}</figcaption>
            </figure>

            <div className="mf-hero__actions">
                                          <MissionLogo />
            </div>
          </div>
        </div>
        <div className="mf-bar" />
      </section>

      <section className="mf-section">
        <div className="mf-wrap">
          <header className="mf-heading" data-reveal>
            <h2>Why Fajr matters</h2>
            <p className="mf-lead">Words from the Prophet ﷺ to carry into every morning.</p>
          </header>
          <div className="mf-grid mf-grid--3">
            {HADITHS.map((item) => (
              <figure key={item.reference} className="mf-card mf-hadith" data-reveal>
                <blockquote>
                  <p className="mf-arabic" lang="ar" dir="rtl">{item.arabic}</p>
                  <p className="mf-translation">"{item.english}"</p>
                </blockquote>
                <figcaption>{item.reference}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mf-section mf-section--sky">
        <div className="mf-wrap">
          <header className="mf-heading" data-reveal>
            <h2>A journey we take together</h2>
            <p className="mf-lead">Students keep the promise. Parents help it last.</p>
          </header>
          <div className="mf-grid mf-grid--2">
            {[
              { title: "For students", intro: "Win the morning. Carry it into your day.", items: FOR_STUDENTS },
              { title: "For parents", intro: "The strongest reminder starts at home.", items: FOR_PARENTS },
            ].map((group) => (
              <article key={group.title} className="mf-card" data-reveal>
                <span className="mf-label">{group.title}</span>
                <h3>{group.intro}</h3>
                <ul className="mf-list">
                  {group.items.map((item) => (
                    <li key={item.title}><b>{item.title}</b>{item.text}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mf-section mf-section--navy">
        <div className="mf-wrap">
          <header className="mf-heading mf-heading--split" data-reveal>
            <div>
              <h2>Forty days, one morning at a time</h2>
              <p className="mf-lead">4 November to 13 December 2026</p>
            </div>
            <strong>{text}</strong>
          </header>
          <div className="mf-days" data-reveal role="img" aria-label={text}>
            {Array.from({ length: TOTAL_DAYS }, (_, i) => {
              const number = i + 1;
              const [r, g, b] = mix([120, 183, 214], [244, 199, 102], i / (TOTAL_DAYS - 1));
              const state = number === day ? "today" : number < day ? "done" : "";
              return (
                <svg key={number} className={state} viewBox="0 0 40 64"
                  style={{ "--day": `rgb(${r}, ${g}, ${b})` }} aria-hidden="true">
                  <title>{`Day ${number}: ${START.add(i, "day").format("D MMM")}`}</title>
                  <path d={ARCH} />
                </svg>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mf-section">
        <div className="mf-wrap">
          <header className="mf-heading" data-reveal>
            <h2>The commitment</h2>
            <p className="mf-lead">Three simple steps, repeated for forty days.</p>
          </header>
          <div className="mf-grid mf-grid--3">
            {COMMITMENTS.map((item) => (
              <article key={item.no} className="mf-card mf-step" data-reveal>
                <span>{item.no}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Pledge day={day} />

      <footer className="mf-footer">
        <div className="mf-wrap mf-footer__inner">
          <p>Together, let's rise for Fajr.</p>
          {/* <span>MS Education Academy</span> */}
        </div>
        <div className="mf-bar" />
      </footer>
    </main>
  );
}