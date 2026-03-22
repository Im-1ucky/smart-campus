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
  // Image upload state
  pendingImage: null,    // { file, dataUrl }
  // Frontend memory — tracks user interests from conversation
  memory: {
    topics: [],          // e.g. ['coding', 'hackathon', 'AI']
    lastEvent: null,     // last event the user asked about
    reminders: [],       // set reminders
    name: null,          // if user mentions their name
    clubs: [],           // joined clubs
    eventsAttended: [],  // past events attended
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
  { name: 'National Hackathon 2026', date: 'March 22, 2026', type: 'Tech', venue: 'Main Auditorium', prize: '₹1,00,000', mapQuery: 'Main+Auditorium+campus',
    keywords: ['hackathon', 'hack', 'national', 'coding', 'code', 'competition', 'team', 'prize', 'web3', 'iot', 'social impact'], icon: '🚀' },
  { name: 'AI & ML Workshop', date: 'March 24, 2026', type: 'Workshop', venue: 'Lab Block C, Room 101', facilitator: 'Dr. Priya Sharma', mapQuery: 'Lab+Block+C+campus',
    keywords: ['ai', 'ml', 'artificial intelligence', 'machine learning', 'workshop', 'neural', 'tensorflow', 'deep learning', 'computer vision'], icon: '🤖' },
  { name: 'SANGAM Cultural Fest', date: 'March 28–30, 2026', type: 'Cultural', venue: 'Open Grounds & Main Stage', mapQuery: 'Open+Grounds+campus',
    keywords: ['sangam', 'cultural', 'fest', 'dance', 'music', 'drama', 'fashion', 'art', 'photography'], icon: '🎭' },
  { name: 'Robotics Competition', date: 'April 2, 2026', type: 'Tech', venue: 'Engineering Block', mapQuery: 'Engineering+Block+campus',
    keywords: ['robotics', 'robot', 'competition', 'engineering', 'hardware', 'arduino', 'circuit'], icon: '🤖' },
  { name: 'Photography Contest', date: 'April 5, 2026', type: 'Cultural', venue: 'Art Gallery, Block E', mapQuery: 'Art+Gallery+campus',
    keywords: ['photography', 'photo', 'contest', 'camera', 'gallery', 'creative', 'art'], icon: '📸' },
  { name: 'Coding Marathon 2026', date: 'February 15, 2026', type: 'Tech', venue: 'CS Lab, Block B', mapQuery: 'Block+B+campus',
    keywords: ['coding', 'marathon', 'code', 'programming', 'dsa', 'algorithm', 'competitive'], icon: '💻' },
  { name: 'IQnition — Ignite Your Intellect', date: 'February 11, 2026', type: 'Quiz', venue: 'CSM Block', time: '2:00 PM – 5:00 PM', organizer: 'Training & Placement Club, GPREC Kurnool', mapQuery: 'CSM+Block+GPREC+Kurnool',
    keywords: ['iqnition', 'ignition', 'ignite', 'intellect', 'quiz', 'gprec', 'pulla reddy', 'kurnool', 'training', 'placement', 'csm'], icon: '🧠' },
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

  return `I'm here to help! 🎓\n\n${prefix ? prefix + suggestions : suggestions}\n\n• 📅 **Events** — personalized recommendations\n• 🗺️ **Navigation** — find any campus location\n• ⏰ **Reminders** — never miss a deadline\n• 📋 **Exam schedules** — full timetable info\n• 🏆 **Certificates** — view your achievements\n• 🧠 **Memory** — I learn from our conversations\n\nTry: *"What events are this week?"* or *"I like coding"*`;
}

// Override renderMessage to support buttons for joining/attending (conceptual improvement)
// For now, I'll just add simple text triggers or enhance the fallback return strings
// Actually, let's just make the fallback strings more interactive with "Click to join" hints.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ═══════════════════════════════════════════════════════════
   IMAGE UPLOAD & OCR — EVENT POSTER RECOGNITION
═══════════════════════════════════════════════════════════ */

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please select an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(ev) {
    state.pendingImage = { file, dataUrl: ev.target.result };
    // Show preview
    document.getElementById('imgPreviewThumb').src = ev.target.result;
    document.getElementById('imgPreviewName').textContent = file.name;
    document.getElementById('imgPreviewStrip').style.display = 'block';
  };
  reader.readAsDataURL(file);
  // Reset input so same file can be re-selected
  e.target.value = '';
}

function removeImagePreview() {
  state.pendingImage = null;
  document.getElementById('imgPreviewStrip').style.display = 'none';
  document.getElementById('imgPreviewThumb').src = '';
}

function matchEventFromText(ocrText) {
  const text = ocrText.toLowerCase();
  const words = text.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const event of CAMPUS_EVENTS) {
    let score = 0;
    // Check event name words
    const nameWords = event.name.toLowerCase().split(/\s+/);
    for (const nw of nameWords) {
      if (nw.length > 2 && text.includes(nw)) score += 3;
    }
    // Check keywords
    for (const kw of event.keywords) {
      if (text.includes(kw)) score += 2;
    }
    // Check venue
    const venueWords = event.venue.toLowerCase().split(/[\s,]+/);
    for (const vw of venueWords) {
      if (vw.length > 2 && text.includes(vw)) score += 1;
    }
    // Check date
    if (event.date && text.includes(event.date.toLowerCase().split(',')[0].toLowerCase())) score += 2;
    // Check type
    if (text.includes(event.type.toLowerCase())) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = event;
    }
  }
  // Require a minimum score to consider it a match
  return bestScore >= 4 ? { event: bestMatch, score: bestScore } : null;
}

function renderEventMatchCard(event) {
  return `
    <div class="event-match-card">
      <div class="event-match-header">
        <div class="event-match-icon">${event.icon || '📅'}</div>
        <div>
          <div class="event-match-title">${event.name}</div>
        </div>
        <span class="event-match-type">${event.type}</span>
      </div>
      <div class="event-match-details">
        <span>📅 <strong>Date:</strong> ${event.date}</span>
        <span>📍 <strong>Venue:</strong> ${event.venue}</span>
        ${event.prize ? `<span>🏆 <strong>Prize:</strong> ${event.prize}</span>` : ''}
        ${event.facilitator ? `<span>👨‍🏫 <strong>Facilitator:</strong> ${event.facilitator}</span>` : ''}
      </div>
      <div class="event-match-actions">
        <button class="ematch-primary" onclick="navigate('chat'); injectQuickMessage('Tell me more about ${event.name}.')">💬 More Details</button>
        <button class="ematch-secondary" onclick="setEventReminder('${event.name}', '${event.date}')">⏰ Set Reminder</button>
      </div>
    </div>
  `;
}

function renderImageMessage(dataUrl, fileName) {
  const container = document.getElementById('chatMessages');
  const now = new Date();
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="msg-avatar usr">S</div>
    <div class="msg-body" style="align-items:flex-end;">
      <img src="${dataUrl}" alt="${escapeHtml(fileName)}" class="msg-image" />
      <div class="msg-bubble user-bubble">📸 Uploaded poster for event recognition</div>
      <span class="msg-time">${formatTime(now)}</span>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
  return now;
}

function showOCRLoading() {
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'typing-row';
  el.id = 'ocrLoading';
  el.innerHTML = `
    <div class="msg-avatar ai">🤖</div>
    <div class="ocr-loading">
      <div class="ocr-spinner"></div>
      <span class="ocr-loading-text">Scanning poster text…</span>
    </div>
  `;
  container.appendChild(el);
  scrollToBottom();
}

function removeOCRLoading() {
  const el = document.getElementById('ocrLoading');
  if (el) el.remove();
}

async function processImageOCR(imageData) {
  showOCRLoading();
  try {
    const result = await Tesseract.recognize(imageData, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          const loadingText = document.querySelector('.ocr-loading-text');
          if (loadingText) loadingText.textContent = `Scanning poster text… ${pct}%`;
        }
      }
    });
    removeOCRLoading();
    const extractedText = result.data.text.trim();
    return extractedText;
  } catch (err) {
    removeOCRLoading();
    console.error('OCR Error:', err);
    return null;
  }
}

function renderOCRResult(extractedText, matchResult) {
  const container = document.getElementById('chatMessages');
  const now = new Date();
  const row = document.createElement('div');
  row.className = 'message-row';

  let content;
  if (matchResult) {
    content = `<div class="msg-bubble ai-bubble">
      <strong>✅ Event Identified!</strong><br/>
      I scanned the poster and found a match:
    </div>
    ${renderEventMatchCard(matchResult.event)}`;
    state.memory.lastEvent = matchResult.event.name;
    addActivity('📸', `Identified event: ${matchResult.event.name}`, now);
  } else if (extractedText) {
    content = `<div class="msg-bubble ai-bubble">
      <strong>🔍 Poster Scanned</strong><br/><br/>
      I extracted text from the poster but couldn't match it to a known campus event.<br/><br/>
      <strong>Extracted text:</strong><br/>
      <em>"${escapeHtml(extractedText.substring(0, 300))}${extractedText.length > 300 ? '…' : ''}"</em><br/><br/>
      Try uploading a clearer image, or ask me about the event by name!
    </div>`;
    addActivity('📸', 'Poster scanned — no event match', now);
  } else {
    content = `<div class="msg-bubble ai-bubble">
      <strong>⚠️ Couldn't Read Poster</strong><br/><br/>
      I wasn't able to extract text from this image. Please try:<br/>
      • A clearer or higher-resolution image<br/>
      • A poster with visible text<br/>
      • Taking a photo with better lighting
    </div>`;
    addActivity('📸', 'Poster scan failed — no text found', now);
  }

  row.innerHTML = `
    <div class="msg-avatar ai">🤖</div>
    <div class="msg-body">
      ${content}
      <span class="msg-time">${formatTime(now)}</span>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
  state.messages.push({ role: 'ai', text: extractedText ? `Scanned poster: ${extractedText.substring(0, 100)}` : 'Poster scan failed', time: now });
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';

  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Sync icons
  updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
  const iconLight = document.querySelector('.theme-icon-light');
  const iconDark = document.querySelector('.theme-icon-dark');
  if (!iconLight || !iconDark) return;

  if (theme === 'dark') {
    iconLight.style.display = 'none';
    iconDark.style.display = 'inline';
  } else {
    iconLight.style.display = 'inline';
    iconDark.style.display = 'none';
  }
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
  refreshDashboard(); 
  showToast(`⏰ Reminder set for ${eventName} — ${eventDate}`);
  
  // If it's a past event, also add to attended list
  if (getEventStatus(eventDate) === 'past') {
    addEventAttended(eventName);
  }
}

function joinClub(clubName) {
  if (!state.memory.clubs.includes(clubName)) {
    state.memory.clubs.push(clubName);
    addActivity('💎', `Joined ${clubName} club`, new Date());
    refreshDashboard();
    showToast(`🎉 You have joined the ${clubName}!`);
  } else {
    showToast(`ℹ️ You are already a member of ${clubName}.`);
  }
}

function addEventAttended(eventName) {
  if (!state.memory.eventsAttended.includes(eventName)) {
    state.memory.eventsAttended.push(eventName);
    addActivity('✅', `Attended ${eventName}`, new Date());
    refreshDashboard();
  }
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
  if (page === 'events') renderEventsWall();
}

function refreshDashboard() {
  updateStats();
  renderActivityList();
  renderReminders();
  renderClubs();
  renderEventsAttended();
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
/* CHAT SIDEBAR FUNCTIONS REMOVED */

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
  const hasImage = !!state.pendingImage;

  // Need either text or image
  if (!text && !hasImage) return;

  const now = new Date();
  state.isTyping = true;
  document.getElementById('sendBtn').disabled = true;

  // ── Handle image upload + OCR ─────────────────────────
  if (hasImage) {
    const imgData = state.pendingImage;
    removeImagePreview();
    input.value = '';
    input.style.height = 'auto';

    // Show the image in chat
    renderImageMessage(imgData.dataUrl, imgData.file.name);
    state.totalMessages++;
    addActivity('📸', `Uploaded poster: ${imgData.file.name}`, now);

    // Run OCR
    const extractedText = await processImageOCR(imgData.dataUrl);
    const matchResult = extractedText ? matchEventFromText(extractedText) : null;
    renderOCRResult(extractedText, matchResult);

    state.isTyping = false;
    document.getElementById('sendBtn').disabled = false;
    updateStats();
    return;
  }

  // ── Normal text message flow ──────────────────────────
  // Update frontend memory FIRST
  updateMemory(text);

  state.messages.push({ role: 'user', text, time: now });
  state.totalMessages++;
  renderMessage('user', text, now);
  // No longer logging user questions to Recent Activity
  // addActivity('💬', `You asked: "${text.length > 40 ? text.slice(0, 40) + '…' : text}"`, now);

  input.value = '';
  input.style.height = 'auto';
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
  // No longer logging chat responses to Recent Activity to keep it genuine
  // addActivity('🤖', `AI responded to your query`, aiTime);

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
  // No longer logging new sessions to Recent Activity
  // addActivity('🔄', 'New chat session started', new Date());
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
  // Only log meaningful changes (reminders, clubs, events)
  const meaningfulIcons = ['⏰', '🗓️', '💎', '🎓', '✅'];
  if (!meaningfulIcons.includes(icon)) return;

  state.activities.unshift({ icon, text, time });
  if (state.activities.length > 15) state.activities.pop();
}

function refreshDashboard() {
  updateStats();
  renderActivityList();
}

function updateStats() {
  const cntEl   = document.getElementById('activityCount');
  if (cntEl)  cntEl.textContent  = state.activities.length;

  const welcomeEl = document.getElementById('dashWelcomeMsg');
  if (welcomeEl) {
    const remCount = state.memory.reminders.length;
    if (remCount === 0) {
      welcomeEl.textContent = "Welcome to your personalized campus space. Start chatting to set reminders!";
    } else {
      welcomeEl.innerHTML = `You have <strong>${remCount} active reminder${remCount > 1 ? 's' : ''}</strong> today.`;
    }
  }
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

function renderClubs() {
  const listEl = document.getElementById('clubsList');
  if (!listEl) return;
  if (state.memory.clubs.length === 0) {
    listEl.innerHTML = `<div class="activity-empty"><p>No clubs joined yet. <a href="#" onclick="navigate('chat'); injectQuickMessage('Show me clubs I can join.')">Explore Clubs</a></p></div>`;
    return;
  }
  listEl.innerHTML = state.memory.clubs.map(c => `
    <div class="event-item">
      <div class="event-badge" style="background:var(--blue-100); color:var(--blue-700);">Member</div>
      <div class="event-info">
        <p class="event-title">${escapeHtml(c)}</p>
        <p class="event-meta">Joined: 2026</p>
      </div>
    </div>
  `).join('');
}

function renderEventsAttended() {
  const listEl = document.getElementById('eventsAttendedList');
  if (!listEl) return;
  if (state.memory.eventsAttended.length === 0) {
    listEl.innerHTML = `<div class="activity-empty"><p>No events attended yet. <a href="#" onclick="navigate('events')">Browse Wall</a></p></div>`;
    return;
  }
  listEl.innerHTML = state.memory.eventsAttended.map(e => `
    <div class="event-item">
      <div class="event-badge" style="background:var(--green-100); color:var(--green-700);">Attended</div>
      <div class="event-info">
        <p class="event-title">${escapeHtml(e)}</p>
        <p class="event-meta">📅 Past Event</p>
      </div>
    </div>
  `).join('');
}

function renderReminders() {
  const listEl = document.getElementById('remindersList');
  if (!listEl) return;
  if (state.memory.reminders.length === 0) {
    listEl.innerHTML = `<div class="activity-empty"><p>No active reminders. <a href="#" onclick="navigate('chat')">Set one now</a></p></div>`;
    return;
  }
  listEl.innerHTML = state.memory.reminders.map(r => `
    <div class="reminder-item">
      <div class="reminder-indicator" style="background:var(--blue-500);"></div>
      <div class="reminder-info">
        <p class="reminder-title">${escapeHtml(r)}</p>
        <p class="reminder-time">Scheduled via Assistant</p>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════
   EVENTS WALL
═══════════════════════════════════════════════════════════ */
const EVENT_TYPE_COLORS = {
  Tech:     { bg: 'var(--blue-100)', color: 'var(--blue-700)', iconBg: 'var(--blue-50)' },
  Workshop: { bg: 'var(--green-100, #dcfce7)', color: 'var(--green-700, #15803d)', iconBg: 'var(--green-50, #f0fdf4)' },
  Cultural: { bg: 'var(--orange-100, #fef3c7)', color: 'var(--orange-700, #b45309)', iconBg: 'var(--orange-50, #fffbeb)' },
  Quiz:     { bg: 'var(--purple-100, #ede9fe)', color: 'var(--purple-700, #7c3aed)', iconBg: 'var(--purple-50, #f5f3ff)' },
};

function getEventStatus(dateStr) {
  // Simple check: does the date string contain a month that's before "now"?
  // For demo purposes, hardcode today as March 21, 2026
  const pastDates = ['january', 'february']; // months already passed
  const d = dateStr.toLowerCase();
  for (const m of pastDates) {
    if (d.includes(m)) return 'past';
  }
  return 'upcoming';
}

function renderEventsWall(filter = 'all') {
  const grid = document.getElementById('eventsWallGrid');
  if (!grid) return;

  const events = filter === 'all'
    ? CAMPUS_EVENTS
    : CAMPUS_EVENTS.filter(e => e.type === filter);

  if (events.length === 0) {
    grid.innerHTML = `<div class="activity-empty" style="grid-column:1/-1;"><p>No events found for this category.</p></div>`;
    return;
  }

  grid.innerHTML = events.map((e, i) => {
    const tc = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Tech;
    const status = getEventStatus(e.date);
    const statusClass = status === 'past' ? 'ew-status-past' : 'ew-status-upcoming';
    const statusLabel = status === 'past' ? '✓ Completed' : '📅 Upcoming';
    const idx = CAMPUS_EVENTS.indexOf(e);

    return `
      <div class="ew-card" onclick="openEventDetail(${idx})">
        <div class="ew-card-header">
          <div class="ew-card-icon" style="background:${tc.iconBg};">${e.icon || '📅'}</div>
          <div class="ew-card-header-info">
            <div class="ew-card-title">${e.name}</div>
            <span class="ew-card-type" style="background:${tc.bg};color:${tc.color};">${e.type}</span>
          </div>
        </div>
        <div class="ew-card-body">
          <div class="ew-card-detail">📅 <strong>${e.date}</strong></div>
          <div class="ew-card-detail">📍 ${e.venue}</div>
          ${e.time ? `<div class="ew-card-detail">⏰ ${e.time}</div>` : ''}
          ${e.prize ? `<div class="ew-card-detail">🏆 Prize: ${e.prize}</div>` : ''}
        </div>
        <div class="ew-card-footer">
          <span class="ew-card-status ${statusClass}">${statusLabel}</span>
          <button class="ew-card-expand">View Details →</button>
        </div>
      </div>
    `;
  }).join('');
}

function filterEvents(type) {
  // Update active filter button
  document.querySelectorAll('.ew-filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderEventsWall(type);
}

function openEventDetail(idx) {
  const e = CAMPUS_EVENTS[idx];
  if (!e) return;
  const tc = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Tech;
  const status = getEventStatus(e.date);

  // Header color based on type
  const header = document.getElementById('eventDetailHeader');
  const typeGradients = {
    Tech: 'linear-gradient(135deg,#2563eb,#1e40af)',
    Workshop: 'linear-gradient(135deg,#059669,#065f46)',
    Cultural: 'linear-gradient(135deg,#d97706,#b45309)',
    Quiz: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
  };
  header.style.background = typeGradients[e.type] || typeGradients.Tech;
  document.getElementById('eventDetailTitle').textContent = `${e.icon || '📅'} ${e.name}`;

  // Body
  const body = document.getElementById('eventDetailBody');
  body.innerHTML = `
    <div class="ed-icon-row">
      <div class="ed-big-icon" style="background:${tc.iconBg};">${e.icon || '📅'}</div>
      <div>
        <div class="ed-event-name">${e.name}</div>
        <span class="ed-event-type" style="background:${tc.bg};color:${tc.color};">${e.type}</span>
      </div>
    </div>
    <div class="ed-details-grid">
      <div class="ed-detail-item">
        <div class="ed-detail-label">Date</div>
        <div class="ed-detail-value">📅 ${e.date}</div>
      </div>
      <div class="ed-detail-item">
        <div class="ed-detail-label">Venue</div>
        <div class="ed-detail-value">📍 ${e.venue}</div>
      </div>
      ${e.time ? `<div class="ed-detail-item">
        <div class="ed-detail-label">Time</div>
        <div class="ed-detail-value">⏰ ${e.time}</div>
      </div>` : ''}
      ${e.prize ? `<div class="ed-detail-item">
        <div class="ed-detail-label">Prize Pool</div>
        <div class="ed-detail-value">🏆 ${e.prize}</div>
      </div>` : ''}
      ${e.facilitator ? `<div class="ed-detail-item">
        <div class="ed-detail-label">Facilitator</div>
        <div class="ed-detail-value">👨‍🏫 ${e.facilitator}</div>
      </div>` : ''}
      ${e.organizer ? `<div class="ed-detail-item">
        <div class="ed-detail-label">Organizer</div>
        <div class="ed-detail-value">🏛️ ${e.organizer}</div>
      </div>` : ''}
    </div>
    <div class="ed-description">
      <strong>Keywords:</strong> ${(e.keywords || []).map(k => `<span style="background:${tc.bg};color:${tc.color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;margin:2px;display:inline-block;">${k}</span>`).join(' ')}
    </div>
  `;

  // Footer — actions with Watch Live button
  const footer = document.getElementById('eventDetailFooter');
  footer.innerHTML = `
    <button class="ed-btn ed-btn-live" onclick="watchLiveEvent('${e.name}')">
      <span class="ew-live-dot"></span> Watch Live
    </button>
    <button class="ed-btn ed-btn-primary" onclick="setEventReminder('${e.name}', '${e.date}'); closeEventDetailModal();">
      ⏰ Set Reminder
    </button>
    <button class="ed-btn ed-btn-secondary" onclick="closeEventDetailModal(); navigate('chat'); injectQuickMessage('Tell me more about ${e.name}.');">
      💬 Ask AI
    </button>
  `;

  // Show modal
  document.getElementById('eventDetailModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEventDetailModal() {
  document.getElementById('eventDetailModal').classList.remove('active');
  document.body.style.overflow = '';
}

function watchLiveEvent(eventName) {
  // Simulated live stream — in production, this would link to an actual stream URL
  showToast(`🔴 Checking live stream for "${eventName}"…`);
  setTimeout(() => {
    showToast(`📡 No live stream available right now for "${eventName}". Check back during the event!`);
  }, 2000);
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
  if (e.target.id === 'eventDetailModal') closeEventDetailModal();
});

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  navigate('chat');
  injectWelcomeMessage();

  // No mock activities added initially
  refreshDashboard();
  renderActivityList();
  renderEventsWall();

  // Determine current theme for UI sync
  const currentTheme = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  updateThemeUI(currentTheme);

  console.log('%cSmart Campus AI Assistant', 'font-size:16px;font-weight:bold;color:#2563eb;');
  console.log('%cMemory AI ready · Backend optional', 'color:#64748b;');
});
