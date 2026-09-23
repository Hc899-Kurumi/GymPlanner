const LEGACY_STORAGE_KEY = "gymplanner-data-v1";
let STORAGE_KEY = null;

const defaultRoutines = [
  { id: "push", day: 1, dayName: "Monday", name: "Chest, Shoulders & Triceps", exercises: [
    ["Bench Press", "Chest"], ["Pec Fly", "Chest"], ["Shoulder Press", "Shoulders"], ["Lateral Raises", "Shoulders"], ["Triceps Extensions", "Triceps"], ["Treadmill Warm-up", "Cardio", "5–10 min"]
  ]},
  { id: "legs-abs", day: 2, dayName: "Tuesday", name: "Legs & Abs", exercises: [
    ["Leg Press", "Glutes"], ["Leg Extension", "Quads"], ["Leg Curl", "Hamstrings"], ["Crunch Machine", "Abs"], ["Treadmill Warm-up", "Cardio", "5–10 min"]
  ]},
  { id: "cardio", day: 3, dayName: "Wednesday", name: "Treadmill Cardio", exercises: [["Treadmill", "Cardio", "30–60 min comfortable pace"]]},
  { id: "pull", day: 4, dayName: "Thursday", name: "Back, Biceps & Abs", exercises: [
    ["Lat Pulldown", "Back"], ["Seated Row", "Back"], ["Bicep Curls", "Biceps"], ["Crunch Machine", "Abs"], ["Treadmill Warm-up", "Cardio", "5–10 min"]
  ]},
  { id: "upper", day: 5, dayName: "Friday", name: "Upper Body", exercises: [
    ["Bench Press", "Chest"], ["Seated Row", "Back"], ["Shoulder Press", "Shoulders"], ["Bicep Curls", "Biceps"], ["Triceps Extensions", "Triceps"], ["Treadmill Warm-up", "Cardio", "5–10 min"]
  ]},
  { id: "legs-cardio", day: 6, dayName: "Saturday", name: "Legs & Cardio", exercises: [
    ["Leg Press", "Glutes"], ["Leg Curl", "Hamstrings"], ["Leg Extension", "Quads"], ["Treadmill", "Cardio", "20–30 min"]
  ]}
].map(r => ({ ...r, exercises: r.exercises.map((e, i) => ({ id: `${r.id}-${i}`, name: e[0], muscle: e[1], note: e[2] || "", sets: e[1] === "Cardio" ? 1 : 3 })) }));

const initialState = { routines: defaultRoutines, history: [], measurements: [], theme: "dark" };
let state = structuredClone(initialState);
let currentView = "today";
let session = null;
let workoutClock = null;
let restClock = null;

function loadState() {
  if (!STORAGE_KEY) return structuredClone(initialState);
  try {
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, localStorage.getItem(LEGACY_STORAGE_KEY));
    }
    return { ...structuredClone(initialState), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  }
  catch { return structuredClone(initialState); }
}
function saveState() { if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function fmtDate(iso) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)); }
function todayRoutine() { return state.routines.find(r => r.day === new Date().getDay()); }
function totalVolume(workout) { return workout.exercises.flatMap(e => e.sets).reduce((sum, s) => sum + ((+s.weight || 0) * (+s.reps || 0)), 0); }
function toast(message) { const el = document.querySelector("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2100); }

function navigate(view) {
  if (session && view !== "workout" && !confirm("Leave the active workout? Your current entries will remain until you finish or cancel it.")) return;
  currentView = view;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  render();
}

function render() {
  const app = document.querySelector("#app");
  document.documentElement.classList.toggle("light", state.theme === "light");
  if (currentView === "today") app.innerHTML = todayView();
  if (currentView === "routines") app.innerHTML = routinesView();
  if (currentView === "history") app.innerHTML = historyView();
  if (currentView === "progress") app.innerHTML = progressView();
  if (currentView === "workout") app.innerHTML = workoutView();
  bindViewEvents();
}

function todayView() {
  const routine = todayRoutine();
  const weekCount = state.history.filter(h => Date.now() - new Date(h.completedAt).getTime() < 7 * 864e5).length;
  const last = state.history[0];
  if (!routine) return `<section class="hero"><span class="kicker">RECOVERY DAY</span><h2>Rest. Recover. Come back stronger.</h2><p>Sunday is your full recovery day. Light walking is optional.</p></section>${summaryCards(weekCount, last)}`;
  return `<section class="hero">
    <span class="kicker">${esc(routine.dayName.toUpperCase())} WORKOUT</span>
    <h2>${esc(routine.name)}</h2>
    <p>${routine.exercises.map(e => esc(e.name)).join(" · ")}</p>
    <div class="hero-meta"><span class="pill">${routine.exercises.length} exercises</span><span class="pill">Saved automatically</span></div>
    <button class="primary wide" data-start="${routine.id}">Start workout</button>
  </section>${summaryCards(weekCount, last)}
  <div class="section-head"><div><h2>Your week</h2><p>Tap any routine to train early.</p></div></div>
  ${state.routines.map(r => routineCard(r, true)).join("")}`;
}

function summaryCards(weekCount, last) {
  const records = getPersonalRecords().length;
  return `<div class="grid" style="margin-top:12px"><div class="stat-card"><strong>${weekCount}</strong><span>workouts this week</span></div><div class="stat-card"><strong>${records}</strong><span>personal records</span></div></div>${last ? `<div class="card" style="margin-top:12px"><span class="muted">Last workout</span><h3 style="margin:6px 0">${esc(last.name)}</h3><span class="muted">${fmtDate(last.completedAt)} · ${Math.round(last.duration / 60)} min</span></div>` : ""}`;
}

function routineCard(r, compact = false) {
  return `<article class="card routine-card"><div><div class="day-badge">${esc(r.dayName.toUpperCase())}</div><h3>${esc(r.name)}</h3><p>${esc(r.exercises.map(e => e.name).join(" · "))}</p></div><button class="${compact ? "secondary" : "primary"}" data-start="${r.id}">${compact ? "Start" : "Begin"}</button></article>`;
}

function routinesView() {
  return `<div class="section-head"><div><h2>Saved routines</h2><p>Edit your week or create a custom workout.</p></div><button class="text-button" id="addRoutine">+ New</button></div>
    ${state.routines.map(r => routineCard(r)).join("")}
    <section class="card" style="margin-top:20px"><h3 style="margin-top:0">Add an exercise</h3><p class="muted">Add a custom exercise to any saved routine.</p><div class="form-grid"><label class="field">Routine<select id="exerciseRoutine">${state.routines.map(r => `<option value="${r.id}">${esc(r.dayName)} — ${esc(r.name)}</option>`).join("")}</select></label><label class="field">Muscle group<input id="exerciseMuscle" placeholder="Chest, Back…"></label></div><label class="field" style="margin-top:10px">Exercise name<input id="exerciseName" placeholder="Exercise name"></label><button class="secondary wide" id="addExercise" style="margin-top:12px">Add exercise</button></section>`;
}

function startWorkout(id) {
  const routine = state.routines.find(r => r.id === id);
  if (!routine) return;
  session = { id: crypto.randomUUID(), routineId: id, name: routine.name, startedAt: new Date().toISOString(), elapsed: 0,
    exercises: routine.exercises.map(ex => ({ ...ex, sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", rpe: "", done: false })) })) };
  currentView = "workout";
  document.querySelectorAll(".bottom-nav").forEach(n => n.style.display = "none");
  workoutClock = setInterval(() => { session.elapsed += 1; const el = document.querySelector("#workoutTimer"); if (el) el.textContent = formatTime(session.elapsed); }, 1000);
  render();
}

function workoutView() {
  if (!session) return "";
  return `<div class="workout-toolbar"><button class="text-button" id="cancelWorkout">Cancel</button><strong class="timer" id="workoutTimer">${formatTime(session.elapsed)}</strong><button class="primary" id="finishWorkout">Finish</button></div>
    <div class="section-head"><div><h2>${esc(session.name)}</h2><p>Log each set as you go.</p></div></div>
    ${session.exercises.map((ex, exIndex) => `<article class="card exercise-card"><h3>${esc(ex.name)}</h3><div class="exercise-meta">${esc(ex.muscle)}${ex.note ? ` · ${esc(ex.note)}` : ""}</div>
      <div class="set-row"><label>SET</label><label>LB</label><label>REPS</label><label>RPE</label><label>✓</label></div>
      ${ex.sets.map((set, setIndex) => setRow(exIndex, setIndex, set)).join("")}
      <button class="add-set" data-add-set="${exIndex}">+ Add set</button></article>`).join("")}
    <section class="card"><h3 style="margin-top:0">Warm-up calculator</h3><p class="muted">Enter a working weight for suggested warm-up steps.</p><div class="form-grid"><label class="field">Working weight<input type="number" id="warmupWeight" inputmode="decimal" placeholder="135"></label><div id="warmupResult" class="field"><span>Suggested</span><strong style="padding:12px 0">—</strong></div></div></section>
    <div id="restPanel"></div>`;
}

function setRow(exIndex, setIndex, set) {
  return `<div class="set-row" data-set-row="${exIndex}-${setIndex}"><label>${setIndex + 1}</label><input type="number" inputmode="decimal" aria-label="Weight" value="${esc(set.weight)}" data-field="weight" data-ex="${exIndex}" data-set="${setIndex}"><input type="number" inputmode="numeric" aria-label="Repetitions" value="${esc(set.reps)}" data-field="reps" data-ex="${exIndex}" data-set="${setIndex}"><input type="number" inputmode="decimal" aria-label="RPE" value="${esc(set.rpe)}" data-field="rpe" data-ex="${exIndex}" data-set="${setIndex}"><button class="check-set ${set.done ? "done" : ""}" data-check="${exIndex}-${setIndex}">${set.done ? "✓" : "○"}</button></div>`;
}

function historyView() {
  return `<div class="section-head"><div><h2>Workout history</h2><p>Every finished session, saved on this device.</p></div><button class="text-button" id="exportCsv">Export CSV</button></div>
    ${state.history.length ? state.history.map(h => `<article class="card history-item"><div><h3>${esc(h.name)}</h3><p>${fmtDate(h.completedAt)} · ${Math.round(h.duration / 60)} min · ${h.exercises.reduce((n,e) => n + e.sets.filter(s => s.done).length, 0)} completed sets</p></div><div class="volume">${Math.round(totalVolume(h)).toLocaleString()} lb</div></article>`).join("") : `<div class="empty"><strong>No workouts yet</strong>Finish your first workout to build your history.</div>`}`;
}

function progressView() {
  const recent = [...state.history].slice(0, 8).reverse();
  const volumes = recent.map(totalVolume);
  const max = Math.max(...volumes, 1);
  const heat = muscleHeat();
  const prs = getPersonalRecords().slice(0, 6);
  return `<div class="section-head"><div><h2>Progress</h2><p>Volume, personal records and trained muscles.</p></div></div>
    <section class="card chart-wrap"><h3 style="margin-top:0">Workout volume</h3>${recent.length ? `<div class="bar-chart">${recent.map((h,i) => `<div class="bar" style="height:${Math.max(8, volumes[i] / max * 100)}%"><span>${new Date(h.completedAt).toLocaleDateString("en-US", {month:"numeric",day:"numeric"})}</span></div>`).join("")}</div>` : `<p class="muted">Complete workouts to unlock your chart.</p>`}</section>
    <div class="section-head"><div><h2>Muscle heat map</h2><p>Activity across your recent workouts.</p></div></div><section class="heat-grid">${Object.entries(heat).map(([muscle,count]) => `<div class="muscle" style="--heat:${Math.min(count,5)}"><strong>${esc(muscle)}</strong><span>${count} exercise entries</span></div>`).join("")}</section>
    <div class="section-head"><div><h2>Personal records</h2></div></div>${prs.length ? prs.map(pr => `<div class="card routine-card"><div><h3>${esc(pr.exercise)}</h3><p>Best logged weight</p></div><strong class="volume">${pr.weight} lb</strong></div>`).join("") : `<div class="card muted">Log weighted sets to establish personal records.</div>`}
    <div class="section-head"><div><h2>Measurements</h2><p>Track body weight or measurements.</p></div></div>
    <section class="card"><div class="form-grid"><label class="field">Type<select id="measurementType"><option>Body weight</option><option>Chest</option><option>Waist</option><option>Arms</option><option>Thighs</option></select></label><label class="field">Value<input id="measurementValue" type="number" inputmode="decimal" placeholder="0.0"></label></div><button class="secondary wide" id="saveMeasurement" style="margin-top:12px">Save measurement</button>${state.measurements.slice(0,4).map(m => `<p><strong>${esc(m.type)}</strong> — ${esc(m.value)} <span class="muted">${fmtDate(m.date)}</span></p>`).join("")}</section>`;
}

function muscleHeat() {
  const muscles = { Chest:0, Back:0, Shoulders:0, Biceps:0, Triceps:0, Quads:0, Hamstrings:0, Glutes:0, Abs:0, Cardio:0 };
  state.history.slice(0,10).forEach(h => h.exercises.forEach(e => { if (e.sets.some(s => s.done)) muscles[e.muscle] = (muscles[e.muscle] || 0) + 1; }));
  return muscles;
}
function getPersonalRecords() {
  const map = new Map();
  state.history.forEach(h => h.exercises.forEach(e => e.sets.forEach(s => { const weight = +s.weight || 0; if (s.done && weight > (map.get(e.name)?.weight || 0)) map.set(e.name, { exercise: e.name, weight }); })));
  return [...map.values()].sort((a,b) => b.weight - a.weight);
}
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`; }

function startRest(seconds = 90) {
  clearInterval(restClock);
  let remaining = seconds;
  const draw = () => { const panel = document.querySelector("#restPanel"); if (panel) panel.innerHTML = `<div class="rest-panel"><span>Rest</span><strong>${formatTime(remaining)}</strong><div class="progress"><span style="width:${remaining / seconds * 100}%"></span></div><button class="text-button" id="skipRest">Skip</button></div>`; };
  draw();
  restClock = setInterval(() => { remaining--; draw(); if (remaining <= 0) { clearInterval(restClock); document.querySelector("#restPanel").innerHTML = ""; toast("Rest finished"); if (navigator.vibrate) navigator.vibrate([120,80,120]); } }, 1000);
}

function finishWorkout() {
  clearInterval(workoutClock); clearInterval(restClock);
  session.completedAt = new Date().toISOString(); session.duration = session.elapsed;
  state.history.unshift(structuredClone(session)); saveState(); session = null;
  document.querySelectorAll(".bottom-nav").forEach(n => n.style.display = "grid");
  currentView = "history"; document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === "history"));
  render(); toast("Workout saved");
}

function exportCsv() {
  const rows = [["date","routine","exercise","muscle","set","weight_lb","reps","rpe","completed"]];
  state.history.forEach(h => h.exercises.forEach(e => e.sets.forEach((s,i) => rows.push([h.completedAt,h.name,e.name,e.muscle,i+1,s.weight,s.reps,s.rpe,s.done]))));
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"})); link.download = `gymplanner-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

function bindViewEvents() {
  document.querySelectorAll("[data-start]").forEach(btn => btn.addEventListener("click", () => startWorkout(btn.dataset.start)));
  document.querySelector("#finishWorkout")?.addEventListener("click", finishWorkout);
  document.querySelector("#cancelWorkout")?.addEventListener("click", () => { if (confirm("Cancel this workout?")) { clearInterval(workoutClock); clearInterval(restClock); session = null; document.querySelector(".bottom-nav").style.display="grid"; navigate("today"); } });
  document.querySelectorAll("[data-field]").forEach(input => input.addEventListener("input", () => { session.exercises[+input.dataset.ex].sets[+input.dataset.set][input.dataset.field] = input.value; }));
  document.querySelectorAll("[data-check]").forEach(btn => btn.addEventListener("click", () => { const [e,s] = btn.dataset.check.split("-").map(Number); const set = session.exercises[e].sets[s]; set.done = !set.done; btn.classList.toggle("done", set.done); btn.textContent = set.done ? "✓" : "○"; if (set.done) startRest(); }));
  document.querySelectorAll("[data-add-set]").forEach(btn => btn.addEventListener("click", () => { session.exercises[+btn.dataset.addSet].sets.push({weight:"",reps:"",rpe:"",done:false}); render(); }));
  document.querySelector("#warmupWeight")?.addEventListener("input", event => { const w = +event.target.value; document.querySelector("#warmupResult strong").textContent = w ? `${Math.round(w*.5)} → ${Math.round(w*.7)} → ${Math.round(w*.85)} lb` : "—"; });
  document.querySelector("#skipRest")?.addEventListener("click", () => { clearInterval(restClock); document.querySelector("#restPanel").innerHTML=""; });
  document.querySelector("#exportCsv")?.addEventListener("click", exportCsv);
  document.querySelector("#addRoutine")?.addEventListener("click", () => { const name = prompt("Routine name"); if (!name) return; const dayName = prompt("Day of week", "Sunday"); const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]; const day=Math.max(0,days.findIndex(d=>d.toLowerCase()===String(dayName).toLowerCase())); state.routines.push({id:crypto.randomUUID(),name,day,dayName:days[day],exercises:[]}); saveState(); render(); });
  document.querySelector("#addExercise")?.addEventListener("click", () => { const name=document.querySelector("#exerciseName").value.trim(); const muscle=document.querySelector("#exerciseMuscle").value.trim(); const routine=state.routines.find(r=>r.id===document.querySelector("#exerciseRoutine").value); if(!name||!muscle) return toast("Add a name and muscle group"); routine.exercises.push({id:crypto.randomUUID(),name,muscle,note:"",sets:3}); saveState(); render(); toast("Exercise added"); });
  document.querySelector("#saveMeasurement")?.addEventListener("click", () => { const value=document.querySelector("#measurementValue").value; if(!value) return toast("Enter a value"); state.measurements.unshift({type:document.querySelector("#measurementType").value,value,date:new Date().toISOString()}); saveState(); render(); toast("Measurement saved"); });
}

document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
document.querySelector("#themeButton").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); render(); });
document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("en-US", {weekday:"long",month:"short",day:"numeric"}).format(new Date()).toUpperCase();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
window.addEventListener("gymplanner-auth", event => {
  clearInterval(workoutClock);
  clearInterval(restClock);
  session = null;
  STORAGE_KEY = `${LEGACY_STORAGE_KEY}:${event.detail.uid}`;
  state = loadState();
  currentView = "today";
  document.querySelector(".bottom-nav").style.display = "grid";
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === "today"));
  render();
});
