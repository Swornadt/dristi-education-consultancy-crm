import { useEffect, useRef, useState } from 'react';
import './landing.css';

/* Edit this block, then you are done. */
const CONFIG = {
  name: 'Study Abroad CRM',
  demoUrl: '/login',                                   // your deployed app or login route
  repoUrl: 'https://github.com/Swornadt/intern-consultancy-crm',   // GitHub link
  builders: 'Sworna D. Tuladhar and Eijkeyal Pakhrin',            // shown in the footer
  demoLogins: [
    { role: 'Admin', email: 'admin@example.com', password: 'user123' },
  ],
};

const PROBLEMS = [
  ['Follow-ups get missed', 'Inquiries sit in chat threads and notebooks until the student signs with someone else.'],
  ['Documents go missing', 'Passports, transcripts and statements arrive by email, messaging apps and paper. Nobody knows what is still outstanding.'],
  ['Deadlines slip', 'One student applies to several programs, each with its own intake and its own deadline.'],
  ['Managers work blind', 'With no single record, nobody can say how many leads converted or what the office spent this month.'],
];

const STEPS = [
  { key: 'Lead', title: 'An inquiry becomes a lead',
    text: 'The front desk records the inquiry, picks the destination country and assigns a counselor. A follow-up task is created at the same time, so the lead is never left waiting.',
    panel: ['Leads / Aarav Sharma', [
      ['Destination', 'Canada'], ['Intake', 'September 2027'], ['Source', 'Walk-in'],
      ['Counselor', 'Priya Thapa'], ['Status', 'Counseling scheduled', 'info'],
      ['Next follow-up', 'Thursday, 11:00', 'warn'], ['Last activity', 'Call logged: budget and course choices']]] },
  { key: 'Student', title: 'A lead becomes a student',
    text: 'Converting a lead creates the student profile and a document checklist. Documents already attached to the lead carry over, and the counselor adds education history and test scores.',
    panel: ['Students / Aarav Sharma', [
      ['Education', 'BSc IT, 2026'], ['IELTS', '7.0 overall'], ['Preferred countries', 'Canada, Australia'],
      ['Passport', 'Verified', 'ok'], ['Transcripts', 'Received', 'info'], ['Statement of purpose', 'Pending', 'warn']]] },
  { key: 'Application', title: 'A student applies to programs',
    text: 'Pick country, university, program and intake from the catalog. Each application shows its deadline, and approaching deadlines are flagged on the dashboard.',
    panel: ['Applications / Aarav Sharma', [
      ['Northbridge University, MSc Computer Science', 'Submitted', 'info'],
      ['Lakeshore College, MSc Data Analytics', 'Offer', 'ok'],
      ['Harcourt University, MSc Software Engineering', 'Draft', 'warn'],
      ['Harcourt deadline', '15 January, in 12 days']]] },
  { key: 'Outcome', title: 'Every application ends in a recorded outcome',
    text: 'Each move from Draft to Submitted, Offer, Accepted or Rejected is stored with its date, so anyone can see how an application got where it is.',
    panel: ['Applications / Lakeshore College', [
      ['Draft', 'Created 4 November'], ['Submitted', '18 November', 'info'],
      ['Offer', '9 January', 'ok'], ['Accepted', '14 January', 'ok']]] },
];

const MATRIX = [
  ['Leads', 'All', 'Own', 'Create and assign'],
  ['Students', 'All', 'Own', 'None'],
  ['Applications', 'All', 'Own', 'None'],
  ['Accounts', 'All', 'None', 'None'],
  ['Users and permissions', 'All', 'None', 'None'],
];

const MODULES = [
  ['Leads', 'Contact details, source, destination, intake and test status. A pipeline from New to Converted or Lost, with a timeline of calls, notes and meetings.'],
  ['Tasks', 'Dated follow-ups linked to a lead, with Today, Overdue, Upcoming and All views.'],
  ['Students', 'Personal details, preferred countries and courses, education history and test scores.'],
  ['Document checklist', 'Passport, transcripts, statements and more, each marked Pending, Received or Verified, with file upload and download.'],
  ['University catalog', 'Countries, universities, programs and intakes with application deadlines. Admins manage it, everyone can browse it.'],
  ['Applications', 'Many programs per student, a status history for every change and a deadline on each one.'],
  ['Dashboard', 'Leads by status and source, conversions per month, overdue tasks and deadlines in the next 30 days.'],
  ['Accounts', 'Rent, salaries, utilities and other income and expenses, with a monthly summary. Admin only.'],
  ['Users and permissions', 'Add and deactivate users, reset passwords and edit what each role may do.'],
];

const STACK = [
  ['Front end', 'React'], ['API', 'Node and Express'], ['Database', 'PostgreSQL'],
  ['Sign-in', 'Token based'], ['Permissions', 'Enforced on the server, not only hidden in the UI'],
  ['Uploads', 'PDF, JPG, PNG or DOCX, up to 10 MB'],
];

const STEP_MS = 6000;

/* Documentation links. Files are resolved against docsBase; adjust paths to match your repo. */
const DOCS_BASE = `${CONFIG.repoUrl}/blob/main/docs/`;
const ERD_IMAGE = ''; // optional: path to an exported ERD image, e.g. '/erd.png' in /public
const DOCS = [
  { title: 'Product requirements', text: 'Goals, non-goals, roles, modules and success criteria.', tag: 'PDF', file: 'eduCRM - PRD.pdf' },
  { title: 'API Contract', text: 'The endpoints the front end and back end agreed on, with request and response shapes.', tag: 'PDF', file: 'eduCRM - API Contract (v1).pdf' },
  { title: 'Database schema and ERD', text: 'Tables and relationships behind leads, students, documents and applications.', tag: 'SQL and diagram', file: 'schema.md' },
  { title: 'Permission design', text: 'How role defaults, the editable matrix and per-person overrides combine.', tag: 'Markdown', file: 'permissions.md' },
];

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}

function Reveal({ as: Tag = 'div', className = '', delay = 0, children }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return (
    <Tag ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

function CountUp({ to }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    if (prefersReduced()) { setN(to); return undefined; }
    let raf; let start;
    const tick = (t) => {
      start = start ?? t;
      const p = Math.min((t - start) / 900, 1);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{n}</span>;
}

const PIPE = [['New', 9], ['Contacted', 7], ['Counseling', 5], ['Converted', 6], ['Lost', 3]];

function Frame({ title, children }) {
  return (
    <div className="frame">
      <div className="frame-bar">{title}</div>
      <div className="frame-body">{children}</div>
      <div className="frame-note">Sample data</div>
    </div>
  );
}

function Rows({ rows }) {
  return (
    <dl className="rows">
      {rows.map(([k, v, tone]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{tone ? <span className={`pill ${tone}`}>{v}</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Dashboard() {
  const stats = [['New leads', 24], ['Converted', 6], ['Tasks overdue', 3], ['Deadlines, 30 days', 5]];
  return (
    <Frame title="Dashboard">
      <div className="stats">
        {stats.map(([k, v]) => <div key={k}><b><CountUp to={v} /></b><span>{k}</span></div>)}
      </div>
      <div className="pipe">
        <div className="pipe-bar">
          {PIPE.map(([k, v], i) => <i key={k} className={`s${i}`} title={`${k}: ${v}`} style={{ flex: v, animationDelay: `${700 + i * 110}ms` }} />)}
        </div>
        <ul className="pipe-key">
          {PIPE.map(([k, v], i) => <li key={k}><i className={`s${i}`} />{k} {v}</li>)}
        </ul>
      </div>
      <Rows rows={[
        ['Harcourt University, MSc Software Eng.', '15 Jan', 'warn'],
        ['Northbridge University, MSc Computer Sci.', '28 Jan', 'info'],
        ['Lakeshore College, MSc Data Analytics', '2 Feb', 'info']]} />
    </Frame>
  );
}

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const flowRef = useRef(null);
  const flowSeen = useInView(flowRef);
  const reduce = prefersReduced();
  const playing = auto && !paused && flowSeen && !reduce;
  const step = STEPS[active];
  const pick = (i) => { setAuto(false); setActive(i); };

  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, playing]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    const root = document.documentElement;
    root.style.scrollBehavior = 'smooth';
    root.style.scrollPaddingTop = '72px';
    return () => {
      window.removeEventListener('scroll', on);
      root.style.scrollBehavior = '';
      root.style.scrollPaddingTop = '';
    };
  }, []);

  return (
    <div className="lp">
      <header className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap lp-nav-in">
          <a className="brand" href="#top">{CONFIG.name}</a>
          <nav aria-label="Sections">
            <a href="#problem">Problem</a>
            <a href="#flow">Walkthrough</a>
            <a href="#access">Access</a>
            <a href="#modules">Modules</a>
            <a href="#docs">Docs</a>
          </nav>
          <a className="btn btn-primary btn-sm" href={CONFIG.demoUrl}>Open live demo</a>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <div>
            <h1 className="rise">One system for every student, from first inquiry to final offer.</h1>
            <p className="lead rise" style={{ '--d': '120ms' }}>
              A CRM for study abroad consultancies. It replaces spreadsheets, chat threads and
              paper files, so follow-ups, documents and deadlines live in one place.
            </p>
            <div className="actions rise" style={{ '--d': '220ms' }}>
              <a className="btn btn-primary" href={CONFIG.demoUrl}>Open live demo</a>
              <a className="btn btn-ghost" href={CONFIG.repoUrl}>View the code</a>
            </div>
            <p className="meta rise" style={{ '--d': '300ms' }}>An internship project by a team of two, built in four weeks.</p>
          </div>
          <div className="rise" style={{ '--d': '240ms' }}><Dashboard /></div>
        </section>

        <section id="problem" className="band">
          <div className="wrap split">
            <Reveal><h2>A student’s journey is long, and most of it is paperwork.</h2></Reveal>
            <ul className="problems">
              {PROBLEMS.map(([t, d], i) => <Reveal as="li" delay={i * 90} key={t}><h3>{t}</h3><p>{d}</p></Reveal>)}
            </ul>
          </div>
        </section>

        <section id="flow" className="wrap section">
          <h2>Follow one student through the system</h2>
          <p className="sub">Lead, student, application, outcome. Each stage has its own screen.</p>
          <div className="flow" ref={flowRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
            <div role="tablist" aria-label="Stages" className="tabs">
              {STEPS.map((s, i) => (
                <button key={s.key} role="tab" id={`tab-${i}`} aria-selected={i === active}
                  aria-controls="flow-panel" style={{ '--ms': `${STEP_MS}ms` }}
                  className={`${i === active ? 'on' : ''}${i === active && playing ? ' run' : ''}`}
                  onClick={() => pick(i)}>
                  {s.key}
                </button>
              ))}
            </div>
            {!reduce && auto && <p className="hint">Stages advance on their own. Hover or click to stop.</p>}
            <div key={active} id="flow-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="flow-body swap">
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <Frame title={step.panel[0]}><Rows rows={step.panel[1]} /></Frame>
            </div>
          </div>
        </section>

        <section id="access" className="band">
          <div className="wrap split">
            <Reveal>
              <h2>Each person sees what their job needs.</h2>
              <p className="sub">
                Admins and managers see everything. Counselors work their own leads and students.
                Front desk captures inquiries and assigns them. An admin edits the permission matrix
                from the UI, and can grant or deny a single permission for one person, such as
                viewing all leads, without changing their role.
              </p>
            </Reveal>
            <Reveal delay={120} className="table-wrap">
              <table>
                <thead><tr><th>Module</th><th>Admin</th><th>Counselor</th><th>Front desk</th></tr></thead>
                <tbody>{MATRIX.map((r) => <tr key={r[0]}>{r.map((c, i) => i ? <td key={i}>{c}</td> : <th key={i} scope="row">{c}</th>)}</tr>)}</tbody>
              </table>
              <p className="caption">Default permissions by role.</p>
            </Reveal>
          </div>
        </section>

        <section id="modules" className="wrap section">
          <h2>What is inside</h2>
          <dl className="modules">
            {MODULES.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 80}><dt>{t}</dt><dd>{d}</dd></Reveal>)}
          </dl>
        </section>

        <section id="docs" className="wrap section">
          <Reveal>
            <h2>The design and engineering behind it</h2>
            <p className="sub">The documents the team built from, kept in the repository next to the code.</p>
          </Reveal>
          <div className={`docs${ERD_IMAGE ? ' has-erd' : ''}`}>
            <ul className="doclist">
              {DOCS.map((d, i) => (
                <Reveal as="li" key={d.title} delay={i * 80}>
                  <a href={DOCS_BASE + d.file} target="_blank" rel="noreferrer">
                    <div><h3>{d.title}</h3><p>{d.text}</p></div>
                    <span className="pill">{d.tag}</span>
                  </a>
                </Reveal>
              ))}
            </ul>
            {ERD_IMAGE && (
              <Reveal as="figure" className="erd" delay={120}>
                <a href={ERD_IMAGE} target="_blank" rel="noreferrer">
                  <img src={ERD_IMAGE} alt="Entity relationship diagram of the database" loading="lazy" />
                </a>
                <figcaption>Database schema, ERD</figcaption>
              </Reveal>
            )}
          </div>
        </section>

        <section className="band">
          <div className="wrap split">
            <h2>How it is built</h2>
            <dl className="stack">
              {STACK.map(([k, v], i) => <Reveal key={k} delay={i * 60}><dt>{k}</dt><dd>{v}</dd></Reveal>)}
            </dl>
          </div>
        </section>

        <section className="cta">
          <div className="wrap">
            <h2>See it running</h2>
            <p>The demo is open. Look around the dashboard, a lead and an application.</p>
            {CONFIG.demoLogins.length > 0 && (
              <ul className="logins">
                {CONFIG.demoLogins.map((l) => (
                  <li key={l.role}><b>{l.role}</b><span>{l.email}</span><span>{l.password}</span></li>
                ))}
              </ul>
            )}
            <div className="actions">
              <a className="btn btn-light" href={CONFIG.demoUrl}>Open live demo</a>
              <a className="btn btn-outline" href={CONFIG.repoUrl}>View the code</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot wrap">
        <span>{CONFIG.name}. Built by {CONFIG.builders}.</span>
      </footer>
    </div>
  );
}
