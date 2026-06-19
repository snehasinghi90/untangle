import { useState, useEffect } from 'react'
import './App.css'
import { db, auth } from './firebase'
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'

const NAV_ITEMS = [
  { id: 'home',      emoji: '🏠', label: 'Home' },
  { id: 'journal',   emoji: '📝', label: 'Journal' },
  { id: 'community', emoji: '👥', label: 'Community' },
  { id: 'insights',  emoji: '📊', label: 'Insights' },
]

const LESSONS = [
  {
    id: 1,
    title: 'Why We Can\'t Say No',
    summary: 'People-pleasing often starts as a survival strategy.',
    body: 'People-pleasing often starts early — as a way to feel safe, loved, or accepted. When saying yes kept the peace and saying no brought conflict, your nervous system learned to default to yes. Understanding this isn\'t weakness; it\'s the first step to rewiring it. The goal isn\'t to become someone who always says no — it\'s to become someone who chooses.',
  },
  {
    id: 2,
    title: 'The Cost of Keeping the Peace',
    summary: 'Every yes to someone else can be a no to yourself.',
    body: 'When we constantly prioritize others\' comfort over our own needs, the bill eventually comes due — in resentment, exhaustion, or a quiet loss of identity. Keeping the peace externally while abandoning yourself internally is not sustainable. This lesson explores what you\'ve been trading away, and why it\'s worth the short-term discomfort of honesty.',
  },
  {
    id: 3,
    title: 'Boundaries vs. Walls',
    summary: 'A boundary protects connection — a wall ends it.',
    body: 'Boundaries are often misunderstood as ways to push people away. In reality, a healthy boundary is an invitation to a more honest relationship. Walls are rigid and defensive; boundaries are flexible and clear. Learning the difference helps you protect your energy without sacrificing closeness. Real connection requires two whole people — not one person slowly disappearing.',
  },
  {
    id: 4,
    title: 'What Guilt Is Really Telling You',
    summary: 'Guilt after saying no doesn\'t mean you did something wrong.',
    body: 'For chronic people-pleasers, guilt is almost automatic after any act of self-assertion. But guilt is just a feeling — not a verdict. It often reflects a learned rule ("I must always accommodate others") rather than an actual moral failure. This lesson helps you separate healthy guilt (when you genuinely harmed someone) from conditioned guilt (when you simply prioritized yourself).',
  },
  {
    id: 5,
    title: 'The Pause Practice',
    summary: 'One breath before answering can change everything.',
    body: 'The most powerful tool against automatic people-pleasing is the pause. Before responding to any request, take one breath and ask: "Do I actually want to do this?" This tiny gap interrupts the reflex. At first it will feel awkward — people expect your instant yes. That discomfort is the signal that the practice is working. Over time, the pause becomes natural, and your answers become yours.',
  },
  {
    id: 6,
    title: 'Self-Compassion Is Not Selfishness',
    summary: 'Caring for yourself makes you better for everyone.',
    body: 'Many people-pleasers fear that taking care of themselves is selfish. But self-compassion is the foundation of sustainable generosity. You can\'t pour from an empty cup — and more importantly, you don\'t have to. This lesson reframes rest, boundaries, and self-care not as indulgences but as the maintenance that keeps you able to show up fully for the people who matter to you.',
  },
]

const PLACEHOLDER_ENTRIES = [
  { date: 'June 17, 2026', text: "I said yes to covering a colleague's shift even though I was exhausted. I didn't want to disappoint her, but ended up feeling resentful the whole time." },
  { date: 'June 16, 2026', text: "Tried to pause before responding when my manager asked me to take on another project. I almost said yes automatically — but I caught myself." },
  { date: 'June 15, 2026', text: "Realized I've been apologizing for things that aren't my fault. Small thing, but interesting to notice." },
]

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

const CATEGORIES = [
  'People-pleasing',
  'Self-comparison',
  'Perfectionism',
  'Time management',
  'Something else',
]

function App() {
  const [problem, setProblem] = useState('')
  const [screen, setScreen] = useState(() => load('utgl_screen', 1))
  const [selected, setSelected] = useState(() => load('utgl_selected', null))
  const [butterflyName, setButterflyName] = useState(() => load('utgl_butterflyName', ''))
  const [userName, setUserName] = useState(() => load('utgl_userName', ''))
  const [feeling, setFeeling] = useState(() => load('utgl_feeling', 5))
  const [navTab, setNavTab] = useState('home')
  const [showProfile, setShowProfile] = useState(false)
  const [journalDraft, setJournalDraft] = useState('')
  const [journalEntries, setJournalEntries] = useState(() => load('utgl_journalEntries', PLACEHOLDER_ENTRIES))
  const [communityPosts, setCommunityPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState(() => load('utgl_likedPosts', []))

  useEffect(() => { save('utgl_screen', screen) }, [screen])
  useEffect(() => { save('utgl_selected', selected) }, [selected])
  useEffect(() => { save('utgl_butterflyName', butterflyName) }, [butterflyName])
  useEffect(() => { save('utgl_userName', userName) }, [userName])
  useEffect(() => { save('utgl_feeling', feeling) }, [feeling])
  useEffect(() => { save('utgl_journalEntries', journalEntries) }, [journalEntries])
  useEffect(() => { save('utgl_likedPosts', likedPosts) }, [likedPosts])

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, snapshot => {
      setCommunityPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setPostsLoading(false)
    })
    return unsub
  }, [])

  const [toggles, setToggles] = useState({ reminder: true, community: true, darkMode: false })
  const flipToggle = key => setToggles(t => ({ ...t, [key]: !t[key] }))
  const [profileEmail, setProfileEmail] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [openLesson, setOpenLesson] = useState(null)

  const [showCompose, setShowCompose] = useState(false)
  const [composeDraft, setComposeDraft] = useState('')

  const missionSteps = [
    'Pause before you respond to a request',
    'Ask yourself: do I actually want this?',
    'Say no to one small thing today',
    'Write down how it felt afterward',
  ]

  const BottomNav = () => (
    <nav className="nav-bar">
      {NAV_ITEMS.map(({ id, emoji, label }) => (
        <button
          key={id}
          className={`nav-item${navTab === id ? ' nav-item--active' : ''}`}
          onClick={() => setNavTab(id)}
        >
          <span className="nav-icon">{emoji}</span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )

  if (screen === 4 && showProfile) {
    const initials = userName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
    const pwValid = newPw.length >= 6 && newPw === confirmPw

    return (
      <div className="profile-screen">
        <div className="profile-topbar">
          <button className="back-link" onClick={() => setShowProfile(false)}>← Back</button>
          <span className="profile-topbar-title">Profile</span>
        </div>

        <div className="profile-body">

          {/* ── My profile ── */}
          <div className="h-card">
            <p className="h-card-label">My profile</p>

            <div className="profile-avatar-row">
              <div className="profile-avatar">{initials}</div>
              <div>
                <p className="profile-bname">{userName || 'Your name'}</p>
                <p className="profile-bstage">{profileUsername ? `@${profileUsername}` : 'Set a username'}</p>
              </div>
            </div>

            <div className="pf-field">
              <label className="pf-label">Full name</label>
              <input
                className="pf-input"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Username</label>
              <div className="pf-input-prefix-wrap">
                <span className="pf-prefix">@</span>
                <input
                  className="pf-input pf-input--prefixed"
                  value={profileUsername}
                  onChange={e => setProfileUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="username"
                />
              </div>
            </div>
            <div className="pf-field">
              <label className="pf-label">Email address</label>
              <input
                className="pf-input"
                type="email"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* ── Security ── */}
          <div className="h-card">
            <p className="h-card-label">Security</p>
            {!showPasswordChange ? (
              <button className="profile-text-link pf-change-pw" onClick={() => setShowPasswordChange(true)}>
                Change password →
              </button>
            ) : (
              <>
                <div className="pf-field">
                  <label className="pf-label">Current password</label>
                  <input className="pf-input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="pf-field">
                  <label className="pf-label">New password</label>
                  <input className="pf-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 characters" />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Confirm new password</label>
                  <input className="pf-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
                  {confirmPw.length > 0 && newPw !== confirmPw && (
                    <p className="pf-error">Passwords don't match</p>
                  )}
                </div>
                <div className="pf-pw-actions">
                  <button className="compose-cancel" onClick={() => { setShowPasswordChange(false); setOldPw(''); setNewPw(''); setConfirmPw('') }}>Cancel</button>
                  <button className="h-btn h-btn--blue compose-post" disabled={!pwValid || !oldPw}>Save password</button>
                </div>
              </>
            )}
          </div>

          {/* ── Your butterfly ── */}
          <div className="h-card">
            <p className="h-card-label">Your butterfly</p>
            <div className="profile-butterfly-row">
              <span className="profile-egg">🥚</span>
              <div>
                <p className="profile-bname">{butterflyName}</p>
                <p className="profile-bstage">Stage 1 — Egg &nbsp;·&nbsp; Day 1 of 30</p>
              </div>
            </div>
            <div className="pf-field">
              <label className="pf-label">Butterfly name</label>
              <input
                className="pf-input"
                value={butterflyName}
                onChange={e => setButterflyName(e.target.value)}
                placeholder="Give them a name"
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Focus area</label>
              <select className="pf-input pf-select" value={selected} onChange={e => setSelected(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── Settings ── */}
          <div className="h-card">
            <p className="h-card-label">Settings</p>
            {[
              { key: 'reminder',  label: 'Daily reminder' },
              { key: 'community', label: 'Community notifications' },
              { key: 'darkMode',  label: 'Dark mode' },
            ].map(({ key, label }) => (
              <div key={key} className="toggle-row">
                <span className="toggle-label">{label}</span>
                <button
                  className={`toggle${toggles[key] ? ' toggle--on' : ''}`}
                  onClick={() => flipToggle(key)}
                  aria-pressed={toggles[key]}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            ))}
          </div>

          {/* ── Safety ── */}
          <div className="h-card safety-card">
            <p className="h-card-label">Safety & support</p>
            <p className="safety-lead">If you're in crisis, you're not alone.</p>
            <p className="safety-line">
              Call or text <a href="tel:988" className="safety-link">988</a> — Suicide & Crisis Lifeline
            </p>
            <p className="safety-line">
              Crisis Text Line: text <strong>HOME</strong> to <strong>741741</strong>
            </p>
            <p className="safety-small">
              Untangle is a wellness tool, not a substitute for professional mental health care.
            </p>
          </div>

          <button className="logout-link">Log out</button>

        </div>
      </div>
    )
  }

  if (screen === 4 && navTab === 'journal') {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const saveEntry = () => {
      if (!journalDraft.trim()) return
      const label = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      setJournalEntries(prev => [{ date: label, text: journalDraft.trim() }, ...prev])
      setJournalDraft('')
    }
    return (
      <>
        <div className="journal-screen">
          <div className="journal-header">
            <p className="journal-title">Journal</p>
            <p className="journal-date">{today}</p>
          </div>
          <div className="journal-body">
            <div className="h-card">
              <p className="h-card-label">What happened today?</p>
              <textarea
                className="journal-textarea"
                value={journalDraft}
                onChange={e => setJournalDraft(e.target.value)}
                placeholder="Write freely — no one else will see this..."
                rows={5}
              />
              <button
                className="h-btn h-btn--blue"
                disabled={!journalDraft.trim()}
                onClick={saveEntry}
              >
                Save entry
              </button>
            </div>

            <p className="journal-section-heading">Past entries</p>
            {journalEntries.map((entry, i) => (
              <div key={i} className="h-card journal-entry-card">
                <div className="entry-header">
                  <p className="journal-entry-date">{entry.date}</p>
                  <button
                    className="entry-delete-btn"
                    onClick={() => setJournalEntries(prev => prev.filter((_, j) => j !== i))}
                    aria-label="Delete entry"
                  >
                    🗑
                  </button>
                </div>
                <p className="journal-entry-preview">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 4 && navTab === 'community') {
    const submitPost = async () => {
      if (!composeDraft.trim()) return
      await addDoc(collection(db, 'posts'), {
        name: userName || 'Anonymous',
        category: selected || 'Something else',
        text: composeDraft.trim(),
        likes: 0,
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous',
      })
      setComposeDraft('')
      setShowCompose(false)
    }
    const toggleLike = async (id) => {
      const isLiked = likedPosts.includes(id)
      await updateDoc(doc(db, 'posts', id), { likes: increment(isLiked ? -1 : 1) })
      setLikedPosts(prev => isLiked ? prev.filter(x => x !== id) : [...prev, id])
    }
    return (
      <>
        <div className="community-screen">
          <div className="journal-header">
            <p className="journal-title">Community</p>
            <p className="journal-date">You're not alone in this.</p>
          </div>
          <div className="community-body">
            {!showCompose ? (
              <button className="share-win-btn" onClick={() => setShowCompose(true)}>
                + Share a win
              </button>
            ) : (
              <div className="h-card">
                <p className="h-card-label">Share your win</p>
                <textarea
                  className="journal-textarea"
                  value={composeDraft}
                  onChange={e => setComposeDraft(e.target.value)}
                  placeholder="What went well? Even small wins count..."
                  rows={4}
                  autoFocus
                />
                <div className="compose-actions">
                  <button className="compose-cancel" onClick={() => { setShowCompose(false); setComposeDraft('') }}>Cancel</button>
                  <button className="h-btn h-btn--blue compose-post" disabled={!composeDraft.trim()} onClick={submitPost}>Post</button>
                </div>
              </div>
            )}
            {postsLoading ? (
              <p className="community-loading">Loading posts…</p>
            ) : communityPosts.map(post => (
              <div key={post.id} className="h-card community-post">
                <div className="post-header">
                  <div>
                    <span className="post-name">{post.name}</span>
                    <span className="post-tag">{post.category}</span>
                  </div>
                  <button
                    className={`like-btn${likedPosts.includes(post.id) ? ' like-btn--active' : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    ♥ {post.likes}
                  </button>
                </div>
                <p className="post-text">{post.text}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 4 && navTab === 'insights' && openLesson) {
    return (
      <>
        <div className="lesson-screen">
          <div className="journal-header">
            <button className="back-link lesson-back" onClick={() => setOpenLesson(null)}>← Back</button>
            <p className="journal-title">{openLesson.title}</p>
          </div>
          <div className="lesson-body">
            <p className="lesson-summary">{openLesson.summary}</p>
            <p className="lesson-text">{openLesson.body}</p>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 4 && navTab === 'insights') {
    const moodPoints = [
      { day: 'Mon', val: 4 },
      { day: 'Tue', val: 5 },
      { day: 'Wed', val: 4 },
      { day: 'Thu', val: 6 },
      { day: 'Fri', val: 7 },
      { day: 'Sat', val: 7 },
      { day: 'Sun', val: 8 },
    ]
    const moodMax = 10
    const badges = [
      { label: 'First Day', icon: '✅', earned: true },
      { label: 'Week Warrior', icon: '✅', earned: true },
      { label: 'Courage Builder', icon: '⭐', earned: true },
      { label: '30-Day Legend', icon: '🔒', earned: false },
      { label: 'Zen Master', icon: '🔒', earned: false },
    ]
    return (
      <>
        <div className="insights-screen">
          <div className="journal-header">
            <p className="journal-title">Insights</p>
            <p className="journal-date">Your growth, visualized.</p>
          </div>

          <div className="insights-body">

            {/* ── Progress & Gamification ── */}
            <div className="ins-row">
              <div className="h-card ins-streak-card ins-half">
                <span className="ins-streak-label">🔥 5 day streak</span>
                <div className="ins-flames ins-flames--compact">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className="ins-flame-col">
                      <span className={`ins-flame ins-flame--sm${i < 5 ? '' : ' ins-flame--dim'}`}>🔥</span>
                      <span className="ins-flame-day">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-card ins-xp-card ins-half">
                <p className="ins-xp-label">⚡ XP</p>
                <p className="ins-xp-value">245</p>
                <div className="ins-xp-bar-track">
                  <div className="ins-xp-bar-fill" style={{ width: '49%' }} />
                </div>
                <p className="ins-xp-sub">/ 500 next level</p>
              </div>
            </div>

            <div className="h-card">
              <p className="h-card-label">Badges</p>
              <div className="ins-badges">
                {badges.map(b => (
                  <div key={b.label} className={`ins-badge${b.earned ? '' : ' ins-badge--locked'}`}>
                    <span className="ins-badge-icon">{b.icon}</span>
                    <span className="ins-badge-label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Insights & Data ── */}
            <div className="h-card">
              <p className="h-card-label">Mood trend</p>
              <div className="ins-mood-change">
                <span className="ins-mood-stat"><span className="ins-mood-num">4</span><span className="ins-mood-meta">start</span></span>
                <span className="ins-mood-arrow">→</span>
                <span className="ins-mood-stat"><span className="ins-mood-num ins-mood-num--up">8</span><span className="ins-mood-meta">today</span></span>
                <span className="ins-mood-delta">+4 ↑</span>
              </div>
              <div className="ins-chart">
                {moodPoints.map(p => (
                  <div key={p.day} className="ins-chart-col">
                    <div className="ins-bar-wrap">
                      <div
                        className="ins-bar"
                        style={{ height: `${(p.val / moodMax) * 100}%` }}
                      />
                    </div>
                    <span className="ins-chart-day">{p.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-card">
              <p className="h-card-label">Behavior change</p>
              <div className="ins-stats">
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Times you said no</span>
                  <span className="ins-stat-value">7</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Missions completed</span>
                  <span className="ins-stat-value">5</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Journal entries</span>
                  <span className="ins-stat-value">{journalEntries.length}</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Check-ins logged</span>
                  <span className="ins-stat-value">6</span>
                </div>
              </div>
            </div>

            <div className="h-card">
              <p className="h-card-label">What we're noticing</p>
              <p className="h-card-body">
                You're most likely to feel better on days you complete your mission early. Your mood has trended up over the week, and you're building a real streak. The hardest moments tend to come mid-week — keep an eye on Wednesday.
              </p>
            </div>

            <div className="h-card">
              <p className="h-card-label">📚 Lessons library</p>
              <p className="h-card-body" style={{ marginBottom: 4 }}>Revisit any lesson anytime.</p>
              {LESSONS.map((lesson, i) => (
                <button
                  key={lesson.id}
                  className="lesson-row"
                  style={i === 0 ? { borderTop: 'none' } : {}}
                  onClick={() => setOpenLesson(lesson)}
                >
                  <div className="lesson-row-text">
                    <span className="lesson-row-title">{lesson.title}</span>
                    <span className="lesson-row-summary">{lesson.summary}</span>
                  </div>
                  <span className="lesson-row-arrow">›</span>
                </button>
              ))}
            </div>

            <button className="export-btn">Export for therapist</button>

          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 4 && navTab !== 'home') {
    const title = NAV_ITEMS.find(n => n.id === navTab).label
    return (
      <>
        <div className="placeholder-screen">
          <p className="placeholder-title">{title}</p>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 4) {
    return (
      <>
        <div className="home">

          <div className="home-header">
            <div className="home-header-top">
              <span className="home-name">Hi, {userName}! 🥚</span>
              <div className="home-header-right">
                <span className="home-day-badge">Day 1</span>
                <button className="profile-icon" onClick={() => setShowProfile(true)}>👤</button>
              </div>
            </div>
            <p className="home-focus">Working on: <strong>{selected}</strong></p>
          </div>

          <div className="home-cards">

            <div className="h-card h-card--center">
              <div className="h-butterfly">🥚</div>
              <p className="h-butterfly-name">{butterflyName}</p>
              <p className="h-progress">1/30 days</p>
            </div>

            <div className="h-card">
              <p className="h-card-label">📚 Today's Lesson</p>
              <p className="h-card-title">Why We Can't Say No</p>
              <p className="h-card-body">
                People-pleasing often starts as a survival strategy — a way to stay safe, liked, or needed. Understanding the root helps you respond differently next time.
              </p>
            </div>

            <div className="h-card h-card--mission">
              <p className="h-card-label">🎯 Guided Mission</p>
              <p className="h-card-title">Notice when you say yes</p>
              <div className="h-steps">
                {missionSteps.map((step, i) => (
                  <div key={i} className={`h-step${i === 0 ? ' h-step--active' : ''}`}>
                    <span className="h-step-num">{i + 1}</span>
                    <span className="h-step-text">{step}</span>
                  </div>
                ))}
              </div>
              <button className="h-btn h-btn--gold">✅ I Did The Steps!</button>
              <button className="h-btn h-btn--red">🔥 I'm Doing It RIGHT NOW!</button>
            </div>

            <button
              className="stuck-card"
              onClick={() => setNavTab('insights')}
            >
              <span className="stuck-emoji">🌱</span>
              <div className="stuck-text">
                <p className="stuck-title">Feeling stuck?</p>
                <p className="stuck-body">Slipping into old habits? That's part of it. Revisit the basics →</p>
              </div>
            </button>

            <div className="h-card">
              <p className="h-card-label">💭 How Are You Feeling?</p>
              <div className="h-slider-row">
                <span className="h-emoji">😢</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={feeling}
                  onChange={(e) => setFeeling(Number(e.target.value))}
                  className="feeling-slider"
                />
                <span className="h-emoji">😊</span>
              </div>
              <p className="h-feeling-number">{feeling}</p>
              <button className="h-btn h-btn--blue">Submit Check-in</button>
            </div>

          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 3) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(2)}>← Back</button>
        <div className="logo">🥚</div>
        <h2 className="screen2-title">Name your butterfly</h2>
        <p className="screen2-subtitle">As you grow, so will they.</p>
        <label className="question">What's your name?</label>
        <input
          className="name-input"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name..."
        />
        <label className="question">Name your butterfly</label>
        <input
          className="name-input"
          type="text"
          value={butterflyName}
          onChange={(e) => setButterflyName(e.target.value)}
          placeholder="Give them a name..."
        />
        <button
          className="next-button"
          disabled={!butterflyName.trim() || !userName.trim()}
          onClick={() => setScreen(4)}
        >
          Let's go
        </button>
      </div>
    )
  }

  if (screen === 2) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(1)}>← Back</button>
        <h2 className="screen2-title">Which of these fits?</h2>
        <p className="screen2-subtitle">Pick the one that feels closest.</p>
        <div className="category-list">
          {CATEGORIES.map((label) => (
            <button
              key={label}
              className={`category-button${selected === label ? ' selected' : ''}`}
              onClick={() => setSelected(label)}
            >
              {label}
            </button>
          ))}
        </div>
        {selected && (
          <button className="next-button continue-button" onClick={() => setScreen(3)}>
            Continue →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="onboarding">
      <div className="logo">🦋</div>
      <h1>Untangle</h1>
      <p className="tagline">Change your life. Feel less alone.</p>

      <label className="question">Hi! What's going on today?</label>
      <textarea
        className="problem-input"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="I can't say no to people, even when I'm exhausted..."
        rows="4"
      />

      <button className="next-button" onClick={() => setScreen(2)}>
        Next →
      </button>
    </div>
  )
}

export default App
