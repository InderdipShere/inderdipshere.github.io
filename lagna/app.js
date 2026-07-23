const companionTopics = [
  {
    keywords: ["who", "couple", "bride", "groom", "deepali", "inderdip", "wedding", "marriage", "vivaah", "vivah"],
    answer:
      "This is the wedding invitation website for Deepali and Inderdip. The site carries their welcome message, RSVP, schedule, ceremony guide, memories, and the dedication to Shri Pradipkumar Shere."
  },
  {
    keywords: ["rsvp", "update", "coming", "attend", "attendance", "adult", "child", "children", "special request"],
    answer:
      "To receive your invitation card, open your personal website link, go to the RSVP section, enter your family details, choose Yes or No, and submit. After RSVP is saved, your personalized invitation card will appear on the website."
  },
  {
    keywords: ["qr", "pass", "entry", "gate", "check in", "check-in", "scan", "venue entry"],
    answer:
      "The invitation card is necessary for entry to the venue. If you RSVP Yes, the card will include a QR entry code for your family. Please keep the invitation card ready on your phone when you come to the venue."
  },
  {
    keywords: ["not coming", "cannot come", "not attend", "no rsvp", "decline"],
    answer:
      "If you cannot attend in person, please still submit the RSVP as not attending. You will receive the invitation card with schedule and livestream details, but no venue-entry QR code will be generated."
  },
  {
    keywords: ["live", "livestream", "youtube", "stream", "online", "watch", "remote"],
    answer:
      "The wedding livestream will be hosted on Inderdip's personal YouTube and embedded on this website. The livestream link will also be included with the invitation details for guests who cannot attend."
  },
  {
    keywords: ["schedule", "time", "day 1", "day 2", "sangeet", "haldi", "buddhist", "vedic", "reception", "lunch", "program", "event"],
    answer:
      "The main wedding ceremony is on 3 August 2026 at 8:00 AM IST. The venue is 7 Vachann Banquet Hall, Nagpur. The invitation card also contains the venue, time, and full schedule."
  },
  {
    keywords: ["ceremony", "ritual", "meaning", "marathi", "sanskrit", "shlok", "mantra", "guide", "antarpat", "mangalashtak", "saptapadi", "phere", "buddha", "buddhist"],
    answer:
      "The Ceremony Guide will explain each event in simple language with English and Marathi titles, ritual meaning, guest participation notes, illustrations, and carefully referenced Sanskrit or traditional verses where appropriate."
  },
  {
    keywords: ["photo", "video", "upload", "story", "stories", "memory", "remove", "delete", "consent", "share"],
    answer:
      "Use the Share a Memory section for two things: photos or videos go through the Google upload form, while written blessings can be submitted directly on this website. Both require consent before anything is reviewed for display on the website or during the event."
  },
  {
    keywords: ["blessing", "blessings", "wish", "wishes", "message", "write", "text", "ashirwad", "आशीर्वाद"],
    answer:
      "You can write a blessing directly in the Share a Memory section without Google sign-in. Family name is filled from the invitation link when available, and the message is saved for review before it is displayed anywhere."
  },
  {
    keywords: ["pradip", "pradipkumar", "pradeep", "shere", "father", "dedication", "dedicated", "memory", "loving memory", "late", "book", "digital book", "smruti"],
    answer:
      "This wedding is dedicated to Shri Pradipkumar Shere in loving memory. The section honours his life, values, dates, and family presence through a photo strip and tribute text. The wedding remains a joyful ceremony for Deepali and Inderdip, carried with his blessings."
  },
  {
    keywords: ["invite", "invitation", "card", "download", "pdf", "token", "family", "personal", "private", "link"],
    answer:
      "The WhatsApp link opens your personal wedding website, not the final invitation card. To download the invitation card: open the website link, go to RSVP, fill your family details, submit RSVP, and then open the invitation card shown below the form. The card has the venue, time, schedule, and QR entry code when attending."
  },
  {
    keywords: ["date", "countdown", "august", "3 august", "3rd august", "wedding day"],
    answer:
      "The countdown is set for 3 August 2026 at 8:00 AM IST. Before the wedding it counts down to the ceremony; after that moment it changes into a positive count-up showing how much time has passed since the wedding began."
  }
];

const quickPrompts = [
  "How do I update RSVP?",
  "How do I download the invitation card?",
  "Is the invitation card needed for entry?",
  "How do I share blessings?",
];

const companionFallbacks = [
  "I can help with RSVP, downloading the invitation card, QR venue entry, livestream, schedule, venue, uploads, written blessings, and the dedication to Shri Pradipkumar Shere.",
  "Try asking: How do I download the invitation card? Is the card needed for venue entry? Where is the venue? How do I RSVP?",
  "I may not know every detail yet, but I can guide guests through the main website sections: RSVP, invitation card, schedule, ceremony guide, memories, livestream, and dedication."
];

function normalizeQuestion(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function getQuestionTokens(text) {
  return normalizeQuestion(text)
    .split(" ")
    .filter(token => token.length > 2);
}

function findCompanionAnswer(question) {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return companionFallbacks[0];
  }

  const tokens = getQuestionTokens(question);
  const scoredTopics = companionTopics
    .map(topic => ({
      topic,
      score: topic.keywords.reduce((count, keyword) => {
        const normalizedKeyword = normalizeQuestion(keyword);
        if (normalized.includes(normalizedKeyword)) return count + 3;
        if (tokens.some(token => normalizedKeyword.includes(token) || token.includes(normalizedKeyword))) return count + 1;
        return count;
      }, 0)
    }))
    .sort((a, b) => b.score - a.score);

  if (scoredTopics[0].score > 0) {
    return scoredTopics[0].topic.answer;
  }

  return companionFallbacks[getStableCompanionIndex(normalized, companionFallbacks.length)];
}

function getStableCompanionIndex(seed, count) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % count;
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
  addChatMessage("assistant", "Namaskar. I can help with RSVP, downloading the invitation card, QR venue entry, livestream, schedule, venue, uploads, written blessings, and the dedication to Shri Pradipkumar Shere.");

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

function moveLegacyStrip(direction) {
  const marquee = document.getElementById("legacyMarquee");
  const track = marquee ? marquee.querySelector(".legacy-track") : null;
  if (!marquee || !track) return;

  track.style.animationPlayState = "paused";
  const step = Math.min(360, Math.max(240, marquee.clientWidth * 0.42));
  marquee.scrollBy({
    left: direction * step,
    behavior: "smooth"
  });

  window.clearTimeout(moveLegacyStrip.resumeTimer);
  moveLegacyStrip.resumeTimer = window.setTimeout(() => {
    track.style.animationPlayState = "";
  }, 1800);
}

document.addEventListener("DOMContentLoaded", loadCompanionPrompts);
document.addEventListener("DOMContentLoaded", loadHeroParallax);
