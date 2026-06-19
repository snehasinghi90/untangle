import { useState, useEffect, Fragment } from 'react'
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

const FLUTTER_ONBOARDING_SYSTEM = "You are Flutter, a warm and supportive mental health companion. The user has just shared what's bothering them. Respond in 3 sentences maximum: first acknowledge what they shared with genuine empathy, then say you'd like to understand better, then end with exactly one sentence suggesting the most relevant category from this list: People-pleasing, Self-comparison, Perfectionism, Time management. The final sentence must follow this format: \"Based on what you shared, it sounds like [category] might be the place to start.\" Be warm, never clinical. Never mention therapy or diagnosis."

const FLUTTER_JOURNAL_SYSTEM = "You are Flutter, a warm mental health companion. When a user shares a journal entry, do two things in 4 sentences maximum: first offer a brief reframe that sounds like hard-won wisdom from a wise friend — not a named psychological framework. Good reframes sound like: 'The guilt you felt? That is not proof you did something wrong. It is just a pattern trying to stay alive.' or 'You were taught that love means saying yes. That is not a flaw — it made sense once.' Then ask ONE specific follow-up question that digs into the exact situation they described, not a generic question like how did that make you feel. Be warm and human. Never name any psychological framework. Never mention therapy, diagnosis, or that you are an AI. End with the question. If anything suggests a crisis, respond only with: 'It sounds like you might be going through something really hard. Please reach out to the 988 Suicide and Crisis Lifeline by calling or texting 988.'"

const FLUTTER_MISSION_SYSTEM = 'You are Flutter, a warm mental health companion. Generate a tiny, doable mission for TODAY ONLY based on the user\'s specific situation. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "title": "5 words max, specific to them",\n  "steps": [\n    "Tiny step 1 specific to their actual situation",\n    "Tiny step 2",\n    "Tiny step 3",\n    "Tiny step 4"\n  ]\n}\nCRITICAL CONSTRAINTS: The whole mission must take 5-10 minutes maximum. It must be doable TODAY — not a multi-day plan or habit. Day 1 should feel almost too easy; the goal is one small win, not a transformation. Steps must be tiny and concrete — not "block out your week" but "notice one moment today when you feel the urge to say yes." Reference their specific context directly — their mom, their boss, their friends, whatever they mentioned. Title is 5 words max, specific to their situation (never generic like "Start Your Journey"). Wrong tone: "Navigate Your First Week Like a Pro" with heavy life-planning steps. Right tone: "Notice One Yes Today" with steps like "Pay attention when someone asks you for something. Notice: do you want to say yes? What feeling comes up? Write one word down. That\'s it."'

const FLUTTER_LESSON_SYSTEM = 'You are Flutter. Based on the user\'s specific situation, generate a personalized lesson for today. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "title": "Short specific lesson title (5 words max) tailored to their situation — never generic",\n  "body": "ONE paragraph (2-3 sentences max) introducing the lesson in a way that connects directly to their specific situation. Make it feel written just for them. Warm, not clinical. No framework names."\n}\nThe lesson topic is about why people struggle to say no or set limits. The title should feel personal and specific — not \'Why We Can\\\'t Say No\' but something like \'Why You Keep Saying Yes\' or \'Why Saying No Feels Wrong\'.'

const FLUTTER_RIGHT_NOW_SYSTEM = "You are Flutter. The user is in a real moment right now — they're about to do something hard that goes against their people-pleasing pattern. They need immediate, grounding support in 3 sentences maximum.\n\nSentence 1: Acknowledge what's happening in their body right now (chest tight, heart racing, urge to say yes) — make them feel seen.\nSentence 2: Give them one concrete thing to do in the next 10 seconds (take a breath, don't answer on the first ring, say 'let me think about it').\nSentence 3: Remind them they're not alone and they've been building to this moment.\n\nNever be generic. Reference their specific situation and mission. Be warm, human, and brief. No platitudes."

const RIGHT_NOW_FALLBACK = "You've been preparing for exactly this. Whatever you're about to do — you're ready. Take one breath. You know what to say."

const DEFAULT_MISSION = {
  title: 'Notice when you say yes',
  steps: [
    'Pause before you respond to a request',
    'Ask yourself: do I actually want this?',
    'Say no to one small thing today',
    'Write down how it felt afterward',
  ],
}

async function callFlutter(system, userText) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  })
  const data = await res.json()
  return data.response || ''
}

const CATEGORIES = [
  'People-pleasing',
  'Self-comparison',
  'Perfectionism',
  'Time management',
  'Something else',
]

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const getButterflyEmoji = count => {
  if (count >= 30) return '🦋✨'
  if (count >= 14) return '🦋'
  if (count >= 7) return '🪱'
  if (count >= 3) return '🐣'
  return '🥚'
}

function App() {
  const [problem, setProblem] = useState(() => load('utgl_problem', ''))
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
  useEffect(() => { save('utgl_problem', problem) }, [problem])
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

  const [missionsCompleted, setMissionsCompleted] = useState(() => load('utgl_missionsCompleted', 0))
  const [streak, setStreak] = useState(() => load('utgl_streak', 0))
  const [lastCompletedDate, setLastCompletedDate] = useState(() => load('utgl_lastCompletedDate', ''))
  const [xp, setXp] = useState(() => load('utgl_xp', 0))
  const [completedDates, setCompletedDates] = useState(() => load('utgl_completedDates', []))
  const [missionSuccess, setMissionSuccess] = useState(false)

  const [showRightNow, setShowRightNow] = useState(false)
  const [rightNowLoading, setRightNowLoading] = useState(false)
  const [rightNowReply, setRightNowReply] = useState('')
  const [rightNowPeople, setRightNowPeople] = useState(0)
  const [rightNowDidIt, setRightNowDidIt] = useState(false)
  const [rightNowXpFlash, setRightNowXpFlash] = useState(false)

  useEffect(() => { save('utgl_missionsCompleted', missionsCompleted) }, [missionsCompleted])
  useEffect(() => { save('utgl_streak', streak) }, [streak])
  useEffect(() => { save('utgl_lastCompletedDate', lastCompletedDate) }, [lastCompletedDate])
  useEffect(() => { save('utgl_xp', xp) }, [xp])
  useEffect(() => { save('utgl_completedDates', completedDates) }, [completedDates])

  const [onboardingAiReply, setOnboardingAiReply] = useState('')
  const [onboardingAiLoading, setOnboardingAiLoading] = useState(false)
  const [journalAiLoading, setJournalAiLoading] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [mission, setMission] = useState(() => load('utgl_mission', null))
  const [missionLoading, setMissionLoading] = useState(false)
  const [lesson, setLesson] = useState(() => load('utgl_lesson', null))

  useEffect(() => { if (mission) save('utgl_mission', mission) }, [mission])
  useEffect(() => { if (lesson) save('utgl_lesson', lesson) }, [lesson])

  const [lessonFailed, setLessonFailed] = useState(false)

  useEffect(() => {
    if (screen !== 4 || lesson !== null || !selected) return
    const ctx = problem
      ? `My situation: ${problem}. I'm working on: ${selected}.`
      : `I'm working on: ${selected}.`
    callFlutter(FLUTTER_LESSON_SYSTEM, ctx)
      .then(reply => {
        const cleaned = reply.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.title && parsed.body) setLesson(parsed)
        else setLessonFailed(true)
      })
      .catch(() => setLessonFailed(true))
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = getTodayStr()
  const alreadyCompletedToday = lastCompletedDate === todayStr
  const butterflyEmoji = getButterflyEmoji(missionsCompleted)

  const handleMissionComplete = () => {
    if (alreadyCompletedToday) return
    const newStreak = lastCompletedDate === getYesterdayStr() ? streak + 1 : 1
    setMissionsCompleted(prev => prev + 1)
    setXp(prev => prev + 10)
    setStreak(newStreak)
    setLastCompletedDate(todayStr)
    setCompletedDates(prev => prev.includes(todayStr) ? prev : [...prev, todayStr])
    setMissionSuccess(true)
    setTimeout(() => setMissionSuccess(false), 2000)
  }

  const handleLogout = () => {
    if (!window.confirm('Are you sure? This will reset your progress.')) return
    localStorage.clear()
    setScreen(1)
    setProblem('')
    setSelected(null)
    setButterflyName('')
    setUserName('')
    setFeeling(5)
    setMission(null)
    setLesson(null)
    setLessonFailed(false)
    setMissionsCompleted(0)
    setStreak(0)
    setLastCompletedDate('')
    setXp(0)
    setCompletedDates([])
    setJournalEntries(PLACEHOLDER_ENTRIES)
    setOnboardingAiReply('')
    setShowProfile(false)
    setNavTab('home')
  }

  const handleChangeCategory = () => {
    if (!window.confirm('This will reset your focus area, mission, and progress. Your name and butterfly will be kept.')) return
    localStorage.removeItem('utgl_mission')
    localStorage.removeItem('utgl_lesson')
    setSelected(null)
    setMission(null)
    setLesson(null)
    setLessonFailed(false)
    setMissionsCompleted(0)
    setStreak(0)
    setLastCompletedDate('')
    setXp(0)
    setCompletedDates([])
    setProblem('')
    setScreen(2)
    setShowProfile(false)
  }

  const handleRightNowOpen = () => {
    setShowRightNow(true)
    setRightNowLoading(true)
    setRightNowReply('')
    setRightNowDidIt(false)
    setRightNowXpFlash(false)
    setRightNowPeople(Math.floor(Math.random() * 21) + 15)
    const missionTitle = (mission || DEFAULT_MISSION).title
    const ctx = `I'm in the moment right now. My mission is: ${missionTitle}. My situation is: ${problem || 'I want to break my people-pleasing patterns.'}`
    callFlutter(FLUTTER_RIGHT_NOW_SYSTEM, ctx)
      .then(reply => {
        setRightNowReply(reply || RIGHT_NOW_FALLBACK)
        setRightNowLoading(false)
      })
      .catch(() => {
        setRightNowReply(RIGHT_NOW_FALLBACK)
        setRightNowLoading(false)
      })
  }

  const handleRightNowDidIt = () => {
    if (rightNowDidIt) return
    setRightNowDidIt(true)
    const newStreak = lastCompletedDate === getYesterdayStr() ? streak + 1 : (lastCompletedDate === todayStr ? streak : 1)
    if (lastCompletedDate !== todayStr) {
      setMissionsCompleted(prev => prev + 1)
      setXp(prev => prev + 10)
      setStreak(newStreak)
      setLastCompletedDate(todayStr)
      setCompletedDates(prev => prev.includes(todayStr) ? prev : [...prev, todayStr])
    }
    setRightNowXpFlash(true)
    setTimeout(() => {
      setShowRightNow(false)
      setRightNowXpFlash(false)
      setRightNowDidIt(false)
    }, 2000)
  }

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
              <span className="profile-egg">{butterflyEmoji}</span>
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

          <button className="change-category-link" onClick={handleChangeCategory}>Change my focus area</button>
          <button className="logout-link" onClick={handleLogout}>Log out</button>

        </div>
      </div>
    )
  }

  if (screen === 4 && navTab === 'journal') {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const saveEntry = async () => {
      if (!journalDraft.trim()) return
      const label = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const text = journalDraft.trim()
      setJournalEntries(prev => [{ date: label, text, flutterReply: null }, ...prev])
      setJournalDraft('')
      setExpandedEntry(0)
      setJournalAiLoading(true)
      try {
        const reply = await callFlutter(FLUTTER_JOURNAL_SYSTEM, text)
        if (reply) {
          setJournalEntries(prev => prev.map((e, i) => i === 0 ? { ...e, flutterReply: reply } : e))
        }
      } catch {
        // fail silently
      } finally {
        setJournalAiLoading(false)
      }
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
              <Fragment key={i}>
                <div className="h-card journal-entry-card">
                  <div
                    className="entry-header entry-header--tappable"
                    onClick={() => setExpandedEntry(expandedEntry === i ? null : i)}
                  >
                    <p className="journal-entry-date">{entry.date}</p>
                    <div className="entry-header-actions">
                      <span className="entry-chevron">{expandedEntry === i ? '▲' : '▼'}</span>
                      <button
                        className="entry-delete-btn"
                        onClick={e => { e.stopPropagation(); setJournalEntries(prev => prev.filter((_, j) => j !== i)) }}
                        aria-label="Delete entry"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <p className={`journal-entry-preview${expandedEntry === i ? ' journal-entry-preview--full' : ''}`}>
                    {entry.text}
                  </p>
                </div>
                {expandedEntry === i && (
                  i === 0 && journalAiLoading ? (
                    <div className="h-card flutter-reply-card">
                      <p className="flutter-name">🦋 Flutter</p>
                      <p className="flutter-thinking">Flutter is thinking…</p>
                    </div>
                  ) : entry.flutterReply ? (
                    <div className="h-card flutter-reply-card">
                      <p className="flutter-name">🦋 Flutter said:</p>
                      <p className="flutter-reply-text">{entry.flutterReply}</p>
                    </div>
                  ) : null
                )}
              </Fragment>
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
      { label: 'First Day', icon: '✅', earned: missionsCompleted >= 1 },
      { label: 'Week Warrior', icon: '🔥', earned: streak >= 7 },
      { label: 'Courage Builder', icon: '⭐', earned: missionsCompleted >= 5 },
      { label: '30-Day Legend', icon: '🦋', earned: missionsCompleted >= 30 },
      { label: 'Zen Master', icon: '🧘', earned: xp >= 500 },
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
                <span className="ins-streak-label">🔥 {streak} day streak</span>
                <div className="ins-flames ins-flames--compact">
                  {['M','T','W','T','F','S','S'].map((d, i) => {
                    const dayOfWeek = new Date().getDay()
                    const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                    const diff = i - todayIdx
                    const date = new Date()
                    date.setDate(date.getDate() + diff)
                    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
                    const lit = completedDates.includes(ds)
                    return (
                      <div key={i} className="ins-flame-col">
                        <span className={`ins-flame ins-flame--sm${lit ? '' : ' ins-flame--dim'}`}>🔥</span>
                        <span className="ins-flame-day">{d}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="h-card ins-xp-card ins-half">
                <p className="ins-xp-label">⚡ XP</p>
                <p className="ins-xp-value">{xp}</p>
                <div className="ins-xp-bar-track">
                  <div className="ins-xp-bar-fill" style={{ width: `${Math.min((xp % 500) / 500 * 100, 100)}%` }} />
                </div>
                <p className="ins-xp-sub">/ 500 next level</p>
              </div>
            </div>

            <div className="h-card">
              <p className="h-card-label">Badges</p>
              <div className="ins-badges">
                {badges.map(b => (
                  <div key={b.label} className={`ins-badge${b.earned ? '' : ' ins-badge--locked'}`}>
                    <span className="ins-badge-icon">{b.earned ? b.icon : '🔒'}</span>
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
                  <span className="ins-stat-value">{missionsCompleted}</span>
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
              <span className="home-name">Hi, {userName}! {butterflyEmoji}</span>
              <div className="home-header-right">
                <span className="home-day-badge">Day 1</span>
                <button className="profile-icon" onClick={() => setShowProfile(true)}>👤</button>
              </div>
            </div>
            <p className="home-focus">Working on: <strong>{selected}</strong></p>
          </div>

          <div className="home-cards">

            <div className="h-card h-card--center">
              <div className="h-butterfly">{butterflyEmoji}</div>
              <p className="h-butterfly-name">{butterflyName}</p>
              <p className="h-progress">{missionsCompleted}/30 missions</p>
            </div>

            <div className="h-card">
              <p className="h-card-label">📚 Today's Lesson</p>
              {lesson ? (
                <>
                  <p className="h-card-title">{lesson.title}</p>
                  <p className="h-card-body">{lesson.body}</p>
                </>
              ) : lessonFailed ? (
                <>
                  <p className="h-card-title">Today's Lesson</p>
                  <p className="h-card-body">Your personalized lesson will be ready next time you open the app.</p>
                </>
              ) : (
                <p className="flutter-thinking">Loading your lesson…</p>
              )}
            </div>

            <div className="h-card h-card--mission">
              <p className="h-card-label">🎯 Guided Mission</p>
              {missionLoading ? (
                <p className="flutter-thinking">Flutter is creating your mission…</p>
              ) : (
                <>
                  <p className="h-card-title">{(mission || DEFAULT_MISSION).title}</p>
                  <div className="h-steps">
                    {(mission || DEFAULT_MISSION).steps.map((step, i) => (
                      <div key={i} className={`h-step${i === 0 ? ' h-step--active' : ''}`}>
                        <span className="h-step-num">{i + 1}</span>
                        <span className="h-step-text">{step}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="h-btn h-btn--gold"
                    onClick={handleMissionComplete}
                    disabled={alreadyCompletedToday}
                  >
                    {alreadyCompletedToday ? '✅ Done for today!' : '✅ I Did The Steps!'}
                  </button>
                  {missionSuccess && <p className="flutter-thinking">🎉 Great work! Keep going.</p>}
                  <button className="h-btn h-btn--red" onClick={handleRightNowOpen}>🔥 I'm Doing It RIGHT NOW!</button>
                </>
              )}
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

        {showRightNow && (
          <div className="rn-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRightNow(false) }}>
            <div className="rn-modal">
              <div className="rn-header">
                <span className="rn-title">🔥 You're in the moment</span>
              </div>

              <div className="rn-flutter-card">
                <p className="flutter-name">Flutter</p>
                {rightNowLoading ? (
                  <p className="flutter-thinking">Flutter is with you right now…</p>
                ) : (
                  <p className="flutter-reply-text">{rightNowReply}</p>
                )}
              </div>

              {!rightNowLoading && (
                <p className="rn-social-proof">
                  You're not alone — <strong>{rightNowPeople} people</strong> doing something hard right now too.
                </p>
              )}

              <div className="rn-actions">
                {rightNowXpFlash ? (
                  <div className="rn-xp-flash">
                    <span className="rn-xp-text">+10 XP ⚡</span>
                    <p className="flutter-thinking" style={{ textAlign: 'center' }}>🎉 You did it! So proud of you.</p>
                  </div>
                ) : (
                  <>
                    <button
                      className="h-btn h-btn--green rn-did-it-btn"
                      onClick={handleRightNowDidIt}
                      disabled={rightNowLoading}
                    >
                      ✅ I Did It!
                    </button>
                    <button className="rn-need-moment" onClick={() => setShowRightNow(false)}>
                      I need a moment...
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
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
          onClick={async () => {
            setScreen(4)
            const needsMission = mission === null
            const needsLesson = lesson === null
            if (!needsMission && !needsLesson) return
            if (needsMission) setMissionLoading(true)
            const ctx = `My situation: ${problem}. I'm working on: ${selected}.`
            await Promise.all([
              needsMission
                ? callFlutter(FLUTTER_MISSION_SYSTEM, ctx)
                    .then(reply => {
                      const parsed = JSON.parse(reply)
                      if (parsed.title && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
                        setMission(parsed)
                      }
                    })
                    .catch(() => {})
                : Promise.resolve(),
              needsLesson
                ? callFlutter(FLUTTER_LESSON_SYSTEM, ctx)
                    .then(reply => {
                      const cleaned = reply.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
                      const parsed = JSON.parse(cleaned)
                      if (parsed.title && parsed.body) setLesson(parsed)
                    })
                    .catch(() => {})
                : Promise.resolve(),
            ])
            if (needsMission) setMissionLoading(false)
          }}
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

  const handleOnboardingNext = async () => {
    if (!problem.trim()) { setScreen(2); return }
    setOnboardingAiLoading(true)
    try {
      const reply = await callFlutter(FLUTTER_ONBOARDING_SYSTEM, problem)
      if (reply) {
        setOnboardingAiReply(reply)
        const match = CATEGORIES.find(c => reply.includes(c))
        if (match) setSelected(match)
      } else {
        setScreen(2)
      }
    } catch {
      setScreen(2)
    } finally {
      setOnboardingAiLoading(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="logo">🦋</div>
      <h1>Untangle</h1>
      <p className="tagline">Change your life. Feel less alone.</p>

      {onboardingAiLoading ? (
        <p className="flutter-thinking flutter-thinking--center">Flutter is thinking…</p>
      ) : onboardingAiReply ? (
        <>
          <div className="onboarding-reply-card">
            <p className="flutter-name">🦋 Flutter</p>
            <p className="onboarding-reply-text">
              {(() => {
                const cat = CATEGORIES.find(c => onboardingAiReply.includes(c))
                if (!cat) return onboardingAiReply
                const idx = onboardingAiReply.indexOf(cat)
                return <>{onboardingAiReply.slice(0, idx)}<strong>{cat}</strong>{onboardingAiReply.slice(idx + cat.length)}</>
              })()}
            </p>
          </div>
          <button className="next-button" onClick={() => setScreen(2)}>
            Continue →
          </button>
        </>
      ) : (
        <>
          <label className="question">Hi! What's going on today?</label>
          <textarea
            className="problem-input"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="I can't say no to people, even when I'm exhausted..."
            rows="4"
          />
          <button className="next-button" onClick={handleOnboardingNext}>
            Next →
          </button>
        </>
      )}
    </div>
  )
}

export default App
