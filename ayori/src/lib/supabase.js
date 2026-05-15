import { createClient } from '@supabase/supabase-js';
import { DAYS, HABITS } from './constants';
import { weekDatesInTz, weekKeyInTz, dayIndexInTz } from './dates';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Both now delegate to the timezone-aware dates.js functions
export const getWeekKey   = (tz = 'UTC') => weekKeyInTz(tz);
export const getWeekDates = (tz = 'UTC') => weekDatesInTz(tz);

export async function dbLoad(userId, tz = 'UTC') {
  const wDates = weekDatesInTz(tz);
  const wKey   = weekKeyInTz(tz);
  const dates  = Object.values(wDates);
  const todayStr = wDates[DAYS[dayIndexInTz(tz)]];
  const dateToDay = Object.fromEntries(Object.entries(wDates).map(([d,date])=>[date,d]));

  const [logs,habR,libR,planR,measR,readR] = await Promise.all([
    supabase.from('meal_logs').select('*').eq('user_id',userId).in('date',dates),
    supabase.from('habits').select('*').eq('user_id',userId).in('date',dates),
    supabase.from('meal_library').select('*').eq('user_id',userId).order('created_at'),
    supabase.from('week_plans').select('*').eq('user_id',userId).eq('week_key',wKey),
    supabase.from('body_measurements').select('*').eq('user_id',userId).order('date'),
    supabase.from('oura_readiness').select('*').eq('user_id',userId).eq('date',todayStr),
  ]);

  const weekLog = Object.fromEntries(DAYS.map(d=>[d,[]]));
  (logs.data||[]).forEach(r=>{const d=dateToDay[r.date];if(d)weekLog[d].push({id:r.id,name:r.meal_name,cal:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat,social:r.is_social});});

  const weekHabits = Object.fromEntries(DAYS.map(d=>[d,{}]));
  (habR.data||[]).forEach(r=>{const d=dateToDay[r.date];if(d&&r.completed)weekHabits[d][r.habit_key]=true;});

  const mealLibrary = (libR.data||[]).map(r=>({name:r.name,cal:r.calories,protein:r.protein,carbs:r.carbs,fat:r.fat}));

  const weekPlan = Object.fromEntries(DAYS.map(d=>[d,{breakfast:null,lunch:null,dinner:null,snack:null}]));
  (planR.data||[]).forEach(r=>{if(weekPlan[r.day])weekPlan[r.day][r.slot]=r.meal_name;});

  const measurements = (measR.data||[]).map(r=>({date:r.date,weight:r.weight,waist:r.waist,hips:r.hips,chest:r.chest,arms:r.arms}));
  const readiness = readR.data?.[0]?.score??null;

  return {weekLog,weekHabits,mealLibrary,weekPlan,measurements,readiness};
}

export async function dbSaveWeekLog(userId,weekLog,weekDates) {
  const dates=Object.values(weekDates);
  const rows=DAYS.flatMap(d=>(weekLog[d]||[]).map(m=>({
    id: m.id,
    user_id:userId, date:weekDates[d], meal_name:m.name,
    calories:m.cal||0, protein:m.protein||0, carbs:m.carbs||0, fat:m.fat||0, is_social:m.social||false,
  })));
  if(rows.length) await supabase.from('meal_logs').upsert(rows,{onConflict:'id'});
  const currentIds=new Set(rows.map(r=>r.id).filter(Boolean));
  const {data:dbRows}=await supabase.from('meal_logs').select('id').eq('user_id',userId).in('date',dates);
  const toDelete=(dbRows||[]).map(r=>r.id).filter(id=>!currentIds.has(id));
  if(toDelete.length) await supabase.from('meal_logs').delete().in('id',toDelete);
}

export async function dbSaveHabits(userId,weekHabits,weekDates) {
  const rows=DAYS.flatMap(d=>HABITS.map(h=>({
    user_id:userId, date:weekDates[d], habit_key:h.key,
    completed:!!(weekHabits[d]?.[h.key]),
  })));
  await supabase.from('habits').upsert(rows,{onConflict:'user_id,date,habit_key'});
}

export async function dbSaveLibrary(userId,mealLibrary) {
  const unique=mealLibrary.filter((m,i,a)=>a.findIndex(x=>x.name===m.name)===i);
  if(!unique.length) return;
  await supabase.from('meal_library').upsert(unique.map(m=>({user_id:userId,name:m.name,calories:m.cal||0,protein:m.protein||0,carbs:m.carbs||0,fat:m.fat||0})),{onConflict:'user_id,name'});
}

export async function dbSaveWeekPlan(userId,weekPlan,weekKey) {
  const rows=DAYS.flatMap(d=>['breakfast','lunch','dinner','snack'].filter(s=>weekPlan[d]?.[s]).map(s=>({user_id:userId,week_key:weekKey,day:d,slot:s,meal_name:weekPlan[d][s]})));
  if(rows.length) await supabase.from('week_plans').upsert(rows,{onConflict:'user_id,week_key,day,slot'});
  const filledSlots=new Set(rows.map(r=>`${r.day}:${r.slot}`));
  const {data:dbRows}=await supabase.from('week_plans').select('id,day,slot').eq('user_id',userId).eq('week_key',weekKey);
  const toDelete=(dbRows||[]).filter(r=>!filledSlots.has(`${r.day}:${r.slot}`)).map(r=>r.id);
  if(toDelete.length) await supabase.from('week_plans').delete().in('id',toDelete);
}

export async function dbSaveMeasurements(userId,measurements) {
  if(!measurements.length) return;
  await supabase.from('body_measurements').upsert(measurements.map(m=>({user_id:userId,...m})),{onConflict:'user_id,date'});
}

export async function dbSaveReadiness(userId,score,date) {
  await supabase.from('oura_readiness').upsert({user_id:userId,date,score},{onConflict:'user_id,date'});
}

export async function dbLoadMessages(userId,weekKey) {
  try {
    const {data}=await supabase.from('coach_sessions').select('messages').eq('user_id',userId).eq('week_key',weekKey).single();
    return data?.messages||null;
  } catch { return null; }
}

export async function dbSaveMessages(userId,weekKey,messages) {
  try {
    await supabase.from('coach_sessions').upsert({user_id:userId,week_key:weekKey,messages,updated_at:new Date().toISOString()},{onConflict:'user_id,week_key'});
  } catch { /* table may not exist yet */ }
}

export async function dbLoadSettings(userId) {
  const { data } = await supabase.from('user_settings').select('*').eq('user_id',userId).single();
  return data || null;
}

export async function dbSaveSettings(userId, settings) {
  await supabase.from('user_settings').upsert({ user_id:userId, ...settings }, { onConflict:'user_id' });
}
