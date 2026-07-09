const companionTopics = [
  {
    keywords: ["rsvp", "update", "coming", "attend", "attendance", "adult", "child", "children", "special request"],
    answer:
      "You can submit or update your RSVP from the RSVP section using the same invitation link. Adult and children counts are entered by the guest during RSVP; they are not pre-filled. You can also add a special request, or leave it as Nil."
  },
  {
    keywords: ["qr", "pass", "entry", "gate", "check in", "check-in", "scan"],
    answer:
      "The QR entry pass becomes active only after an attending RSVP is submitted. It represents the whole family and will show the RSVP count. If you are not attending, your invitation PDF remains available without the QR code."
  },
  {
    keywords: ["not coming", "cannot come", "not attend", "no rsvp", "decline"],
    answer:
      "If you cannot attend in person, please still submit the RSVP as not attending. You will still receive the invitation PDF, key event schedule, and livestream link, but no QR entry code will be generated."
  },
  {
    keywords: ["live", "livestream", "youtube", "stream", "online", "watch"],
    answer:
      "The wedding livestream will be hosted on Inderdip's personal YouTube and embedded on this website. The livestream link will also be included with the invitation details for guests who cannot attend."
  },
  {
    keywords: ["schedule", "time", "day 1", "day 2", "sangeet", "haldi", "buddhist", "vedic", "reception", "lunch"],
    answer:
      "The schedule is divided into key event groups: Day 1 includes Sangeet, Haldi, Stories of Us, and Dinner. Day 2 includes Haldi Removal, Buddhist Wedding, Vedic Wedding, Reception, Lunch, and Farewell. The official Day 1 and Day 2 PDF schedules will be linked on the site."
  },
  {
    keywords: ["ceremony", "ritual", "meaning", "marathi", "sanskrit", "shlok", "mantra", "guide"],
    answer:
      "The Ceremony Guide will explain each event in simple language with English and Marathi titles, ritual meaning, guest participation notes, illustrations, and carefully referenced Sanskrit or traditional verses where appropriate."
  },
  {
    keywords: ["photo", "video", "upload", "story", "stories", "memory", "remove", "delete", "consent"],
    answer:
      "Guests will be able to upload selected photos or videos for Stories of Us. Uploads will require consent for screening on the website and during the event, and limits will be added to avoid misuse. Guests should be able to manage their own uploads from their invitation link."
  },
  {
    keywords: ["pradip", "smruti", "father", "book", "digital book", "late"],
    answer:
      "Pradipkumar Smruti is a dedicated page for Shri Pradipkumar Shere. Before the wedding countdown completes, guests will see the tribute page introduction. The digital book will become live only after the wedding countdown."
  },
  {
    keywords: ["invite", "invitation", "pdf", "token", "family", "personal"],
    answer:
      "Each family receives a personalized invitation link using a private invite token. The website uses that token to show the family welcome message and invitation details. A general invite link can show the default message."
  },
  {
    keywords: ["date", "countdown", "august", "3 august", "3rd august", "wedding day"],
    answer:
      "The main countdown is for the wedding date: 3 August. The site will use this countdown to guide guests and to unlock some post-wedding content such as the digital book."
  }
];

const quickPrompts = [
  "How do I update RSVP?",
  "When is the QR pass active?",
  "Where can I watch livestream?",
  "What is on Day 2?"
];

function normalizeQuestion(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function findCompanionAnswer(question) {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return "Ask me about RSVP, QR entry pass, livestream, schedule, ceremony meanings, uploads, or Pradipkumar Smruti.";
  }

  const scoredTopics = companionTopics
    .map(topic => ({
      topic,
      score: topic.keywords.reduce((count, keyword) => {
        return normalized.includes(keyword) ? count + 1 : count;
      }, 0)
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredTopics[0].score > 0) {
    return scoredTopics[0].topic.answer;
  }

  return "I am still learning this answer. For now, please check the RSVP, Schedule, Ceremony Guide, and Share a Memory sections, or ask about QR pass, livestream, uploads, or event timings.";
}

function addChatMessage(type, message) {
  const chatLog = document.getElementById("chatLog");
  if (!chatLog) return;

  const bubble = document.createElement("div");
  bubble.className = `chat-message ${type}`;
  bubble.textContent = message;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function answerQuestion(questionText) {
  const input = document.getElementById("questionInput");
  const question = questionText || (input ? input.value : "");
  const trimmedQuestion = question.trim();

  if (trimmedQuestion) {
    addChatMessage("guest", trimmedQuestion);
  }

  addChatMessage("assistant", findCompanionAnswer(trimmedQuestion));

  if (input) {
    input.value = "";
    input.focus();
  }
}

function loadCompanionPrompts() {
  const chatLog = document.getElementById("chatLog");
  const input = document.getElementById("questionInput");
  if (!chatLog || !input) return;

  const promptRow = document.createElement("div");
  promptRow.className = "quick-prompts";

  quickPrompts.forEach(prompt => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => answerQuestion(prompt));
    promptRow.appendChild(button);
  });

  chatLog.appendChild(promptRow);
  addChatMessage("assistant", "Namaskar. I can help with RSVP, QR entry pass, livestream, schedule, ceremony guide, uploads, and Pradipkumar Smruti.");

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      answerQuestion();
    }
  });
}

function loadHeroParallax() {
  const hero = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || reduceMotion) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY || 0;
    const maxShift = 18;
    const shift = Math.min(maxShift, scrollY * 0.035);
    hero.style.setProperty("--hero-bg-y", `${50 + shift}%`);
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();
}

document.addEventListener("DOMContentLoaded", loadCompanionPrompts);
document.addEventListener("DOMContentLoaded", loadHeroParallax);
