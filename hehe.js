const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const puckRadius = 15;
const dividerGap = 60;
const numPucksPerPlayer = 5;
let pucks = [];
let currentPlayer = 1;
let dragging = false;
let selectedPuck = null;
let power = 0;
let timer = 15;
let timerInterval;
let gameOver = false;
let lastMousePos = { x: 0, y: 0 };

const powerBar = document.getElementById("powerBar");
const turnDisplay = document.getElementById("turn");
const scoreDisplay = document.getElementById("score");
const winnerDisplay = document.getElementById("winner");
const timerDisplay = document.getElementById("timerDisplay");

function createPucks() {
  pucks = [];
  for (let i = 0; i < numPucksPerPlayer; i++) {
    pucks.push({ x: 100, y: 60 + i * 60, vx: 0, vy: 0, owner: 1 });
    pucks.push({ x: canvas.width - 100, y: 60 + i * 60, vx: 0, vy: 0, owner: 2 });
  }
}

function drawDivider() {
  const gapStart = (canvas.height - dividerGap) / 2;
  ctx.fillStyle = "black";
  ctx.fillRect(canvas.width / 2 - 2, 0, 4, gapStart);
  ctx.fillRect(canvas.width / 2 - 2, gapStart + dividerGap, 4, canvas.height - gapStart - dividerGap);
}

function drawPucks() {
  ctx.fillStyle = "black";
  pucks.forEach(puck => {
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puckRadius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawAimLine(pos) {
  if (selectedPuck) {
    const dx = selectedPuck.x - pos.x;
    const dy = selectedPuck.y - pos.y;
    const length = Math.min(Math.hypot(dx, dy), 100); // max aim length
    const angle = Math.atan2(dy, dx);

    const endX = selectedPuck.x + length * Math.cos(angle);
    const endY = selectedPuck.y + length * Math.sin(angle);

    const gradient = ctx.createLinearGradient(
      selectedPuck.x, selectedPuck.y, endX, endY
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");   
    gradient.addColorStop(0.5, "rgba(208, 17, 17, 0.4)"); 
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)");   

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(selectedPuck.x, selectedPuck.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}



function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawDivider();
  drawPucks();
  if (dragging && selectedPuck) {
    drawAimLine(lastMousePos);
  }
}

function animate() {
  updatePucks();
  draw();
  if (!gameOver) {
    if (allPucksStopped()) {
      checkWinCondition();
    }
    requestAnimationFrame(animate);
  }
}


function updatePucks() {
  for (let puck of pucks) {
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= 0.98;
    puck.vy *= 0.98;

    if (puck.x - puckRadius < 0 || puck.x + puckRadius > canvas.width) {
      puck.vx *= -1;
      puck.x = Math.max(puckRadius, Math.min(puck.x, canvas.width - puckRadius));
    }
    if (puck.y - puckRadius < 0 || puck.y + puckRadius > canvas.height) {
      puck.vy *= -1;
      puck.y = Math.max(puckRadius, Math.min(puck.y, canvas.height - puckRadius));
    }

    const gapStart = (canvas.height - dividerGap) / 2;
const gapEnd = gapStart + dividerGap;

const nextX = puck.x + puck.vx;
const crossingDivider = 
  (puck.x < canvas.width / 2 && nextX >= canvas.width / 2 - puckRadius) ||
  (puck.x > canvas.width / 2 && nextX <= canvas.width / 2 + puckRadius);

const goingThroughWall = crossingDivider && (puck.y < gapStart || puck.y > gapEnd);

if (goingThroughWall) {
  puck.vx *= -1;
  puck.x = puck.x < canvas.width / 2
    ? canvas.width / 2 - puckRadius
    : canvas.width / 2 + puckRadius;
}

  }

  for (let i = 0; i < pucks.length; i++) {
    for (let j = i + 1; j < pucks.length; j++) {
      let a = pucks[i], b = pucks[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist < 2 * puckRadius) {
        let angle = Math.atan2(dy, dx);
        a.vx -= Math.cos(angle);
        a.vy -= Math.sin(angle);
        b.vx += Math.cos(angle);
        b.vy += Math.sin(angle);
      }
    }
  }
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function isOnCurrentSide(puck) {
  return currentPlayer === 1 ? puck.x < canvas.width / 2 : puck.x > canvas.width / 2;
}

function handleStart(pos) {
  if (gameOver) return;
  for (let puck of pucks) {
    if (isOnCurrentSide(puck)) {
      const dx = pos.x - puck.x;
      const dy = pos.y - puck.y;
      if (Math.hypot(dx, dy) < puckRadius) {
        selectedPuck = puck;
        dragging = true;
        break;
      }
    }
  }
}

function handleEnd(pos) {
  if (gameOver) return;
  if (dragging && selectedPuck) {
    const dx = selectedPuck.x - pos.x;
    const dy = selectedPuck.y - pos.y;
    selectedPuck.vx = dx * 0.2;
    selectedPuck.vy = dy * 0.2;
    powerBar.value = 0;
    endTurn();
  }
  dragging = false;
  selectedPuck = null;
}

function handleMove(pos) {
  if (gameOver) return;
  lastMousePos = pos;
  if (dragging && selectedPuck) {
    const dx = selectedPuck.x - pos.x;
    const dy = selectedPuck.y - pos.y;
    power = Math.min(Math.hypot(dx, dy), 100);
    powerBar.value = power;
  }
}

document.addEventListener("mousedown", e => handleStart(getMousePos(e)));
document.addEventListener("mousemove", e => handleMove(getMousePos(e)));
document.addEventListener("mouseup", e => handleEnd(getMousePos(e)));


document.addEventListener("touchstart", e => handleStart(getTouchPos(e.touches[0])));
document.addEventListener("touchmove", e => {
  e.preventDefault();
  handleMove(getTouchPos(e.touches[0]));
}, { passive: false });
document.addEventListener("touchend", e => handleEnd(getTouchPos(e.changedTouches[0])));

function endTurn() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnUI();
  resetTimer();
}

function updateTurnUI() {
  turnDisplay.textContent = `Turn: Player ${currentPlayer}`;
}

function updateScore() {
  const p1 = pucks.filter(p => p.x < canvas.width / 2).length;
  const p2 = pucks.filter(p => p.x > canvas.width / 2).length;
  scoreDisplay.textContent = `Player 1: ${p1} | Player 2: ${p2}`;
}
function allPucksStopped() {
  return pucks.every(p => Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1);
}

function updateTimerUI() {
  timerDisplay.textContent = `⏱️ ${timer}s`;
}

function resetTimer() {
  clearInterval(timerInterval);
  timer = 15;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timer--;
    updateTimerUI();
    if (timer <= 0) {
      clearInterval(timerInterval);
      endTurn();
    }
  }, 1000);
}

function checkWinCondition() {
  const p1OwnSide = pucks.filter(p => p.owner === 1 && p.x < canvas.width / 2).length;
  const p2OwnSide = pucks.filter(p => p.owner === 2 && p.x > canvas.width / 2).length;

  if (p1OwnSide === 0) {
    winnerDisplay.textContent = "🎉 Player 1 Wins!";
    gameOver = true;
    clearInterval(timerInterval);
    draw();
  } else if (p2OwnSide === 0) {
    winnerDisplay.textContent = "🎉 Player 2 Wins!";
    gameOver = true;
    clearInterval(timerInterval);
    draw();
  }
}

// Show confirmation modal instead of restarting directly
function restartGame() {
  document.getElementById("restartModal").classList.remove("hidden");
}

// Confirm Restart
document.getElementById("confirmRestartBtn").addEventListener("click", () => {
  document.getElementById("restartModal").classList.add("hidden");
  createPucks();
  currentPlayer = 1;
  gameOver = false;
  updateTurnUI();
  updateScore();
  winnerDisplay.textContent = "";
  resetTimer();
  animate();
});

// Cancel Restart
document.getElementById("cancelRestartBtn").addEventListener("click", () => {
  document.getElementById("restartModal").classList.add("hidden");
});

setInterval(updateScore, 500);
createPucks();
updateTurnUI();
resetTimer();
animate();
