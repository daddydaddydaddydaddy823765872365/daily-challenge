// Load state
let state = { weights: {}, lastChallenge: null };
try { state = JSON.parse(fs.readFileSync("state.json", "utf-8")); } catch {}

// Initialize weights if first run
members.forEach(m => {
  if (!(m.id in state.weights)) state.weights[m.id] = 20; // start at 20%
});

// Pick weighted random
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

// Reset chosen weight, increase others
const increment = 2.5;
members.forEach(m => {
  if (m.id === chosen.id) {
    state.weights[m.id] = 0;
  } else {
    state.weights[m.id] += increment;
  }
});
