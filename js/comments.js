// ═══════════════════════════════════════
//  COMENTARIOS IA — LOCAL (sin CORS)
//  El banco COMMENTS vive en data.js
// ═══════════════════════════════════════
function pickComment(bank, vars = {}) {
  let text = bank[Math.floor(Math.random() * bank.length)];
  Object.entries(vars).forEach(([k, v]) => { text = text.replaceAll(`{${k}}`, v); });
  return text;
}

function getHaikuComment(type, n1, op, n2, correct, streak, targetName = '') {
  const aiText = document.getElementById('aiText');
  if (!aiText) return;

  let text = '';
  if (type === 'correct') {
    text = streak > 2
      ? pickComment(COMMENTS.streak, { n: streak })
      : pickComment(COMMENTS.correct);
  } else if (type === 'incorrect') {
    text = pickComment(COMMENTS.incorrect);
  } else if (type === 'blocked') {
    text = pickComment(COMMENTS.blocked, { correct });
  } else if (type === 'fireball') {
    text = pickComment(COMMENTS.fireball, { target: targetName });
  }

  // Tiny delay to feel responsive, not instant
  aiText.textContent = '';
  setTimeout(() => { if (aiText) aiText.textContent = text; }, 120);
}

function getHaikuEndComment(won, winnerName, level, correct, total) {
  const aiText = document.getElementById('resultAiText');
  if (!aiText) return;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const bank = won ? COMMENTS.end_win : COMMENTS.end_lose;
  aiText.textContent = pickComment(bank) + ` (Precisión: ${accuracy}%)`;
}
