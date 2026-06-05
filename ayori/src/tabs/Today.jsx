import { useState } from "react";
import { motion } from "framer-motion";
import { FULL_DAYS, DAYS, HABITS, WORKOUT_TYPES, BASE } from "../lib/constants";
import { sumLog, getSuggestion, getTargets } from "../lib/helpers";
import { Arc, Bar, BigNum, GlossySphere, GhostBtn, SolidBtn, Over } from "../components/ui";

export default function Dashboard({ t, today, dayIdx, todayLog, setTodayLog, targets, readiness, setReadiness, schedule, weekHabits, setWeekHabits, setActiveTab, mealLibrary, weekLog, setWeekLog, base }) {
  const [editingIdx,setEditingIdx]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [readinessInput,setReadinessInput]=useState("");
  const [viewDay,setViewDay]=useState(today);

  const todayIdx=DAYS.indexOf(today);
  const viewDayIdx=DAYS.indexOf(viewDay);
  const isToday=viewDay===today;

  const viewLog=weekLog?.[viewDay]||(isToday?todayLog:[]);
  const setViewLog=fn=>{
    if(setWeekLog) setWeekLog(p=>({...p,[viewDay]:typeof fn==="function"?fn(p[viewDay]||[]):fn}));
    else if(isToday) setTodayLog(fn);
  };

  const effectiveBase=base||BASE;
  const viewTargets=getTargets(schedule[viewDay],isToday?readiness:null,effectiveBase);
  const viewWorkout=WORKOUT_TYPES[schedule[viewDay]]||WORKOUT_TYPES.REST;

  const totals=sumLog(viewLog);
  const remaining={cal:viewTargets.total-totals.cal,protein:viewTargets.protein-totals.protein,carbs:viewTargets.carbs-totals.carbs,fat:viewTargets.fat-totals.fat};
  const suggestion=getSuggestion(remaining,mealLibrary);
  const todayHabits=weekHabits[viewDay]||{};
  const habitCount=Object.values(todayHabits).filter(Boolean).length;
  const readinessColor=readiness===null?t.textDim:readiness>=75?t.good:readiness>=60?t.warn:t.over;
  const toggleHabit=(day,key)=>{ navigator.vibrate?.(1); setWeekHabits(p=>({...p,[day]:{...p[day],[key]:!p[day]?.[key]}})); };
  const getStreak=key=>{let s=0;for(let i=DAYS.indexOf(today);i>=0;i--){if(weekHabits[DAYS[i]]?.[key])s++;else break;}return s;};

  const navBtn=(dir)=>{
    const newIdx=viewDayIdx+dir;
    if(newIdx<0||newIdx>todayIdx)return;
    setViewDay(DAYS[newIdx]);
    setEditingIdx(null);
  };

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 28px", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <button onClick={()=>navBtn(-1)} disabled={viewDayIdx===0} style={{
            background:"transparent", border:"none", cursor:viewDayIdx===0?"default":"pointer",
            color:viewDayIdx===0?t.border:t.textDim, fontSize:18, padding:"4px 8px",
            fontFamily:"inherit", lineHeight:1, minWidth:32, minHeight:32,
          }}>‹</button>
          <Over t={t} style={{ textAlign:"center" }}>
            {isToday?"Today":FULL_DAYS[viewDayIdx]}
          </Over>
          <button onClick={()=>navBtn(+1)} disabled={isToday} style={{
            background:"transparent", border:"none", cursor:isToday?"default":"pointer",
            color:isToday?t.border:t.textDim, fontSize:18, padding:"4px 8px",
            fontFamily:"inherit", lineHeight:1, minWidth:32, minHeight:32,
          }}>›</button>
        </div>
        <div style={{ fontSize:40, fontWeight:200, letterSpacing:-2, color:t.text, lineHeight:0.95, fontFamily:"'Georgia','Times New Roman',serif", marginBottom:8 }}>
          {viewWorkout.label}
        </div>
        {!isToday&&<div style={{ fontSize:12, color:t.accentB, letterSpacing:2, textTransform:"uppercase", marginTop:10 }}>Past day — tap + to backfill</div>}
      </div>

      {/* Calorie ring */}
      <div style={{ padding:"32px 0 0", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <Arc value={totals.cal} max={viewTargets.total} size={160} sw={6} color={t.ring} label="kcal" sub={viewTargets.total} t={t}/>
        <div style={{ fontSize:13, color:remaining.cal<0?t.over:t.textDim, letterSpacing:1, marginTop:16, marginBottom:28 }}>
          {remaining.cal<0?`${Math.abs(remaining.cal)} over target`:`${remaining.cal} remaining`}
        </div>
      </div>

      {/* Macro bars */}
      <div style={{ paddingBottom:28, borderBottom:`1px solid ${t.border}` }}>
        {[
          {label:"Protein", val:totals.protein, target:viewTargets.protein, color:t.protein},
          {label:"Carbs",   val:totals.carbs,   target:viewTargets.carbs,   color:t.carbs},
          {label:"Fat",     val:totals.fat,     target:viewTargets.fat,     color:t.fat},
        ].map(m=>(
          <div key={m.label} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <Over t={t}>{m.label}</Over>
              <span style={{ fontSize:12, color:m.val>m.target?t.over:t.textDim, letterSpacing:0.5 }}>
                <span style={{ color:m.val>m.target?t.over:t.text }}>{m.val}</span>
                <span style={{ opacity:0.4 }}>/{m.target}g</span>
              </span>
            </div>
            <Bar value={m.val} target={m.target} color={m.color} t={t}/>
          </div>
        ))}
      </div>

      {/* Oura Readiness — today only */}
      {isToday&&(
        <div style={{ padding:"20px 0", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:20 }}>
          <div>
            <Over t={t} style={{ marginBottom:6 }}>Readiness</Over>
            <BigNum t={t} value={readiness??<span style={{ opacity:0.3 }}>—</span>} color={readinessColor} size={40}/>
          </div>
          <div style={{ flex:1, display:"flex", gap:8, flexWrap:"wrap" }}>
            {[{v:75,l:"Good",c:t.good},{v:60,l:"Fair",c:t.warn},{v:45,l:"Low",c:t.over}].map(z=>(
              <motion.button key={z.v} onClick={()=>setReadiness(readiness===z.v?null:z.v)} whileTap={{ scale:0.93 }} style={{
                padding:"6px 14px", borderRadius:20,
                border:`1px solid ${readiness===z.v?z.c+"80":t.border}`,
                background:readiness===z.v?`${z.c}18`:t.elevated,
                color:readiness===z.v?z.c:t.textDim,
                fontSize:12, letterSpacing:2, textTransform:"uppercase",
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                boxShadow:readiness===z.v?`inset 2px 2px 6px ${z.c}30`:t.shadowSm,
              }}>{z.l}</motion.button>
            ))}
            <input type="number" value={readinessInput} onChange={e=>{setReadinessInput(e.target.value);const n=+e.target.value;if(n>=40&&n<=100)setReadiness(n);}} placeholder="or score" min={40} max={100}
              style={{ width:60, padding:"6px 8px", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none" }}/>
          </div>
        </div>
      )}

      {/* Suggestion */}
      {viewLog.length>0&&suggestion.meal&&(
        <div style={{ padding:"20px 0", borderBottom:`1px solid ${t.border}` }}>
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
      <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <Over t={t}>Habits</Over>
          <Over t={t} color={t.accent}>{habitCount} / {HABITS.length}</Over>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {HABITS.map(h=>{
            const done=todayHabits[h.key];
            const col=t.name==="day"?h.dayCol:h.nightCol;
            const streak=getStreak(h.key);
            return (
              <motion.button key={h.key} onClick={()=>toggleHabit(viewDay,h.key)}
                whileTap={{ scale:0.95 }}
                style={{
                  background:done?`${col}10`:t.elevated,
                  border:`1px solid ${done?col+"50":t.border}`,
                  borderRadius:16, padding:"14px 12px",
                  cursor:"pointer", fontFamily:"inherit",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                  boxShadow:done?`4px 4px 12px ${col}30, -4px -4px 12px rgba(255,255,255,0.8)`:t.shadowSm,
                  transition:"box-shadow 0.2s, background 0.2s",
                }}>
                {done
                  ? <GlossySphere size={10} color={col} pulse />
                  : <div style={{ width:10, height:10, borderRadius:"50%", background:t.textDim, boxShadow:t.shadowInset }}/>}
                <Over t={t} color={done?col:t.textDim} style={{ textAlign:"center", lineHeight:1.4 }}>{h.label}</Over>
                {streak>0&&<div style={{ fontSize:10, color:col, letterSpacing:1.5, textTransform:"uppercase" }}>{streak}d</div>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Coach CTA */}
      <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}`, display:"flex", flexDirection:"column", gap:10 }}>
        {isToday&&<SolidBtn t={t} onClick={()=>setActiveTab("coach")} style={{ width:"100%", textAlign:"center" }}>Ask Coach</SolidBtn>}
        <button onClick={()=>setActiveTab("log")} style={{ background:"transparent", border:"none", color:t.textDim, fontSize:12, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", padding:"6px 0", textAlign:"center", minHeight:44 }}>
          + Log a Meal
        </button>
      </div>

      {/* Empty state */}
      {viewLog.length===0&&isToday&&readiness===null&&(
        <div style={{ padding:"32px 0", textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:300, color:t.textDim, lineHeight:1.9, maxWidth:260, margin:"0 auto" }}>
            Start by setting your Oura score above, then log your first meal to see your macros fill in.
          </div>
        </div>
      )}
      {viewLog.length===0&&!isToday&&(
        <div style={{ padding:"32px 0", textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:300, color:t.textDim, lineHeight:1.9, maxWidth:260, margin:"0 auto" }}>
            Nothing logged for {FULL_DAYS[viewDayIdx]}. Tap + Log a Meal above to backfill.
          </div>
        </div>
      )}

      {/* Logged meals */}
      {viewLog.length>0&&(
        <div style={{ marginTop:28 }}>
          <Over t={t} style={{ marginBottom:16 }}>Logged{isToday?" Today":` · ${FULL_DAYS[viewDayIdx]}`}</Over>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {(()=>{
              let runningCal=0;
              return viewLog.map((m,i)=>{
                runningCal+=m.cal;
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
                        setViewLog(p=>p.map((x,idx)=>idx===i?{...editForm,id:x.id,cal:+editForm.cal,protein:+editForm.protein,carbs:+editForm.carbs,fat:+editForm.fat}:x));
                        setEditingIdx(null);
                      }} style={{ flex:2, textAlign:"center", padding:"9px 16px" }}>Save</SolidBtn>
                      <GhostBtn t={t} onClick={()=>{setViewLog(p=>p.filter((_,idx)=>idx!==i));setEditingIdx(null);}} style={{ flex:1, textAlign:"center", padding:"9px 16px", color:t.over, borderColor:t.over }}>Delete</GhostBtn>
                      <GhostBtn t={t} onClick={()=>setEditingIdx(null)} style={{ flex:1, textAlign:"center", padding:"9px 16px" }}>Cancel</GhostBtn>
                    </div>
                  </div>
                );
                return (
                  <div key={i} onClick={()=>{setEditingIdx(i);setEditForm({...m});}} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}`, cursor:"pointer" }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:300, color:t.text }}>{m.social&&<span style={{ color:t.accentC }}>↗ </span>}{m.name}</div>
                      <div style={{ fontSize:12, color:t.textDim, marginTop:3, letterSpacing:0.5 }}>P{m.protein} · C{m.carbs} · F{m.fat}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                      <div style={{ fontSize:16, fontWeight:200, color:m.cal>700?t.over:t.textMid }}>{m.cal}</div>
                      <div style={{ fontSize:11, color:t.textDim, letterSpacing:0.5 }}>= {runningCal}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
