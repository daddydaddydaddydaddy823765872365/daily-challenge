import fs from "fs";
import fetch from "node-fetch";

const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!WEBHOOK_URL) { console.error("Missing WEBHOOK_URL"); process.exit(1); }

// Load members and challenges
const members = JSON.parse(fs.readFileSync("members.json", "utf-8"));
const challenges = fs.readFileSync("challenges.txt", "utf-8")
  .split("\n").map(s => s.trim()).filter(Boolean);

// Load or initialize state
let state = { weights: {}, lastChallenge: null };
try { state = JSON.parse(fs.readFileSync("state.json", "utf-8")); } catch {}

const increment = 2.5;   // % increase per day for non-picked
const maxWeight = 100;

// Initialize weights if first run
members.forEach(m => {
  if (!(m.id in state.weights)) state.weights[m.id] = 20; // start at 20%
});

// Weighted random selection
function weightedRandom(members, weights) {
  const total = members.reduce((sum, m) => sum + weights[m.id], 0);
  let r = Math.random() * total;
  for (const m of members) {
    r -= weights[m.id];
    if (r <= 0) return m;
  }
}

// Pick member
const chosen = weightedRandom(members, state.weights);

// Pick challenge avoiding immediate repeat
let availableChallenges = challenges.filter(c => c !== state.lastChallenge);
const challenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];

// Update weights
members.forEach(m => {
  if (m.id === chosen.id) {
    state.weights[m.id] = 0;
  } else {
    state.weights[m.id] = Math.min(maxWeight, state.weights[m.id] + increment);
  }
});

// Prepare message
const content = `🎥 Today's pick: <@${chosen.id}> (${chosen.name})\n🧩 Challenge: ${challenge}\n\nWeights: ${members.map(m => `${m.name}: ${state.weights[m.id].toFixed(1)}%`).join(", ")}`;

const payload = {
  content,
  allowed_mentions: { parse: ["users"] }
};

// Send message to Discord webhook
(async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error("Webhook send failed:", res.status, await res.text());
    process.exit(1);
  }

  // Save state
  state.lastChallenge = challenge;
  fs.writeFileSync("state.json", JSON.stringify(state, null, 2));
  console.log("Posted message and updated state successfully.");
})();
