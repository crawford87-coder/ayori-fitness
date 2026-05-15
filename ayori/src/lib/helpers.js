import { supabase } from './supabase';
import { DAYS, WORKOUT_TYPES, BASE, DAMAGE_CONTROL } from './constants';

export function getTargets(workoutKey, readiness, isSocialNight, base = BASE) {
  const w = WORKOUT_TYPES[workoutKey] || WORKOUT_TYPES.REST;
  let calBonus = w.calBonus, carbBonus = w.carbBonus;
  if (readiness !== null && readiness < 60)      { calBonus = 0; carbBonus = 0; }
  else if (readiness !== null && readiness < 75) { calBonus = Math.round(calBonus*0.5); carbBonus = Math.round(carbBonus*0.5); }
  const socialReserve = isSocialNight ? 700 : 0;
  return {
    cal: base.cal + calBonus - socialReserve,
    protein: base.protein + (w.intensity==="high"?15:w.intensity==="moderate"?8:0),
    carbs: base.carbs + carbBonus, fat: base.fat,
    total: base.cal + calBonus, socialReserve,
  };
}

export function sumLog(log) {
  return log.reduce((a,m)=>({cal:a.cal+m.cal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{cal:0,protein:0,carbs:0,fat:0});
}

export function getSuggestion(remaining, mealLibrary) {
  if (remaining.cal < 0) return { type:"over", meal:DAMAGE_CONTROL[1] };
  if (remaining.cal < 200) return { type:"tight", meal:null };
  const best = mealLibrary.filter(m=>m.cal<=remaining.cal+80&&m.protein>=10).sort((a,b)=>Math.abs(a.cal-remaining.cal)-Math.abs(b.cal-remaining.cal))[0];
  return { type:"normal", meal:best||null };
}

async function invokeCoach(payload) {
  const { data, error } = await supabase.functions.invoke("coach", { body: payload });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function buildSystemPrompt(state) {
  const { today, schedule, readiness, weekLog, mealLibrary, measurements, weekPlan } = state;
  const totals = sumLog(weekLog[today]||[]);
  const targets = getTargets(schedule[today], readiness, false);
  const latest = measurements[measurements.length-1];
  const dayTargets = DAYS.map(d=>{
    const tgt=getTargets(schedule[d],null,false);
    return `${d}(${WORKOUT_TYPES[schedule[d]]?.label}): ${tgt.total}cal / P${tgt.protein}g / C${tgt.carbs}g / F${tgt.fat}g`;
  }).join("\n");
  return `You are a nutrition coach agent embedded in a fitness tracking app. You write data directly into the app via JSON blocks. Never say you "can't save" or "can't log" — you are the agent that does it.

TWO MODES — recognise which one the user is in:
1. MEAL LOGGING: User says "I just had X", "I ate X", "just finished X" → estimate macros, break them down clearly in your message, then output LOG_JSON. The app will show a confirmation card before committing — tell the user to confirm.
2. MEAL PLANNING: User wants to plan the week, brainstorm meals, prep for the week → collaborate first, then when ready output MEALS_JSON + GROCERY_JSON + WEEK_JSON together. The user confirms the full plan before it's saved.

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

MEAL LOGGING — when user reports eating something, estimate macros in your message then output:
<LOG_JSON>[{"day":"Mon","name":"","cal":0,"protein":0,"carbs":0,"fat":0}]</LOG_JSON>
Use today (${today}) as the day unless the user specifies otherwise. The app shows a confirmation card before logging — tell the user to tap "Log It" to confirm.

MEAL PLANNING — when building or modifying a meal plan, output ALL THREE:
<MEALS_JSON>[{"name":"","cal":0,"protein":0,"carbs":0,"fat":0}]</MEALS_JSON>
<GROCERY_JSON>{"Proteins":[],"Produce":[],"Pantry & Grains":[],"Fridge & Other":[]}</GROCERY_JSON>
<WEEK_JSON>{"Mon":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Tue":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Wed":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Thu":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Fri":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Sat":{"breakfast":null,"lunch":null,"dinner":null,"snack":null},"Sun":{"breakfast":null,"lunch":null,"dinner":null,"snack":null}}</WEEK_JSON>
WEEK_JSON slot values must be meal name strings matching MEALS_JSON exactly, or null.`;
}

export async function callClaude(messages, systemPrompt) {
  const data = await invokeCoach({ type: "chat", messages, systemPrompt });
  return data.content?.find(b=>b.type==="text")?.text||"";
}

export async function estimateMacros(desc, imgData, imgType) {
  const data = await invokeCoach({ type: "estimate", description: desc, imageData: imgData, imageType: imgType });
  return JSON.parse((data.content?.find(b=>b.type==="text")?.text||"").replace(/```json|```/g,"").trim());
}

export const parseMeals = t => { try{const m=t.match(/<MEALS_JSON>([\s\S]*?)<\/MEALS_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
export const parseGrocery = t => { try{const m=t.match(/<GROCERY_JSON>([\s\S]*?)<\/GROCERY_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
export const parseWeek = t => { try{const m=t.match(/<WEEK_JSON>([\s\S]*?)<\/WEEK_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
export const parseLog = t => { try{const m=t.match(/<LOG_JSON>([\s\S]*?)<\/LOG_JSON>/);return m?JSON.parse(m[1]):null;}catch{return null;} };
export const stripJson = t => t.replace(/<MEALS_JSON>[\s\S]*?<\/MEALS_JSON>/g,"").replace(/<GROCERY_JSON>[\s\S]*?<\/GROCERY_JSON>/g,"").replace(/<WEEK_JSON>[\s\S]*?<\/WEEK_JSON>/g,"").replace(/<LOG_JSON>[\s\S]*?<\/LOG_JSON>/g,"").trim();
