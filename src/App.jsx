import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dumbbell, User, Lock, LogOut, Loader2, Eye, EyeOff, AlertCircle,
  Plus, Trash2, X, Check, ChevronLeft, ChevronDown, ChevronUp, CalendarDays, TrendingUp, Flame, History, StickyNote,
  Minus, Circle, CheckCircle2, Activity, Award, Layers, Timer, Play, Pause, Sun, TrendingDown,
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

/* ---------- design tokens (المرحلة ٢ المعتمدة) ----------
   bg: #0F1113   surface: #1A1D21   line: #232629
   text: #EDEBE4  muted: #7D828B
   flame(accent): #FF5A36   progress: #3D7FFF   gold: #F0B429
------------------------------------------------------------ */

import { supabase } from "./supabaseClient.js";

/* ================= helpers: auth + data ================= */
/* Supabase Auth بده إيميل، بس إحنا بدنا "اسم مستخدم" بس (وممكن يكون عربي).
   هاي الدالة تحوّل أي اسم مستخدم (عربي أو إنجليزي) لإيميل داخلي ثابت وفريد،
   عن طريق تحويل كل حرف لكوده الست-عشري — هيك ما في تعارض مع قيود صيغة الإيميل. */
function usernameToEmail(username) {
  const encoded = Array.from(username)
    .map((c) => c.codePointAt(0).toString(16).padStart(4, "0"))
    .join("");
  return `u${encoded}@gymapp.local`;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function fmtArabicDate(key) {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}
function computeLogStats(log) {
  let volume = 0, done = 0, total = 0;
  Object.values(log.entries || {}).forEach((entry) => {
    entry.sets.forEach((s) => {
      total++;
      if (s.done) done++;
      volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });
  });
  return { volume: Math.round(volume), done, total };
}


/* ================= global style block ================= */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
      .font-display { font-family: 'Cairo', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .scrollbar-none::-webkit-scrollbar { display: none; }
      .press { transition: transform .12s ease, opacity .12s ease, background .15s ease, border-color .15s ease; }
      .press:active { transform: scale(0.96); }
      .tap-fade:active { opacity: 0.7; }
      @keyframes fadeInUp { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:translateY(0);} }
      .fade-in { animation: fadeInUp .28s cubic-bezier(.2,.7,.3,1) both; }
      @keyframes popIn { 0% { transform: scale(.85); opacity:0;} 60% { transform: scale(1.04); opacity:1;} 100% { transform: scale(1); } }
      .pop-in { animation: popIn .32s cubic-bezier(.2,.8,.3,1) both; }
      @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
      .skeleton { background: linear-gradient(90deg, #1A1D21 25%, #232629 37%, #1A1D21 63%); background-size: 200px 100%; animation: shimmer 1.4s ease-in-out infinite; }
      .glow-focus:focus-within { border-color: #FF5A36 !important; box-shadow: 0 0 0 3px rgba(255,90,54,0.14); }
      @keyframes flicker { 0%,100% { opacity:.6; transform:translate(-50%,-50%) scale(1);} 50% { opacity:1; transform:translate(-50%,-50%) scale(1.15);} }
      @keyframes flickerSoft { 0%,100% { opacity:.45; } 50% { opacity:.75; } }
      @keyframes countRing { from { stroke-dashoffset: 126; } }
      .chevron { transition: transform .25s ease; }
      input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin:0; }
      input[type=number] { -moz-appearance: textfield; }
      .card-depth { box-shadow: 0 1px 0 rgba(255,255,255,0.025) inset, 0 10px 24px -16px rgba(0,0,0,0.65); }
      .card-depth:hover { border-color: #2A2E33; }
      .btn-primary { background: linear-gradient(180deg, #FF6A47 0%, #FF5A36 100%); box-shadow: 0 6px 16px -6px rgba(255,90,54,0.45); }
      .btn-primary:active { box-shadow: 0 2px 8px -4px rgba(255,90,54,0.4); }
      .nav-indicator { border-radius: 0 0 4px 4px; box-shadow: 0 2px 8px 0 rgba(255,90,54,0.5); }
    `}</style>
  );
}

/* ================= plate stack visual ================= */
const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLOR = { 25: "#FF5A36", 20: "#3D7FFF", 15: "#F0B429", 10: "#7C9BE0", 5: "#8B8F98", 2.5: "#B6BAC2", 1.25: "#5A5F68" };
const BAR_WEIGHT = 20;
function computePlates(totalWeight) {
  let perSide = Math.max(totalWeight - BAR_WEIGHT, 0) / 2;
  const plates = [];
  for (const size of PLATE_SIZES) {
    while (perSide >= size - 0.001) {
      plates.push(size);
      perSide -= size;
    }
  }
  return plates;
}
function PlateStack({ weight }) {
  const plates = useMemo(() => computePlates(Number(weight) || 0), [weight]);
  if (!weight || Number(weight) <= BAR_WEIGHT) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: "#7D828B" }}>
        <div className="h-2 w-10 rounded-full" style={{ background: "#232629" }} />
        <span>بار فارغ (٢٠ كجم)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center transition-all duration-200" style={{ direction: "ltr" }}>
        {plates.map((p, i) => (
          <div key={i} title={`${p} كجم`} className="fade-in" style={{ width: 8 + p * 1.1, height: 10 + p * 1.6, background: PLATE_COLOR[p], marginInlineStart: i === 0 ? 0 : -2, borderRadius: 3, border: "1px solid rgba(0,0,0,0.25)" }} />
        ))}
      </div>
      <span className="text-[11px] font-mono" style={{ color: "#7D828B" }}>{plates.length ? plates.join(" + ") : "—"}</span>
    </div>
  );
}

/* ================= auth form fields ================= */
function Field({ icon: Icon, ...props }) {
  return (
    <div className="glow-focus flex items-center gap-2 rounded-xl px-3.5 py-3" style={{ background: "#1A1D21", border: "1px solid #232629", transition: "border-color .15s, box-shadow .15s" }}>
      <Icon size={16} style={{ color: "#7D828B" }} />
      <input {...props} className="flex-1 bg-transparent outline-none text-sm min-w-0" style={{ color: "#EDEBE4", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }} />
    </div>
  );
}
function PasswordField({ placeholder, value, onChange, showPw, setShowPw }) {
  return (
    <div className="glow-focus flex items-center gap-2 rounded-xl px-3.5 py-3" style={{ background: "#1A1D21", border: "1px solid #232629", transition: "border-color .15s, box-shadow .15s" }}>
      <Lock size={16} style={{ color: "#7D828B" }} />
      <input placeholder={placeholder} type={showPw ? "text" : "password"} value={value} onChange={onChange} className="flex-1 bg-transparent outline-none text-sm min-w-0" style={{ color: "#EDEBE4", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }} />
      <button type="button" onClick={() => setShowPw((s) => !s)} className="shrink-0 press">
        {showPw ? <EyeOff size={15} style={{ color: "#7D828B" }} /> : <Eye size={15} style={{ color: "#7D828B" }} />}
      </button>
    </div>
  );
}

/* ================= PR celebration overlay ================= */
function PRCelebration({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(15,17,19,0.85)", animation: "fadeInUp .2s ease both" }} onClick={onClose}>
      <div className="pop-in rounded-3xl p-8 text-center relative overflow-hidden max-w-xs w-full" style={{ background: "radial-gradient(circle at 50% 30%, #2A1712 0%, #1A1D21 70%)", border: "1px solid #3A211A" }}>
        <div className="absolute rounded-full" style={{ width: 260, height: 260, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(255,90,54,0.55) 0%, rgba(255,90,54,0) 70%)", animation: "flicker 1.8s ease-in-out infinite" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold mb-2" style={{ color: "#F0B429" }}>
            <Flame size={14} /> رقم قياسي جديد
          </div>
          <div className="font-mono font-bold" style={{ fontSize: 46, color: "#FF5A36", direction: "ltr" }}>{data.weight}</div>
          <div className="text-sm mt-1" style={{ color: "#EDEBE4" }}>كجم — {data.name}</div>
          <button onClick={onClose} className="press btn-primary mt-5 px-5 py-2 rounded-xl text-sm font-semibold" style={{ color: "#0F1113" }}>
            🔥 يعطيك العافية
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= finish-day confirm overlay ================= */
function FinishDayModal({ open, onSave, onKeep, onDismiss, incompleteCount }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(15,17,19,0.85)", animation: "fadeInUp .2s ease both" }} onClick={onDismiss}>
      <div className="pop-in rounded-3xl p-6 relative max-w-xs w-full" style={{ background: "#1A1D21", border: "1px solid #232629" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2" style={{ color: "#3D7FFF" }}>
          <CheckCircle2 size={18} />
          <span className="font-display text-lg" style={{ color: "#EDEBE4" }}>إنهاء اليوم</span>
        </div>
        <div className="text-sm mb-3" style={{ color: "#7D828B" }}>
          سجّلت أوزان وجولات وأوقات راحة جديدة اليوم. تحب تحفظها كأساس جديد لهاد اليوم بالجدول، ولا تخلي الجدول زي ما هو؟
        </div>
        {incompleteCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(240,180,41,0.1)", color: "#F0B429" }}>
            <AlertCircle size={13} className="shrink-0" />
            عندك {incompleteCount} جولة لسا ما حددتها كمخلّصة
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button onClick={onSave} className="press btn-primary py-2.5 rounded-xl text-sm font-semibold" style={{ color: "#0F1113" }}>
            احفظ التعديلات كأساس جديد
          </button>
          <button onClick={onKeep} className="press py-2.5 rounded-xl text-sm font-semibold" style={{ background: "#232629", color: "#EDEBE4" }}>
            خلي الجدول القديم زي ما هو
          </button>
          <button onClick={onDismiss} className="press py-1.5 rounded-xl text-xs" style={{ color: "#7D828B" }}>
            رجوع
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= main app ================= */
export default function GymApp() {
  const [phase, setPhase] = useState("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);

  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState({});
  const [view, setView] = useState("schedule");
  const [prData, setPrData] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user) {
        await enterApp(authSession.user);
        return;
      }
      setPhase("login");
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setSchedule([]);
        setLogs({});
        setPhase("login");
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function enterApp(user) {
    let { data: row } = await supabase.from("app_data").select("*").eq("user_id", user.id).maybeSingle();
    if (!row) {
      const { data: created } = await supabase
        .from("app_data")
        .insert({ user_id: user.id, schedule: [], logs: {} })
        .select()
        .single();
      row = created;
    }
    setSchedule(row?.schedule || []);
    setLogs(row?.logs || {});
    setSession({ userId: user.id, username: user.user_metadata?.username || "", joinedAt: user.created_at });
    setPhase("app");
  }

  function validateUsername(u) {
    return /^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/.test(u);
  }

  async function handleSignup(e) {
    if (e?.preventDefault) e.preventDefault();
    setError("");
    if (!validateUsername(username)) return setError("اسم المستخدم لازم يكون بين ٣ و٢٠ حرف بدون رموز");
    if (password.length < 6) return setError("كلمة السر لازم تكون ٦ أحرف على الأقل");
    if (password !== confirm) return setError("كلمتا السر غير متطابقتين");
    setBusy(true);
    try {
      const email = usernameToEmail(username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        if (error.status === 422 || /registered|exists/i.test(error.message)) {
          setError("اسم المستخدم مستخدم من قبل");
        } else {
          setError("خطأ: " + error.message);
        }
        setBusy(false);
        return;
      }
      if (!data.session) {
        // ما اشتغل تسجيل دخول تلقائي بعد التسجيل — غالبًا لأن "تأكيد الإيميل" لسا مفعّل بإعدادات Supabase.
        setError("تم إنشاء الحساب، بس لازم توقف خاصية تأكيد الإيميل من إعدادات Supabase عشان الدخول يشتغل مباشرة.");
        setBusy(false);
        return;
      }
      await supabase.from("app_data").insert({ user_id: data.user.id, schedule: [], logs: {} });
      await enterApp(data.user);
    } catch (e2) {
      setError("خطأ: " + (e2?.message || "غير معروف"));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e) {
    if (e?.preventDefault) e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const email = usernameToEmail(username);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("اسم المستخدم أو كلمة السر غير صحيحة");
        setBusy(false);
        return;
      }
      await enterApp(data.user);
    } catch (e2) {
      setError("خطأ: " + (e2?.message || "غير معروف"));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setUsername("");
    setPassword("");
    setConfirm("");
    setSchedule([]);
    setLogs({});
    setPhase("login");
  }

  function switchPhase(p) {
    setError("");
    setPassword("");
    setConfirm("");
    setPhase(p);
  }

  /* ---------- schedule persistence ---------- */
  async function persistSchedule(next) {
    setSchedule(next);
    await supabase.from("app_data").update({ schedule: next, updated_at: new Date().toISOString() }).eq("user_id", session.userId);
  }
  async function persistLogs(next) {
    setLogs(next);
    await supabase.from("app_data").update({ logs: next, updated_at: new Date().toISOString() }).eq("user_id", session.userId);
  }

  function addDay() {
    persistSchedule([...schedule, { id: uid(), name: `يوم ${schedule.length + 1}`, exercises: [], collapsed: false }]);
  }
  function renameDay(dayId, name) {
    persistSchedule(schedule.map((d) => (d.id === dayId ? { ...d, name } : d)));
  }
  function toggleCollapse(dayId) {
    persistSchedule(schedule.map((d) => (d.id === dayId ? { ...d, collapsed: !d.collapsed } : d)));
  }
  function deleteDay(dayId) {
    persistSchedule(schedule.filter((d) => d.id !== dayId));
  }
  function moveDay(dayId, direction) {
    const idx = schedule.findIndex((d) => d.id === dayId);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= schedule.length) return;
    const next = [...schedule];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    persistSchedule(next);
  }
  function addExercise(dayId) {
    persistSchedule(schedule.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, { id: uid(), name: "", sets: 3, reps: 10, targetWeight: 20 }] } : d)));
  }
  function updateExercise(dayId, exId, patch) {
    persistSchedule(schedule.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) } : d)));
  }
  function deleteExercise(dayId, exId) {
    persistSchedule(schedule.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)));
  }
  function moveExercise(dayId, exId, direction) {
    persistSchedule(schedule.map((d) => {
      if (d.id !== dayId) return d;
      const idx = d.exercises.findIndex((e) => e.id === exId);
      const swapWith = idx + direction;
      if (idx < 0 || swapWith < 0 || swapWith >= d.exercises.length) return d;
      const nextEx = [...d.exercises];
      [nextEx[idx], nextEx[swapWith]] = [nextEx[swapWith], nextEx[idx]];
      return { ...d, exercises: nextEx };
    }));
  }

  /* ---------- today logging ---------- */
  const dateKey = todayKey();
  const todayLog = logs[dateKey];

  function startTodaySession(day) {
    if (todayLog && todayLog.dayId === day.id && !todayLog.finished) {
      setView("session");
      return;
    }
    const entries = {};
    day.exercises.forEach((ex) => {
      entries[ex.id] = { name: ex.name || "تمرين", sets: [{ weight: ex.targetWeight || 0, reps: ex.reps || 0, done: false, restSeconds: ex.defaultRestSeconds || 60 }] };
    });
    persistLogs({ ...logs, [dateKey]: { dayId: day.id, dayName: day.name, entries } });
    setView("session");
  }

  function finishDaySaveChanges() {
    if (todayLog) {
      const next = schedule.map((d) => {
        if (d.id !== todayLog.dayId) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) => {
            const entry = todayLog.entries[ex.id];
            if (!entry || !entry.sets.length) return ex;
            const last = entry.sets[entry.sets.length - 1];
            return {
              ...ex,
              sets: entry.sets.length,
              reps: Number(last.reps) || ex.reps,
              targetWeight: Number(last.weight) || ex.targetWeight,
              defaultRestSeconds: Number(last.restSeconds) || ex.defaultRestSeconds || 60,
            };
          }),
        };
      });
      persistSchedule(next);
      persistLogs({ ...logs, [dateKey]: { ...todayLog, finished: true } });
    }
    setShowFinishConfirm(false);
    setView("history");
  }

  function finishDayKeepOld() {
    if (todayLog) {
      persistLogs({ ...logs, [dateKey]: { ...todayLog, finished: true } });
    }
    setShowFinishConfirm(false);
    setView("history");
  }

  function reopenToday() {
    if (todayLog) {
      persistLogs({ ...logs, [dateKey]: { ...todayLog, finished: false } });
    }
  }

  function getPrevMax(exerciseName) {
    let max = 0;
    Object.entries(logs).forEach(([date, log]) => {
      if (date === dateKey) return;
      Object.values(log.entries || {}).forEach((entry) => {
        if (entry.name === exerciseName) {
          entry.sets.forEach((s) => {
            const w = Number(s.weight) || 0;
            if (w > max) max = w;
          });
        }
      });
    });
    return max;
  }

  function updateSetValue(exId, setIdx, field, value) {
    if (!todayLog) return;
    const entry = todayLog.entries[exId];
    const newSets = entry.sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s));
    const next = { ...logs, [dateKey]: { ...todayLog, entries: { ...todayLog.entries, [exId]: { ...entry, sets: newSets } } } };
    persistLogs(next);

    if (field === "weight") {
      const w = Number(value) || 0;
      const prevMax = getPrevMax(entry.name);
      if (w > prevMax && w > 0) {
        setPrData({ name: entry.name, weight: w });
      }
    }
  }
  function stepSetValue(exId, setIdx, field, delta) {
    const entry = todayLog.entries[exId];
    const cur = Number(entry.sets[setIdx][field]) || 0;
    const next = Math.max(0, +(cur + delta).toFixed(2));
    updateSetValue(exId, setIdx, field, next);
  }
  function toggleSetDone(exId, setIdx) {
    if (!todayLog) return;
    const entry = todayLog.entries[exId];
    const newSets = entry.sets.map((s, i) => (i === setIdx ? { ...s, done: !s.done } : s));
    persistLogs({ ...logs, [dateKey]: { ...todayLog, entries: { ...todayLog.entries, [exId]: { ...entry, sets: newSets } } } });
  }
  function addSetRow(exId) {
    if (!todayLog) return;
    const entry = todayLog.entries[exId];
    const last = entry.sets[entry.sets.length - 1] || { weight: 0, reps: 0, done: false, restSeconds: 60 };
    persistLogs({ ...logs, [dateKey]: { ...todayLog, entries: { ...todayLog.entries, [exId]: { ...entry, sets: [...entry.sets, { ...last, done: false }] } } } });
  }
  function updateExerciseNote(exId, note) {
    if (!todayLog) return;
    const entry = todayLog.entries[exId];
    persistLogs({ ...logs, [dateKey]: { ...todayLog, entries: { ...todayLog.entries, [exId]: { ...entry, notes: note } } } });
  }

  const todayVolume = useMemo(() => {
    if (!todayLog) return 0;
    let v = 0;
    Object.values(todayLog.entries).forEach((entry) => entry.sets.forEach((s) => { v += (Number(s.weight) || 0) * (Number(s.reps) || 0); }));
    return Math.round(v);
  }, [todayLog]);

  const todayCompletion = useMemo(() => {
    if (!todayLog) return { done: 0, total: 0 };
    let done = 0, total = 0;
    Object.values(todayLog.entries).forEach((entry) => entry.sets.forEach((s) => { total++; if (s.done) done++; }));
    return { done, total };
  }, [todayLog]);

  /* ---------- progress ---------- */
  const exerciseNames = useMemo(() => {
    const names = new Set();
    schedule.forEach((d) => d.exercises.forEach((e) => e.name && names.add(e.name)));
    Object.values(logs).forEach((l) => Object.values(l.entries || {}).forEach((e) => e.name && names.add(e.name)));
    return Array.from(names);
  }, [schedule, logs]);
  const [progressEx, setProgressEx] = useState(null);
  useEffect(() => {
    if (!progressEx && exerciseNames.length) setProgressEx(exerciseNames[0]);
  }, [exerciseNames, progressEx]);
  const progressData = useMemo(() => {
    if (!progressEx) return [];
    const rows = [];
    Object.entries(logs).sort(([a], [b]) => (a > b ? 1 : -1)).forEach(([date, log]) => {
      Object.values(log.entries || {}).forEach((entry) => {
        if (entry.name === progressEx) {
          const maxWeight = Math.max(...entry.sets.map((s) => Number(s.weight) || 0), 0);
          rows.push({ date: date.slice(5), weight: maxWeight });
        }
      });
    });
    return rows;
  }, [logs, progressEx]);

  const allTimeStats = useMemo(() => {
    let bestLift = 0, totalVolume = 0;
    Object.values(logs).forEach((log) => {
      Object.values(log.entries || {}).forEach((entry) => {
        entry.sets.forEach((s) => {
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          if (w > bestLift) bestLift = w;
          totalVolume += w * r;
        });
      });
    });
    return { bestLift, totalVolume: Math.round(totalVolume) };
  }, [logs]);

  const progressDelta = useMemo(() => {
    if (progressData.length < 2) return null;
    return progressData[progressData.length - 1].weight - progressData[progressData.length - 2].weight;
  }, [progressData]);

  const sessionCount = Object.keys(logs).length;

  /* ================= render ================= */
  if (phase === "loading") {
    return (
      <div dir="rtl" className="min-h-[640px] w-full flex flex-col" style={{ background: "#0F1113" }}>
        <GlobalStyle />
        <div className="px-5 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: "1px solid #232629" }}>
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-20 rounded-lg" />
            <div className="skeleton h-3 w-28 rounded-lg" />
          </div>
          <div className="skeleton h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 px-5 py-5 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "#1A1D21", border: "1px solid #232629" }}>
              <div className="skeleton h-5 w-24 rounded-lg mb-3" />
              <div className="skeleton h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "login" || phase === "signup") {
    return (
      <div dir="rtl" className="min-h-[640px] w-full flex flex-col items-center justify-center px-6" style={{ background: "#0F1113" }}>
        <GlobalStyle />
        <div className="w-full max-w-sm fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute rounded-full" style={{ width: 90, height: 90, background: "radial-gradient(circle, rgba(255,90,54,0.35) 0%, rgba(255,90,54,0) 72%)", animation: "flickerSoft 3s ease-in-out infinite" }} />
              <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "#1A1D21", border: "1px solid #2A2E33" }}>
                <Dumbbell size={24} style={{ color: "#FF5A36" }} />
              </div>
            </div>
            <div className="font-display text-2xl font-extrabold" style={{ color: "#EDEBE4" }}>الحديد</div>
            <div className="text-xs mt-1.5" style={{ color: "#7D828B" }}>{phase === "login" ? "سجّل دخولك عشان تكمل تقدمك" : "أنشئ حساب جديد وابدأ التتبع"}</div>
          </div>

          <div className="flex flex-col gap-3">
            <Field icon={User} placeholder="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" />
            <PasswordField placeholder="كلمة السر" value={password} onChange={(e) => setPassword(e.target.value)} showPw={showPw} setShowPw={setShowPw} />
            {phase === "signup" && <PasswordField placeholder="تأكيد كلمة السر" value={confirm} onChange={(e) => setConfirm(e.target.value)} showPw={showPw} setShowPw={setShowPw} />}

            {error && (
              <div className="fade-in flex items-center gap-1.5 text-xs px-1" style={{ color: "#FF5A36" }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={(e) => (phase === "login" ? handleLogin(e) : handleSignup(e))}
              disabled={busy || !username || !password}
              className="press btn-primary mt-2 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ color: "#0F1113", opacity: busy || !username || !password ? 0.6 : 1 }}
            >
              {busy && <Loader2 className="animate-spin" size={14} />}
              {phase === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </div>

          <div className="text-center mt-5 text-xs" style={{ color: "#7D828B" }}>
            {phase === "login" ? (
              <>ما عندك حساب؟ <button onClick={() => switchPhase("signup")} style={{ color: "#FF5A36" }} className="font-medium press">أنشئ واحد</button></>
            ) : (
              <>عندك حساب؟ <button onClick={() => switchPhase("login")} style={{ color: "#FF5A36" }} className="font-medium press">سجّل دخولك</button></>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- app phase ---------- */
  const tabs = [
    { id: "schedule", label: "الجدول", icon: CalendarDays },
    { id: "history", label: "السجل", icon: History },
    { id: "progress", label: "التقدم", icon: TrendingUp },
  ];
  const activeIdx = tabs.findIndex((t) => t.id === view);

  return (
    <div dir="rtl" className="min-h-[640px] w-full flex flex-col" style={{ background: "#0F1113", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <GlobalStyle />
      <PRCelebration data={prData} onClose={() => setPrData(null)} />
      <FinishDayModal open={showFinishConfirm} onSave={finishDaySaveChanges} onKeep={finishDayKeepOld} onDismiss={() => setShowFinishConfirm(false)} incompleteCount={todayCompletion.total - todayCompletion.done} />

      <div className="relative px-5 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: "1px solid #232629", boxShadow: "0 8px 16px -12px rgba(0,0,0,0.6)" }}>
        <div>
          <div className="font-display text-2xl font-bold" style={{ color: "#EDEBE4" }}>الحديد</div>
          <div className="text-xs mt-0.5" style={{ color: "#7D828B" }}>{fmtArabicDate(dateKey)} · {sessionCount} جلسة</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center font-display font-bold text-sm" style={{ background: "#1A1D21", border: "1.5px solid #FF5A36", color: "#FF5A36" }}>
            {session.username.slice(0, 1).toUpperCase()}
          </div>
          <button onClick={handleLogout} className="press" style={{ color: "#7D828B" }}><LogOut size={17} /></button>
        </div>
      </div>

      <div key={view} className="fade-in flex-1 overflow-y-auto scrollbar-none px-5 py-5">
        {view === "schedule" && (
          <ScheduleView schedule={schedule} todayLog={todayLog} addDay={addDay} renameDay={renameDay} deleteDay={deleteDay} moveDay={moveDay} addExercise={addExercise} updateExercise={updateExercise} deleteExercise={deleteExercise} moveExercise={moveExercise} startTodaySession={startTodaySession} />
        )}
        {view === "session" && (
          <TodayView schedule={schedule} todayLog={todayLog} updateSetValue={updateSetValue} stepSetValue={stepSetValue} toggleSetDone={toggleSetDone} addSetRow={addSetRow} updateExerciseNote={updateExerciseNote} startTodaySession={startTodaySession} todayVolume={todayVolume} todayCompletion={todayCompletion} onRequestFinish={() => setShowFinishConfirm(true)} onReopen={reopenToday} />
        )}
        {view === "history" && (
          <HistoryView logs={logs} dateKey={dateKey} onResume={() => setView("session")} />
        )}
        {view === "progress" && (
          <ProgressView exerciseNames={exerciseNames} progressEx={progressEx} setProgressEx={setProgressEx} progressData={progressData} allTimeStats={allTimeStats} sessionCount={sessionCount} progressDelta={progressDelta} />
        )}
      </div>

      <div className="relative flex" style={{ borderTop: "1px solid #232629", background: "#1A1D21" }}>
        <div
          className="nav-indicator absolute top-0 h-[3px] transition-all duration-300 ease-out"
          style={{ width: `${100 / tabs.length}%`, right: `${activeIdx >= 0 ? (activeIdx / tabs.length) * 100 : 0}%`, opacity: activeIdx >= 0 ? 1 : 0, background: "#FF5A36" }}
        />
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} className="press flex-1 flex flex-col items-center gap-1 py-3" style={{ color: active ? "#FF5A36" : "#7D828B" }}>
              <div className="flex items-center justify-center rounded-full transition-colors" style={{ width: 30, height: 22, background: active ? "rgba(255,90,54,0.14)" : "transparent" }}>
                <Icon size={18} />
              </div>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= sub-views ================= */
function Card({ children, className = "" }) {
  return <div className={"rounded-2xl p-4 card-depth transition-colors " + className} style={{ background: "#1A1D21", border: "1px solid #232629" }}>{children}</div>;
}

function StatPill({ icon: Icon, label, value, color = "#EDEBE4" }) {
  return (
    <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: "#1A1D21", border: "1px solid #232629" }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: "#7D828B" }}>
        <Icon size={12} />
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="font-mono font-bold text-sm" style={{ color, direction: "ltr" }}>{value}</div>
    </div>
  );
}

function OrderButtons({ onUp, onDown, disableUp, disableDown }) {
  return (
    <div className="flex flex-col shrink-0" style={{ gap: 2 }}>
      <button onClick={onUp} disabled={disableUp} className="press flex items-center justify-center rounded-md" style={{ width: 20, height: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", color: disableUp ? "#3A3E44" : "#7D828B", opacity: disableUp ? 0.5 : 1 }}>
        <ChevronUp size={12} />
      </button>
      <button onClick={onDown} disabled={disableDown} className="press flex items-center justify-center rounded-md" style={{ width: 20, height: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", color: disableDown ? "#3A3E44" : "#7D828B", opacity: disableDown ? 0.5 : 1 }}>
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

function DayDetailModal({ day, dayIndex, totalDays, todayLog, renameDay, deleteDay, moveDay, addExercise, updateExercise, deleteExercise, moveExercise, startTodaySession, onClose }) {
  if (!day) return null;
  const inProgress = todayLog && todayLog.dayId === day.id && !todayLog.finished;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,17,19,0.85)", animation: "fadeInUp .2s ease both" }} onClick={onClose}>
      <div className="pop-in w-full max-w-sm rounded-t-3xl p-5 pb-6" style={{ background: "#1A1D21", border: "1px solid #232629", borderBottom: "none", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <button onClick={onClose} className="press" style={{ color: "#7D828B" }}><ChevronDown size={20} /></button>
          <div className="flex items-center gap-2">
            <OrderButtons onUp={() => moveDay(day.id, -1)} onDown={() => moveDay(day.id, 1)} disableUp={dayIndex === 0} disableDown={dayIndex === totalDays - 1} />
            <button onClick={() => { deleteDay(day.id); onClose(); }} className="press" style={{ color: "#FF5A36" }}><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-none" style={{ flex: 1 }}>
          <input
            value={day.name}
            onChange={(e) => renameDay(day.id, e.target.value)}
            className="font-display text-xl bg-transparent outline-none w-full mb-4"
            style={{ color: "#EDEBE4" }}
          />
          <div className="flex flex-col gap-2 mb-3">
            {day.exercises.map((ex, exIdx) => (
              <div key={ex.id} className="rounded-xl p-3" style={{ background: "#232629" }}>
                <div className="flex items-center gap-2 mb-2">
                  <OrderButtons onUp={() => moveExercise(day.id, ex.id, -1)} onDown={() => moveExercise(day.id, ex.id, 1)} disableUp={exIdx === 0} disableDown={exIdx === day.exercises.length - 1} />
                  <input placeholder="اسم التمرين" value={ex.name} onChange={(e) => updateExercise(day.id, ex.id, { name: e.target.value })} className="bg-transparent outline-none flex-1 text-sm font-medium min-w-0" style={{ color: "#EDEBE4" }} />
                  <button onClick={() => deleteExercise(day.id, ex.id)} className="press shrink-0" style={{ color: "#7D828B" }}><X size={14} /></button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <NumField label="جولات" value={ex.sets} onChange={(v) => updateExercise(day.id, ex.id, { sets: v })} />
                  <NumField label="تكرارات" value={ex.reps} onChange={(v) => updateExercise(day.id, ex.id, { reps: v })} />
                  <NumField label="وزن كجم" value={ex.targetWeight} onChange={(v) => updateExercise(day.id, ex.id, { targetWeight: v })} />
                </div>
                <PlateStack weight={ex.targetWeight} />
              </div>
            ))}
            {day.exercises.length === 0 && (
              <div className="text-center py-6 text-sm" style={{ color: "#7D828B" }}>ما فيه تمارين بعد، ضيف أول تمرين</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1">
          <button onClick={() => addExercise(day.id)} className="press flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#232629", color: "#EDEBE4" }}>
            <Plus size={14} /> تمرين
          </button>
          {day.exercises.length > 0 && (
            <button onClick={() => { startTodaySession(day); onClose(); }} className="press btn-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: "#0F1113" }}>
              {inProgress ? <Activity size={14} /> : null}
              {inProgress ? "تابع اليوم" : "ابدأ اليوم"} <ChevronLeft size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleView({ schedule, todayLog, addDay, renameDay, deleteDay, moveDay, addExercise, updateExercise, deleteExercise, moveExercise, startTodaySession }) {
  const [openDayId, setOpenDayId] = useState(null);
  const openDay = schedule.find((d) => d.id === openDayId) || null;
  const openDayIdx = schedule.findIndex((d) => d.id === openDayId);

  return (
    <div className="flex flex-col gap-4">
      {schedule.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#232629" }}>
              <Dumbbell size={22} style={{ color: "#7D828B" }} />
            </div>
            <div className="font-display text-lg mb-1" style={{ color: "#EDEBE4" }}>ما فيه أيام تدريب بعد</div>
            <div className="text-sm" style={{ color: "#7D828B" }}>أضف أول يوم وحدد تماريـنه</div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {schedule.map((day) => {
          const inProgress = todayLog && todayLog.dayId === day.id && !todayLog.finished;
          return (
            <button
              key={day.id}
              onClick={() => setOpenDayId(day.id)}
              className="press card-depth fade-in rounded-2xl p-4 flex flex-col justify-between text-right"
              style={{ background: "#1A1D21", border: inProgress ? "1px solid #F0B42955" : "1px solid #232629", aspectRatio: "1 / 1" }}
            >
              <div>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: "#232629" }}>
                  <Dumbbell size={16} style={{ color: "#FF5A36" }} />
                </div>
                <div className="font-display text-base leading-tight" style={{ color: "#EDEBE4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{day.name}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono" style={{ color: "#7D828B" }}>{day.exercises.length} تمارين</span>
                {inProgress && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(240,180,41,0.14)", color: "#F0B429" }}>شغال</span>}
              </div>
            </button>
          );
        })}
        <button onClick={addDay} className="press rounded-2xl flex flex-col items-center justify-center gap-1.5" style={{ border: "1.5px dashed #232629", color: "#7D828B", aspectRatio: "1 / 1" }}>
          <Plus size={18} />
          <span className="text-xs font-medium">إضافة يوم</span>
        </button>
      </div>

      <DayDetailModal
        day={openDay}
        dayIndex={openDayIdx}
        totalDays={schedule.length}
        todayLog={todayLog}
        renameDay={renameDay}
        deleteDay={deleteDay}
        moveDay={moveDay}
        addExercise={addExercise}
        updateExercise={updateExercise}
        deleteExercise={deleteExercise}
        moveExercise={moveExercise}
        startTodaySession={startTodaySession}
        onClose={() => setOpenDayId(null)}
      />
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px]" style={{ color: "#7D828B" }}>{label}</span>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="glow-focus w-16 rounded-lg px-2 py-1 text-sm font-mono outline-none" style={{ background: "#0F1113", color: "#EDEBE4", border: "1px solid #232629" }} />
    </div>
  );
}

function Stepper({ value, onStep, suffix }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onStep(-1)} className="press h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "#1A1D21", color: "#7D828B" }}>
        <Minus size={12} />
      </button>
      <div className="flex-1 text-center font-mono text-sm" style={{ color: "#EDEBE4" }}>{value}{suffix}</div>
      <button onClick={() => onStep(1)} className="press h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "#1A1D21", color: "#7D828B" }}>
        <Plus size={12} />
      </button>
    </div>
  );
}

const SET_TYPES = {
  warmup: { label: "تحمية", color: "#F0B429", icon: Sun },
  drop: { label: "دروب سيت", color: "#FF5A36", icon: TrendingDown },
  superset: { label: "سوبر سيت", color: "#3D7FFF", icon: Layers },
};
const SET_TYPE_ORDER = [null, "warmup", "drop", "superset"];

function SetTypeBadge({ type, onCycle }) {
  const cfg = type ? SET_TYPES[type] : null;
  const Icon = cfg?.icon;
  return (
    <button
      onClick={onCycle}
      title="نوع الجولة"
      className="press shrink-0 flex items-center justify-center gap-1 rounded-md text-[10px] font-medium"
      style={{
        minWidth: 64,
        height: 24,
        padding: "0 6px",
        background: cfg ? `${cfg.color}1E` : "#1A1D21",
        border: `1px solid ${cfg ? cfg.color : "#232629"}`,
        color: cfg ? cfg.color : "#5A5F68",
      }}
    >
      {Icon && <Icon size={11} />}
      {cfg ? cfg.label : "نوع الجولة"}
    </button>
  );
}

function RestTimerRow({ remaining, running, onToggle, onAdjust }) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const finished = remaining === 0;
  const activeColor = finished ? "#FF5A36" : running ? "#3D7FFF" : "#EDEBE4";

  return (
    <div className="flex items-center gap-1.5">
      <Timer size={12} style={{ color: "#7D828B" }} className="shrink-0" />
      <span className="text-[10px] shrink-0" style={{ color: "#7D828B" }}>راحة</span>
      <button onClick={() => onAdjust(-15)} className="press h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "#1A1D21", color: "#7D828B" }}>
        <Minus size={11} />
      </button>
      <button onClick={onToggle} className="press flex-1 flex items-center justify-center gap-1.5 h-6 rounded-md text-xs font-mono transition-colors" style={{ background: finished ? "rgba(255,90,54,0.14)" : running ? "rgba(61,127,255,0.14)" : "#1A1D21", color: activeColor }}>
        {running ? <Pause size={10} /> : <Play size={10} />}
        {mm}:{ss}
      </button>
      <button onClick={() => onAdjust(15)} className="press h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "#1A1D21", color: "#7D828B" }}>
        <Plus size={11} />
      </button>
    </div>
  );
}

function ExerciseCard({ exId, entry, toggleSetDone, stepSetValue, updateSetValue, addSetRow, updateExerciseNote }) {
  const exDone = entry.sets.every((s) => s.done);
  const [activeIdx, setActiveIdx] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!entry.notes);
  const intervalRef = useRef(null);
  const prevDoneRef = useRef(entry.sets.map((s) => s.done));

  function restOf(idx) {
    return Math.max(15, Number(entry.sets[idx]?.restSeconds) || 60);
  }

  /* لو جولة انعلّمت "خلصت" وفيه تايمر تاني شغال، هاد التايمر الجديد ياخذ الأولوية وينهي القديم تلقائيًا */
  useEffect(() => {
    const prevDone = prevDoneRef.current;
    entry.sets.forEach((s, i) => {
      const wasDone = prevDone[i];
      if (s.done && !wasDone) {
        setActiveIdx(i);
        setRemaining(restOf(i));
        setRunning(true);
      } else if (!s.done && wasDone && activeIdx === i) {
        setRunning(false);
        setActiveIdx(null);
      }
    });
    prevDoneRef.current = entry.sets.map((s) => s.done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.sets]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function toggleRun(idx) {
    if (activeIdx !== idx) {
      setActiveIdx(idx);
      setRemaining(restOf(idx));
      setRunning(true);
      return;
    }
    if (remaining <= 0) {
      setRemaining(restOf(idx));
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }

  function adjustRest(idx, delta) {
    const next = Math.max(15, restOf(idx) + delta);
    updateSetValue(exId, idx, "restSeconds", next);
    if (activeIdx === idx && !running) setRemaining(next);
  }

  function cycleType(idx) {
    const cur = entry.sets[idx]?.type || null;
    const pos = SET_TYPE_ORDER.indexOf(cur);
    const next = SET_TYPE_ORDER[(pos + 1) % SET_TYPE_ORDER.length];
    updateSetValue(exId, idx, "type", next);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-sm" style={{ color: "#EDEBE4" }}>{entry.name || "تمرين"}</div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setNoteOpen((o) => !o)} className="press" title="ملاحظة">
            <StickyNote size={15} style={{ color: entry.notes ? "#F0B429" : "#4A4E55" }} />
          </button>
          {exDone && <CheckCircle2 size={16} style={{ color: "#3D7FFF" }} />}
        </div>
      </div>
      {noteOpen && (
        <div className="mb-3 fade-in">
          <textarea
            value={entry.notes || ""}
            onChange={(e) => updateExerciseNote(exId, e.target.value)}
            placeholder="ملاحظة عن هالتمرين... (وجع، تعديل وضعية، فكرة للمرة الجاية)"
            rows={2}
            className="glow-focus w-full rounded-lg px-3 py-2 text-xs outline-none resize-none"
            style={{ background: "#0F1113", color: "#EDEBE4", border: "1px solid #232629", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {entry.sets.map((s, i) => {
          const isActive = activeIdx === i;
          const rowRemaining = isActive ? remaining : restOf(i);
          const rowRunning = isActive && running;
          const typeColor = s.type ? SET_TYPES[s.type].color : null;
          return (
            <div key={i} className="rounded-xl p-2 fade-in" style={{ background: "rgba(255,255,255,0.02)", border: isActive ? "1px solid #2A3A55" : typeColor ? `1px solid ${typeColor}55` : "1px solid #232629" }}>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleSetDone(exId, i)} className="press shrink-0">
                  {s.done ? <CheckCircle2 size={18} style={{ color: "#3D7FFF" }} /> : <Circle size={18} style={{ color: "#3A3E44" }} />}
                </button>
                <span className="text-[11px] w-4 font-mono shrink-0" style={{ color: "#7D828B" }}>{i + 1}</span>
                <div className="flex-1 min-w-0 rounded-lg px-1" style={{ background: "#232629", opacity: s.done ? 0.55 : 1, transition: "opacity .2s" }}>
                  <Stepper value={s.weight} onStep={(d) => stepSetValue(exId, i, "weight", d * 2.5)} suffix=" كجم" />
                </div>
                <div className="flex-1 min-w-0 rounded-lg px-1" style={{ background: "#232629", opacity: s.done ? 0.55 : 1, transition: "opacity .2s" }}>
                  <Stepper value={s.reps} onStep={(d) => stepSetValue(exId, i, "reps", d)} suffix=" تكرار" />
                </div>
              </div>
              <div className="mt-2 pr-6 flex items-center gap-2">
                <SetTypeBadge type={s.type} onCycle={() => cycleType(i)} />
                <div className="flex-1 min-w-0">
                  <RestTimerRow remaining={rowRemaining} running={rowRunning} onToggle={() => toggleRun(i)} onAdjust={(d) => adjustRest(i, d)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3"><PlateStack weight={Math.max(...entry.sets.map((s) => Number(s.weight) || 0))} /></div>
      <button onClick={() => addSetRow(exId)} className="press mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#232629", color: "#7D828B" }}>
        <Plus size={12} /> جولة إضافية
      </button>
    </Card>
  );
}

function TodayView({ schedule, todayLog, updateSetValue, stepSetValue, toggleSetDone, addSetRow, updateExerciseNote, startTodaySession, todayVolume, todayCompletion, onRequestFinish, onReopen }) {
  if (!todayLog) {
    return (
      <div className="flex flex-col gap-3">
        <Card>
          <div className="text-center py-4">
            <div className="font-display text-lg mb-1" style={{ color: "#EDEBE4" }}>اختر يوم تبدأ فيه</div>
            <div className="text-sm" style={{ color: "#7D828B" }}>ولا سجّلت شي اليوم بعد</div>
          </div>
        </Card>
        {schedule.map((day) => (
          <button key={day.id} onClick={() => startTodaySession(day)} disabled={day.exercises.length === 0} className="press flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: "#1A1D21", border: "1px solid #232629", opacity: day.exercises.length ? 1 : 0.4 }}>
            <span className="font-display text-base" style={{ color: "#EDEBE4" }}>{day.name}</span>
            <span className="text-xs" style={{ color: "#7D828B" }}>{day.exercises.length} تمارين</span>
          </button>
        ))}
      </div>
    );
  }
  if (todayLog.finished) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <div className="text-center py-6">
            <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(61,127,255,0.14)" }}>
              <CheckCircle2 size={24} style={{ color: "#3D7FFF" }} />
            </div>
            <div className="font-display text-lg mb-1" style={{ color: "#EDEBE4" }}>خلّصت يوم {todayLog.dayName}</div>
            <div className="text-sm mb-4" style={{ color: "#7D828B" }}>سجّلت {todayCompletion.done} جولة بحجم {todayVolume} كجم</div>
            <button onClick={onReopen} className="press px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "#232629", color: "#EDEBE4" }}>
              تعديل اليوم من جديد
            </button>
          </div>
        </Card>
      </div>
    );
  }
  const pct = todayCompletion.total ? Math.round((todayCompletion.done / todayCompletion.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check size={16} style={{ color: "#3D7FFF" }} />
          <span className="font-display text-lg" style={{ color: "#EDEBE4" }}>{todayLog.dayName}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: "#7D828B" }}>{todayCompletion.done}/{todayCompletion.total} جولة</span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#232629" }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, background: "#3D7FFF" }} />
      </div>

      <div className="flex gap-2">
        <StatPill icon={Layers} label="الحجم الكلي" value={`${todayVolume} كجم`} color="#3D7FFF" />
        <StatPill icon={Activity} label="نسبة الإنجاز" value={`${pct}%`} color="#FF5A36" />
      </div>

      {Object.entries(todayLog.entries).map(([exId, entry]) => (
        <ExerciseCard key={exId} exId={exId} entry={entry} toggleSetDone={toggleSetDone} stepSetValue={stepSetValue} updateSetValue={updateSetValue} addSetRow={addSetRow} updateExerciseNote={updateExerciseNote} />
      ))}

      <button onClick={onRequestFinish} className="press flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold" style={{ background: "rgba(61,127,255,0.12)", border: "1px solid #2A3A55", color: "#3D7FFF" }}>
        <CheckCircle2 size={16} /> إنهاء اليوم
      </button>
    </div>
  );
}

function HistoryView({ logs, dateKey, onResume }) {
  const [expanded, setExpanded] = useState(null);
  const dates = useMemo(() => Object.keys(logs).sort((a, b) => (a > b ? -1 : 1)), [logs]);

  if (dates.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#232629" }}>
            <History size={22} style={{ color: "#7D828B" }} />
          </div>
          <div className="font-display text-lg mb-1" style={{ color: "#EDEBE4" }}>ما فيه أيام مسجّلة بعد</div>
          <div className="text-sm" style={{ color: "#7D828B" }}>ابدأ أول يوم من تبويب الجدول عشان يبلش السجل</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {dates.map((date) => {
        const log = logs[date];
        const stats = computeLogStats(log);
        const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
        const isOpen = expanded === date;
        const inProgress = date === dateKey && !log.finished;
        return (
          <Card key={date} className="fade-in">
            <button onClick={() => setExpanded(isOpen ? null : date)} className="press w-full flex items-center justify-between">
              <div className="text-right">
                <div className="font-display text-base flex items-center gap-2" style={{ color: "#EDEBE4" }}>
                  {log.dayName}
                  {inProgress && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(240,180,41,0.14)", color: "#F0B429" }}>قيد التنفيذ</span>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#7D828B" }}>{fmtArabicDate(date)}</div>
              </div>
              <ChevronDown size={16} className="chevron shrink-0" style={{ color: "#7D828B", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            <div className="flex gap-2 mt-3">
              <StatPill icon={Layers} label="الحجم" value={`${stats.volume} كجم`} color="#3D7FFF" />
              <StatPill icon={Activity} label="الإنجاز" value={`${pct}%`} color="#FF5A36" />
            </div>

            {isOpen && (
              <div className="fade-in flex flex-col gap-2 mt-3">
                {Object.values(log.entries || {}).map((entry, idx) => (
                  <div key={idx} className="rounded-xl p-3" style={{ background: "#232629" }}>
                    <div className="text-sm font-medium mb-1.5" style={{ color: "#EDEBE4" }}>{entry.name}</div>
                    <div className="flex flex-col gap-1">
                      {entry.sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono" style={{ color: s.done ? "#EDEBE4" : "#4A4E55" }}>
                          <span style={{ color: "#7D828B" }}>{i + 1}.</span>
                          <span>{s.weight} كجم × {s.reps}</span>
                          {s.type && <span style={{ color: SET_TYPES[s.type].color }}>{SET_TYPES[s.type].label}</span>}
                          {s.done && <CheckCircle2 size={12} style={{ color: "#3D7FFF" }} />}
                        </div>
                      ))}
                    </div>
                    {entry.notes && (
                      <div className="flex items-start gap-1.5 mt-2 pt-2 text-xs" style={{ borderTop: "1px solid #2A2E33", color: "#F0B429" }}>
                        <StickyNote size={12} className="shrink-0 mt-0.5" />
                        <span style={{ color: "#B8BCC4" }}>{entry.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
                {inProgress && (
                  <button onClick={onResume} className="press btn-primary mt-1 py-2 rounded-xl text-sm font-semibold" style={{ color: "#0F1113" }}>
                    تابع اليوم
                  </button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ProgressView({ exerciseNames, progressEx, setProgressEx, progressData, allTimeStats, sessionCount, progressDelta }) {
  if (exerciseNames.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#232629" }}>
            <TrendingUp size={22} style={{ color: "#7D828B" }} />
          </div>
          <div className="font-display text-lg mb-1" style={{ color: "#EDEBE4" }}>ما فيه بيانات تقدم بعد</div>
          <div className="text-sm" style={{ color: "#7D828B" }}>سجّل أول جلسة تدريب عشان يبدأ التتبع</div>
        </div>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <StatPill icon={CalendarDays} label="إجمالي الجلسات" value={sessionCount} />
        <StatPill icon={Award} label="أعلى وزن مسجّل" value={`${allTimeStats.bestLift} كجم`} color="#F0B429" />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {exerciseNames.map((name) => (
          <button key={name} onClick={() => setProgressEx(name)} className="press px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: progressEx === name ? "#FF5A36" : "#1A1D21", color: progressEx === name ? "#0F1113" : "#7D828B", border: "1px solid #232629" }}>
            {name}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs" style={{ color: "#7D828B" }}>أقصى وزن مسجّل لكل جلسة (كجم)</div>
          {progressDelta !== null && (
            <div className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ color: progressDelta >= 0 ? "#3D7FFF" : "#FF5A36", background: progressDelta >= 0 ? "rgba(61,127,255,0.12)" : "rgba(255,90,54,0.12)" }}>
              {progressDelta >= 0 ? "+" : ""}{progressDelta}
            </div>
          )}
        </div>
        {progressData.length > 1 ? (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A36" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF5A36" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#232629" vertical={false} />
                <XAxis dataKey="date" stroke="#7D828B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#7D828B" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1A1D21", border: "1px solid #232629", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#EDEBE4" }} />
                <Area type="monotone" dataKey="weight" stroke="#FF5A36" strokeWidth={2.5} fill="url(#fillArea)" dot={{ r: 3, fill: "#FF5A36" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-sm text-center py-8" style={{ color: "#7D828B" }}>سجّل جلستين على الأقل لهذا التمرين عشان يظهر رسم التقدم</div>
        )}
      </Card>
    </div>
  );
}
