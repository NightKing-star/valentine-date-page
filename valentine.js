// ---- step order & progress bar ----
const STEPS = ["step-ask", "step-yaas", "step-when", "step-where", "step-pass", "step-calendar"];
const progressEl = document.getElementById("progress");
const progressDots = progressEl.querySelectorAll("span");
 
let stepIndex = 0;
let chosenDay = null;   // { iso, label }
let chosenPlace = null; // { name, icon }
 
function showStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("is-active"));
  document.getElementById(id).classList.add("is-active");
  stepIndex = STEPS.indexOf(id);
  progressDots.forEach((dot, i) => dot.classList.toggle("filled", i <= stepIndex));
}
 
document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => {
    const prev = STEPS[Math.max(0, stepIndex - 1)];
    showStep(prev);
  });
});
 
// ---- STEP 1: the "No" button that refuses to be caught ----
// No never accepts a no. It dodges, shrinks, and argues.
const noBtn = document.getElementById("btn-no");
const yesBtn = document.getElementById("btn-yes");
const LINES = ["No", "Try again", "Nope", "Nice try", "Still no", "Never!", "Yes is right there"];
let dodges = 0;
 
function dodge() {
  dodges++;
  noBtn.textContent = LINES[Math.min(dodges, LINES.length - 1)];
 
  const parent = noBtn.parentElement.getBoundingClientRect();
  const btn = noBtn.getBoundingClientRect();
  const maxX = parent.width - btn.width;
  const maxY = 80; // vertical wiggle room
 
  const x = (Math.random() * 2 - 1) * (maxX / 2);
  const y = (Math.random() * 2 - 1) * (maxY / 2);
  const shrink = Math.max(0.5, 1 - dodges * 0.05);
 
  noBtn.style.setProperty("--grow", 1 + dodges * 0.08);
  noBtn.style.transform = `translate(${x}px, ${y}px) scale(${shrink})`;
  noBtn.style.position = "relative";
 
  // also nudge Yes to grow slightly, because the answer is obvious
  yesBtn.style.transform = `scale(${1 + Math.min(dodges, 6) * 0.03})`;
}
 
noBtn.addEventListener("mouseenter", dodge);
noBtn.addEventListener("touchstart", (e) => { e.preventDefault(); dodge(); }, { passive: false });
noBtn.addEventListener("click", (e) => { e.preventDefault(); dodge(); });
 
yesBtn.addEventListener("click", () => {
  showStep("step-yaas");
  setTimeout(() => showStep("step-when"), 1400);
});
 
// ---- STEP 3: when are you free ----
const dayGroup = document.getElementById("day-group");
const nextWhenBtn = document.getElementById("next-when");
 
dayGroup.querySelectorAll(".pill").forEach(pill => {
  pill.addEventListener("click", () => {
    dayGroup.querySelectorAll(".pill").forEach(p => p.setAttribute("aria-checked", "false"));
    pill.setAttribute("aria-checked", "true");
    chosenDay = { iso: pill.dataset.iso, label: pill.querySelector("span").textContent };
    nextWhenBtn.disabled = false;
  });
});
 
nextWhenBtn.addEventListener("click", () => showStep("step-where"));
 
// ---- STEP 4: where are we going ----
const whereGroup = document.getElementById("where-group");
 
whereGroup.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => {
    whereGroup.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    chosenPlace = { name: card.dataset.place, icon: card.dataset.icon };
    setTimeout(buildPass, 250);
  });
});
 
// ---- STEP 5: date pass ----
function formatLongDate(iso) {
  const d = new Date(iso + "T19:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
 
let countdownTimer = null;
 
function buildPass() {
  document.getElementById("pass-when").textContent = formatLongDate(chosenDay.iso);
  document.getElementById("pass-where").textContent = chosenPlace.name;
  showStep("step-pass");
  startCountdown(chosenDay.iso);
}
 
function startCountdown(iso) {
  clearInterval(countdownTimer);
  const target = new Date(iso + "T19:00:00").getTime();
  const el = document.getElementById("countdown");
 
  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) { el.textContent = "now!"; clearInterval(countdownTimer); return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    el.textContent = `${days}D ${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}
 
document.getElementById("btn-share").addEventListener("click", () => {
  const text = `Save the date — ${formatLongDate(chosenDay.iso)}, 7:00pm, ${chosenPlace.name}. 💗`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text);
  }
});
 
// ---- build a Google Calendar "add event" link, pre-filled ----
function toGCalUTC(date) {
  // YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
 
function buildGoogleCalendarUrl(iso, place) {
  const start = new Date(iso + "T19:00:00"); // 7:00 pm local
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
 
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Date with you 💗 (${place.icon} ${place.name})`,
    dates: `${toGCalUTC(start)}/${toGCalUTC(end)}`,
    details: `It's a date!\n\nBring: Flowers\nThen: Stargazing\n\nSee you there 💗`,
    location: place.name,
  });
 
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
 
document.getElementById("btn-calendar").addEventListener("click", () => {
  // open Google Calendar in a new tab, pre-filled with the date, time,
  // title and location the person picked
  const url = buildGoogleCalendarUrl(chosenDay.iso, chosenPlace);
  window.open(url, "_blank", "noopener");
 
  // also show our own in-app confirmation screen
  buildCalendar(chosenDay.iso);
  showStep("step-calendar");
});
 
// ---- STEP 6: calendar confirmation ----
function buildCalendar(iso) {
  const date = new Date(iso + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth();
  const pickedDate = date.getDate();
 
  document.getElementById("cal-month").textContent =
    date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  document.getElementById("cal-date-text").textContent =
    `${formatLongDate(iso)}, 7:00 pm`;
 
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
 
  ["M","T","W","T","F","S","S"].forEach(d => {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = d;
    grid.appendChild(el);
  });
 
  const firstOfMonth = new Date(year, month, 1);
  // convert Sunday(0)-based getDay() to Monday-first index
  let leadingEmpty = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
 
  for (let i = 0; i < leadingEmpty; i++) {
    const el = document.createElement("div");
    el.className = "day empty";
    grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement("div");
    el.className = "day" + (d === pickedDate ? " picked" : "");
    el.textContent = d;
    grid.appendChild(el);
  }
}
 
document.getElementById("btn-done").addEventListener("click", () => {
  // final step — nothing left to do but wait for the date
  document.getElementById("btn-done").textContent = "💗";
});
 
// ---- init ----
showStep("step-ask");
 

