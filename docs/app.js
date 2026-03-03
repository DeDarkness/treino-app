
// =====================
// Storage
// =====================
const STORAGE_KEY = "treino_pwa_v1";

const Weekdays = [
  { key: "monday", title: "Segunda" },
  { key: "tuesday", title: "Terça" },
  { key: "wednesday", title: "Quarta" },
  { key: "thursday", title: "Quinta" },
  { key: "friday", title: "Sexta" },
  { key: "saturday", title: "Sábado" }
];

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return bootstrapState();
  try {
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.plans)) return bootstrapState();
    return s;
  } catch {
    return bootstrapState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function bootstrapState() {
  const planId = uid();
  const plan = {
    id: planId,
    name: "Meu Treino",
    notes: "",
    isActive: true,
    days: Weekdays.reduce((acc, d) => {
      acc[d.key] = [];
      return acc;
    }, {})
  };
  return {
    plans: [plan],
    ui: {
      selectedPlanId: planId,
      selectedEditDay: "monday",
      selectedWeekDay: "monday"
    }
  };
}

let state = loadState();

// =====================
// DOM refs
// =====================
const $ = (id) => document.getElementById(id);

const tabs = document.querySelectorAll(".tab");
const panels = {
  plans: $("tab-plans"),
  week: $("tab-week"),
  settings: $("tab-settings")
};

const plansList = $("plansList");
const newPlanName = $("newPlanName");
const btnAddPlan = $("btnAddPlan");
const editorCard = $("editorCard");
const editPlanName = $("editPlanName");
const editPlanNotes = $("editPlanNotes");
const btnSetActive = $("btnSetActive");
const weekdayButtons = $("weekdayButtons");
const dayEditorArea = $("dayEditorArea");

const weekDayButtons = $("weekDayButtons");
const activePlanSelect = $("activePlanSelect");
const btnGoPlans = $("btnGoPlans");
const weekExercisesList = $("weekExercisesList");
const weekHeader = $("weekHeader");

const activePlanLabel = $("activePlanLabel");

const btnExport = $("btnExport");
const btnImport = $("btnImport");
const importFile = $("importFile");
const btnReset = $("btnReset");

const btnEnableNotifications = $("btnEnableNotifications");
const notifStatus = $("notifStatus");

// Timer modal
const timerModal = $("timerModal");
const btnCloseTimer = $("btnCloseTimer");
const timerTitle = $("timerTitle");
const timerSub = $("timerSub");
const timerTime = $("timerTime");
const timerPhase = $("timerPhase");
const btnStartTimer = $("btnStartTimer");
const btnPauseTimer = $("btnPauseTimer");
const btnResetTimer = $("btnResetTimer");

const cfgSets = $("cfgSets");
const cfgWork = $("cfgWork");
const cfgRest = $("cfgRest");
const cfgSimple = $("cfgSimple");
const btnSaveTimerConfig = $("btnSaveTimerConfig");
const configHint = $("configHint");

const modeIntervals = $("modeIntervals");
const modeSimple = $("modeSimple");

// =====================
// Helpers
// =====================
function getActivePlan() {
  return state.plans.find(p => p.isActive) || state.plans[0] || null;
}

function getPlanById(id) {
  return state.plans.find(p => p.id === id) || null;
}

function formatTime(seconds) {
  seconds = Math.max(0, seconds | 0);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function setTab(tabKey) {
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabKey));
  Object.keys(panels).forEach(k => panels[k].classList.toggle("show", k === tabKey));
}

function toast(text) {
  configHint.textContent = text;
  setTimeout(() => { if (configHint.textContent === text) configHint.textContent = ""; }, 2500);
}

// =====================
// Tabs
// =====================
tabs.forEach(t => {
  t.addEventListener("click", () => setTab(t.dataset.tab));
});

// =====================
// Plans CRUD
// =====================
btnAddPlan.addEventListener("click", () => {
  const name = newPlanName.value.trim();
  if (!name) return;

  const plan = {
    id: uid(),
    name,
    notes: "",
    isActive: state.plans.length === 0,
    days: Weekdays.reduce((acc, d) => {
      acc[d.key] = [];
      return acc;
    }, {})
  };

  state.plans.unshift(plan);
  state.ui.selectedPlanId = plan.id;
  newPlanName.value = "";
  saveState();
});

btnSetActive.addEventListener("click", () => {
  const plan = getPlanById(state.ui.selectedPlanId);
  if (!plan) return;
  state.plans.forEach(p => p.isActive = false);
  plan.isActive = true;
  saveState();
});

function deletePlan(planId) {
  const plan = getPlanById(planId);
  if (!plan) return;
  state.plans = state.plans.filter(p => p.id !== planId);

  // ensure active
  if (state.plans.length > 0 && state.plans.every(p => !p.isActive)) {
    state.plans[0].isActive = true;
  }

  // fix selected
  state.ui.selectedPlanId = state.plans[0]?.id || null;
  saveState();
}

function openEditor(planId) {
  state.ui.selectedPlanId = planId;
  editorCard.style.display = "block";
  renderEditor();
}

editPlanName.addEventListener("input", () => {
  const plan = getPlanById(state.ui.selectedPlanId);
  if (!plan) return;
  plan.name = editPlanName.value;
  saveState();
});

editPlanNotes.addEventListener("input", () => {
  const plan = getPlanById(state.ui.selectedPlanId);
  if (!plan) return;
  plan.notes = editPlanNotes.value;
  saveState();
});

// =====================
// Day editor
// =====================
function renderWeekdayButtons(containerEl, selectedKey, onSelect) {
  containerEl.innerHTML = "";
  Weekdays.forEach(d => {
    const b = document.createElement("button");
    b.className = "dayBtn" + (d.key === selectedKey ? " active" : "");
    b.textContent = d.title;
    b.addEventListener("click", () => onSelect(d.key));
    containerEl.appendChild(b);
  });
}

function renderEditor() {
  const plan = getPlanById(state.ui.selectedPlanId);
  if (!plan) {
    editorCard.style.display = "none";
    return;
  }

  editPlanName.value = plan.name;
  editPlanNotes.value = plan.notes;

  renderWeekdayButtons(weekdayButtons, state.ui.selectedEditDay, (dayKey) => {
    state.ui.selectedEditDay = dayKey;
    saveState();
  });

  renderDayEditorArea(plan, state.ui.selectedEditDay);
}

function renderDayEditorArea(plan, dayKey) {
  const list = plan.days[dayKey] || [];
  const dayTitle = Weekdays.find(d => d.key === dayKey)?.title || "Dia";

  dayEditorArea.innerHTML = `
    <div class="cardTitle">${dayTitle}</div>
    <div class="grid2">
      <div>
        <label class="label">Nome do exercício</label>
        <input class="input" id="exTitle" placeholder="Ex: Supino reto" />
      </div>
      <div>
        <label class="label">Detalhes</label>
        <input class="input" id="exDetails" placeholder="Ex: 4x10, 60kg" />
      </div>
    </div>

    <div class="divider"></div>

    <div class="cardTitle">Configuração padrão do timer</div>
    <div class="grid3">
      <div>
        <label class="label">Séries</label>
        <input class="input" id="exSets" type="number" min="1" max="50" value="4" />
      </div>
      <div>
        <label class="label">Trabalho (seg)</label>
        <input class="input" id="exWork" type="number" min="1" max="3600" value="40" />
      </div>
      <div>
        <label class="label">Descanso (seg)</label>
        <input class="input" id="exRest" type="number" min="0" max="3600" value="20" />
      </div>
    </div>

    <div class="row" style="margin-top:10px;">
      <button class="btn primary" id="btnAddExercise">Adicionar exercício</button>
      <div class="hint grow">Regra: não pode repetir o mesmo exercício no mesmo dia.</div>
    </div>

    <div class="divider"></div>
    <div class="cardTitle">Lista de exercícios</div>
    <div class="list" id="dayExercisesList"></div>
  `;

  const exTitle = document.getElementById("exTitle");
  const exDetails = document.getElementById("exDetails");
  const exSets = document.getElementById("exSets");
  const exWork = document.getElementById("exWork");
  const exRest = document.getElementById("exRest");
  const btnAddExercise = document.getElementById("btnAddExercise");

  btnAddExercise.addEventListener("click", () => {
    const title = exTitle.value.trim();
    const details = exDetails.value.trim();
    if (!title) return;

    const exists = list.some(e => e.title.trim().toLowerCase() === title.toLowerCase());
    if (exists) {
      alert("Já existe um exercício com esse nome neste dia.");
      return;
    }

    const exercise = {
      id: uid(),
      title,
      details,
      timer: {
        mode: "intervals",
        sets: Math.max(1, parseInt(exSets.value || "4", 10)),
        work: Math.max(1, parseInt(exWork.value || "40", 10)),
        rest: Math.max(0, parseInt(exRest.value || "20", 10)),
        simple: 60
      }
    };

    plan.days[dayKey].push(exercise);
    exTitle.value = "";
    exDetails.value = "";
    saveState();
  });

  const dayExercisesList = document.getElementById("dayExercisesList");
  dayExercisesList.innerHTML = "";
  if (list.length === 0) {
    dayExercisesList.innerHTML = `<div class="hint">Sem exercícios neste dia.</div>`;
  } else {
    list.forEach(ex => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div>
          <div class="itemTitle">${escapeHtml(ex.title)}</div>
          <div class="itemSub">${escapeHtml(ex.details || "")}</div>
          <div class="itemSub">${timerSummary(ex.timer)}</div>
        </div>
        <div class="itemActions">
          <button class="btn" data-act="timer">Timer</button>
          <button class="btn danger" data-act="del">Excluir</button>
        </div>
      `;
      el.querySelector('[data-act="timer"]').addEventListener("click", () => openTimer(ex, plan, dayKey));
      el.querySelector('[data-act="del"]').addEventListener("click", () => {
        plan.days[dayKey] = plan.days[dayKey].filter(x => x.id !== ex.id);
        saveState();
      });
      dayExercisesList.appendChild(el);
    });
  }
}

function timerSummary(t) {
  if (!t) return "Sem timer";
  if (t.mode === "simple") return `Simples • ${formatTime(t.simple || 60)}`;
  return `Séries • ${t.sets}x ${formatTime(t.work)} / Desc ${formatTime(t.rest)}`;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// =====================
// Week view
// =====================
btnGoPlans.addEventListener("click", () => setTab("plans"));

function renderWeek() {
  renderWeekdayButtons(weekDayButtons, state.ui.selectedWeekDay, (dayKey) => {
    state.ui.selectedWeekDay = dayKey;
    saveState();
  });

  // Active plan select
  activePlanSelect.innerHTML = "";
  state.plans.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name + (p.isActive ? " (Ativo)" : "");
    if (p.isActive) opt.selected = true;
    activePlanSelect.appendChild(opt);
  });

  activePlanSelect.onchange = () => {
    const id = activePlanSelect.value;
    state.plans.forEach(p => p.isActive = (p.id === id));
    saveState();
  };

  const plan = getActivePlan();
  const dayKey = state.ui.selectedWeekDay;
  const dayTitle = Weekdays.find(d => d.key === dayKey)?.title || "Dia";
  weekHeader.textContent = `${dayTitle} • Exercícios`;

  weekExercisesList.innerHTML = "";
  if (!plan) {
    weekExercisesList.innerHTML = `<div class="hint">Crie um treino na aba Treinos.</div>`;
    return;
  }

  const list = plan.days[dayKey] || [];
  if (list.length === 0) {
    weekExercisesList.innerHTML = `<div class="hint">Nenhum exercício para este dia.</div>`;
    return;
  }

  list.forEach(ex => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div>
        <div class="itemTitle">${escapeHtml(ex.title)}</div>
        <div class="itemSub">${escapeHtml(ex.details || "")}</div>
        <div class="itemSub">${timerSummary(ex.timer)}</div>
      </div>
      <div class="itemActions">
        <button class="btn primary" data-act="start">INICIAR</button>
      </div>
    `;
    el.querySelector('[data-act="start"]').addEventListener("click", () => openTimer(ex, plan, dayKey));
    weekExercisesList.appendChild(el);
  });
}

// =====================
// Timer modal + Engine
// =====================
let currentExerciseRef = null;
let engine = null;

function openTimer(exercise, plan, dayKey) {
  currentExerciseRef = { exerciseId: exercise.id, planId: plan.id, dayKey };
  timerTitle.textContent = exercise.title;
  timerSub.textContent = exercise.details || "";
  applyTimerConfigToUI(exercise.timer);

  timerModal.classList.add("show");
  timerModal.setAttribute("aria-hidden", "false");

  // build engine
  engine = makeEngine(exercise.timer, () => {
    timerPhase.textContent = "Concluído";
    timerTime.textContent = "00:00";
    notifyFinished(exercise.title);
  });

  renderEngine();
}

btnCloseTimer.addEventListener("click", closeTimer);
timerModal.addEventListener("click", (e) => {
  if (e.target === timerModal) closeTimer();
});

function closeTimer() {
  if (engine) engine.stop();
  engine = null;
  currentExerciseRef = null;
  timerModal.classList.remove("show");
  timerModal.setAttribute("aria-hidden", "true");
}

btnStartTimer.addEventListener("click", () => { if (engine) engine.start(); });
btnPauseTimer.addEventListener("click", () => { if (engine) engine.pause(); });
btnResetTimer.addEventListener("click", () => { if (engine) engine.reset(); });

function applyTimerConfigToUI(timerCfg) {
  const mode = timerCfg?.mode || "intervals";
  document.querySelectorAll('input[name="mode"]').forEach(r => r.checked = (r.value === mode));
  modeIntervals.style.display = (mode === "intervals") ? "" : "none";
  modeSimple.style.display = (mode === "simple") ? "" : "none";

  cfgSets.value = timerCfg?.sets ?? 4;
  cfgWork.value = timerCfg?.work ?? 40;
  cfgRest.value = timerCfg?.rest ?? 20;
  cfgSimple.value = timerCfg?.simple ?? 60;
}

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener("change", () => {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    modeIntervals.style.display = (mode === "intervals") ? "" : "none";
    modeSimple.style.display = (mode === "simple") ? "" : "none";
  });
});

btnSaveTimerConfig.addEventListener("click", () => {
  if (!currentExerciseRef) return;

  const plan = getPlanById(currentExerciseRef.planId);
  if (!plan) return;
  const list = plan.days[currentExerciseRef.dayKey] || [];
  const ex = list.find(x => x.id === currentExerciseRef.exerciseId);
  if (!ex) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const sets = Math.max(1, parseInt(cfgSets.value || "4", 10));
  const work = Math.max(1, parseInt(cfgWork.value || "40", 10));
  const rest = Math.max(0, parseInt(cfgRest.value || "20", 10));
  const simple = Math.max(1, parseInt(cfgSimple.value || "60", 10));

  ex.timer = { mode, sets, work, rest, simple };
  saveState();
  toast("Configuração salva.");

  // reconfigure engine if open
  if (engine) {
    engine.stop();
    engine = makeEngine(ex.timer, () => {
      timerPhase.textContent = "Concluído";
      timerTime.textContent = "00:00";
      notifyFinished(ex.title);
    });
    renderEngine();
  }
});

function renderEngine() {
  if (!engine) return;
  timerTime.textContent = formatTime(engine.remaining());
  timerPhase.textContent = engine.phaseLabel();
  requestAnimationFrame(() => {
    // keep UI updated
    if (!engine) return;
    timerTime.textContent = formatTime(engine.remaining());
    timerPhase.textContent = engine.phaseLabel();
    setTimeout(renderEngine, 200);
  });
}

function makeEngine(cfg, onFinish) {
  const mode = cfg?.mode || "intervals";

  let intervalId = null;
  let paused = false;

  // state
  let phase = "idle"; // idle, simple, work, rest, finished
  let remaining = 0;

  // intervals
  const totalSets = Math.max(1, cfg?.sets ?? 4);
  const work = Math.max(1, cfg?.work ?? 40);
  const rest = Math.max(0, cfg?.rest ?? 20);
  let setIndex = 1;

  // simple
  const simple = Math.max(1, cfg?.simple ?? 60);

  function start() {
    if (phase === "finished") reset();
    if (phase === "idle") {
      if (mode === "simple") {
        phase = "simple";
        remaining = simple;
      } else {
        phase = "work";
        setIndex = 1;
        remaining = work;
      }
    }
    if (paused) paused = false;
    tickLoop();
  }

  function pause() {
    paused = true;
    stopInterval();
  }

  function reset() {
    paused = false;
    stopInterval();
    phase = "idle";
    remaining = 0;
    setIndex = 1;
  }

  function stop() {
    stopInterval();
  }

  function stopInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function tickLoop() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      if (paused) return;

      if (remaining > 0) {
        remaining -= 1;
      }
      if (remaining <= 0) {
        remaining = 0;
        advance();
      }
    }, 1000);
  }

  function advance() {
    if (mode === "simple") {
      phase = "finished";
      stopInterval();
      onFinish?.();
      return;
    }

    if (phase === "work") {
      if (setIndex >= totalSets) {
        phase = "finished";
        stopInterval();
        onFinish?.();
      } else {
        // rest before next
        if (rest <= 0) {
          setIndex += 1;
          phase = "work";
          remaining = work;
        } else {
          phase = "rest";
          remaining = rest;
        }
      }
      return;
    }

    if (phase === "rest") {
      setIndex += 1;
      phase = "work";
      remaining = work;
      return;
    }
  }

  function phaseLabel() {
    if (phase === "idle") return "Pronto";
    if (phase === "simple") return "Simples";
    if (phase === "work") return `TRABALHO — Série ${setIndex}/${totalSets}`;
    if (phase === "rest") return `DESCANSO — Próxima ${setIndex+1}/${totalSets}`;
    if (phase === "finished") return "Concluído";
    return "—";
  }

  return {
    start, pause, reset, stop,
    remaining: () => remaining,
    phaseLabel
  };
}

// =====================
// Notifications (Web)
// =====================
async function enableNotifications() {
  if (!("Notification" in window)) {
    notifStatus.textContent = "Seu navegador não suporta notificações.";
    return;
  }
  const perm = await Notification.requestPermission();
  notifStatus.textContent = `Permissão: ${perm}`;
}

function notifyFinished(title) {
  // PWA web notifications: pode variar no iOS, mas tentamos.
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Exercício concluído", { body: `${title} finalizado.` });
    }
  } catch {}
}

btnEnableNotifications.addEventListener("click", enableNotifications);

// =====================
// Backup (Export/Import)
// =====================
btnExport.addEventListener("click", () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `treino-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

btnImport.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const imported = JSON.parse(text);
    if (!imported || !Array.isArray(imported.plans)) throw new Error("Formato inválido");
    state = imported;
    // sanity: ensure at least one plan active
    if (state.plans.length > 0 && state.plans.every(p => !p.isActive)) state.plans[0].isActive = true;
    saveState();
    alert("Importado com sucesso.");
  } catch (e) {
    alert("Falha ao importar: arquivo inválido.");
  } finally {
    importFile.value = "";
  }
});

btnReset.addEventListener("click", () => {
  if (!confirm("Tem certeza que deseja apagar tudo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = bootstrapState();
  saveState();
});

// =====================
// Render
// =====================
function renderPlans() {
  plansList.innerHTML = "";
  if (state.plans.length === 0) {
    plansList.innerHTML = `<div class="hint">Nenhum treino. Crie um acima.</div>`;
    editorCard.style.display = "none";
    return;
  }

  state.plans.forEach(plan => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div>
        <div class="itemTitle">${escapeHtml(plan.name)}</div>
        <div class="itemSub">${escapeHtml(plan.notes || "")}</div>
        <div class="itemSub">
          ${plan.isActive ? `<span class="badge">Ativo</span>` : ""}
        </div>
      </div>
      <div class="itemActions">
        <button class="btn" data-act="edit">Editar</button>
        <button class="btn" data-act="active">Ativar</button>
        <button class="btn danger" data-act="del">Excluir</button>
      </div>
    `;

    el.querySelector('[data-act="edit"]').addEventListener("click", () => openEditor(plan.id));
    el.querySelector('[data-act="active"]').addEventListener("click", () => {
      state.plans.forEach(p => p.isActive = false);
      plan.isActive = true;
      saveState();
    });
    el.querySelector('[data-act="del"]').addEventListener("click", () => deletePlan(plan.id));

    plansList.appendChild(el);
  });
}

function renderHeader() {
  const active = getActivePlan();
  activePlanLabel.textContent = active ? `Ativo: ${active.name}` : "Sem treino ativo";
}

function renderAll() {
  renderHeader();
  renderPlans();

  // Show editor if selected exists
  const selected = getPlanById(state.ui.selectedPlanId);
  if (selected) {
    editorCard.style.display = "block";
    renderEditor();
  } else {
    editorCard.style.display = "none";
  }

  renderWeek();

  // notif status
  if ("Notification" in window) {
    notifStatus.textContent = `Permissão: ${Notification.permission}`;
  } else {
    notifStatus.textContent = "Notificações não suportadas aqui.";
  }
}

renderAll();

// Start default tab
setTab("plans");
