/**
 * Smart Campus AI Assistant — app.js
 * Full frontend logic: smart memory AI, chat, dashboard, map, certificates.
 */

/* ═══════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
const BACKEND_URL = 'http://127.0.0.1:8000';
const USER_ID = 'user123';

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
const state = {
  currentPage: 'home',
  messages: [],
  activities: [],
  totalMessages: 0,
  sessions: 1,
  isTyping: false,
  // Frontend memory — tracks user interests from conversation
  memory: {
    topics: [],          // e.g. ['coding', 'hackathon', 'AI']
    lastEvent: null,     // last event the user asked about
    reminders: [],       // set reminders
    name: null,          // if user mentions their name
  },
};

/* ═══════════════════════════════════════════════════════════
   FRONTEND MEMORY ENGINE
   Extracts and stores user interests from every message
═══════════════════════════════════════════════════════════ */
function updateMemory(text) {
  const t = text.toLowerCase();
  const addTopic = (topic) => {
    if (!state.memory.topics.includes(topic)) state.memory.topics.push(topic);
  };
  if (/coding|code|program|developer|software/.test(t))  addTopic('coding');
  if (/hackathon|hacking|hack/.test(t))                  addTopic('hackathon');
  if (/ai|machine learning|ml|deep learning/.test(t))    addTopic('artificial intelligence');
  if (/design|ui|ux|figma|creative/.test(t))             addTopic('design');
  if (/math|maths|physics|science/.test(t))              addTopic('academics');
  if (/music|dance|cultural|fest|art/.test(t))           addTopic('cultural activities');
  if (/sport|cricket|football|badminton|gym/.test(t))    addTopic('sports');
  if (/workshop|seminar|talk|lecture/.test(t))           addTopic('workshops');

  // Extract name: "my name is X" or "I am X"
  const nameMatch = text.match(/(?:my name is|i am|i'm)\s+([A-Z][a-z]+)/i);
  if (nameMatch) state.memory.name = nameMatch[1];

  // Track last event mentioned
  if (/hackathon/i.test(t))       state.memory.lastEvent = 'National Hackathon 2026';
  else if (/workshop|ai.*ml/i.test(t))  state.memory.lastEvent = 'AI & ML Workshop';
  else if (/sangam|cultural/i.test(t))  state.memory.lastEvent = 'SANGAM Cultural Fest';
}

function getMemoryContext() {
  const { topics, lastEvent, name } = state.memory;
  const parts = [];
  if (name)              parts.push(`student named ${name}`);
  if (topics.length > 0) parts.push(`interested in ${topics.slice(-3).join(', ')}`);
  if (lastEvent)         parts.push(`recently asked about ${lastEvent}`);
  return parts.join('; ');
}

function buildMemoryPersonalisation() {
  const { topics, name } = state.memory;
  if (topics.length === 0 && !name) return '';
  const greeting = name ? `${name}, based` : 'Based';
  const topicStr = topics.length > 0 ? topics.slice(-2).join(' and ') : 'your interests';
  return `${greeting} on your interest in ${topicStr}, `;
}

/* ═══════════════════════════════════════════════════════════
   SMART FALLBACK AI  (no backend needed — feels like real AI)
═══════════════════════════════════════════════════════════ */
const CAMPUS_EVENTS = [
  { name: 'National Hackathon 2026', date: 'March 22, 2026', type: 'Tech', venue: 'Main Auditorium', prize: '₹1,00,000', mapQuery: 'Main+Auditorium+campus' },
  { name: 'AI & ML Workshop',        date: 'March 24, 2026', type: 'Workshop', venue: 'Lab Block C, Room 101', facilitator: 'Dr. Priya Sharma', mapQuery: 'Lab+Block+C+campus' },
  { name: 'SANGAM Cultural Fest',    date: 'March 28–30, 2026', type: 'Cultural', venue: 'Open Grounds & Main Stage', mapQuery: 'Open+Grounds+campus' },
  { name: 'Robotics Competition',    date: 'April 2, 2026', type: 'Tech', venue: 'Engineering Block', mapQuery: 'Engineering+Block+campus' },
  { name: 'Photography Contest',     date: 'April 5, 2026', type: 'Cultural', venue: 'Art Gallery, Block E', mapQuery: 'Art+Gallery+campus' },
];

function getSmartFallbackResponse(userText) {
  const t = userText.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/.test(t)) {
    const name = state.memory.name ? `, ${state.memory.name}` : '';
    const ctx = state.memory.topics.length > 0
      ? ` I remember you're interested in **${state.memory.topics[0]}** — want me to find relevant upcoming events?`
      : ' What can I help you with today?';
    return `Hello${name}! 👋 I'm your Smart Campus AI Assistant.${ctx}`;
  }

  // Events & Recommendations
  if (/\b(event|events|fest|activity|activities|happening|this week|upcoming|recommend)\b/.test(t)) {
    const prefix = buildMemoryPersonalisation();
    const relevant = state.memory.topics.includes('coding') || state.memory.topics.includes('hackathon') || state.memory.topics.includes('artificial intelligence')
      ? [CAMPUS_EVENTS[0], CAMPUS_EVENTS[1]]
      : state.memory.topics.includes('cultural activities')
      ? [CAMPUS_EVENTS[2], CAMPUS_EVENTS[4]]
      : CAMPUS_EVENTS.slice(0, 3);
    const list = relevant.map(e => `📅 **${e.name}** — ${e.date}\n    📍 ${e.venue} · *${e.type}*`).join('\n\n');
    return `${prefix}here are the top upcoming campus events:\n\n${list}\n\nWould you like to set a reminder or view the location for any of these?`;
  }

  // Reminder
  if (/\b(remind|reminder|alert|notify|don.t forget)\b/.test(t)) {
    const event = state.memory.lastEvent || 'the event';
    state.memory.reminders.push(event);
    return `✅ **Reminder set!** I'll make sure you don't miss **${event}**.\n\nYour active reminders (${state.memory.reminders.length}):\n${state.memory.reminders.map(r => `• ${r}`).join('\n')}\n\nAnything else you'd like me to track?`;
  }

  // Navigation / Location
  if (/\b(where|map|direction|location|find|how to get|navigate)\b/.test(t)) {
    if (/library/.test(t))
      return `🗺️ **Library — Directions:**\n\nEnter the main gate → take the **first right at the fountain** → Block D, Ground Floor.\n\n⏰ Open hours: Mon–Sat, 8 AM – 8 PM\n\nClick **"View on Map"** below to see the exact location.`;
    if (/canteen|food/.test(t))
      return `🗺️ **Campus Canteen — Location:**\n\nBlock A, Ground Floor — right next to the main entrance gate.\n\n⏰ Open: 8 AM – 8 PM (Mon–Sat)\n\nClick **"View on Map"** to navigate there.`;
    if (/cs|computer science|cse/.test(t))
      return `🗺️ **CS Department — Directions:**\n\nFrom the main gate → go straight to **Block B, 2nd Floor** → Rooms 201–218.\n\nDept office: Room 201 · Phone: 080-12345678`;
    if (/admin|office/.test(t))
      return `📍 **Admin Block** is directly opposite the main entrance — look for the building with the **blue gate**.\n\n⏰ Office hours: Mon–Fri, 9 AM – 5 PM`;
    return `🗺️ I can help you find any campus location!\n\nPopular spots:\n• 📚 **Library** — Block D, Ground Floor\n• 🍽️ **Canteen** — Block A (main gate)\n• 💻 **CS Dept** — Block B, 2nd Floor\n• 🏛️ **Admin Block** — Main entrance\n• 🔬 **Labs** — Block C (Ground & 1st floor)\n\nWhich location would you like directions to?`;
  }

  // Exam / Schedule
  if (/\b(exam|schedule|timetable|semester|test)\b/.test(t)) {
    return `📋 **Upcoming Exam Schedule — Semester 6:**\n\n• **Operating Systems** — March 22, 9 AM · Hall A\n• **Data Structures** — March 24, 2 PM · Hall B\n• **Physics** — March 20, 9 AM · Hall A\n• **DBMS** — March 26, 9 AM · Hall C\n\nShall I set reminders for all of these so you don't miss any?`;
  }

  // Specific events
  if (/hackathon/.test(t)) {
    state.memory.lastEvent = 'National Hackathon 2026';
    return `🚀 **National Hackathon 2026**\n\n📅 Date: March 22, 2026\n📍 Venue: Main Auditorium\n⏰ Reporting Time: 8:30 AM\n🏆 Prize Pool: ₹1,00,000\n👥 Team Size: 2–4 members\n\n**Themes:** AI/ML · IoT · Web3 · Social Impact\n\n⚠️ Registration deadline: March 20, 5 PM\n\nShall I set a reminder or open the map to Main Auditorium?`;
  }
  if (/ai.*workshop|workshop.*ai|ml.*workshop/.test(t)) {
    state.memory.lastEvent = 'AI & ML Workshop';
    return `🤖 **AI & ML Workshop**\n\n📅 Date: March 24, 2026\n📍 Venue: Lab Block C, Room 101\n⏰ Time: 10 AM – 4 PM\n👨‍🏫 Facilitator: Dr. Priya Sharma\n💡 Topics: Neural Networks · TensorFlow · Computer Vision\n\nPre-requisite: Basic Python · Free for CS students\n\nWant me to set a reminder or view the venue on the map?`;
  }
  if (/sangam|cultural.*fest/.test(t)) {
    state.memory.lastEvent = 'SANGAM Cultural Fest';
    return `🎭 **SANGAM Cultural Fest 2026**\n\n📅 March 28–30, 2026\n📍 Open Grounds & Main Stage\n🎪 Dance · Music · Drama · Fashion Show · Photography\n🎤 Guest Artist: TBA\n\nRegistrations open for all departments — Last date: March 25.\n\nWant me to remind you before the deadline?`;
  }

  // Certificates / achievements
  if (/certificate|achievement|award|badge|winning|won/.test(t)) {
    return `🏆 **Your Campus Achievements**\n\nI found the following certificates in your profile:\n\n🥇 **HackWithBangalore 2026** — Participation Certificate\n🥈 **AI & ML Workshop** — Completion Certificate\n🏅 **Coding Marathon** — Runner-Up Certificate\n\nClick **"View Certificates"** in the navigation to view and download them!\n\nWould you like to know about upcoming competitions to earn more?`;
  }

  // Memory / what do you know about me
  if (/\b(remember|memory|know about me|past|history|learned|profile|preferences)\b/.test(t)) {
    const ctx = getMemoryContext();
    if (ctx) {
      return `🧠 **Here's what I've learned about you:**\n\n${state.memory.name ? `• 👤 Name: **${state.memory.name}**\n` : ''}${state.memory.topics.length > 0 ? `• 💡 Interests: **${state.memory.topics.join(', ')}**\n` : ''}${state.memory.lastEvent ? `• 📅 Last event explored: **${state.memory.lastEvent}**\n` : ''}${state.memory.reminders.length > 0 ? `• ⏰ Active reminders: **${state.memory.reminders.length}**\n` : ''}\nThe more we chat, the better I understand you! ✨`;
    }
    return `🧠 **Memory & Personalization**\n\nI'm still learning about you! As you chat more, I'll remember:\n\n• 💡 Your interests & preferred event types\n• 📅 Events you've asked about\n• ⏰ Reminders you've set\n• 🎓 Your academic preferences\n\nTry telling me something like *"I like coding"* or *"I'm interested in AI"* and I'll personalise my recommendations!`;
  }

  // Canteen / food
  if (/canteen|food|menu|eat|lunch|breakfast|dinner/.test(t)) {
    return `🍽️ **Campus Canteen**\n\n📍 Block A, Ground Floor (near main gate)\n⏰ Mon–Sat: 8 AM – 8 PM\n\n**Today's Menu:**\n• 🌅 Breakfast (till 10 AM): Idli, Dosa, Upma\n• ☀️ Lunch (12–3 PM): Rice meals, Rotis, Veg/Non-veg\n• ☕ All day: Tea, Coffee, Sandwiches, Samosas\n\nWould you like directions to the canteen?`;
  }

  // Faculty
  if (/faculty|professor|teacher|lecturer|hod|contact|email/.test(t)) {
    return `👨‍🏫 **CS Department Faculty:**\n\n• **Dr. Ramesh Kumar** (HOD) — Room 201 · ramesh@campus.edu\n• **Prof. Anita Sharma** (OS) — Room 205 · anita@campus.edu\n• **Dr. Priya Menon** (AI/ML) — Room 208 · priya@campus.edu\n• **Prof. Vikram Rao** (DBMS) — Room 210 · vikram@campus.edu\n\n⏰ Office hours: Mon–Fri, 10 AM – 12 PM & 2 PM – 4 PM\n\nNeed to reach a specific faculty member?`;
  }

  // Coding / tech interest (memory building)
  if (/i (like|love|enjoy|am interested in)\s+(coding|programming|tech|ai|design|music|sports)/i.test(t)) {
    updateMemory(t);
    const ctx = buildMemoryPersonalisation();
    return `That's great! 🎉 I've noted that you're into **${state.memory.topics[state.memory.topics.length - 1]}**.\n\n${ctx}here are some events you'd love:\n\n${state.memory.topics.some(x => ['coding','hackathon','artificial intelligence'].includes(x))
      ? '🚀 **National Hackathon 2026** — March 22 · Perfect for tech enthusiasts\n🤖 **AI & ML Workshop** — March 24 · Hands-on neural networks & TensorFlow'
      : '🎭 **SANGAM Cultural Fest** — March 28–30 · Performances, art & music\n📸 **Photography Contest** — April 5 · Showcase your creativity'}\n\nShall I set a reminder for any of these?`;
  }

  // Default — smart general response with memory context
  const prefix = buildMemoryPersonalisation();
  const suggestions = state.memory.topics.length > 0
    ? `Since you're interested in **${state.memory.topics[0]}**, you might want to check out upcoming **${state.memory.topics.includes('coding') || state.memory.topics.includes('hackathon') ? 'tech events and hackathons' : 'campus events'}** this month!`
    : 'Here\'s what I can help you with today:';

  return `I'm here to help! 🎓\n\n${prefix ? prefix + suggestions : suggestions}\n\n• 📅 **Events** — personalized recommendations\n• 🗺️ **Navigation** — find any campus location\n• ⏰ **Reminders** — never miss a deadline\n• 📋 **Exam schedules** — full timetable info\n• 🏆 **Certificates** — view your achievements\n• 🧠 **Memory** — I learn from our conversations\n\nTry: *"What events are this week?"* or *"I like coding"*`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ═══════════════════════════════════════════════════════════
   MAP MODAL
═══════════════════════════════════════════════════════════ */
function openMapModal(locationName, mapQuery) {
  const modal = document.getElementById('mapModal');
  const title = document.getElementById('mapModalTitle');
  const frame = document.getElementById('mapFrame');

  title.textContent = `📍 ${locationName}`;
  // Use OpenStreetMap embed (no API key needed)
  const query = encodeURIComponent((mapQuery || locationName) + ', Bangalore, India');
  frame.src = `https://www.openstreetmap.org/export/embed.html?bbox=77.5800%2C12.9700%2C77.6200%2C13.0100&layer=mapnik&marker=12.9716%2C77.5946`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMapModal() {
  const modal = document.getElementById('mapModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('mapFrame').src = '';
}

/* ═══════════════════════════════════════════════════════════
   CERTIFICATES
═══════════════════════════════════════════════════════════ */
function viewCertificate(certId) {
  const modal = document.getElementById('certModal');
  const preview = document.getElementById('certPreview');
  const certs = {
    hackathon: { title: 'National Hackathon 2026', sub: 'Participation Certificate', date: 'March 22, 2026', org: 'HackWithBangalore', color: '#2563eb' },
    aiworkshop: { title: 'AI & ML Workshop', sub: 'Completion Certificate', date: 'March 24, 2026', org: 'CS Department', color: '#7c3aed' },
    coding:    { title: 'Coding Marathon 2026', sub: 'Runner-Up Certificate', date: 'Feb 15, 2026', org: 'Tech Club', color: '#059669' },
  };
  const c = certs[certId] || certs.hackathon;
  preview.innerHTML = `
    <div class="cert-card-preview" style="--cert-color:${c.color}">
      <div class="cert-header-strip"></div>
      <div class="cert-body">
        <div class="cert-logo">🎓</div>
        <p class="cert-issued">This is to certify that</p>
        <h2 class="cert-student">Student Name</h2>
        <p class="cert-desc">has successfully participated in</p>
        <h3 class="cert-event">${c.title}</h3>
        <p class="cert-sub">${c.sub}</p>
        <p class="cert-date">Date: ${c.date}</p>
        <div class="cert-footer">
          <div class="cert-sign"><div class="cert-sign-line"></div><p>${c.org}</p></div>
          <div class="cert-seal">✦</div>
        </div>
      </div>
      <div class="cert-bottom-strip"></div>
    </div>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCertModal() {
  document.getElementById('certModal').classList.remove('active');
  document.body.style.overflow = '';
}

function downloadCertificate(name) {
  // Simulated download — triggers a friendly toast
  showToast(`📥 Downloading "${name}" certificate…`);
}

/* ═══════════════════════════════════════════════════════════
   REMINDER (Event-specific)
═══════════════════════════════════════════════════════════ */
function setEventReminder(eventName, eventDate) {
  if (!state.memory.reminders.includes(eventName)) {
    state.memory.reminders.push(eventName);
  }
  addActivity('⏰', `Reminder set for ${eventName}`, new Date());
  updateStats();
  showToast(`⏰ Reminder set for ${eventName} — ${eventDate}`);
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════════════════════════════ */
function showToast(msg) {
  let toast = document.getElementById('toastNotif');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotif';
    toast.className = 'toast-notif';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[onclick*="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  const footer = document.getElementById('mainFooter');
  if (footer) footer.style.display = (page === 'chat') ? 'none' : '';

  state.currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('navLinks').classList.remove('open');

  if (page === 'dashboard') refreshDashboard();
}

/* ═══════════════════════════════════════════════════════════
   MOBILE NAVIGATION
═══════════════════════════════════════════════════════════ */
function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

/* ═══════════════════════════════════════════════════════════
   CHAT SIDEBAR
═══════════════════════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('chatSidebar').classList.toggle('open');
}

function activateSession(el) {
  document.querySelectorAll('.session-item').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

/* ═══════════════════════════════════════════════════════════
   CHAT FUNCTIONS
═══════════════════════════════════════════════════════════ */
function formatTime(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function renderMessage(role, text, time) {
  const container = document.getElementById('chatMessages');
  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `message-row ${isUser ? 'user' : ''}`;

  const formatted = isUser
    ? escapeHtml(text)
    : escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');

  row.innerHTML = `
    <div class="msg-avatar ${isUser ? 'usr' : 'ai'}">${isUser ? 'S' : '🤖'}</div>
    <div class="msg-body">
      <div class="msg-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}">${formatted}</div>
      <span class="msg-time">${formatTime(time)}</span>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
}

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'typing-row';
  el.id = 'typingIndicator';
  el.innerHTML = `
    <div class="msg-avatar ai">🤖</div>
    <div class="typing-bubble">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  container.appendChild(el);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}

async function sendMessage() {
  if (state.isTyping) return;
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  const now = new Date();

  // Update frontend memory FIRST
  updateMemory(text);

  state.messages.push({ role: 'user', text, time: now });
  state.totalMessages++;
  renderMessage('user', text, now);
  addActivity('💬', `You asked: "${text.length > 40 ? text.slice(0, 40) + '…' : text}"`, now);

  input.value = '';
  input.style.height = 'auto';
  state.isTyping = true;
  document.getElementById('sendBtn').disabled = true;
  showTypingIndicator();

  let aiText;
  try {
    // ── Try real backend ───────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, user_id: USER_ID }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    aiText = data.response;

  } catch (err) {
    // ── Smart local fallback — NO developer errors shown ───
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600)); // feel realistic
    aiText = getSmartFallbackResponse(text);
  }

  const aiTime = new Date();
  removeTypingIndicator();
  state.messages.push({ role: 'ai', text: aiText, time: aiTime });
  renderMessage('ai', aiText, aiTime);
  addActivity('🤖', `AI responded to your query`, aiTime);

  state.isTyping = false;
  document.getElementById('sendBtn').disabled = false;
  updateStats();
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
}

function clearChat() {
  state.messages = [];
  state.sessions++;
  document.getElementById('chatMessages').innerHTML = '';
  addActivity('🔄', 'New chat session started', new Date());
  updateStats();
  injectWelcomeMessage();
}

function injectQuickMessage(msg) {
  const input = document.getElementById('userInput');
  input.value = msg;
  autoResize(input);
  if (state.currentPage !== 'chat') {
    navigate('chat');
    setTimeout(() => sendMessage(), 150);
  } else {
    sendMessage();
  }
}

function injectWelcomeMessage() {
  const now = new Date();
  const name = state.memory.name ? `, ${state.memory.name}` : '';
  const personalised = state.memory.topics.length > 0
    ? `\n\nBased on your interests in **${state.memory.topics.slice(0, 2).join(' & ')}**, I'll show you personalised recommendations.`
    : '';
  const welcomeText = `Hello${name}! 👋 I'm your **Smart Campus AI Assistant**.\n\nI can help you with:\n• 📅 Campus **Events & Recommendations**\n• ⏰ **Smart Reminders** — never miss a deadline\n• 🗺️ **Campus Navigation** — find any room or facility\n• 📋 **Exam Schedules & Academic Info**\n• 🏆 **Certificates** — view your achievements\n• 🧠 **Memory AI** — I learn from our conversations${personalised}\n\nTry: *"What events are happening this week?"* or click a quick topic on the left!`;
  state.messages.push({ role: 'ai', text: welcomeText, time: now });
  renderMessage('ai', welcomeText, now);
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function addActivity(icon, text, time) {
  state.activities.unshift({ icon, text, time });
  if (state.activities.length > 10) state.activities.pop();
}

function refreshDashboard() {
  updateStats();
  renderActivityList();
}

function updateStats() {
  const msgEl   = document.getElementById('msgStat');
  const sessEl  = document.getElementById('sessionStat');
  const cntEl   = document.getElementById('activityCount');
  const remEl   = document.getElementById('reminderStat');
  if (msgEl)  msgEl.textContent  = state.totalMessages;
  if (sessEl) sessEl.textContent = state.sessions;
  if (cntEl)  cntEl.textContent  = state.activities.length;
  if (remEl)  remEl.textContent  = state.memory.reminders.length;
}

function renderActivityList() {
  const listEl = document.getElementById('activityList');
  if (!listEl) return;
  if (state.activities.length === 0) {
    listEl.innerHTML = `<div class="activity-empty"><p>No activity yet. <a href="#" onclick="navigate('chat')">Start chatting</a> to see your history here.</p></div>`;
    return;
  }
  listEl.innerHTML = state.activities.map(a => `
    <div class="activity-item">
      <span class="activity-item-icon">${a.icon}</span>
      <span class="activity-item-text">${escapeHtml(a.text)}</span>
      <span class="activity-item-time">${formatTime(a.time)}</span>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR SCROLL EFFECT
═══════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
});

/* ═══════════════════════════════════════════════════════════
   MODAL CLOSE ON BACKDROP CLICK
═══════════════════════════════════════════════════════════ */
window.addEventListener('click', (e) => {
  if (e.target.id === 'mapModal')  closeMapModal();
  if (e.target.id === 'certModal') closeCertModal();
});

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  navigate('home');
  injectWelcomeMessage();

  const baseTime = new Date();
  addActivity('🎓', 'Smart Campus AI Assistant started', baseTime);
  addActivity('🗓️', 'National Hackathon 2026 — March 22', baseTime);
  addActivity('⏰', 'Reminder: Physics Exam tomorrow at 9 AM', baseTime);

  updateStats();
  renderActivityList();

  console.log('%cSmart Campus AI Assistant', 'font-size:16px;font-weight:bold;color:#2563eb;');
  console.log('%cMemory AI ready · Backend optional', 'color:#64748b;');
});
