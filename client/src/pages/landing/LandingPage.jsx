import { useState } from 'react';
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
  const stats = [['New leads', '24'], ['Converted', '6'], ['Tasks overdue', '3'], ['Deadlines, 30 days', '5']];
  return (
    <Frame title="Dashboard">
      <div className="stats">
        {stats.map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}
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
  const step = STEPS[active];

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="wrap lp-nav-in">
          <a className="brand" href="#top">{CONFIG.name}</a>
          <nav aria-label="Sections">
            <a href="#problem">Problem</a>
            <a href="#flow">Walkthrough</a>
            <a href="#access">Access</a>
            <a href="#modules">Modules</a>
          </nav>
          <a className="btn btn-primary btn-sm" href={CONFIG.demoUrl}>Open live demo</a>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <div>
            <h1>One system for every student, from first inquiry to final offer.</h1>
            <p className="lead">
              A CRM for study abroad consultancies. It replaces spreadsheets, chat threads and
              paper files, so follow-ups, documents and deadlines live in one place.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href={CONFIG.demoUrl}>Open live demo</a>
              <a className="btn btn-ghost" href={CONFIG.repoUrl}>View the code</a>
            </div>
            <p className="meta">An internship project by a team of two, built in four weeks.</p>
          </div>
          <Dashboard />
        </section>

        <section id="problem" className="band">
          <div className="wrap split">
            <h2>A student’s journey is long, and most of it is paperwork.</h2>
            <ul className="problems">
              {PROBLEMS.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
            </ul>
          </div>
        </section>

        <section id="flow" className="wrap section">
          <h2>Follow one student through the system</h2>
          <p className="sub">Lead, student, application, outcome. Each stage has its own screen.</p>
          <div className="flow">
            <div role="tablist" aria-label="Stages" className="tabs">
              {STEPS.map((s, i) => (
                <button key={s.key} role="tab" id={`tab-${i}`} aria-selected={i === active}
                  aria-controls="flow-panel" className={i === active ? 'on' : ''}
                  onClick={() => setActive(i)}>
                  {s.key}
                </button>
              ))}
            </div>
            <div id="flow-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="flow-body">
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
            <div>
              <h2>Each person sees what their job needs.</h2>
              <p className="sub">
                Admins and managers see everything. Counselors work their own leads and students.
                Front desk captures inquiries and assigns them. An admin edits the permission matrix
                from the UI, and can grant or deny a single permission for one person, such as
                viewing all leads, without changing their role.
              </p>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Module</th><th>Admin</th><th>Counselor</th><th>Front desk</th></tr></thead>
                <tbody>{MATRIX.map((r) => <tr key={r[0]}>{r.map((c, i) => i ? <td key={i}>{c}</td> : <th key={i} scope="row">{c}</th>)}</tr>)}</tbody>
              </table>
              <p className="caption">Default permissions by role.</p>
            </div>
          </div>
        </section>

        <section id="modules" className="wrap section">
          <h2>What is inside</h2>
          <dl className="modules">
            {MODULES.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
          </dl>
        </section>

        <section className="band">
          <div className="wrap split">
            <h2>How it is built</h2>
            <dl className="stack">
              {STACK.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
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
