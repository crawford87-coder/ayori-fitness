import { useState, useRef, useEffect } from "react";
import { supabase } from './supabase'
import Auth from './Auth'

// ── THEMES ────────────────────────────────────────────────────────────────────
const THEMES = {
  day: {
    name:"day", label:"Day",
    bg:        "#111008",   // warm near-black
    surface:   "#1c1a10",   // card bg
    elevated:  "#242218",   // raised element
    border:    "rgba(255,245,220,0.10)",
    borderMid: "rgba(255,245,220,0.20)",
    text:      "#f5f0e8",   // primary — near white warm
    textMid:   "#b0a890",   // secondary — clearly readable
    textDim:   "#706858",   // tertiary — labels, dimmed — still legible
    accent:    "#d4906a",   // terracotta — brightened
    accentB:   "#b88848",   // amber
    accentC:   "#9888a0",   // dusty mauve
    ring:      "#d4906a",
    protein:   "#d4906a",
    carbs:     "#b88848",
    fat:       "#9888a0",
    good:      "#80b888",
    warn:      "#d4906a",
    over:      "#c05858",
  },
  night: {
    name:"night", label:"Night",
    bg:        "#0a0814",
    surface:   "#131020",
    elevated:  "#1c1830",
    border:    "rgba(200,180,255,0.10)",
    borderMid: "rgba(200,180,255,0.20)",
    text:      "#ede8f8",   // primary
    textMid:   "#9890b8",   // secondary — readable
    textDim:   "#605878",   // tertiary — still legible
    accent:    "#9880e0",   // violet — brightened
    accentB:   "#6888d8",   // blue
    accentC:   "#d07898",   // rose
    ring:      "#9880e0",
    protein:   "#9880e0",
    carbs:     "#6888d8",
    fat:       "#d07898",
    good:      "#68b888",
    warn:      "#c8a060",
    over:      "#c05868",
  }
};

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WORKOUT_TYPES = {
  PT:      { label:"PT Session",  intensity:"high",     calBonus:200, carbBonus:30 },
  PILATES: { label:"Pilates",     intensity:"moderate", calBonus:100, carbBonus:15 },
  PADEL:   { label:"Padel",       intensity:"moderate", calBonus:120, carbBonus:20 },
  SWIM:    { label:"Swimming",    intensity:"moderate", calBonus:130, carbBonus:20 },
  CARDIO:  { label:"Cardio",      intensity:"moderate", calBonus:150, carbBonus:25 },
  REST:    { label:"Rest",        intensity:"none",     calBonus:0,   carbBonus:0  },
};
const DEFAULT_SCHEDULE = { Mon:"PT", Tue:"REST", Wed:"PT", Thu:"PILATES", Fri:"PT", Sat:"PILATES", Sun:"REST" };
const BASE = { cal:1300, protein:120, carbs:90, fat:45 };
const SOCIAL_DAYS = { Tue:"Lunch", Wed:"Date night", Fri:"Date night" };

const HABITS = [
  { key:"noAlcohol", label:"No Alcohol",  dayCol:"#c8956a", nightCol:"#8870d0" },
  { key:"gym",       label:"Gym",         dayCol:"#a07855", nightCol:"#5878c8" },
  { key:"steps",     label:"10k Steps",   dayCol:"#887060", nightCol:"#8870d0" },
  { key:"swim",      label:"Swim",        dayCol:"#c8956a", nightCol:"#5878c8" },
  { key:"padel",     label:"Padel",       dayCol:"#a07855", nightCol:"#c06888" },
  { key:"pilates",   label:"Pilates",     dayCol:"#887060", nightCol:"#8870d0" },
];

const DEFAULT_LIBRARY = [
  { name:"Greek Yogurt Protein Bowl",        cal:430, protein:40, carbs:42, fat:8  },
  { name:"Protein Smoothie",                 cal:430, protein:35, carbs:48, fat:9  },
  { name:"Scrambled Eggs + Rice Cakes",      cal:280, protein:22, carbs:24, fat:12 },
  { name:"Chicken Caesar Wrap",              cal:450, protein:38, carbs:32, fat:14 },
  { name:"Turkey Taco Bowl",                 cal:490, protein:40, carbs:45, fat:12 },
  { name:"Herby Couscous + Scallion Dress.", cal:420, protein:14, carbs:62, fat:14 },
  { name:"Mushroom Stuffed Peppers",         cal:480, protein:18, carbs:58, fat:16 },
  { name:"Burger Bowl + Roasted Potatoes",   cal:480, protein:36, carbs:38, fat:18 },
  { name:"Braised Fennel + White Beans",     cal:420, protein:18, carbs:52, fat:12 },
  { name:"Blistered Tomato Sweetcorn Pasta", cal:480, protein:16, carbs:72, fat:14 },
  { name:"Chilled Melon Soup + Eggs",        cal:380, protein:18, carbs:38, fat:14 },
  { name:"Edamame + Jerky",                  cal:140, protein:18, carbs:8,  fat:4  },
  { name:"Baby Carrots + Cottage Cheese",    cal:130, protein:14, carbs:12, fat:2  },
  { name:"Hard Boiled Eggs (x2)",            cal:140, protein:12, carbs:1,  fat:10 },
];

const DAMAGE_CONTROL = [
  { name:"Greek Yogurt + Berries",    cal:180, protein:22, carbs:18, fat:2 },
  { name:"Grilled Chicken + Veg",     cal:240, protein:36, carbs:8,  fat:6 },
  { name:"Tuna + Rice Cakes",         cal:200, protein:28, carbs:16, fat:2 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getTargets(workoutKey, readiness, isSocialNight) {
  const w = WORKOUT_TYPES[workoutKey] || WORKOUT_TYPES.REST;
  let calBonus = w.calBonus, carbBonus = w.carbBonus;
  if (readiness !== null && readiness < 60)      { calBonus = 0; carbBonus = 0; }
  else if (readiness !== null && readiness < 75) { calBonus = Math.round(calBonus*0.5); carbBonus = Math.round(carbBonus*0.5); }
  const socialReserve = isSocialNight ? 700 : 0;
  return {
    cal: BASE.cal + calBonus - socialReserve,
    protein: BASE.protein + (w.intensity==="high"?15:w.intensity==="moderate"?8:0),
    carbs: BASE.carbs + carbBonus, fat: BASE.fat,
    total: BASE.cal + calBonus, socialReserve,
  };
}
function sumLog(log) {
  return log.reduce((a,m)=>({cal:a.cal+m.cal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{cal:0,protein:0,carbs:0,fat:0});
}
function getSuggestion(remaining, mealLibrary) {
  if (remaining.cal < 0) return { type:"over", meal:DAMAGE_CONTROL[1] };
  if (remaining.cal < 200) return { type:"tight", meal:null };
  const best = mealLibrary.filter(m=>m.cal<=remaining.cal+80&&m.protein>=10).sort((a,b)=>Math.abs(a.cal-remaining.cal)-Math.abs(b.cal-remaining.cal))[0];
  return { type:"normal", meal:best||null };
}

// ── API ───────────────────────────────────────────────────────────────────────
function buildSystemPrompt(state) {
  const { today, schedule, readiness, weekLog, mealLibrary, measurements, weekPlan } = state;
  const totals = sumLog(weekLog[today]||[]);
  const targets = getTargets(schedule[today], readiness, false);
  const latest = measurements[measurements.length-1];
  const dayTargets = DAYS.map(d=>{
    const tgt=getTargets(schedule[d],null,false);
    return `${d}(${WORKOUT_TYPES[schedule[d]]?.label}): ${tgt.total}cal / P${tgt.protein}g / C${tgt.carbs}g / F${tgt.fat}g`;
  }).join("\n");
  return `You are a nutrition coach agent embedded in a fitness tracking app. You write data directly into the app via JSON blocks. Never say you "can't save" or "can't log" — you are the agent that does it.

USER GOAL: Fat loss. Preserve muscle. Needs to HIT calorie and protein targets every day — undereating is as bad as overeating for this goal.

DAILY TARGETS (non-negotiable — every planned day MUST hit these within ±100cal and ±10g protein):
${dayTargets}
Social nights (Tue lunch, Wed dinner, Fri dinner): 700cal reserved for eating out, plan remaining meals around that.

TODAY: ${today} (${WORKOUT_TYPES[schedule[today]]?.label}). Oura: ${readiness??"not set"}. Eaten: ${totals.cal}/${targets.total}cal P${totals.protein}g.
WEEK LOG: ${DAYS.map(d=>{const t=sumLog(weekLog[d]||[]);return t.cal>0?`${d}:${t.cal}cal P${t.protein}g`:null;}).filter(Boolean).join(", ")||"nothing logged yet"}
WEEK PLAN:
${DAYS.map(d=>{const p=weekPlan?.[d]||{};const slots=["breakfast","lunch","dinner","snack"].map(s=>`${s[0].toUpperCase()}:${p[s]||"—"}`).join(" | ");return `${d}: ${slots}`;}).join("\n")}
LIBRARY (name · cal · protein): ${mealLibrary.map(m=>`${m.name}·${m.cal}·P${m.protein}`).join(", ")}
${latest?`BODY: ${latest.weight}kg waist ${latest.waist}cm`:""}

PLANNING RULES:
1. Before writing WEEK_JSON, calculate each day's total calories and protein from the assigned meals. If a day doesn't hit the target, swap meals until it does.
2. Protein must come from real sources (meat, fish, dairy, legumes) — coffee, cortados, and condiments do not count toward protein targets.
3. Each meal should be substantial. Snacks should be 130–200cal with at least 12g protein.
4. Show the user the per-day totals in your message so they can verify.

ACTION BLOCKS — output whichever apply:

Log meals the user tells you about:
<LOG_JSON>[{"day":"Mon","name":"","cal":0,"protein":0,"carbs":0,"fat":0}]</LOG_JSON>

When building or modifying a meal plan, output ALL THREE:
<MEALS_JSON>[{"name":"","cal":0,"protein":0,"carbs":0,"fat":0}]</MEALS_JSON>
<GROCERY_JSON>{"Proteins":[],"Produce":[],"Pantry & Grains":[],"Fridge & Other":[]}</GROCERY_JSON>
<WEEK_JSON>{"Mon":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Tue":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Wed":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Thu":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Fri":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Sat":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Sun":{"breakfast":null,"lunch":null,"dinner":null,"snack":null}}</WEEK_JSON>
WEEK_JSON slot values must be meal name strings matching MEALS_JSON exactly, or null.`;
}
const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
};
async function callClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:ANTHROPIC_HEADERS,body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:systemPrompt,messages})});
  const data = await res.json();
  if(!res.ok) throw new Error(data.error?.message||`API error ${res.status}`);
  return data.content?.find(b=>b.type==="text")?.text||"";
}
async function estimateMacros(desc, imgData, imgType) {
  const content = imgData
    ? [{type:"image",source:{type:"base64",media_type:imgType,data:imgData}},{type:"text",text:`Estimate macros. User: "${desc||"this"}". Restaurant portions. JSON only: {"name":"","cal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","note":""}`}]
    : `Estimate macros for: "${desc}". Restaurant portions. JSON only: {"name":"","cal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","note":""}`;
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:ANTHROPIC_HEADERS,body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,messages:[{role:"user",content}]})});
  const data = await res.json();
  return JSON.parse((data.content?.find(b=>b.type==="text")?.text||"").replace(/```json|```/g,"").trim());
}
const parseMeals = t => { try{const m=t.match(/<MEALS_JSON>([\s\S]*?)<\/MEALS_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
const parseGrocery = t => { try{const m=t.match(/<GROCERY_JSON>([\s\S]*?)<\/GROCERY_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
const parseWeek = t => { try{const m=t.match(/<WEEK_JSON>([\s\S]*?)<\/WEEK_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
const parseLog = t => { try{const m=t.match(/<LOG_JSON>([\s\S]*?)<\/LOG_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
const stripJson = t => t.replace(/<MEALS_JSON>[\s\S]*?<\/MEALS_JSON>/g,"").replace(/<GROCERY_JSON>[\s\S]*?<\/GROCERY_JSON>/g,"").replace(/<WEEK_JSON>[\s\S]*?<\/WEEK_JSON>/g,"").replace(/<LOG_JSON>[\s\S]*?<\/LOG_JSON>/g,"").trim();

// ── DB ────────────────────────────────────────────────────────────────────────
function getWeekKey() {
  const d=new Date(),day=d.getDay(),diff=d.getDate()-day+(day===0?-6:1);
  const mon=new Date(new Date(d).setDate(diff));
  return `w-${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
}
function getWeekDates() {
  const d=new Date(),day=d.getDay(),diff=d.getDate()-day+(day===0?-6:1);
  const mon=new Date(new Date(d).setDate(diff));
  return Object.fromEntries(DAYS.map((name,i)=>{
    const dt=new Date(mon);dt.setDate(mon.getDate()+i);
    return [name,dt.toISOString().split('T')[0]];
  }));
}
async function dbLoad(userId) {
  const weekDates=getWeekDates(),dates=Object.values(weekDates),weekKey=getWeekKey();
  const dateToDay=Object.fromEntries(Object.entries(weekDates).map(([d,date])=>[date,d]));
  const todayIdx=new Date().getDay();const todayStr=weekDates[DAYS[todayIdx===0?6:todayIdx-1]];
  const [logs,habR,libR,planR,measR,readR]=await Promise.all([
    supabase.from('meal_logs').select('*').eq('user_id',userId).in('date',dates),
    supabase.from('habits').select('*').eq('user_id',userId).in('date',dates),
    supabase.from('meal_library').select('*').eq('user_id',userId).order('created_at'),
    supabase.from('week_plans').select('*').eq('user_id',userId).eq('week_key',weekKey),
    supabase.from('body_measurements').select('*').eq('user_id',userId).order('date'),
    supabase.from('oura_readiness').select('*').eq('user_id',userId).eq('date',todayStr),
  ]);
  const weekLog=Object.fromEntries(DAYS.map(d=>[d,[]]));
  (logs.data||[]).forEach(r=>{const d=dateToDay[r.date];if(d)weekLog[d].push({name:r.meal_name,cal:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat,social:r.is_social});});
  const weekHabits=Object.fromEntries(DAYS.map(d=>[d,{}]));
  (habR.data||[]).forEach(r=>{const d=dateToDay[r.date];if(d&&r.completed)weekHabits[d][r.habit_key]=true;});
  const mealLibrary=(libR.data||[]).map(r=>({name:r.name,cal:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat}));
  const weekPlan=Object.fromEntries(DAYS.map(d=>[d,{breakfast:null,lunch:null,dinner:null,snack:null}]));
  (planR.data||[]).forEach(r=>{if(weekPlan[r.day])weekPlan[r.day][r.slot]=r.meal_name;});
  const measurements=(measR.data||[]).map(r=>({date:r.date,weight:r.weight,waist:r.waist,hips:r.hips,chest:r.chest,arms:r.arms}));
  const readiness=readR.data?.[0]?.score??null;
  return {weekLog,weekHabits,mealLibrary,weekPlan,measurements,readiness};
}
async function dbSaveWeekLog(userId,weekLog,weekDates) {
  const dates=Object.values(weekDates);
  await supabase.from('meal_logs').delete().eq('user_id',userId).in('date',dates);
  const rows=DAYS.flatMap(d=>(weekLog[d]||[]).map(m=>({user_id:userId,date:weekDates[d],meal_name:m.name,calories:m.cal||0,protein:m.protein||0,carbs:m.carbs||0,fat:m.fat||0,is_social:m.social||false})));
  if(rows.length) await supabase.from('meal_logs').insert(rows);
}
async function dbSaveHabits(userId,weekHabits,weekDates) {
  const dates=Object.values(weekDates);
  await supabase.from('habits').delete().eq('user_id',userId).in('date',dates);
  const rows=DAYS.flatMap(d=>HABITS.filter(h=>weekHabits[d]?.[h.key]).map(h=>({user_id:userId,date:weekDates[d],habit_key:h.key,completed:true})));
  if(rows.length) await supabase.from('habits').insert(rows);
}
async function dbSaveLibrary(userId,mealLibrary) {
  await supabase.from('meal_library').delete().eq('user_id',userId);
  if(mealLibrary.length) await supabase.from('meal_library').insert(mealLibrary.map(m=>({user_id:userId,name:m.name,calories:m.cal||0,protein:m.protein||0,carbs:m.carbs||0,fat:m.fat||0})));
}
async function dbSaveWeekPlan(userId,weekPlan,weekKey) {
  await supabase.from('week_plans').delete().eq('user_id',userId).eq('week_key',weekKey);
  const rows=DAYS.flatMap(d=>['breakfast','lunch','dinner','snack'].filter(s=>weekPlan[d]?.[s]).map(s=>({user_id:userId,week_key:weekKey,day:d,slot:s,meal_name:weekPlan[d][s]})));
  if(rows.length) await supabase.from('week_plans').insert(rows);
}
async function dbSaveMeasurements(userId,measurements) {
  await supabase.from('body_measurements').delete().eq('user_id',userId);
  if(measurements.length) await supabase.from('body_measurements').insert(measurements.map(m=>({user_id:userId,...m})));
}
async function dbSaveReadiness(userId,score,date) {
  await supabase.from('oura_readiness').upsert({user_id:userId,date,score},{onConflict:'user_id,date'});
}

// ── DESIGN PRIMITIVES ─────────────────────────────────────────────────────────

// The thin horizontal rule — used as a divider
const Rule = ({ t }) => <div style={{ height:1, background:t.border, margin:"0" }}/>;

// Overline label
const Over = ({ t, children, color, style={} }) => (
  <div style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:color||t.textDim, fontWeight:500, ...style }}>{children}</div>
);

// Large display number — Submersive-style scale
const BigNum = ({ t, value, color, size=52 }) => (
  <div style={{ fontSize:size, fontWeight:200, letterSpacing:-2, color:color||t.text, lineHeight:0.95, fontFamily:"'Georgia', 'Times New Roman', serif" }}>{value}</div>
);

// Arc ring — Oura-style data ring
function Arc({ value, max, size=100, sw=5, color, bg, label, sub }) {
  const r=(size-sw)/2, circ=2*Math.PI*r, pct=Math.min(1,value/max), over=value>max;
  const col = over?"#b05050":color;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg||"rgba(255,255,255,0.05)"} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:size>90?22:14, fontWeight:200, color:col, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif", lineHeight:1 }}>{value}</div>
        {sub&&<div style={{ fontSize:8, color:"rgba(255,255,255,0.2)", letterSpacing:1, marginTop:3 }}>/{sub}</div>}
        {label&&<div style={{ fontSize:7, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(255,255,255,0.2)", marginTop:4 }}>{label}</div>}
      </div>
    </div>
  );
}

// Thin progress bar
function Bar({ value, target, color }) {
  const pct=Math.min(100,(value/target)*100), over=value>target;
  return (
    <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.10)", overflow:"hidden" }}>
      <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:over?"#c05858":color, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
    </div>
  );
}

// Surface — slightly elevated panel
const Surface = ({ t, children, style={} }) => (
  <div style={{ background:t.elevated, borderRadius:16, padding:"20px", ...style }}>{children}</div>
);

// Ghost button — Submersive style: just border, no fill
const GhostBtn = ({ t, children, onClick, accent, style={} }) => (
  <button onClick={onClick} style={{
    padding:"11px 20px", borderRadius:40,
    border:`1px solid ${accent||t.borderMid}`,
    background:"transparent", color:accent||t.textMid,
    fontSize:11, letterSpacing:2, textTransform:"uppercase",
    cursor:"pointer", fontFamily:"inherit", fontWeight:500,
    transition:"border-color 0.2s, color 0.2s",
    ...style
  }}>{children}</button>
);

// Solid btn
const SolidBtn = ({ t, children, onClick, disabled, color, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:"13px 24px", borderRadius:40,
    border:"none", background:color||t.accent,
    color:t.bg, fontSize:11, letterSpacing:2, textTransform:"uppercase",
    cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:600,
    opacity:disabled?0.35:1, transition:"opacity 0.15s",
    ...style
  }}>{children}</button>
);

// Text input
const TxtInput = ({ t, style={}, ...props }) => (
  <input {...props} style={{
    width:"100%", padding:"13px 0", borderRadius:0,
    border:"none", borderBottom:`1px solid ${t.border}`,
    background:"transparent", color:t.text, fontSize:14,
    fontFamily:"inherit", outline:"none", boxSizing:"border-box",
    ...style
  }}/>
);

// ── GROCERY LIST ──────────────────────────────────────────────────────────────
function GroceryList({ t, groceryList }) {
  const [checked, setChecked] = useState({});
  if (!groceryList||!Object.keys(groceryList).length) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, textAlign:"center", gap:20 }}>
      <div style={{ fontSize:9, letterSpacing:4, textTransform:"uppercase", color:t.textDim }}>Shopping List</div>
      <div style={{ color:t.textDim, fontSize:13, lineHeight:1.8, maxWidth:240 }}>Chat with the coach to plan your week. The list builds itself.</div>
    </div>
  );
  const total=Object.values(groceryList).flat().length;
  const done=Object.values(checked).filter(Boolean).length;
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"0 24px 40px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:32 }}>
        <div style={{ fontSize:28, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>List</div>
        <Over t={t} style={{ letterSpacing:2 }}>{done} / {total}</Over>
      </div>
      {Object.entries(groceryList).map(([cat,items])=>(
        <div key={cat} style={{ marginBottom:28 }}>
          <Over t={t} style={{ marginBottom:14 }}>{cat}</Over>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {items.map((item,i)=>{
              const k=`${cat}::${i}`, isDone=checked[k];
              return (
                <button key={i} onClick={()=>setChecked(p=>({...p,[k]:!p[k]}))} style={{
                  display:"flex", alignItems:"center", gap:16,
                  background:"transparent", border:"none", borderBottom:`1px solid ${t.border}`,
                  padding:"13px 0", textAlign:"left", cursor:"pointer", fontFamily:"inherit",
                }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, border:`1px solid ${isDone?t.accent:t.textDim}`, background:isDone?t.accent:"transparent", transition:"all 0.15s" }}/>
                  <span style={{ fontSize:14, fontWeight:300, color:isDone?t.textDim:t.text, textDecoration:isDone?"line-through":"none" }}>{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── COACH ─────────────────────────────────────────────────────────────────────
function CoachScreen({ t, appState, mealLibrary, setMealLibrary, setWeekPlan, setWeekLog, setActiveTab, messages, setMessages, groceryList, setGroceryList }) {
  const [view,setView]=useState("chat");
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [pendingMeals,setPendingMeals]=useState(null);
  const [pendingWeek,setPendingWeek]=useState(null);
  const bottomRef=useRef(), taRef=useRef();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);

  const send=async()=>{
    const text=input.trim();if(!text||loading)return;
    setInput("");if(taRef.current)taRef.current.style.height="auto";
    const newMsgs=[...messages,{role:"user",content:text}];
    setMessages(newMsgs);setLoading(true);
    try {
      const reply=await callClaude(newMsgs.map(m=>({role:m.role,content:m.content})),buildSystemPrompt(appState));
      const meals=parseMeals(reply),grocery=parseGrocery(reply),week=parseWeek(reply),log=parseLog(reply),clean=stripJson(reply);
      setMessages(p=>[...p,{role:"assistant",content:clean}]);
      if(meals?.length)setPendingMeals(meals);
      if(grocery&&Object.keys(grocery).length)setGroceryList(grocery);
      if(week)setPendingWeek(week);
      if(log?.length){
        log.forEach(entry=>{
          const {day,...meal}=entry;
          if(day&&DAYS.includes(day))setWeekLog(p=>({...p,[day]:[...(p[day]||[]),meal]}));
        });
      }
    } catch(err){setMessages(p=>[...p,{role:"assistant",content:`Error: ${err.message}`}]);}
    setLoading(false);
  };

  const confirmPlan=()=>{
    if(!pendingMeals)return;
    // Add new meals to library
    const ex=new Set(mealLibrary.map(m=>m.name.toLowerCase()));
    const newM=pendingMeals.filter(m=>!ex.has(m.name.toLowerCase()));
    setMealLibrary(p=>[...p,...newM]);
    // Set week plan
    if(pendingWeek) setWeekPlan(pendingWeek);
    setMessages(p=>[...p,{role:"assistant",content:`Plan confirmed. ${newM.length} meals added to your library. Head to Week to see your schedule.`}]);
    setPendingMeals(null);setPendingWeek(null);
  };

  const hasGrocery=Object.keys(groceryList).length>0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 64px)" }}>
      {/* Tab strip */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {[{k:"chat",l:"Plan"},{k:"list",l:`List${hasGrocery?" ·":""}`}].map(tab=>(
          <button key={tab.k} onClick={()=>setView(tab.k)} style={{
            flex:1, padding:"16px 0", border:"none", background:"transparent",
            borderBottom:`2px solid ${view===tab.k?t.accent:"transparent"}`,
            color:view===tab.k?t.text:t.textDim,
            fontSize:10, letterSpacing:3, textTransform:"uppercase",
            cursor:"pointer", fontFamily:"inherit", fontWeight:view===tab.k?600:400,
            marginBottom:-1, transition:"all 0.2s",
          }}>{tab.l}</button>
        ))}
      </div>

      {view==="list" ? <GroceryList t={t} groceryList={groceryList}/> : (
        <>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"80%", padding:"12px 16px", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap",
                  fontWeight:300,
                  borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",
                  background:m.role==="user"?t.accent:t.elevated,
                  color:m.role==="user"?t.bg:t.text,
                }}>{m.content}</div>
              </div>
            ))}
            {loading&&(
              <div style={{ display:"flex", gap:6, padding:"12px 4px" }}>
                {[0,1,2].map(i=><div key={i} style={{ width:4, height:4, borderRadius:"50%", background:t.textDim, animation:`pulse 1.2s ease ${i*0.2}s infinite` }}/>)}
              </div>
            )}
            {pendingMeals&&(
              <Surface t={t} style={{ padding:"16px 20px" }}>
                <Over t={t} style={{ marginBottom:16, color:t.accent }}>
                  {pendingMeals.length} meals · {pendingWeek?"week plan ready":"no week schedule"}
                </Over>

                {pendingWeek ? (
                  /* Day-by-day breakdown */
                  <div style={{ display:"flex", flexDirection:"column", marginBottom:16 }}>
                    {DAYS.map(d=>{
                      const slots=["breakfast","lunch","dinner","snack"];
                      const daySlots=slots.map(s=>({slot:s,name:pendingWeek[d]?.[s]||null})).filter(s=>s.name);
                      if(!daySlots.length) return null;
                      const workout=WORKOUT_TYPES[appState.schedule[d]];
                      return (
                        <div key={d} style={{ marginBottom:14 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:8 }}>
                            <Over t={t} color={t.accent}>{d}</Over>
                            <Over t={t} color={t.textDim}>{workout?.label}</Over>
                          </div>
                          {daySlots.map(({slot,name})=>{
                            const meal=pendingMeals.find(m=>m.name===name);
                            return (
                              <div key={slot} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"8px 0", borderBottom:`1px solid ${t.border}` }}>
                                <div style={{ display:"flex", gap:10, alignItems:"baseline" }}>
                                  <Over t={t} color={t.textDim} style={{ width:20 }}>{slot[0].toUpperCase()}</Over>
                                  <span style={{ fontSize:13, fontWeight:300, color:t.text }}>{name}</span>
                                </div>
                                {meal&&<span style={{ fontSize:11, color:t.textMid, flexShrink:0 }}>{meal.cal} · P{meal.protein}</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {/* Meals added to library but not scheduled */}
                    {(()=>{
                      const scheduled=new Set(DAYS.flatMap(d=>["breakfast","lunch","dinner","snack"].map(s=>pendingWeek[d]?.[s]).filter(Boolean)));
                      const unscheduled=pendingMeals.filter(m=>!scheduled.has(m.name));
                      if(!unscheduled.length) return null;
                      return (
                        <div style={{ marginTop:4 }}>
                          <Over t={t} style={{ marginBottom:8 }}>Added to library</Over>
                          {unscheduled.map((m,i)=>(
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${t.border}` }}>
                              <span style={{ fontSize:13, fontWeight:300, color:t.textMid }}>{m.name}</span>
                              <span style={{ fontSize:11, color:t.textDim }}>{m.cal} · P{m.protein}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* No week plan — flat list */
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                    {pendingMeals.map((m,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:300, borderBottom:`1px solid ${t.border}`, paddingBottom:10 }}>
                        <span style={{ color:t.text }}>{m.name}</span>
                        <span style={{ color:t.textMid }}>{m.cal} · P{m.protein}</span>
                      </div>
                    ))}
                  </div>
                )}

                {hasGrocery&&<div style={{ fontSize:11, color:t.textDim, letterSpacing:1.5, textTransform:"uppercase", marginBottom:14 }}>Shopping list generated</div>}
                <div style={{ display:"flex", gap:10 }}>
                  <SolidBtn t={t} onClick={confirmPlan} style={{ flex:2, textAlign:"center" }}>Confirm Plan</SolidBtn>
                  <GhostBtn t={t} onClick={()=>{setPendingMeals(null);setPendingWeek(null);}} style={{ flex:1, textAlign:"center" }}>Dismiss</GhostBtn>
                </div>
              </Surface>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:"12px 20px 16px", borderTop:`1px solid ${t.border}`, display:"flex", gap:12, alignItems:"flex-end", flexShrink:0 }}>
            <textarea ref={taRef} value={input}
              onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="What are we cooking this week..." rows={1}
              style={{ flex:1, padding:"10px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.5, overflow:"hidden", fontWeight:300 }}/>
            <button onClick={send} disabled={loading||!input.trim()} style={{
              width:36, height:36, borderRadius:"50%", border:`1px solid ${input.trim()?t.accent:t.border}`,
              background:"transparent", color:input.trim()?t.accent:t.textDim,
              cursor:input.trim()?"pointer":"default", fontSize:14,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s",
            }}>↑</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ t, today, dayIdx, todayLog, setTodayLog, targets, readiness, setReadiness, schedule, weekHabits, setActiveTab, socialFlag, mealLibrary }) {
  const totals=sumLog(todayLog);
  const [editingIdx,setEditingIdx]=useState(null);
  const [editForm,setEditForm]=useState({});
  const remaining={cal:targets.total-totals.cal,protein:targets.protein-totals.protein,carbs:targets.carbs-totals.carbs,fat:targets.fat-totals.fat};
  const suggestion=getSuggestion(remaining,mealLibrary);
  const workout=WORKOUT_TYPES[schedule[today]]||WORKOUT_TYPES.REST;
  const todayHabits=weekHabits[today]||{};
  const habitCount=Object.values(todayHabits).filter(Boolean).length;
  const readinessColor=readiness===null?t.textDim:readiness>=75?t.good:readiness>=60?t.warn:t.over;

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Masthead — Submersive-style stacked type */}
      <div style={{ padding:"24px 0 32px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:12 }}>{FULL_DAYS[dayIdx]}</Over>
        <div style={{ fontSize:42, fontWeight:200, letterSpacing:-2, color:t.text, lineHeight:0.95, fontFamily:"'Georgia','Times New Roman',serif", marginBottom:8 }}>
          {workout.label}
        </div>
        {socialFlag&&<div style={{ fontSize:11, color:t.warn, letterSpacing:1, marginTop:12 }}>{socialFlag} — {targets.socialReserve} cal held</div>}
      </div>

      {/* Calorie — centrepiece */}
      <div style={{ padding:"32px 0 28px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:28 }}>
        <Arc value={totals.cal} max={targets.total} size={112} sw={5} color={t.ring} label="kcal" sub={targets.total}/>
        <div style={{ flex:1 }}>
          {[
            {label:"Protein", val:totals.protein, target:targets.protein, color:t.protein},
            {label:"Carbs",   val:totals.carbs,   target:targets.carbs,   color:t.carbs},
            {label:"Fat",     val:totals.fat,     target:targets.fat,     color:t.fat},
          ].map(m=>(
            <div key={m.label} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <Over t={t}>{m.label}</Over>
                <span style={{ fontSize:10, color:m.val>m.target?t.over:t.textDim, letterSpacing:0.5 }}>
                  <span style={{ color:m.val>m.target?t.over:t.text }}>{m.val}</span>
                  <span style={{ opacity:0.4 }}>/{m.target}g</span>
                </span>
              </div>
              <Bar value={m.val} target={m.target} color={m.color}/>
            </div>
          ))}
          <div style={{ fontSize:10, color:remaining.cal<0?t.over:t.textDim, textAlign:"right", letterSpacing:1, marginTop:4 }}>
            {remaining.cal<0?`${Math.abs(remaining.cal)} over`:`${remaining.cal} remaining`}
          </div>
        </div>
      </div>

      {/* Readiness */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <Over t={t} style={{ marginBottom:8 }}>Oura Readiness</Over>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <BigNum t={t} value={readiness??<span style={{ opacity:0.2 }}>—</span>} color={readinessColor} size={44}/>
              <div style={{ fontSize:10, color:readinessColor, letterSpacing:2, textTransform:"uppercase" }}>
                {readiness===null?"":readiness>=75?"Good":readiness>=60?"Fair":"Low"}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[40,50,55,60,65,70,75,80,85,90,95,100].map(v=>{
            const active=readiness===v;
            const col=v>=75?t.good:v>=60?t.warn:t.over;
            return (
              <button key={v} onClick={()=>setReadiness(v)} style={{
                padding:"5px 9px", borderRadius:4,
                border:`1px solid ${active?col:t.border}`,
                background:active?`${col}15`:"transparent",
                color:active?col:t.textDim,
                fontSize:10, cursor:"pointer", fontFamily:"inherit",
                transition:"all 0.15s",
              }}>{v}</button>
            );
          })}
        </div>
        {readiness!==null&&readiness<60&&<div style={{ marginTop:12, fontSize:11, color:t.over, letterSpacing:0.5 }}>Low readiness — rest day targets applied.</div>}
      </div>

      {/* Suggestion */}
      {todayLog.length>0&&suggestion.meal&&(
        <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
          <Over t={t} style={{ marginBottom:10, color:suggestion.type==="over"?t.over:t.accentB }}>
            {suggestion.type==="over"?"Damage control":"Next meal"}
          </Over>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <div style={{ fontSize:16, fontWeight:300, color:t.text }}>{suggestion.meal.name}</div>
            <div style={{ fontSize:14, fontWeight:200, color:t.textMid }}>{suggestion.meal.cal} kcal</div>
          </div>
        </div>
      )}

      {/* Habits */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <Over t={t}>Habits</Over>
          <Over t={t} color={t.accent}>{habitCount} / {HABITS.length}</Over>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {HABITS.map(h=>{
            const done=todayHabits[h.key];
            const col=t.name==="day"?h.dayCol:h.nightCol;
            return (
              <button key={h.key} onClick={()=>setActiveTab("habits")} style={{
                background:done?`${col}12`:t.elevated,
                border:`1px solid ${done?col+"40":t.border}`,
                borderRadius:12, padding:"16px 12px",
                cursor:"pointer", fontFamily:"inherit",
                display:"flex", flexDirection:"column", alignItems:"center", gap:10,
                transition:"all 0.2s",
              }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:done?col:t.textDim, transition:"background 0.2s" }}/>
                <Over t={t} color={done?col:t.textDim} style={{ textAlign:"center", lineHeight:1.4 }}>{h.label}</Over>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding:"28px 0 0", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:10 }}>
          <SolidBtn t={t} onClick={()=>setActiveTab("coach")} style={{ flex:1, textAlign:"center" }}>Coach</SolidBtn>
          <GhostBtn t={t} onClick={()=>setActiveTab("social")} style={{ flex:1, textAlign:"center" }}>Eating Out</GhostBtn>
        </div>
        <button onClick={()=>setActiveTab("log")} style={{ background:"transparent", border:"none", color:t.textDim, fontSize:10, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", padding:"8px 0", textAlign:"center" }}>
          + Log a Meal
        </button>
      </div>

      {/* Logged */}
      {todayLog.length>0&&(
        <div style={{ marginTop:32 }}>
          <Over t={t} style={{ marginBottom:16 }}>Logged Today</Over>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {todayLog.map((m,i)=>{
              if(editingIdx===i) return (
                <div key={i} style={{ padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
                  <input value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}
                    style={{ width:"100%", padding:"8px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:10 }}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                    {[["cal","Cal"],["protein","P"],["carbs","C"],["fat","F"]].map(([k,l])=>(
                      <div key={k}>
                        <Over t={t} style={{ marginBottom:4 }}>{l}</Over>
                        <input type="number" value={editForm[k]||""} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}
                          style={{ width:"100%", padding:"6px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none" }}/>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <SolidBtn t={t} onClick={()=>{
                      setTodayLog(p=>p.map((x,idx)=>idx===i?{...editForm,cal:+editForm.cal,protein:+editForm.protein,carbs:+editForm.carbs,fat:+editForm.fat}:x));
                      setEditingIdx(null);
                    }} style={{ flex:2, textAlign:"center", padding:"9px 16px" }}>Save</SolidBtn>
                    <GhostBtn t={t} onClick={()=>{setTodayLog(p=>p.filter((_,idx)=>idx!==i));setEditingIdx(null);}} style={{ flex:1, textAlign:"center", padding:"9px 16px", color:t.over, borderColor:t.over }}>Delete</GhostBtn>
                    <GhostBtn t={t} onClick={()=>setEditingIdx(null)} style={{ flex:1, textAlign:"center", padding:"9px 16px" }}>Cancel</GhostBtn>
                  </div>
                </div>
              );
              return (
                <div key={i} onClick={()=>{setEditingIdx(i);setEditForm({...m});}} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}`, cursor:"pointer" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:300, color:t.text }}>{m.social&&<span style={{ color:t.accentC }}>↗ </span>}{m.name}</div>
                    <div style={{ fontSize:10, color:t.textDim, marginTop:3, letterSpacing:0.5 }}>P{m.protein} · C{m.carbs} · F{m.fat}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:14, fontWeight:200, color:m.cal>700?t.over:t.textMid }}>{m.cal}</div>
                    <div style={{ fontSize:10, color:t.textDim }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MEAL LOG ──────────────────────────────────────────────────────────────────
function MealLog({ t, weekLog, setWeekLog, today, schedule, readiness, mealLibrary }) {
  const [selectedDay,setSelectedDay]=useState(today);
  const [search,setSearch]=useState("");
  const [custom,setCustom]=useState({name:"",cal:"",protein:"",carbs:"",fat:""});
  const [mode,setMode]=useState("library");
  const [addOpen,setAddOpen]=useState(false);

  const dayLog=weekLog[selectedDay]||[];
  const setDayLog=fn=>setWeekLog(p=>({...p,[selectedDay]:typeof fn==="function"?fn(p[selectedDay]||[]):fn}));
  const targets=getTargets(schedule[selectedDay],selectedDay===today?readiness:null,false);
  const totals=sumLog(dayLog);

  return (
    <div style={{ padding:"0 0 48px" }}>
      {/* Day strip */}
      <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, overflowX:"auto", scrollbarWidth:"none" }}>
        {DAYS.map(d=>{
          const active=selectedDay===d, isToday=d===today, hasLog=(weekLog[d]||[]).length>0;
          return (
            <button key={d} onClick={()=>{setSelectedDay(d);setAddOpen(false);}} style={{
              flexShrink:0, flex:1, minWidth:52, padding:"14px 0 12px",
              border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
              borderBottom:`2px solid ${active?t.accent:"transparent"}`, marginBottom:-1, textAlign:"center",
            }}>
              <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:active?t.accent:isToday?t.textMid:t.textDim, fontWeight:active?600:400 }}>{d}</div>
              {hasLog&&<div style={{ width:4, height:4, borderRadius:"50%", background:active?t.accent:t.textDim, margin:"5px auto 0" }}/>}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"0 24px" }}>
        {/* Macro strip */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0, borderBottom:`1px solid ${t.border}` }}>
          {[{l:"kcal",v:totals.cal,tg:targets.total,c:t.ring},{l:"pro",v:totals.protein,tg:targets.protein,c:t.protein},{l:"carb",v:totals.carbs,tg:targets.carbs,c:t.carbs},{l:"fat",v:totals.fat,tg:targets.fat,c:t.fat}].map((m,i)=>(
            <div key={m.l} style={{ padding:"20px 0", textAlign:"center", borderRight:i<3?`1px solid ${t.border}`:"none" }}>
              <div style={{ fontSize:22, fontWeight:200, color:m.v>m.tg?t.over:m.c, letterSpacing:-0.5, fontFamily:"'Georgia','Times New Roman',serif" }}>{m.v}</div>
              <Over t={t} style={{ marginTop:4 }}>{m.l}</Over>
            </div>
          ))}
        </div>

        {/* Logged meals */}
        {dayLog.length>0?(
          <div style={{ marginTop:24, marginBottom:8 }}>
            {dayLog.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:300, color:t.text }}>{m.name}</div>
                  <div style={{ fontSize:10, color:t.textDim, marginTop:3 }}>P{m.protein} · C{m.carbs} · F{m.fat}</div>
                </div>
                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ fontSize:13, fontWeight:200, color:t.textMid }}>{m.cal}</div>
                  <button onClick={()=>setDayLog(p=>p.filter((_,idx)=>idx!==i))} style={{ background:"none", border:"none", fontSize:12, cursor:"pointer", color:t.textDim }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ):(
          <div style={{ padding:"28px 0", color:t.textDim, fontSize:13, fontWeight:300 }}>Nothing logged yet.</div>
        )}

        {/* Collapsible add section */}
        <button onClick={()=>setAddOpen(p=>!p)} style={{
          width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"16px 0", background:"transparent", border:"none", borderTop:`1px solid ${t.border}`,
          cursor:"pointer", fontFamily:"inherit",
        }}>
          <Over t={t} color={addOpen?t.accent:t.textMid}>Add Meal</Over>
          <span style={{ fontSize:16, color:t.textDim, lineHeight:1 }}>{addOpen?"−":"+"}</span>
        </button>

        {addOpen&&(
          <>
            {/* Mode tabs */}
            <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, marginBottom:24 }}>
              {["library","custom"].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{
                  flex:1, padding:"12px 0", border:"none", background:"transparent",
                  borderBottom:`2px solid ${mode===m?t.accent:"transparent"}`,
                  color:mode===m?t.text:t.textDim, fontSize:9, letterSpacing:3, textTransform:"uppercase",
                  cursor:"pointer", fontFamily:"inherit", fontWeight:mode===m?600:400, marginBottom:-1,
                }}>{m==="library"?"Library":"Custom"}</button>
              ))}
            </div>

            {mode==="library"&&(
              <>
                <TxtInput t={t} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search meals..." style={{ marginBottom:20 }}/>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {mealLibrary.filter(m=>m.name.toLowerCase().includes(search.toLowerCase())).map((meal,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}` }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:300, color:t.text }}>{meal.name}</div>
                        <div style={{ fontSize:10, color:t.textDim, marginTop:3 }}>P{meal.protein} · C{meal.carbs} · F{meal.fat}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                        <div style={{ fontSize:13, fontWeight:200, color:t.textMid }}>{meal.cal}</div>
                        <button onClick={()=>setDayLog(p=>[...p,meal])} style={{ width:26, height:26, borderRadius:"50%", background:"transparent", border:`1px solid ${t.accent}`, color:t.accent, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {mode==="custom"&&(
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <TxtInput t={t} placeholder="Meal name" value={custom.name} onChange={e=>setCustom(p=>({...p,name:e.target.value}))} style={{ marginBottom:8 }}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {[["cal","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"]].map(([k,ph])=>(
                    <TxtInput key={k} t={t} placeholder={ph} type="number" value={custom[k]} onChange={e=>setCustom(p=>({...p,[k]:e.target.value}))}/>
                  ))}
                </div>
                <SolidBtn t={t} onClick={()=>{
                  if(!custom.name||!custom.cal)return;
                  setDayLog(p=>[...p,{name:custom.name,cal:+custom.cal,protein:+(custom.protein||0),carbs:+(custom.carbs||0),fat:+(custom.fat||0)}]);
                  setCustom({name:"",cal:"",protein:"",carbs:"",fat:""});
                  setAddOpen(false);
                }} style={{ marginTop:20, width:"100%", textAlign:"center" }}>Add to {selectedDay}</SolidBtn>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── SOCIAL MEAL ───────────────────────────────────────────────────────────────
function SocialMeal({ t, todayLog, setTodayLog, targets }) {
  const [desc,setDesc]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const [imgPreview,setImgPreview]=useState(null);
  const [imgData,setImgData]=useState(null);
  const [imgType,setImgType]=useState(null);
  const fileRef=useRef();
  const totals=sumLog(todayLog);
  const remaining=targets.total-totals.cal;

  return (
    <div style={{ padding:"0 24px 48px" }}>
      <div style={{ padding:"24px 0 32px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:12 }}>Social Meal</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, lineHeight:1, fontFamily:"'Georgia','Times New Roman',serif" }}>Eating<br/>out?</div>
        <div style={{ fontSize:13, fontWeight:300, color:t.textMid, marginTop:14, lineHeight:1.7 }}>Describe or photograph what you ate. Claude estimates the macros and recalibrates your day.</div>
      </div>

      {remaining<200&&<div style={{ padding:"16px 0", borderBottom:`1px solid ${t.border}`, fontSize:11, color:t.over, letterSpacing:0.5 }}>Only {remaining} kcal left — damage control.</div>}

      <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const url=ev.target.result;setImgPreview(url);setImgData(url.split(",")[1]);setImgType(f.type);};r.readAsDataURL(f);}} style={{ display:"none" }}/>
        <button onClick={()=>fileRef.current.click()} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:8, padding:"10px 16px", color:t.textDim, fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
          {imgPreview?"Photo ready — change":"+ Photo"}
        </button>
        {imgPreview&&<img src={imgPreview} alt="meal" style={{ width:"100%", borderRadius:8, marginBottom:16, maxHeight:160, objectFit:"cover" }}/>}
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe what you ate..." rows={3}
          style={{ width:"100%", padding:"12px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.6, fontWeight:300 }}/>
      </div>

      <div style={{ padding:"24px 0" }}>
        <SolidBtn t={t} onClick={async()=>{if(!desc&&!imgData)return;setLoading(true);setError(null);setResult(null);try{setResult(await estimateMacros(desc,imgData,imgType));}catch{setError("Couldn't estimate.");}setLoading(false);}} disabled={loading||(!desc&&!imgData)}>
          {loading?"Estimating...":"Estimate Macros"}
        </SolidBtn>
        {error&&<div style={{ marginTop:16, fontSize:11, color:t.over }}>{error}</div>}
      </div>

      {result&&(
        <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:24 }}>
          <div style={{ fontSize:18, fontWeight:300, color:t.text, marginBottom:4 }}>{result.name}</div>
          <div style={{ fontSize:11, color:t.textMid, marginBottom:24, lineHeight:1.6, fontStyle:"italic" }}>{result.note}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", marginBottom:24 }}>
            {[{l:"kcal",v:result.cal,c:t.ring},{l:"pro",v:result.protein,c:t.protein},{l:"carb",v:result.carbs,c:t.carbs},{l:"fat",v:result.fat,c:t.fat}].map((m,i)=>(
              <div key={m.l} style={{ textAlign:"center", borderRight:i<3?`1px solid ${t.border}`:"none", padding:"8px 0" }}>
                <div style={{ fontSize:20, fontWeight:200, color:m.c, fontFamily:"'Georgia','Times New Roman',serif" }}>{m.v}</div>
                <Over t={t} style={{ marginTop:4 }}>{m.l}</Over>
              </div>
            ))}
          </div>
          {(()=>{const after=totals.cal+result.cal,rem=targets.total-after,over=rem<0;return(
            <div style={{ fontSize:12, color:over?t.over:t.good, letterSpacing:0.5, marginBottom:20 }}>{over?`${Math.abs(rem)} over target`:`${rem} kcal remaining`}</div>
          );})()} 
          <SolidBtn t={t} onClick={()=>{setTodayLog(p=>[...p,{...result,social:true}]);setResult(null);setDesc("");setImgPreview(null);setImgData(null);}}>
            Log This Meal
          </SolidBtn>
        </div>
      )}
    </div>
  );
}

// ── HABITS ────────────────────────────────────────────────────────────────────
function Habits({ t, weekHabits, setWeekHabits, today }) {
  const toggle=(day,key)=>setWeekHabits(p=>({...p,[day]:{...p[day],[key]:!p[day]?.[key]}}));
  const getStreak=key=>{let s=0;for(let i=DAYS.indexOf(today);i>=0;i--){if(weekHabits[DAYS[i]]?.[key])s++;else break;}return s;};
  const todayHabits=weekHabits[today]||{};
  const total=Object.values(todayHabits).filter(Boolean).length;

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Score */}
      <div style={{ padding:"24px 0 32px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"flex-end", gap:20 }}>
        <div>
          <Over t={t} style={{ marginBottom:12 }}>Today</Over>
          <BigNum t={t} value={total} color={t.accent} size={64}/>
          <div style={{ fontSize:11, color:t.textDim, marginTop:8, letterSpacing:1 }}>of {HABITS.length} habits</div>
        </div>
        <div style={{ marginBottom:8, fontSize:13, color:t.textMid, fontWeight:300, fontStyle:"italic" }}>
          {total===0?"Rest day":total<=2?"Building momentum":total<=4?"Strong day":"Perfect"}
        </div>
      </div>

      {/* Habit list */}
      <div style={{ display:"flex", flexDirection:"column", marginBottom:40 }}>
        {HABITS.map(h=>{
          const done=todayHabits[h.key],streak=getStreak(h.key);
          const col=t.name==="day"?h.dayCol:h.nightCol;
          return (
            <button key={h.key} onClick={()=>toggle(today,h.key)} style={{
              display:"flex", alignItems:"center", gap:16, background:"transparent",
              border:"none", borderBottom:`1px solid ${t.border}`,
              padding:"18px 0", cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            }}>
              <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:done?col:t.textDim, border:`1px solid ${done?col:t.textDim}`, transition:"all 0.2s" }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:300, color:done?t.text:t.textMid }}>{h.label}</div>
                {streak>0&&<div style={{ fontSize:9, color:col, marginTop:4, letterSpacing:2, textTransform:"uppercase" }}>{streak} day streak</div>}
              </div>
              {done&&<div style={{ fontSize:9, color:col, letterSpacing:2, textTransform:"uppercase" }}>Done</div>}
            </button>
          );
        })}
      </div>

      {/* Week grid */}
      <Over t={t} style={{ marginBottom:16 }}>This Week</Over>
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:340 }}>
          <div style={{ display:"grid", gridTemplateColumns:`90px repeat(${DAYS.length},1fr)`, borderBottom:`1px solid ${t.border}`, marginBottom:0 }}>
            <div/>
            {DAYS.map(d=><div key={d} style={{ padding:"8px 4px", textAlign:"center" }}><Over t={t} color={d===today?t.accent:t.textDim}>{d}</Over></div>)}
          </div>
          {HABITS.map(h=>{
            const col=t.name==="day"?h.dayCol:h.nightCol;
            return (
              <div key={h.key} style={{ display:"grid", gridTemplateColumns:`90px repeat(${DAYS.length},1fr)`, borderBottom:`1px solid ${t.border}` }}>
                <div style={{ padding:"14px 0", display:"flex", alignItems:"center" }}><Over t={t}>{h.label}</Over></div>
                {DAYS.map(d=>{
                  const done=weekHabits[d]?.[h.key];
                  return <button key={d} onClick={()=>toggle(d,h.key)} style={{ padding:"14px 4px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:done?col:t.elevated, transition:"background 0.15s" }}/>
                  </button>;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── BODY ──────────────────────────────────────────────────────────────────────
function Body({ t, measurements, setMeasurements }) {
  const [form,setForm]=useState({weight:"",waist:"",hips:"",chest:"",arms:"",date:new Date().toISOString().split("T")[0]});
  const [saved,setSaved]=useState(false);
  const save=()=>{
    if(!form.weight)return;
    setMeasurements(p=>[...p,{...form,weight:+form.weight,waist:+form.waist,hips:+form.hips,chest:+form.chest,arms:+form.arms}]);
    setForm({weight:"",waist:"",hips:"",chest:"",arms:"",date:new Date().toISOString().split("T")[0]});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  const latest=measurements[measurements.length-1];
  const prev=measurements[measurements.length-2];
  const diff=key=>(!latest||!prev)?null:+(latest[key]-prev[key]).toFixed(1);

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Latest stats */}
      {latest&&(
        <div style={{ padding:"24px 0 28px", borderBottom:`1px solid ${t.border}` }}>
          <Over t={t} style={{ marginBottom:20 }}>Latest · {latest.date}</Over>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[{label:"Weight",key:"weight",unit:"kg",invert:true},{label:"Waist",key:"waist",unit:"cm",invert:true},{label:"Hips",key:"hips",unit:"cm",invert:true},{label:"Chest",key:"chest",unit:"cm"},{label:"Arms",key:"arms",unit:"cm"}].filter(m=>latest[m.key]).map(m=>{
              const d=diff(m.key),good=d===null?null:(m.invert?d<0:d>0);
              return (
                <div key={m.key} style={{ borderBottom:`1px solid ${t.border}`, paddingBottom:16 }}>
                  <Over t={t} style={{ marginBottom:8 }}>{m.label}</Over>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:28, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{latest[m.key]}</span>
                    <span style={{ fontSize:11, color:t.textDim }}>{m.unit}</span>
                    {d!==null&&d!==0&&<span style={{ fontSize:10, color:good?t.good:t.over, marginLeft:4 }}>{d>0?`+${d}`:d}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight chart */}
      {measurements.length>1&&(
        <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
          <Over t={t} style={{ marginBottom:20 }}>Weight</Over>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:48 }}>
            {measurements.map((m,i)=>{
              const wts=measurements.map(x=>x.weight),mn=Math.min(...wts),mx=Math.max(...wts),range=mx-mn||1;
              const h=4+((m.weight-mn)/range)*44, isLast=i===measurements.length-1;
              return <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:7, color:t.textDim, opacity:isLast?1:0.4 }}>{m.weight}</div>
                <div style={{ width:"100%", height:h, background:isLast?t.accent:t.elevated, borderRadius:2 }}/>
                <div style={{ fontSize:6, color:t.textDim, opacity:0.5 }}>{m.date.slice(5)}</div>
              </div>;
            })}
          </div>
        </div>
      )}

      {/* Form */}
      <div style={{ padding:"28px 0 0" }}>
        <Over t={t} style={{ marginBottom:20 }}>Log Check-In</Over>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <TxtInput t={t} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{ marginBottom:8 }}/>
          <TxtInput t={t} placeholder="Weight (kg)" type="number" step="0.1" value={form.weight} onChange={e=>setForm(p=>({...p,weight:e.target.value}))} style={{ marginBottom:8 }}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
            {[["waist","Waist cm"],["hips","Hips cm"],["chest","Chest cm"],["arms","Arms cm"]].map(([k,ph])=>(
              <TxtInput key={k} t={t} placeholder={ph} type="number" step="0.1" value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>
            ))}
          </div>
          <SolidBtn t={t} onClick={save} color={saved?t.good:t.accent} style={{ marginTop:24, width:"100%", textAlign:"center" }}>
            {saved?"Saved":"Save Check-In"}
          </SolidBtn>
        </div>
      </div>

      {measurements.length>0&&(
        <div style={{ marginTop:36 }}>
          <Over t={t} style={{ marginBottom:16 }}>History</Over>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {[...measurements].reverse().map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${t.border}` }}>
                <Over t={t}>{m.date}</Over>
                <div style={{ display:"flex", gap:16, fontSize:13, fontWeight:300 }}>
                  <span style={{ color:t.text }}>{m.weight}kg</span>
                  {m.waist?<span style={{ color:t.textDim }}>{m.waist}w</span>:null}
                  {m.hips?<span style={{ color:t.textDim }}>{m.hips}h</span>:null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WEEK SCREEN ───────────────────────────────────────────────────────────────
const SLOTS = ["breakfast","lunch","dinner","snack"];
const SLOT_LABELS = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snack:"Snack" };

function WeekScreen({ t, weekPlan, setWeekPlan, mealLibrary, todayLog, setTodayLog, today }) {
  const [selectedDay, setSelectedDay] = useState(today);
  const [swapping, setSwapping] = useState(null); // {day, slot}
  const [dragging, setDragging] = useState(null); // {day, slot, meal}

  const dayPlan = weekPlan[selectedDay] || {};

  // Find meal object from library by name
  const getMeal = name => name ? mealLibrary.find(m=>m.name===name)||{name,cal:"?",protein:"?"} : null;

  const dayTotals = day => {
    const plan = weekPlan[day]||{};
    return SLOTS.reduce((acc,slot)=>{
      const m = getMeal(plan[slot]);
      if(m&&m.cal&&m.cal!=="?") acc.cal += +m.cal;
      if(m&&m.protein&&m.protein!=="?") acc.protein += +m.protein;
      return acc;
    },{cal:0,protein:0});
  };

  const logMeal = (mealName) => {
    const meal = getMeal(mealName);
    if(!meal||meal.cal==="?") return;
    setTodayLog(p=>[...p,{...meal}]);
  };

  const swapMeal = (day, slot, newMealName) => {
    setWeekPlan(p=>({...p,[day]:{...p[day],[slot]:newMealName}}));
    setSwapping(null);
  };

  const moveToSlot = (fromDay, fromSlot, toDay, toSlot) => {
    const fromMeal = weekPlan[fromDay]?.[fromSlot]||null;
    const toMeal = weekPlan[toDay]?.[toSlot]||null;
    setWeekPlan(p=>({
      ...p,
      [fromDay]:{...p[fromDay],[fromSlot]:toMeal},
      [toDay]:{...p[toDay],[toSlot]:fromMeal},
    }));
    setDragging(null);
  };

  const isEmpty = !DAYS.some(d=>SLOTS.some(s=>weekPlan[d]?.[s]));

  if(isEmpty) return (
    <div style={{ padding:"0 24px 48px" }}>
      <div style={{ padding:"24px 0 32px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:12 }}>Week</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, lineHeight:1, fontFamily:"'Georgia','Times New Roman',serif" }}>No plan<br/>yet</div>
        <div style={{ fontSize:13, fontWeight:300, color:t.textMid, marginTop:16, lineHeight:1.7 }}>Chat with the coach to build your week — tap Confirm Plan and it'll appear here.</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"0 0 48px" }}>
      {/* Day strip */}
      <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, overflowX:"auto", scrollbarWidth:"none" }}>
        {DAYS.map(d=>{
          const tots=dayTotals(d);
          const active=selectedDay===d;
          const isToday=d===today;
          const hasMeals=SLOTS.some(s=>weekPlan[d]?.[s]);
          return (
            <button key={d} onClick={()=>setSelectedDay(d)} style={{
              flexShrink:0, flex:1, minWidth:52, padding:"14px 0 12px", border:"none",
              background:"transparent", cursor:"pointer", fontFamily:"inherit",
              borderBottom:`2px solid ${active?t.accent:"transparent"}`,
              marginBottom:-1, textAlign:"center",
            }}>
              <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:active?t.accent:isToday?t.textMid:t.textDim, fontWeight:active?600:400 }}>{d}</div>
              {hasMeals&&<div style={{ width:4, height:4, borderRadius:"50%", background:active?t.accent:t.textDim, margin:"5px auto 0" }}/>}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <div style={{ padding:"24px 24px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:24 }}>
          <div style={{ fontSize:28, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{FULL_DAYS[DAYS.indexOf(selectedDay)]}</div>
          {(()=>{const tots=dayTotals(selectedDay);return tots.cal>0?(
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, fontWeight:200, color:t.accent }}>{tots.cal} kcal</div>
              <div style={{ fontSize:10, color:t.textDim, letterSpacing:1 }}>P{tots.protein}g</div>
            </div>
          ):null;})()}
        </div>

        {/* Slots */}
        <div style={{ display:"flex", flexDirection:"column" }}>
          {SLOTS.map(slot=>{
            const mealName = dayPlan[slot]||null;
            const meal = getMeal(mealName);
            const isSwappingThis = swapping?.day===selectedDay&&swapping?.slot===slot;
            const isDraggingThis = dragging?.day===selectedDay&&dragging?.slot===slot;

            return (
              <div key={slot}>
                <div style={{ paddingBottom:isDraggingThis?0:16, borderBottom:`1px solid ${t.border}`, marginBottom:16 }}>
                  <Over t={t} style={{ marginBottom:8 }}>{SLOT_LABELS[slot]}</Over>

                  {meal ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:300, color:t.text, lineHeight:1.4 }}>{meal.name}</div>
                        <div style={{ fontSize:11, color:t.textDim, marginTop:4 }}>{meal.cal} kcal · P{meal.protein}g</div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                        {selectedDay===today&&(
                          <button onClick={()=>logMeal(mealName)} style={{
                            background:"transparent", border:`1px solid ${t.accent}`, borderRadius:20,
                            padding:"5px 10px", color:t.accent, fontSize:9, letterSpacing:2,
                            textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                          }}>Log</button>
                        )}
                        <button onClick={()=>setSwapping(isSwappingThis?null:{day:selectedDay,slot})} style={{
                          background:"transparent", border:`1px solid ${t.border}`, borderRadius:20,
                          padding:"5px 10px", color:t.textDim, fontSize:9, letterSpacing:2,
                          textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                        }}>Swap</button>
                        <button
                          onMouseDown={()=>setDragging({day:selectedDay,slot,meal:mealName})}
                          onTouchStart={()=>setDragging({day:selectedDay,slot,meal:mealName})}
                          style={{ background:"transparent", border:"none", color:t.textDim, fontSize:16, cursor:"grab", padding:"4px 6px" }}
                        >⠿</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={()=>dragging?moveToSlot(dragging.day,dragging.slot,selectedDay,slot):setSwapping(isSwappingThis?null:{day:selectedDay,slot})}
                      style={{ fontSize:12, color:t.textDim, fontStyle:"italic", padding:"8px 0", cursor:"pointer",
                        background:dragging?`${t.accent}10`:"transparent",
                        border:dragging?`1px dashed ${t.accent}`:"1px dashed transparent",
                        borderRadius:8, paddingLeft:dragging?12:0, transition:"all 0.15s",
                      }}>
                      {dragging?"Drop here":"+ Add meal"}
                    </div>
                  )}

                  {/* Swap picker */}
                  {isSwappingThis&&(
                    <div style={{ marginTop:12, background:t.surface, borderRadius:12, overflow:"hidden" }}>
                      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${t.border}` }}>
                        <Over t={t}>Choose a meal</Over>
                      </div>
                      <div style={{ maxHeight:200, overflowY:"auto" }}>
                        {mealName&&(
                          <button onClick={()=>swapMeal(selectedDay,slot,null)} style={{ width:"100%", padding:"11px 14px", background:"transparent", border:"none", borderBottom:`1px solid ${t.border}`, color:t.over, fontSize:12, textAlign:"left", cursor:"pointer", fontFamily:"inherit" }}>
                            Remove meal
                          </button>
                        )}
                        {mealLibrary.map((m,i)=>(
                          <button key={i} onClick={()=>swapMeal(selectedDay,slot,m.name)} style={{
                            width:"100%", padding:"11px 14px", background:m.name===mealName?t.elevated:"transparent",
                            border:"none", borderBottom:`1px solid ${t.border}`,
                            color:m.name===mealName?t.accent:t.text, fontSize:13, fontWeight:300,
                            textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", justifyContent:"space-between",
                          }}>
                            <span>{m.name}</span>
                            <span style={{ color:t.textDim, fontSize:11 }}>{m.cal}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drop target for dragging between slots on same day */}
                {dragging&&dragging.day===selectedDay&&dragging.slot!==slot&&(
                  <div onClick={()=>moveToSlot(dragging.day,dragging.slot,selectedDay,slot)}
                    style={{ height:4, background:t.accent, borderRadius:99, marginBottom:12, cursor:"pointer", opacity:0.5 }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel drag */}
        {dragging&&(
          <button onClick={()=>setDragging(null)} style={{ background:"transparent", border:"none", color:t.textDim, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", padding:"8px 0", marginTop:8 }}>
            Cancel move
          </button>
        )}
      </div>
    </div>
  );
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function Progress({ t, weekLog, weekHabits, measurements, schedule, today }) {
  const weekStats = DAYS.map(d=>{
    const tots=sumLog(weekLog[d]||[]);
    const tgt=getTargets(schedule[d],null,false);
    return { day:d, ...tots, target:tgt.total, logged:(weekLog[d]||[]).length>0 };
  });
  const logged=weekStats.filter(d=>d.logged);
  const totalCal=logged.reduce((a,d)=>a+d.cal,0);
  const totalProt=logged.reduce((a,d)=>a+d.protein,0);
  const avgCal=logged.length?Math.round(totalCal/logged.length):0;
  const avgProt=logged.length?Math.round(totalProt/logged.length):0;
  const onTarget=logged.filter(d=>d.cal>=d.target*0.85&&d.cal<=d.target*1.1).length;
  const maxBar=Math.max(...weekStats.map(d=>Math.max(d.cal,d.target)),1);

  const habitStats=HABITS.map(h=>({
    ...h, done:DAYS.filter(d=>weekHabits[d]?.[h.key]).length
  }));
  const habitScore=habitStats.reduce((a,h)=>a+h.done,0);

  const latest=measurements[measurements.length-1];
  const prev=measurements[measurements.length-2];

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 28px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:8 }}>This Week</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>Progress</div>
      </div>

      {/* Calorie chart */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
          <Over t={t}>Daily Calories</Over>
          {logged.length>0&&<Over t={t} color={t.accent}>{onTarget} / {logged.length} on target</Over>}
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:88 }}>
          {weekStats.map(d=>{
            const isToday=d.day===today;
            const barH=d.logged?Math.max(4,(d.cal/maxBar)*72):0;
            const tgtH=(d.target/maxBar)*72;
            const col=!d.logged?t.elevated:d.cal>d.target*1.1?t.over:d.cal<d.target*0.75?t.warn:t.good;
            return (
              <div key={d.day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:8, color:t.textDim, height:10 }}>{d.logged?d.cal:""}</div>
                <div style={{ width:"100%", height:72, display:"flex", flexDirection:"column", justifyContent:"flex-end", position:"relative" }}>
                  <div style={{ position:"absolute", bottom:tgtH, left:0, right:0, height:1, background:t.borderMid, zIndex:1 }}/>
                  <div style={{ width:"75%", margin:"0 auto", height:barH, background:col, borderRadius:"3px 3px 0 0", transition:"height 0.7s ease", position:"relative", zIndex:2 }}/>
                </div>
                <Over t={t} color={isToday?t.accent:t.textDim}>{d.day}</Over>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:9, color:t.textDim, letterSpacing:1.5, marginTop:8 }}>— target</div>
      </div>

      {/* Weekly averages */}
      {logged.length>0&&(
        <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
          <Over t={t} style={{ marginBottom:20 }}>Weekly Averages</Over>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0 }}>
            {[
              {label:"Avg Cal",  value:avgCal,       sub:"/day"},
              {label:"Avg Prot", value:avgProt+"g",   sub:"/day"},
              {label:"On Target",value:onTarget,      sub:`of ${logged.length} days`},
            ].map((s,i)=>(
              <div key={s.label} style={{ textAlign:"center", borderRight:i<2?`1px solid ${t.border}`:"none", padding:"0 8px" }}>
                <div style={{ fontSize:26, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{s.value}</div>
                <Over t={t} style={{ marginTop:4 }}>{s.label}</Over>
                <div style={{ fontSize:9, color:t.textDim, marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
          <Over t={t}>Habits This Week</Over>
          <Over t={t} color={t.accent}>{habitScore} / {HABITS.length*7}</Over>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {habitStats.map(h=>{
            const col=t.name==="day"?h.dayCol:h.nightCol;
            return (
              <div key={h.key}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                  <Over t={t}>{h.label}</Over>
                  <span style={{ fontSize:10, color:h.done>0?col:t.textDim, letterSpacing:0.5 }}>{h.done} / 7</span>
                </div>
                <Bar value={h.done} target={7} color={col}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body snapshot */}
      {latest&&(
        <div style={{ padding:"28px 0" }}>
          <Over t={t} style={{ marginBottom:20 }}>Body · {latest.date}</Over>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[{label:"Weight",key:"weight",unit:"kg",invert:true},{label:"Waist",key:"waist",unit:"cm",invert:true},{label:"Hips",key:"hips",unit:"cm",invert:true},{label:"Arms",key:"arms",unit:"cm"}]
              .filter(m=>latest[m.key]).map(m=>{
                const d=prev?+(latest[m.key]-prev[m.key]).toFixed(1):null;
                const good=d===null?null:m.invert?d<0:d>0;
                return (
                  <div key={m.key} style={{ borderBottom:`1px solid ${t.border}`, paddingBottom:12 }}>
                    <Over t={t} style={{ marginBottom:6 }}>{m.label}</Over>
                    <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                      <span style={{ fontSize:22, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{latest[m.key]}</span>
                      <span style={{ fontSize:10, color:t.textDim }}>{m.unit}</span>
                      {d!==null&&d!==0&&<span style={{ fontSize:10, color:good?t.good:t.over }}>{d>0?`+${d}`:d}</span>}
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const todayIndex=new Date().getDay();
  const adjustedIndex=todayIndex===0?6:todayIndex-1;
  const today=DAYS[adjustedIndex];

  const [theme,setTheme]=useState(()=>new Date().getHours()>=18?"night":"day");
  const [activeTab,setActiveTab]=useState("dashboard");
  const [schedule]=useState(DEFAULT_SCHEDULE);
  const [readiness,setReadiness]=useState(null);
  const [weekLog,setWeekLog]=useState(Object.fromEntries(DAYS.map(d=>[d,[]])));
  const [weekHabits,setWeekHabits]=useState(Object.fromEntries(DAYS.map(d=>[d,{}])));
  const [measurements,setMeasurements]=useState([]);
  const [mealLibrary,setMealLibrary]=useState(DEFAULT_LIBRARY);
  const [weekPlan,setWeekPlan]=useState(Object.fromEntries(DAYS.map(d=>[d,{breakfast:null,lunch:null,dinner:null,snack:null}])));
  const [coachMessages,setCoachMessages]=useState([{role:"assistant",content:"What are we working with this week? Tell me what's in your fridge, recipes to test, social plans."}]);
  const [groceryList,setGroceryList]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [weekDates]=useState(getWeekDates);
  const [weekKey]=useState(getWeekKey);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user??null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!user){setLoaded(false);return;}
    (async()=>{
      try {
        const data=await dbLoad(user.id);
        setWeekLog(data.weekLog);
        setWeekHabits(data.weekHabits);
        if(data.mealLibrary.length) setMealLibrary(data.mealLibrary);
        setWeekPlan(data.weekPlan);
        setMeasurements(data.measurements);
        if(data.readiness!==null) setReadiness(data.readiness);
      } catch(e){console.error('Load error:',e);}
      setLoaded(true);
    })();
  },[user]);

  useEffect(()=>{ if(loaded&&user) dbSaveWeekLog(user.id,weekLog,weekDates); },[weekLog,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveHabits(user.id,weekHabits,weekDates); },[weekHabits,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveMeasurements(user.id,measurements); },[measurements,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveLibrary(user.id,mealLibrary); },[mealLibrary,loaded]);
  useEffect(()=>{ if(loaded&&user&&readiness!==null) dbSaveReadiness(user.id,readiness,weekDates[today]); },[readiness,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveWeekPlan(user.id,weekPlan,weekKey); },[weekPlan,loaded]);

  const t=THEMES[theme];
  const todayLog=weekLog[today]||[];
  const setTodayLog=fn=>setWeekLog(p=>({...p,[today]:typeof fn==="function"?fn(p[today]):fn}));
  const isSocialNight=!!SOCIAL_DAYS[today]&&SOCIAL_DAYS[today].includes("night");
  const targets=getTargets(schedule[today],readiness,isSocialNight);
  const socialFlag=SOCIAL_DAYS[today]||null;
  const appState={today,schedule,readiness,weekLog,mealLibrary,measurements,weekPlan};

  const tabs=[
    {key:"dashboard",label:"Today"},
    {key:"week",     label:"Week"},
    {key:"coach",    label:"Coach"},
    {key:"log",      label:"Meals"},
    {key:"social",   label:"Out"},
    {key:"habits",   label:"Habits"},
    {key:"body",     label:"Body"},
    {key:"progress", label:"Stats"},
  ];

  if(authLoading||!loaded) return (
    <div style={{ background:THEMES[theme].bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Over t={THEMES[theme]}>Ayori</Over>
    </div>
  );

  if(!user) return <Auth />;

  return (
    <div style={{ fontFamily:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", background:t.bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", paddingBottom:60, color:t.text }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        input::placeholder,textarea::placeholder{color:${t.textDim};}
        input[type=date]{color-scheme:dark;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {/* Top bar — wordmark + theme toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 0", borderBottom:`1px solid ${t.border}`, paddingBottom:16 }}>
        <div style={{ fontSize:11, letterSpacing:4, textTransform:"uppercase", color:t.textMid, fontWeight:500 }}>Ayori</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>setTheme(theme==="day"?"night":"day")} style={{
            background:"transparent", border:`1px solid ${t.border}`, borderRadius:20,
            padding:"5px 12px", cursor:"pointer", fontFamily:"inherit",
            color:t.textDim, fontSize:8, letterSpacing:3, textTransform:"uppercase",
          }}>{t.label}</button>
          <button onClick={()=>supabase.auth.signOut()} style={{
            background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit",
            color:t.textDim, fontSize:8, letterSpacing:3, textTransform:"uppercase", padding:"5px 4px",
          }}>Out</button>
        </div>
      </div>

      {activeTab==="dashboard"&&<Dashboard t={t} today={today} dayIdx={adjustedIndex} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets} readiness={readiness} setReadiness={setReadiness} schedule={schedule} weekHabits={weekHabits} setActiveTab={setActiveTab} socialFlag={socialFlag} mealLibrary={mealLibrary}/>}
      {activeTab==="week"      &&<WeekScreen t={t} weekPlan={weekPlan} setWeekPlan={setWeekPlan} mealLibrary={mealLibrary} todayLog={todayLog} setTodayLog={setTodayLog} today={today}/>}
      {activeTab==="coach"    &&<CoachScreen t={t} appState={appState} mealLibrary={mealLibrary} setMealLibrary={setMealLibrary} setWeekPlan={setWeekPlan} setWeekLog={setWeekLog} setActiveTab={setActiveTab} messages={coachMessages} setMessages={setCoachMessages} groceryList={groceryList} setGroceryList={setGroceryList}/>}
      {activeTab==="log"      &&<MealLog t={t} weekLog={weekLog} setWeekLog={setWeekLog} today={today} schedule={schedule} readiness={readiness} mealLibrary={mealLibrary}/>}
      {activeTab==="progress" &&<Progress t={t} weekLog={weekLog} weekHabits={weekHabits} measurements={measurements} schedule={schedule} today={today}/>}
      {activeTab==="social"   &&<SocialMeal t={t} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets}/>}
      {activeTab==="habits"   &&<Habits t={t} weekHabits={weekHabits} setWeekHabits={setWeekHabits} today={today}/>}
      {activeTab==="body"     &&<Body t={t} measurements={measurements} setMeasurements={setMeasurements}/>}

      {/* Nav — text only, Submersive-style */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:t.bg, borderTop:`1px solid ${t.border}`, display:"flex", zIndex:10 }}>
        {tabs.map(tab=>{
          const active=activeTab===tab.key;
          return (
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{
              flex:1, padding:"14px 0 12px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
              color:active?t.accent:t.textDim,
              fontSize:10, letterSpacing:1.5, textTransform:"uppercase", fontWeight:active?600:400,
              borderTop:`1px solid ${active?t.accent:"transparent"}`,
              marginTop:-1,
            }}>{tab.label}</button>
          );
        })}
      </div>
    </div>
  );
}