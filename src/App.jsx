import { useState, useEffect, useRef, Fragment } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import jsPDF from 'jspdf'
import './App.css'
import { db, auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase'
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, serverTimestamp, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore'

const NAV_ITEMS = [
  { id: 'home',      emoji: '🏠', label: 'Home' },
  { id: 'journal',   emoji: '📝', label: 'Journal' },
  { id: 'community', emoji: '👥', label: 'Community' },
  { id: 'insights',  emoji: '📊', label: 'Insights' },
  { id: 'plan',      emoji: '🗺️', label: 'Plan' },
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

const FLUTTER_ONBOARDING_SYSTEM = "You are Flutter, a warm and supportive mental health companion. The user has just shared what's bothering them. Respond in 3 sentences maximum: first acknowledge what they shared with genuine empathy, then say you'd like to understand better, then end with exactly one sentence suggesting the most relevant category from this list: People-pleasing, Self-comparison, Perfectionism, Overthinking, Overwhelm. The final sentence must follow this format: \"Based on what you shared, it sounds like [category] might be the place to start.\" Be warm, never clinical. Never mention therapy or diagnosis."

const FLUTTER_JOURNAL_SYSTEM = "You are Flutter, a warm mental health companion. When a user shares a journal entry, do two things in 4 sentences maximum: first offer a brief reframe that sounds like hard-won wisdom from a wise friend — not a named psychological framework. Good reframes sound like: 'The guilt you felt? That is not proof you did something wrong. It is just a pattern trying to stay alive.' or 'You were taught that love means saying yes. That is not a flaw — it made sense once.' Then ask ONE specific follow-up question that digs into the exact situation they described, not a generic question like how did that make you feel. Be warm and human. Never name any psychological framework. Never mention therapy, diagnosis, or that you are an AI. End with the question. If anything suggests a crisis, respond only with: 'It sounds like you might be going through something really hard. Please reach out to the 988 Suicide and Crisis Lifeline by calling or texting 988.'"

const FLUTTER_MISSION_SYSTEM = 'You are Flutter, a warm mental health companion. Generate a tiny, doable mission for TODAY ONLY based on the user\'s specific situation. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "title": "5 words max, specific to them",\n  "steps": [\n    "Tiny step 1 specific to their actual situation",\n    "Tiny step 2",\n    "Tiny step 3",\n    "Tiny step 4"\n  ]\n}\nCRITICAL CONSTRAINTS: The whole mission must take 5-10 minutes maximum. It must be doable TODAY — not a multi-day plan or habit. Day 1 should feel almost too easy; the goal is one small win, not a transformation. Steps must be tiny and concrete. Reference their specific context directly. Title is 5 words max.\n\nCategory-specific framing (use whichever fits the user\'s situation):\n- People-pleasing: notice the urge to say yes, pause before responding, say no to one small thing. The insight: every automatic yes costs something.\n- Self-comparison: notice one moment of comparison, name what you\'re actually afraid of underneath it, redirect to one thing you chose for yourself.\n- Perfectionism: do one thing imperfectly on purpose, ship something before it feels ready, notice the difference between "good enough" and "not done".\n- Overthinking: take ONE small action without waiting to feel certain first — pick something you\'ve been going in circles about and do the next physical step right now. Notice a mental loop (a conversation you\'re replaying, a decision you can\'t land on) and set a 2-minute timer: decide before it rings, then move on. The Adlerian insight: you cannot think your way to certainty. Action is the only thing that breaks the loop.\n- Overwhelm: pick just ONE item from the mental pile and do only that — not the most important, just the first. Write down everything in your head, then cross off anything that isn\'t actually yours to carry today. Say no to one thing. The Adlerian insight: not everything on your plate is yours. Courage means choosing what matters and letting the rest wait.\n\nWrong tone: "Navigate Your First Week Like a Pro" with heavy life-planning steps. Right tone: "Notice One Yes Today" with steps like "Pay attention when someone asks you for something. Notice: do you want to say yes? What feeling comes up? Write one word down. That\'s it."'

const FLUTTER_LESSON_SYSTEM = 'You are Flutter. Based on the user\'s specific situation, generate a personalized lesson for today. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "title": "Short specific lesson title (5 words max) tailored to their situation — never generic",\n  "body": "ONE paragraph (2-3 sentences max) introducing the lesson in a way that connects directly to their specific situation. Make it feel written just for them. Warm, not clinical. No framework names."\n}\nChoose the lesson topic and framing based on what the user is working on:\n- People-pleasing / saying yes automatically: why people default to yes, what it costs them, the courage to choose.\n- Self-comparison: why comparison feels informative but isn\'t, what it\'s really measuring, the cost of someone else\'s highlight reel.\n- Perfectionism: how perfectionism masquerades as high standards but is really fear of judgment, what "done" actually means.\n- Overthinking: why the mind loops (it\'s trying to find certainty in an uncertain world), why more thinking doesn\'t help, and how action — not analysis — is the only thing that breaks the loop. Adlerian framing: courage means moving before you feel ready. You cannot think your way to certainty.\n- Overwhelm: why everything feels equally urgent (it isn\'t), what task separation looks like (what\'s actually yours to carry today vs. what you absorbed from others), and the courage to let some things wait. Adlerian framing: saying no to the unimportant is saying yes to what matters.\nTitle should feel personal — not generic like \'Why We Can\\\'t Say No\' but specific like \'Why You Keep Saying Yes\' or \'Why Your Brain Won\\\'t Stop Looping\' or \'Why Everything Feels Urgent\'.'

const FLUTTER_RIGHT_NOW_SYSTEM = "You are Flutter. The user is in a real moment right now — they're about to do something hard that goes against their people-pleasing pattern. They need immediate, grounding support in 3 sentences maximum.\n\nSentence 1: Acknowledge what's happening in their body right now (chest tight, heart racing, urge to say yes) — make them feel seen.\nSentence 2: Give them one concrete thing to do in the next 10 seconds (take a breath, don't answer on the first ring, say 'let me think about it').\nSentence 3: Remind them they're not alone and they've been building to this moment.\n\nNever be generic. Reference their specific situation and mission. Be warm, human, and brief. No platitudes."

const RIGHT_NOW_FALLBACK = "You've been preparing for exactly this. Whatever you're about to do — you're ready. Take one breath. You know what to say."

const FLUTTER_INSIGHTS_SYSTEM = "You are Flutter. Read these journal entries and write a warm, honest 3-4 sentence summary of what patterns you notice — what this person seems to be working through, what's improving, what's still hard. Reference specific things they wrote about. Don't use clinical language. Sound like a wise friend who's been paying attention. Start with 'Over the past [X] entries...' Never mention Adler or any framework name."

const FLUTTER_MISSION_PLAN_SYSTEM = 'You are Flutter. Generate a personalized 20-mission journey for someone working on their mental wellness. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "phases": [\n    {\n      "id": 1,\n      "title": "Phase 1: Foundation",\n      "missions": [\n        { "id": 1, "title": "Short mission title 5-7 words" },\n        { "id": 2, "title": "Short mission title 5-7 words" },\n        { "id": 3, "title": "Short mission title 5-7 words" },\n        { "id": 4, "title": "Short mission title 5-7 words" },\n        { "id": 5, "title": "Short mission title 5-7 words" }\n      ]\n    },\n    { "id": 2, "title": "Phase 2: Awareness", "missions": [ ...5 missions ids 6-10... ] },\n    { "id": 3, "title": "Phase 3: Practice", "missions": [ ...5 missions ids 11-15... ] },\n    { "id": 4, "title": "Phase 4: Integration", "missions": [ ...5 missions ids 16-20... ] }\n  ]\n}\nReturn exactly 4 phases with exactly 5 missions each (20 total). Mission IDs must be sequential 1-20. Each mission title should be specific to the user\'s situation and category. Missions build in difficulty across phases.'

const FLUTTER_EXPAND_MISSION_SYSTEM = 'You are Flutter. A user has a mission topic for today. Expand it into a concrete, doable mission. Return ONLY a JSON object with no markdown, no backticks, no explanation — just raw JSON in this exact format:\n{\n  "title": "Mission title 5-7 words matching the topic",\n  "steps": [\n    "Tiny concrete step 1",\n    "Tiny concrete step 2",\n    "Tiny concrete step 3",\n    "Tiny concrete step 4"\n  ]\n}\nCRITICAL: The whole mission must take 5-10 minutes maximum. Steps must be tiny and concrete. Reference the user\'s specific context directly.'

const FALLBACK_PLANS = {
  'People-pleasing': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Notice your first yes of the day' },
      { id: 2, title: 'Pause before answering one request' },
      { id: 3, title: 'Write down what you actually want' },
      { id: 4, title: 'Say let me think about it once' },
      { id: 5, title: 'Notice guilt without acting on it' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Spot one automatic yes today' },
      { id: 7, title: 'Name the fear behind your yes' },
      { id: 8, title: 'Let one request sit briefly unanswered' },
      { id: 9, title: 'Notice whose approval you sought today' },
      { id: 10, title: 'Write what you gave up by saying yes' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Say no to one small thing' },
      { id: 12, title: 'Offer a counter-offer instead of yes' },
      { id: 13, title: 'Hold a boundary for one hour' },
      { id: 14, title: 'Let someone be disappointed briefly' },
      { id: 15, title: 'Prioritize one thing only you want' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Choose yourself in one decision today' },
      { id: 17, title: 'Say no warmly with no explanation' },
      { id: 18, title: 'Notice what changed when you said no' },
      { id: 19, title: 'Celebrate one real choice you made' },
      { id: 20, title: 'Write your own wants list for the week' },
    ]},
  ]},
  'Self-comparison': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Catch one comparison thought today' },
      { id: 2, title: 'Name what you are actually afraid of' },
      { id: 3, title: 'List three things only you have done' },
      { id: 4, title: 'Notice what triggers comparison for you' },
      { id: 5, title: 'Unfollow one account that triggers you' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Write what comparison is costing you' },
      { id: 7, title: 'Name one thing you chose for yourself' },
      { id: 8, title: 'Notice comparison without feeding it' },
      { id: 9, title: 'Find one area where you are ahead' },
      { id: 10, title: 'Ask whose timeline am I following' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Take one action just for you today' },
      { id: 12, title: 'Define success on your own terms' },
      { id: 13, title: 'Redirect comparison into curiosity once' },
      { id: 14, title: 'Celebrate one win no one else noticed' },
      { id: 15, title: 'Write your own next chapter opening' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Design one day on your own metrics' },
      { id: 17, title: 'Name three things you value about yourself' },
      { id: 18, title: 'Let someone else win without cost to you' },
      { id: 19, title: 'Notice when you stopped comparing today' },
      { id: 20, title: 'Write your personal definition of enough' },
    ]},
  ]},
  'Perfectionism': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Finish something imperfect on purpose' },
      { id: 2, title: 'Name what good enough looks like today' },
      { id: 3, title: 'Notice the fear behind your high standards' },
      { id: 4, title: 'Ship something before it feels ready' },
      { id: 5, title: 'Give yourself a time limit for one task' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Catch yourself over-polishing today' },
      { id: 7, title: 'Ask who am I doing this for' },
      { id: 8, title: 'Notice what you avoid because of fear' },
      { id: 9, title: 'Make one small decision quickly on purpose' },
      { id: 10, title: 'Write down what done actually means' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Do one thing at 80% and call it done' },
      { id: 12, title: 'Send something unpolished to one person' },
      { id: 13, title: 'Let a mistake exist without fixing it' },
      { id: 14, title: 'Start something you have been delaying' },
      { id: 15, title: 'Decide in two minutes on one thing' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Finish five things at good-enough today' },
      { id: 17, title: 'Notice what improved by being faster' },
      { id: 18, title: 'Let someone see your work in progress' },
      { id: 19, title: 'Celebrate done over perfect once' },
      { id: 20, title: 'Write your new bar for good enough' },
    ]},
  ]},
  'Overthinking': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Name the loop you are in right now' },
      { id: 2, title: 'Set a 2-minute timer and decide' },
      { id: 3, title: 'Take one small action without certainty' },
      { id: 4, title: 'Notice one thought you have replayed today' },
      { id: 5, title: 'Move your body for 5 minutes to reset' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Catch yourself thinking instead of acting' },
      { id: 7, title: 'Name what certainty you are waiting for' },
      { id: 8, title: 'Write the worst case and rate likelihood' },
      { id: 9, title: 'Make one decision and stick with it' },
      { id: 10, title: 'Notice when analysis stops helping you' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Act on something you have been circling' },
      { id: 12, title: 'Let a decision be made and move on' },
      { id: 13, title: 'Interrupt one loop with a physical action' },
      { id: 14, title: 'Stop researching one thing and just do it' },
      { id: 15, title: 'Trust your gut on one small thing today' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Make five small decisions fast today' },
      { id: 17, title: 'Notice what happened after you decided' },
      { id: 18, title: 'Let uncertainty exist without resolving it' },
      { id: 19, title: 'Write what you would tell a friend in loops' },
      { id: 20, title: 'Celebrate one brave imperfect decision' },
    ]},
  ]},
  'Overwhelm': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Write everything in your head right now' },
      { id: 2, title: 'Cross off what is not yours to carry today' },
      { id: 3, title: 'Pick just one thing and only do that' },
      { id: 4, title: 'Say no to one non-essential thing' },
      { id: 5, title: 'Take a 10-minute break on purpose' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Notice what you absorbed from others today' },
      { id: 7, title: 'Name the most important thing only' },
      { id: 8, title: 'Ask what happens if this waits' },
      { id: 9, title: 'Identify one task to delete or delegate' },
      { id: 10, title: 'Write what enough for today looks like' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Protect one hour for deep work today' },
      { id: 12, title: 'Finish one thing before starting another' },
      { id: 13, title: 'Let something slide without guilt today' },
      { id: 14, title: 'Ask for help with one thing you carry' },
      { id: 15, title: 'Design a shorter to-do list on purpose' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Start the day with your one real priority' },
      { id: 17, title: 'Notice when you have done enough today' },
      { id: 18, title: 'Protect your energy from one draining thing' },
      { id: 19, title: 'End the day with three things done well' },
      { id: 20, title: 'Write your personal definition of a good day' },
    ]},
  ]},
  'Something else': { phases: [
    { id: 1, title: 'Phase 1: Foundation', missions: [
      { id: 1, title: 'Name the pattern you want to change' },
      { id: 2, title: 'Notice when the pattern shows up today' },
      { id: 3, title: 'Write one thing you want instead' },
      { id: 4, title: 'Take one small step in a new direction' },
      { id: 5, title: 'Pause before reacting to one trigger' },
    ]},
    { id: 2, title: 'Phase 2: Awareness', missions: [
      { id: 6, title: 'Track when the old pattern appears today' },
      { id: 7, title: 'Name the feeling underneath the pattern' },
      { id: 8, title: 'Ask what you are protecting yourself from' },
      { id: 9, title: 'Notice one small sign of growth today' },
      { id: 10, title: 'Write what triggers the pattern most' },
    ]},
    { id: 3, title: 'Phase 3: Practice', missions: [
      { id: 11, title: 'Respond differently to one trigger today' },
      { id: 12, title: 'Choose your values over your habits once' },
      { id: 13, title: 'Let an urge pass without acting on it' },
      { id: 14, title: 'Do one thing your future self will thank you for' },
      { id: 15, title: 'Name one moment you handled things better' },
    ]},
    { id: 4, title: 'Phase 4: Integration', missions: [
      { id: 16, title: 'Design one day around who you are becoming' },
      { id: 17, title: 'Notice the gap between old you and now' },
      { id: 18, title: 'Let someone see your growth today' },
      { id: 19, title: 'Write what you have learned about yourself' },
      { id: 20, title: 'Celebrate how far you have actually come' },
    ]},
  ]},
}

function getAuthErrorMessage(code) {
  if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(code))
    return 'Incorrect email or password. Try again.'
  if (code === 'auth/email-already-in-use') return 'Account already exists. Try signing in instead.'
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
  if (code === 'auth/popup-blocked') return 'Please allow popups for this site and try again.'
  if (code === 'auth/network-request-failed') return 'Connection issue. Check your internet and try again.'
  return 'Something went wrong. Please try again.'
}

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
  'Overthinking',
  'Overwhelm',
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
const getYesterdayDateStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toDateString()
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
  const [completedToday, setCompletedToday] = useState(() => load('utgl_lastCompletedDate', '') === new Date().toDateString())
  const [xp, setXp] = useState(() => load('utgl_xp', 0))
  const [completedDates, setCompletedDates] = useState(() => load('utgl_completedDates', []))
  const [missionSuccess, setMissionSuccess] = useState(false)
  const [moodCheckedIn, setMoodCheckedIn] = useState(() => load('utgl_moodCheckedInDate', '') === getTodayStr())

  const [showRightNow, setShowRightNow] = useState(false)
  const [rightNowLoading, setRightNowLoading] = useState(false)
  const [rightNowReply, setRightNowReply] = useState('')
  const [rightNowPeople, setRightNowPeople] = useState(0)
  const [rightNowDidIt, setRightNowDidIt] = useState(false)
  const [rightNowXpFlash, setRightNowXpFlash] = useState(false)

  const [moodEntries, setMoodEntries] = useState([])
  const [insightsSummary, setInsightsSummary] = useState('')
  const [insightsSummaryLoading, setInsightsSummaryLoading] = useState(false)
  const insightsSummaryFetchedRef = useRef(false)
  const expandingMissionRef = useRef(false)

  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState('signup')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [showEmailSignIn, setShowEmailSignIn] = useState(false)
  const authInitialized = useRef(false)

  useEffect(() => { save('utgl_missionsCompleted', missionsCompleted) }, [missionsCompleted])
  useEffect(() => { save('utgl_streak', streak) }, [streak])
  useEffect(() => { save('utgl_lastCompletedDate', lastCompletedDate) }, [lastCompletedDate])
  useEffect(() => { save('utgl_xp', xp) }, [xp])
  useEffect(() => { save('utgl_completedDates', completedDates) }, [completedDates])

  const loadUserAndRoute = async (user) => {
    const [userSnap, progressSnap, planSnap] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'progress', user.uid)),
      getDoc(doc(db, 'missionPlans', user.uid)),
    ])
    if (userSnap.exists()) {
      const u = userSnap.data()
      if (u.userName)         setUserName(u.userName)
      if (u.butterflyName)    setButterflyName(u.butterflyName)
      if (u.selectedCategory) setSelected(u.selectedCategory)
      if (u.problem)          setProblem(u.problem)
      if (user.email)         setProfileEmail(user.email)
    }
    if (progressSnap.exists()) {
      const p = progressSnap.data()
      setMissionsCompleted(p.missionsCompleted ?? 0)
      setStreak(p.streak ?? 0)
      setXp(p.xp ?? 0)
      setLastCompletedDate(p.lastCompletedDate ?? '')
      setCompletedToday((p.lastCompletedDate ?? '') === new Date().toDateString())
      setCompletedDates(p.completedDates ?? [])
      if (p.currentMission?.expandedDate === new Date().toDateString()) {
        const { title, steps } = p.currentMission
        setMission({ title, steps, cachedDate: new Date().toDateString() })
      }
    }
    if (planSnap.exists()) setMissionPlan(planSnap.data())
    if (userSnap.exists()) {
      const journalSnap = await getDocs(
        query(collection(db, 'journals', user.uid, 'entries'), orderBy('timestamp', 'desc'))
      )
      setJournalEntries(journalSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setMoodCheckedIn(load('utgl_moodCheckedInDate', '') === getTodayStr())
      setScreen(7)
    } else {
      setScreen(2)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (authInitialized.current) return
      authInitialized.current = true
      if (!user) {
        setCurrentUser(null)
        setScreen(1)
        setAuthLoading(false)
        return
      }
      setCurrentUser(user)
      try {
        await loadUserAndRoute(user)
      } catch (e) {
        console.error('Auth load error:', e.code, e.message, e)
        setScreen(1)
      } finally {
        setAuthLoading(false)
      }
    })
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [onboardingAiReply, setOnboardingAiReply] = useState('')
  const [onboardingAiLoading, setOnboardingAiLoading] = useState(false)
  const [journalAiLoading, setJournalAiLoading] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [mission, setMission] = useState(() => {
    const m = load('utgl_mission', null)
    return (m && m.cachedDate === new Date().toDateString()) ? m : null
  })
  const [missionLoading, setMissionLoading] = useState(false)
  const [lesson, setLesson] = useState(() => load('utgl_lesson', null))
  const [missionPlan, setMissionPlan] = useState(null)
  const [showPlanLoading, setShowPlanLoading] = useState(false)
  const [editingMissionId, setEditingMissionId] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => { if (mission) save('utgl_mission', mission) }, [mission])
  useEffect(() => { if (lesson) save('utgl_lesson', lesson) }, [lesson])
  useEffect(() => { if (screen === 6) setAuthMode('signup') }, [screen])

  useEffect(() => {
    if (navTab !== 'journal' || !currentUser?.uid) return
    getDocs(query(collection(db, 'journals', currentUser.uid, 'entries'), orderBy('timestamp', 'desc')))
      .then(snap => setJournalEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(e => console.error('[Firestore] Journal tab fetch failed | code:', e.code, '| message:', e.message))
  }, [navTab, currentUser?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (navTab !== 'insights') return

    if (currentUser?.uid) {
      getDocs(query(collection(db, 'moods', currentUser.uid, 'entries'), orderBy('timestamp', 'asc')))
        .then(snap => setMoodEntries(snap.docs.map(d => d.data())))
        .catch(e => console.error('[Firestore] Mood entries fetch failed | code:', e.code, '| message:', e.message, e))
    }

    if (!insightsSummaryFetchedRef.current && journalEntries.length >= 3) {
      insightsSummaryFetchedRef.current = true
      setInsightsSummaryLoading(true)
      const recent = journalEntries.slice(0, 7)
      const entriesText = recent.map(e => `${e.date || ''}: ${e.text || ''}`).join('\n')
      callFlutter(FLUTTER_INSIGHTS_SYSTEM, `Here are my recent journal entries:\n${entriesText}`)
        .then(summary => {
          setInsightsSummary(summary)
          setInsightsSummaryLoading(false)
        })
        .catch(() => setInsightsSummaryLoading(false))
    }
  }, [navTab, currentUser?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const [lessonFailed, setLessonFailed] = useState(false)

  useEffect(() => {
    if (screen !== 7 || lesson !== null || !selected) return
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

  useEffect(() => {
    if (screen !== 7 || !currentUser?.uid || !missionPlan || mission || missionLoading || expandingMissionRef.current) return
    const allMissions = missionPlan.phases.flatMap(p => p.missions)
    const currentTopic = allMissions.find(m => m.id === missionsCompleted + 1)
    if (!currentTopic) return
    expandingMissionRef.current = true
    setMissionLoading(true)
    expandCurrentMission(currentUser.uid, currentTopic.title)
      .finally(() => {
        setMissionLoading(false)
        expandingMissionRef.current = false
      })
  }, [screen, missionPlan, mission]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = getTodayStr()          // YYYY-MM-DD — used for completedDates array, mood, PDF
  const todayDateStr = new Date().toDateString() // local date string — used for lastCompletedDate
  const alreadyCompletedToday = completedToday
  const butterflyEmoji = getButterflyEmoji(missionsCompleted)

  const handleMissionComplete = async () => {
    if (completedToday) return
    setMissionSuccess(true)
    setTimeout(() => setMissionSuccess(false), 2000)

    if (currentUser) {
      try {
        const progressSnap = await getDoc(doc(db, 'progress', currentUser.uid))
        const p = progressSnap.exists() ? progressSnap.data() : {}
        const currentLastDate = p.lastCompletedDate ?? ''
        if (currentLastDate === todayDateStr) { setCompletedToday(true); return }
        const currentMC = p.missionsCompleted ?? 0
        const currentXp = p.xp ?? 0
        const currentStreak = p.streak ?? 0
        const currentDates = p.completedDates ?? []
        const newMC = currentMC + 1
        const newXp = currentXp + 10
        const newStreak = currentLastDate === getYesterdayDateStr() ? currentStreak + 1 : 1
        const newDates = currentDates.includes(todayStr) ? currentDates : [...currentDates, todayStr]
        await setDoc(doc(db, 'progress', currentUser.uid), {
          missionsCompleted: newMC, streak: newStreak, xp: newXp,
          lastCompletedDate: todayDateStr, completedDates: newDates,
        })
        setMissionsCompleted(newMC)
        setXp(newXp)
        setStreak(newStreak)
        setLastCompletedDate(todayDateStr)
        setCompletedToday(true)
        setCompletedDates(newDates)
      } catch (e) {
        console.error('[Firestore] Progress update (I Did It!) failed | code:', e.code, '| message:', e.message, e)
      }
    } else {
      const newStreak = lastCompletedDate === getYesterdayDateStr() ? streak + 1 : 1
      const newMC = missionsCompleted + 1
      const newXp = xp + 10
      const newDates = completedDates.includes(todayStr) ? completedDates : [...completedDates, todayStr]
      setMissionsCompleted(newMC)
      setXp(newXp)
      setStreak(newStreak)
      setLastCompletedDate(todayDateStr)
      setCompletedToday(true)
      setCompletedDates(newDates)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.clear()
    save('utgl_hadAccount', false)
    setCurrentUser(null)
    setScreen(1)
    setProblem('')
    setSelected(null)
    setButterflyName('')
    setUserName('')
    setFeeling(5)
    setMission(null)
    setMissionPlan(null)
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
    setAuthMode('signup')
    setAuthEmail('')
    setAuthPassword('')
    setAuthError('')
    setShowEmailSignIn(false)
    expandingMissionRef.current = false
  }

  const handleChangeCategory = async () => {
    if (!window.confirm('This will reset your focus area, mission, and progress. Your name and butterfly will be kept.')) return
    localStorage.removeItem('utgl_mission')
    localStorage.removeItem('utgl_lesson')
    setSelected(null)
    setMission(null)
    setMissionPlan(null)
    setLesson(null)
    setLessonFailed(false)
    setMissionsCompleted(0)
    setStreak(0)
    setLastCompletedDate('')
    setXp(0)
    setCompletedDates([])
    setProblem('')
    setScreen(4)
    expandingMissionRef.current = false
    setShowProfile(false)
    if (currentUser) {
      setDoc(doc(db, 'progress', currentUser.uid), {
        missionsCompleted: 0, streak: 0, xp: 0, lastCompletedDate: '', completedDates: [],
      }, { merge: true }).catch(e =>
        console.error('[Firestore] Progress reset (change category) failed | code:', e.code, '| message:', e.message, e)
      )
    }
  }

  const handleMoodCheckin = () => {
    if (moodCheckedIn) return
    const history = load('utgl_moodHistory', [])
    const updated = [...history, { date: todayStr, value: feeling }].slice(-90)
    save('utgl_moodHistory', updated)
    save('utgl_moodCheckedInDate', todayStr)
    setMoodCheckedIn(true)
    if (currentUser) {
      addDoc(collection(db, 'moods', currentUser.uid, 'entries'), {
        value: feeling, date: todayStr, timestamp: serverTimestamp(),
      }).catch(e =>
        console.error('[Firestore] Mood write failed | code:', e.code, '| message:', e.message, e)
      )
    }
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

  const handleRightNowDidIt = async () => {
    if (rightNowDidIt) return
    setRightNowDidIt(true)

    const showAlreadyDone = () => {
      setTimeout(() => {
        setShowRightNow(false)
        setRightNowDidIt(false)
      }, 2500)
    }

    const showSuccess = () => {
      setCompletedToday(true)
      setRightNowXpFlash(true)
      setTimeout(() => {
        setShowRightNow(false)
        setRightNowXpFlash(false)
        setRightNowDidIt(false)
      }, 2000)
    }

    // Fast local check first
    if (completedToday) {
      showAlreadyDone()
      return
    }

    if (currentUser) {
      try {
        const progressSnap = await getDoc(doc(db, 'progress', currentUser.uid))
        const p = progressSnap.exists() ? progressSnap.data() : {}
        const currentLastDate = p.lastCompletedDate ?? ''
        if (currentLastDate === todayDateStr) {
          setCompletedToday(true)
          showAlreadyDone()
          return
        }
        const currentMC = p.missionsCompleted ?? 0
        const currentXp = p.xp ?? 0
        const currentStreak = p.streak ?? 0
        const currentDates = p.completedDates ?? []
        const newMC = currentMC + 1
        const newXp = currentXp + 10
        const newStreak = currentLastDate === getYesterdayDateStr() ? currentStreak + 1 : 1
        const newDates = currentDates.includes(todayStr) ? currentDates : [...currentDates, todayStr]
        await setDoc(doc(db, 'progress', currentUser.uid), {
          missionsCompleted: newMC, streak: newStreak, xp: newXp,
          lastCompletedDate: todayDateStr, completedDates: newDates,
        })
        setMissionsCompleted(newMC)
        setXp(newXp)
        setStreak(newStreak)
        setLastCompletedDate(todayDateStr)
        setCompletedDates(newDates)
      } catch (e) {
        console.error('[Firestore] Progress update (Right Now Did It!) failed | code:', e.code, '| message:', e.message, e)
      }
    } else {
      const newStreak = lastCompletedDate === getYesterdayDateStr() ? streak + 1 : 1
      const newDates = completedDates.includes(todayStr) ? completedDates : [...completedDates, todayStr]
      setMissionsCompleted(m => m + 1)
      setXp(x => x + 10)
      setStreak(newStreak)
      setLastCompletedDate(todayDateStr)
      setCompletedDates(newDates)
    }

    showSuccess()
  }

  const generateAndSaveMissionPlan = async (uid) => {
    const ctx = `My situation: ${problem}. I am working on: ${selected || 'personal growth'}.`
    try {
      const reply = await callFlutter(FLUTTER_MISSION_PLAN_SYSTEM, ctx)
      const cleaned = reply.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed.phases?.length > 0) {
        await setDoc(doc(db, 'missionPlans', uid), { phases: parsed.phases, generatedAt: serverTimestamp() })
        setMissionPlan(parsed)
        return parsed
      }
    } catch (e) {
      console.error('[MissionPlan] Generation failed, using fallback:', e)
    }
    const fallback = FALLBACK_PLANS[selected] || FALLBACK_PLANS['Something else']
    await setDoc(doc(db, 'missionPlans', uid), { phases: fallback.phases, generatedAt: serverTimestamp() })
    setMissionPlan(fallback)
    return fallback
  }

  const expandCurrentMission = async (uid, topicTitle) => {
    const ctx = `My situation: ${problem}. I am working on: ${selected || 'personal growth'}. Today's mission topic: ${topicTitle}`
    try {
      const reply = await callFlutter(FLUTTER_EXPAND_MISSION_SYSTEM, ctx)
      const cleaned = reply.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed.title && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        const missionData = { title: parsed.title, steps: parsed.steps, cachedDate: new Date().toDateString() }
        setMission(missionData)
        if (uid) {
          await setDoc(doc(db, 'progress', uid), {
            currentMission: { title: parsed.title, steps: parsed.steps, expandedDate: new Date().toDateString() },
          }, { merge: true })
        }
        return
      }
    } catch (e) {
      console.error('[ExpandMission] Failed:', e)
    }
    setMission(DEFAULT_MISSION)
  }

  const handleSaveMissionEdit = async (missionId, newTitle) => {
    if (!missionPlan || !newTitle.trim()) return
    const updatedPhases = missionPlan.phases.map(phase => ({
      ...phase,
      missions: phase.missions.map(m => m.id === missionId ? { ...m, title: newTitle.trim() } : m),
    }))
    const updatedPlan = { ...missionPlan, phases: updatedPhases }
    setMissionPlan(updatedPlan)
    setEditingMissionId(null)
    setEditDraft('')
    if (currentUser) {
      setDoc(doc(db, 'missionPlans', currentUser.uid), { phases: updatedPhases }, { merge: true })
        .catch(e => console.error('[Firestore] MissionPlan edit failed | code:', e.code, '| message:', e.message, e))
    }
  }

  const handleRegenerateMission = async () => {
    if (!missionPlan || !currentUser?.uid) return
    setMission(null)
    localStorage.removeItem('utgl_mission')
    const allMissions = missionPlan.phases.flatMap(p => p.missions)
    const currentTopic = allMissions.find(m => m.id === missionsCompleted + 1)
    if (!currentTopic) return
    expandingMissionRef.current = false
    setMissionLoading(true)
    try {
      await expandCurrentMission(currentUser.uid, currentTopic.title)
    } finally {
      setMissionLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setAuthError('')
    setAuthSubmitting(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      setCurrentUser(user)
      const userSnap = await getDoc(doc(db, 'users', user.uid))
      if (userSnap.exists()) {
        const u = userSnap.data()
        if (u.userName)         setUserName(u.userName)
        if (u.butterflyName)    setButterflyName(u.butterflyName)
        if (u.selectedCategory) setSelected(u.selectedCategory)
        if (u.problem)          setProblem(u.problem)
        if (user.email)         setProfileEmail(user.email)
        const [progressSnap, planSnap, journalSnap] = await Promise.all([
          getDoc(doc(db, 'progress', user.uid)),
          getDoc(doc(db, 'missionPlans', user.uid)),
          getDocs(query(collection(db, 'journals', user.uid, 'entries'), orderBy('timestamp', 'desc'))),
        ])
        if (progressSnap.exists()) {
          const p = progressSnap.data()
          setMissionsCompleted(p.missionsCompleted ?? 0)
          setStreak(p.streak ?? 0)
          setXp(p.xp ?? 0)
          setLastCompletedDate(p.lastCompletedDate ?? '')
          setCompletedToday((p.lastCompletedDate ?? '') === new Date().toDateString())
          setCompletedDates(p.completedDates ?? [])
          if (p.currentMission?.expandedDate === new Date().toDateString()) {
            const { title, steps } = p.currentMission
            setMission({ title, steps, cachedDate: new Date().toDateString() })
          }
        }
        if (planSnap.exists()) setMissionPlan(planSnap.data())
        setJournalEntries(journalSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        save('utgl_hadAccount', true)
        setScreen(7)
      } else {
        const nameToUse = userName.trim() || user.displayName?.split(' ')[0] || ''
        if (nameToUse) setUserName(nameToUse)
        try {
          await Promise.all([
            setDoc(doc(db, 'users', user.uid), {
              userName: nameToUse,
              butterflyName: butterflyName.trim(),
              selectedCategory: selected,
              problem,
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp(),
            }),
            setDoc(doc(db, 'progress', user.uid), {
              missionsCompleted: 0, streak: 0, xp: 0, lastCompletedDate: '', completedDates: [],
            }),
          ])
          const verifySnap = await getDoc(doc(db, 'users', user.uid))
          if (!verifySnap.exists()) {
            console.error('[Firestore] Write appeared to succeed but read-back returned no document for uid:', user.uid)
          } else {
            console.log('[Firestore] Write verified for uid:', user.uid, verifySnap.data())
          }
        } catch (fsErr) {
          console.error('[Firestore] setDoc failed for uid:', user.uid, '| code:', fsErr.code, '| message:', fsErr.message, fsErr)
          throw fsErr
        }
        save('utgl_hadAccount', true)
        setShowPlanLoading(true)
        setScreen(7)
        try { await generateAndSaveMissionPlan(user.uid) } finally { setShowPlanLoading(false) }
      }
    } catch (e) {
      console.error('[handleGoogleAuth] error:', e.code, e.message, e)
      setAuthError(getAuthErrorMessage(e.code))
    } finally {
      setAuthSubmitting(false)
    }
  }

  // Used on the landing screen — routes returning users to Home, new users to onboarding
  const handleLandingGoogle = async () => {
    setAuthError('')
    setAuthSubmitting(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setCurrentUser(result.user)
      save('utgl_hadAccount', true)
      await loadUserAndRoute(result.user)
    } catch (e) {
      console.error('[handleLandingGoogle] error:', e.code, e.message, e)
      setAuthError(getAuthErrorMessage(e.code))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }
    setAuthError('')
    setAuthSubmitting(true)
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword)
        setCurrentUser(result.user)
        setProfileEmail(result.user.email || '')
        try {
          await Promise.all([
            setDoc(doc(db, 'users', result.user.uid), {
              userName: userName.trim(),
              butterflyName: butterflyName.trim(),
              selectedCategory: selected,
              problem,
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp(),
            }),
            setDoc(doc(db, 'progress', result.user.uid), {
              missionsCompleted: 0, streak: 0, xp: 0, lastCompletedDate: '', completedDates: [],
            }),
          ])
          const verifySnap = await getDoc(doc(db, 'users', result.user.uid))
          if (!verifySnap.exists()) {
            console.error('[Firestore] Write appeared to succeed but read-back returned no document for uid:', result.user.uid)
          } else {
            console.log('[Firestore] Write verified for uid:', result.user.uid, verifySnap.data())
          }
        } catch (fsErr) {
          console.error('[Firestore] setDoc failed for uid:', result.user.uid, '| code:', fsErr.code, '| message:', fsErr.message, fsErr)
          throw fsErr
        }
        save('utgl_hadAccount', true)
        setShowPlanLoading(true)
        setScreen(7)
        try { await generateAndSaveMissionPlan(result.user.uid) } finally { setShowPlanLoading(false) }
      } else {
        // Sign-in path (used from landing screen email sign-in)
        const result = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword)
        setCurrentUser(result.user)
        await loadUserAndRoute(result.user)
        save('utgl_hadAccount', true)
      }
    } catch (e) {
      console.error('[handleEmailAuth] error:', e.code, e.message, e)
      setAuthError(getAuthErrorMessage(e.code))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleOnboardingNext = async () => {
    if (!problem.trim()) { setScreen(4); return }
    setScreen(3)
    setOnboardingAiLoading(true)
    try {
      const reply = await callFlutter(FLUTTER_ONBOARDING_SYSTEM, problem)
      if (reply) {
        setOnboardingAiReply(reply)
        const match = CATEGORIES.find(c => reply.includes(c))
        if (match) setSelected(match)
      } else {
        setScreen(4)
      }
    } catch {
      setScreen(4)
    } finally {
      setOnboardingAiLoading(false)
    }
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

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-butterfly">🦋</div>
        <p className="auth-loading-text">Loading...</p>
      </div>
    )
  }

  if (showPlanLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-butterfly">🦋</div>
        <p className="auth-loading-text">Flutter is building your personal mission plan…</p>
        <p className="auth-loading-sub">This takes about 10 seconds</p>
      </div>
    )
  }

  if (screen === 7 && showProfile) {
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

  if (screen === 7 && navTab === 'journal') {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const saveEntry = async () => {
      if (!journalDraft.trim()) return
      const label = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const text = journalDraft.trim()
      setJournalEntries(prev => [{ date: label, text, flutterReply: null }, ...prev])
      setJournalDraft('')
      setExpandedEntry(0)
      setJournalAiLoading(true)
      let firestoreRef = null
      if (currentUser) {
        try {
          firestoreRef = await addDoc(collection(db, 'journals', currentUser.uid, 'entries'), {
            text, date: label, flutterReply: null, timestamp: serverTimestamp(),
          })
          console.log('[Firestore] Journal entry created:', firestoreRef.id)
        } catch (e) {
          console.error('[Firestore] Journal addDoc failed | code:', e.code, '| message:', e.message, e)
        }
      }
      try {
        const reply = await callFlutter(FLUTTER_JOURNAL_SYSTEM, text)
        if (reply) {
          setJournalEntries(prev => prev.map((e, i) => i === 0 ? { ...e, flutterReply: reply } : e))
          if (firestoreRef) {
            updateDoc(firestoreRef, { flutterReply: reply }).catch(e =>
              console.error('[Firestore] Journal flutterReply update failed | code:', e.code, '| message:', e.message)
            )
          }
        }
      } catch {
        // AI call failure - journal text already saved above
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
                        onClick={e => {
                          e.stopPropagation()
                          const entry = journalEntries[i]
                          if (entry.id && currentUser) {
                            deleteDoc(doc(db, 'journals', currentUser.uid, 'entries', entry.id)).catch(e =>
                              console.error('[Firestore] Journal delete failed | code:', e.code, '| message:', e.message)
                            )
                          }
                          setJournalEntries(prev => prev.filter((_, j) => j !== i))
                        }}
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

  if (screen === 7 && navTab === 'community') {
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

  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF()
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const rawMoods = currentUser ? moodEntries : load('utgl_moodHistory', [])
      const startMoodVal = rawMoods.length > 0 ? rawMoods[0].value : null
      const currentMoodVal = rawMoods.length > 0 ? rawMoods[rawMoods.length - 1].value : null
      let y = 22

      // Cover
      pdf.setFontSize(22)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Untangle Progress Report', 105, y, { align: 'center' })
      y += 10
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      if (userName) { pdf.text(userName, 105, y, { align: 'center' }); y += 8 }
      pdf.setFontSize(11)
      pdf.text(today, 105, y, { align: 'center' })
      y += 7
      pdf.setTextColor(150, 150, 150)
      pdf.text('Powered by Untangle', 105, y, { align: 'center' })
      pdf.setTextColor(0, 0, 0)
      y += 16

      // Section 1: Overview
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Overview', 20, y)
      y += 8
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      const overviewLines = [
        `Missions completed: ${missionsCompleted}`,
        `Current streak: ${streak} day${streak !== 1 ? 's' : ''}`,
        `Total XP: ${xp}`,
        startMoodVal !== null ? `Starting mood: ${startMoodVal}/10` : null,
        currentMoodVal !== null ? `Current mood: ${currentMoodVal}/10` : null,
      ].filter(Boolean)
      overviewLines.forEach(line => { pdf.text(line, 20, y); y += 7 })
      y += 8

      // Section 2: Mood trend
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Mood Trend', 20, y)
      y += 8
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      if (rawMoods.length === 0) {
        pdf.text('No mood check-ins recorded yet.', 20, y)
        y += 7
      } else {
        const trendText = rawMoods.slice(-14).map(e => `${e.date}: ${e.value}/10`).join('  →  ')
        const wrapped = pdf.splitTextToSize(trendText, 170)
        pdf.text(wrapped, 20, y)
        y += wrapped.length * 6 + 4
      }
      y += 8

      // Section 3: What Flutter noticed
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('What Flutter Noticed', 20, y)
      y += 8
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const summaryText = insightsSummary || 'Not enough journal entries yet for a summary.'
      const summaryLines = pdf.splitTextToSize(summaryText, 170)
      pdf.text(summaryLines, 20, y)
      y += summaryLines.length * 6 + 8

      // Section 4: Recent journal entries
      if (y > 240) { pdf.addPage(); y = 22 }
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recent Journal Entries', 20, y)
      y += 8
      pdf.setFontSize(10)
      const recent = journalEntries.filter(e => e.text).slice(0, 5)
      if (recent.length === 0) {
        pdf.setFont('helvetica', 'normal')
        pdf.text('No journal entries yet.', 20, y)
      } else {
        recent.forEach(entry => {
          if (y > 258) { pdf.addPage(); y = 22 }
          pdf.setFont('helvetica', 'bold')
          pdf.text(entry.date || '', 20, y)
          y += 6
          pdf.setFont('helvetica', 'normal')
          const lines = pdf.splitTextToSize(entry.text || '', 170)
          pdf.text(lines, 20, y)
          y += lines.length * 6 + 6
        })
      }

      // Footer on every page
      const pageCount = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        const footerLines = pdf.splitTextToSize(
          'This report was generated by Untangle. Untangle is not a substitute for professional mental health care. For support, call or text 988.',
          170
        )
        pdf.text(footerLines, 105, 290, { align: 'center' })
        pdf.setTextColor(0, 0, 0)
      }

      pdf.save(`untangle-report-${getTodayStr()}.pdf`)
    } catch (e) {
      console.error('[PDF Export] Failed:', e)
      alert("PDF export isn't available right now. Try again later.")
    }
  }

  if (screen === 7 && navTab === 'insights' && openLesson) {
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

  if (screen === 7 && navTab === 'insights') {
    const rawMoodEntries = currentUser ? moodEntries : load('utgl_moodHistory', [])
    const last14 = rawMoodEntries.slice(-14)
    const moodPoints = last14.map(e => ({
      label: e.date ? e.date.slice(5).replace('-', '/') : '',
      val: e.value,
    }))
    const startMoodVal = moodPoints.length > 0 ? moodPoints[0].val : null
    const currentMoodVal = moodPoints.length > 0 ? moodPoints[moodPoints.length - 1].val : null
    const moodDelta = startMoodVal !== null && currentMoodVal !== null
      ? +(currentMoodVal - startMoodVal).toFixed(1)
      : null
    const moodCheckInCount = currentUser ? moodEntries.length : load('utgl_moodHistory', []).length

    const badges = [
      { label: 'First Day',      icon: '✅', earned: missionsCompleted >= 1  },
      { label: 'Week Warrior',   icon: '🔥', earned: streak >= 7             },
      { label: 'Courage Builder',icon: '⭐', earned: missionsCompleted >= 5  },
      { label: '30-Day Legend',  icon: '🦋', earned: missionsCompleted >= 30 },
      { label: 'Zen Master',     icon: '🧘', earned: xp >= 500              },
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

            {/* ── Mood trend ── */}
            <div className="h-card">
              <p className="h-card-label">Mood trend</p>
              {moodPoints.length < 2 ? (
                <p className="h-card-body">Check in daily to see your mood trend</p>
              ) : (
                <>
                  <div className="ins-mood-change">
                    <span className="ins-mood-stat">
                      <span className="ins-mood-num">{startMoodVal}</span>
                      <span className="ins-mood-meta">start</span>
                    </span>
                    <span className="ins-mood-arrow">→</span>
                    <span className="ins-mood-stat">
                      <span className={`ins-mood-num${moodDelta !== null && moodDelta >= 0 ? ' ins-mood-num--up' : ''}`}>{currentMoodVal}</span>
                      <span className="ins-mood-meta">today</span>
                    </span>
                    {moodDelta !== null && (
                      <span className="ins-mood-delta">
                        {moodDelta >= 0 ? `↑ +${moodDelta}` : `↓ ${moodDelta}`} since you started
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={moodPoints} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis domain={[1, 10]} hide />
                      <Tooltip formatter={(v) => [`${v}/10`, 'Mood']} />
                      <Line
                        type="monotone"
                        dataKey="val"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ fill: '#7c3aed', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* ── Stats ── */}
            <div className="h-card">
              <p className="h-card-label">Behavior change</p>
              <div className="ins-stats">
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Missions completed</span>
                  <span className="ins-stat-value">{missionsCompleted}</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Current streak</span>
                  <span className="ins-stat-value">{streak} day{streak !== 1 ? 's' : ''}</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Journal entries</span>
                  <span className="ins-stat-value">{journalEntries.length}</span>
                </div>
                <div className="ins-stat-row">
                  <span className="ins-stat-label">Mood check-ins</span>
                  <span className="ins-stat-value">{moodCheckInCount}</span>
                </div>
              </div>
            </div>

            {/* ── AI journal summary ── */}
            <div className="h-card">
              <p className="h-card-label">What we're noticing</p>
              {insightsSummaryLoading ? (
                <p className="flutter-thinking">Flutter is noticing patterns…</p>
              ) : journalEntries.length < 3 ? (
                <p className="h-card-body">Journal for a few more days and Flutter will start noticing patterns</p>
              ) : insightsSummary ? (
                <p className="h-card-body">{insightsSummary}</p>
              ) : (
                <p className="h-card-body">Journal for a few more days and Flutter will start noticing patterns</p>
              )}
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

            <button className="export-btn" onClick={handleExportPDF}>Export for therapist</button>

          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 7 && navTab === 'plan') {
    const allMissions = (missionPlan?.phases || []).flatMap(p => p.missions)
    const totalMissions = allMissions.length
    const currentMissionId = Math.min(missionsCompleted + 1, totalMissions + 1)

    if (editingMissionId !== null) {
      return (
        <>
          <div className="plan-screen">
            <div className="journal-header">
              <button className="back-link" onClick={() => { setEditingMissionId(null); setEditDraft('') }}>← Back</button>
              <p className="journal-title">Edit Mission</p>
            </div>
            <div className="plan-body">
              <div className="h-card">
                <p className="h-card-label">Mission title</p>
                <input
                  className="plan-edit-input"
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  placeholder="Mission title..."
                  autoFocus
                />
                <button
                  className="h-btn h-btn--blue"
                  style={{ marginTop: 12 }}
                  onClick={() => handleSaveMissionEdit(editingMissionId, editDraft)}
                  disabled={!editDraft.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          <BottomNav />
        </>
      )
    }

    return (
      <>
        <div className="plan-screen">
          <div className="journal-header">
            <p className="journal-title">Mission Plan</p>
            <p className="journal-date">Your 20-mission journey 🗺️</p>
          </div>
          <div className="plan-body">
            {!missionPlan ? (
              <div className="h-card">
                <p className="flutter-thinking">Flutter is building your plan…</p>
              </div>
            ) : (
              missionPlan.phases.map(phase => (
                <div key={phase.id} className="plan-phase">
                  <p className="plan-phase-title">{phase.title}</p>
                  {phase.missions.map(m => {
                    const isCompleted = m.id <= missionsCompleted
                    const isCurrent = m.id === currentMissionId
                    const isUpcoming = !isCompleted && !isCurrent && m.id <= currentMissionId + 3
                    const isLocked = !isCompleted && !isCurrent && !isUpcoming
                    return (
                      <div
                        key={m.id}
                        className={`plan-mission${isCompleted ? ' plan-mission--done' : ''}${isCurrent ? ' plan-mission--current' : ''}${isLocked ? ' plan-mission--locked' : ''}`}
                      >
                        <div className="plan-mission-left">
                          <span className="plan-mission-icon">
                            {isCompleted ? '✅' : isCurrent ? '🎯' : isLocked ? '🔒' : '○'}
                          </span>
                          <span className="plan-mission-title-text">
                            {isLocked ? 'Mission locked' : m.title}
                          </span>
                        </div>
                        <div className="plan-mission-right">
                          {!isLocked && (
                            <button className="plan-edit-btn" onClick={() => { setEditingMissionId(m.id); setEditDraft(m.title) }}>Edit</button>
                          )}
                          {isCurrent && (
                            <button className="plan-regen-btn" onClick={handleRegenerateMission}>↻</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  if (screen === 7 && navTab !== 'home') {
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

  if (screen === 7) {
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
                    {alreadyCompletedToday ? 'Done for today ✓' : '✅ I Did The Steps!'}
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
              <button
                className="h-btn h-btn--blue"
                onClick={handleMoodCheckin}
                disabled={moodCheckedIn}
              >
                {moodCheckedIn ? '✅ Logged for today' : 'Submit Check-in'}
              </button>
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
                ) : completedToday ? (
                  <p className="flutter-thinking" style={{ textAlign: 'center' }}>
                    You already crushed it today 🦋 Come back tomorrow for your next mission.
                  </p>
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

  if (screen === 5) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(4)}>← Back</button>
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
            if (currentUser) {
              // Already authenticated — save onboarding data and go straight to Home
              try {
                await Promise.all([
                  setDoc(doc(db, 'users', currentUser.uid), {
                    userName: userName.trim(),
                    butterflyName: butterflyName.trim(),
                    selectedCategory: selected,
                    problem,
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                  }),
                  setDoc(doc(db, 'progress', currentUser.uid), {
                    missionsCompleted: 0, streak: 0, xp: 0, lastCompletedDate: '', completedDates: [],
                  }),
                ])
                console.log('[Firestore] Onboarding data saved for already-authenticated user:', currentUser.uid)
              } catch (e) {
                console.error('[Firestore] Onboarding save failed | code:', e.code, '| message:', e.message, e)
              }
              save('utgl_hadAccount', true)
              if (!missionPlan) {
                setShowPlanLoading(true)
                setScreen(7)
                try { await generateAndSaveMissionPlan(currentUser.uid) } finally { setShowPlanLoading(false) }
              } else {
                setScreen(7)
              }
            } else {
              setScreen(6)
            }
          }}
        >
          Next →
        </button>
      </div>
    )
  }

  if (screen === 4) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(onboardingAiReply ? 3 : 2)}>← Back</button>
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
          <button className="next-button continue-button" onClick={() => setScreen(5)}>
            Continue →
          </button>
        )}
      </div>
    )
  }

  if (screen === 3) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(2)}>← Back</button>
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
            <button className="next-button" onClick={() => setScreen(4)}>
              Continue →
            </button>
          </>
        ) : (
          <button className="next-button" onClick={() => setScreen(4)}>
            Choose a category →
          </button>
        )}
      </div>
    )
  }

  if (screen === 6) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(5)}>← Back</button>
        <div className="logo">🦋</div>
        <h2 className="screen2-title">Save your progress 🦋</h2>
        <p className="screen2-subtitle">Create a free account so your journey is saved on all your devices.</p>

        <button
          className="next-button"
          onClick={handleGoogleAuth}
          disabled={authSubmitting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <span style={{ fontWeight: 900, fontSize: 17 }}>G</span>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <input
          className="name-input auth-field"
          type="email"
          value={authEmail}
          onChange={e => { setAuthEmail(e.target.value); setAuthError('') }}
          placeholder="Email address"
          autoComplete="email"
        />
        <input
          className="name-input auth-field"
          type="password"
          value={authPassword}
          onChange={e => { setAuthPassword(e.target.value); setAuthError('') }}
          placeholder="Password (min 6 characters)"
          autoComplete="new-password"
          onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
        />

        {authError && <p className="auth-error">{authError}</p>}

        <button
          className="next-button"
          onClick={handleEmailAuth}
          disabled={authSubmitting || !authEmail.trim() || authPassword.length < 6}
        >
          {authSubmitting ? '...' : 'Create account'}
        </button>

        <button className="auth-toggle-link" onClick={() => setScreen(7)} style={{ marginTop: 12 }}>
          Skip for now →
        </button>
        <button
          className="auth-toggle-link"
          style={{ marginTop: 6, opacity: 0.6 }}
          onClick={() => { setScreen(1); setAuthError('') }}
        >
          Already have an account? Sign in →
        </button>
      </div>
    )
  }

  if (screen === 2) {
    return (
      <div className="onboarding">
        <button className="back-link" onClick={() => setScreen(1)}>← Back</button>
        <div className="logo">🦋</div>
        <h2 className="screen2-title">Hi! What's going on today?</h2>
        <p className="screen2-subtitle">Share whatever's on your mind. Flutter will listen.</p>
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
      </div>
    )
  }

  // Screen 1 — Landing (new users and signed-out returning users)
  return (
    <div className="onboarding">
      <div className="logo">🦋</div>
      <h1>Untangle</h1>
      <p className="tagline">Change your life. Feel less alone.</p>

      <button
        className="next-button"
        onClick={handleLandingGoogle}
        disabled={authSubmitting}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32 }}
      >
        <span style={{ fontWeight: 900, fontSize: 17 }}>G</span>
        {authSubmitting ? 'Signing in...' : 'Continue with Google'}
      </button>

      {showEmailSignIn ? (
        <>
          <div className="auth-divider"><span>or</span></div>
          <input
            className="name-input auth-field"
            type="email"
            value={authEmail}
            onChange={e => { setAuthEmail(e.target.value); setAuthError('') }}
            placeholder="Email address"
            autoComplete="email"
            autoFocus
          />
          <input
            className="name-input auth-field"
            type="password"
            value={authPassword}
            onChange={e => { setAuthPassword(e.target.value); setAuthError('') }}
            placeholder="Password"
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
          />
          {authError && <p className="auth-error">{authError}</p>}
          <button
            className="auth-submit-btn"
            onClick={handleEmailAuth}
            disabled={authSubmitting || !authEmail.trim() || !authPassword}
          >
            {authSubmitting ? '...' : 'Sign in'}
          </button>
          <button
            className="auth-toggle-link"
            onClick={() => { setShowEmailSignIn(false); setAuthError('') }}
          >
            ← Back
          </button>
        </>
      ) : (
        <>
          <button
            className="auth-toggle-link"
            style={{ marginTop: 16 }}
            onClick={() => { setShowEmailSignIn(true); setAuthMode('signin') }}
          >
            Sign in with email
          </button>
          <button
            className="auth-toggle-link"
            style={{ marginTop: 8, fontWeight: 600 }}
            onClick={() => setScreen(2)}
          >
            Check it out first →
          </button>
        </>
      )}
    </div>
  )
}

export default App
