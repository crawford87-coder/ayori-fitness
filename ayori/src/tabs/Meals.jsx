import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DAYS } from "../lib/constants";
import { sumLog } from "../lib/helpers";
import { Over, TxtInput, SolidBtn, GhostBtn } from "../components/ui";

const SLOTS = ["Breakfast","Lunch","Dinner","Snack","Other"];

function UndoToast({ t, item, onUndo }) {
  return (
    <motion.div initial={{ y:60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:60, opacity:0 }}
      style={{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 48px)", maxWidth:432, background:t.elevated, border:`1px solid ${t.border}`, borderRadius:16, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:50, boxShadow:t.shadow }}>
      <span style={{ fontSize:15, fontWeight:300, color:t.text }}>{item.name} deleted</span>
      <button onClick={onUndo} style={{ background:"transparent", border:"none", color:t.accent, fontSize:13, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>Undo</button>
    </motion.div>
  );
}

function LoggedMealRow({ t, meal, onEdit, onDelete }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:80, background:t.over, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:12, color:"#fff", letterSpacing:2, textTransform:"uppercase" }}>Delete</span>
      </div>
      <motion.div drag="x" dragConstraints={{ left:-80, right:0 }} dragElastic={0.1}
        onDragStart={()=>setDragging(true)}
        onDragEnd={(_,info)=>{ setDragging(false); if(info.offset.x<-60) onDelete(); }}
        onClick={()=>{ if(!dragging) onEdit(); }}
        style={{ background:t.bg, cursor:"pointer", position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}` }}>
        <div>
          <div style={{ fontSize:15, fontWeight:400, color:t.text }}>{meal.social&&<span style={{ color:t.accentC }}>↗ </span>}{meal.name}</div>
          <div style={{ fontSize:12, color:t.textDim, marginTop:3, letterSpacing:0.5 }}>P{meal.protein} · C{meal.carbs} · F{meal.fat}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:16, fontWeight:200, color:meal.cal>700?t.over:t.textMid }}>{meal.cal}</div>
          <span style={{ fontSize:12, color:t.textDim }}>›</span>
        </div>
      </motion.div>
    </div>
  );
}

function ProjectedMealRow({ t, name, meal, onLog, onSkip }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}` }}>
      <div>
        <div style={{ fontSize:15, fontWeight:300, color:t.accent, fontStyle:"italic" }}>{name}</div>
        <div style={{ fontSize:12, color:t.textDim, marginTop:3, letterSpacing:0.5 }}>
          {meal ? `P${meal.protein} · C${meal.carbs} · F${meal.fat} · projected` : "projected"}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {meal && <div style={{ fontSize:16, fontWeight:200, color:t.accent, fontStyle:"italic", opacity:0.75 }}>{meal.cal}</div>}
        <button onClick={onSkip} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${t.border}`, background:"transparent", color:t.textDim, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>Skip</button>
        <button onClick={onLog} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${t.accent}`, background:"transparent", color:t.accent, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>Log</button>
      </div>
    </div>
  );
}

function SkippedMealRow({ t, name, onUndo }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}`, opacity:0.45 }}>
      <div>
        <div style={{ fontSize:15, fontWeight:300, color:t.textDim, textDecoration:"line-through", fontStyle:"italic" }}>{name}</div>
        <div style={{ fontSize:12, color:t.textDim, marginTop:3, letterSpacing:0.5 }}>skipped</div>
      </div>
      <button onClick={onUndo} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${t.border}`, background:"transparent", color:t.textDim, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit" }}>Undo</button>
    </div>
  );
}

export default function MealLog({ t, weekLog, setWeekLog, today, schedule, readiness, mealLibrary, base, weekPlan }) {
  const [selectedDay,setSelectedDay]=useState(today);
  const [search,setSearch]=useState("");
  const [custom,setCustom]=useState({name:"",cal:"",protein:"",carbs:"",fat:"",type:"Other"});
  const [mode,setMode]=useState("library");
  const [addOpen,setAddOpen]=useState(false);
  const [editMeal,setEditMeal]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [undoItem,setUndoItem]=useState(null);
  const undoTimerRef=useRef(null);

  const dayLog=weekLog[selectedDay]||[];
  const setDayLog=fn=>setWeekLog(p=>({...p,[selectedDay]:typeof fn==="function"?fn(p[selectedDay]||[]):fn}));
  const totals=sumLog(dayLog);

  // Planned meals from coach
  const dayPlan=weekPlan?.[selectedDay]||{};
  const plannedSlots=["breakfast","lunch","dinner","snack"]
    .map(s=>({ slot:s, name:dayPlan[s]||null }))
    .filter(s=>s.name)
    .map(s=>({ ...s, meal: mealLibrary.find(m=>m.name===s.name)||null }));
  const plannedTotals=plannedSlots.reduce((acc,s)=>{
    if(!s.meal) return acc;
    return { cal:acc.cal+s.meal.cal, protein:acc.protein+s.meal.protein, carbs:acc.carbs+s.meal.carbs, fat:acc.fat+s.meal.fat };
  },{ cal:0, protein:0, carbs:0, fat:0 });
  const hasPlanned=plannedSlots.length>0;

  // Fuzzy match: strip connectives/stopwords, then check keyword overlap
  // "Kachava + Almond Milk" and "Kachava with Almond Milk" both → ["kachava","almond","milk"]
  const STOP=new Set(['with','and','the','a','an','in','of','for','on','at','by','or','to','plus']);
  const normStr=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const keyWords=s=>normStr(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w));
  const namesMatch=(a,b)=>{
    if(normStr(a)===normStr(b)) return true;
    const wa=keyWords(a),wb=keyWords(b);
    if(!wa.length||!wb.length) return false;
    const [shorter,longerSet]=wa.length<=wb.length?[wa,new Set(wb)]:[wb,new Set(wa)];
    const hits=shorter.filter(w=>longerSet.has(w)).length;
    return hits/shorter.length>=0.6;
  };

  // For each planned slot, find the best logged match anywhere in dayLog (any slot type)
  const claimedIds=new Set();
  const slotMatches={};
  plannedSlots.forEach(s=>{
    const match=dayLog.find(m=>!claimedIds.has(m.id)&&namesMatch(m.name,s.name));
    if(match){ claimedIds.add(match.id); slotMatches[s.slot]=match; }
  });

  const deleteMeal=(meal)=>{
    setDayLog(p=>p.filter(m=>m.id!==meal.id));
    setUndoItem(meal);
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current=setTimeout(()=>setUndoItem(null),5000);
  };

  const undoDelete=()=>{
    if(undoItem) setDayLog(p=>[...p,undoItem]);
    setUndoItem(null);
    clearTimeout(undoTimerRef.current);
  };

  const openEdit=(meal)=>{ setEditMeal(meal.id); setEditForm({...meal,type:meal.type||"Other"}); setAddOpen(false); };

  const saveEdit=()=>{
    setDayLog(p=>p.map(m=>m.id===editMeal?{...editForm,cal:+editForm.cal,protein:+editForm.protein||0,carbs:+editForm.carbs||0,fat:+editForm.fat||0}:m));
    setEditMeal(null);
  };

  const logPlanned=(slotKey, meal, name)=>{
    const type=slotKey.charAt(0).toUpperCase()+slotKey.slice(1);
    const entry=meal ? {...meal, id:crypto.randomUUID(), type} : {id:crypto.randomUUID(), name, cal:0, protein:0, carbs:0, fat:0, type};
    setDayLog(p=>[...p,entry]);
  };

  const skipPlanned=(slotKey, name)=>{
    const type=slotKey.charAt(0).toUpperCase()+slotKey.slice(1);
    setDayLog(p=>[...p,{id:crypto.randomUUID(),name,cal:0,protein:0,carbs:0,fat:0,type,skipped:true}]);
  };

  const unskipPlanned=(mealId)=>{
    setDayLog(p=>p.filter(m=>m.id!==mealId));
  };

  return (
    <div style={{ padding:"0 0 80px", position:"relative" }}>

      {/* Day strip */}
      <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, overflowX:"auto", scrollbarWidth:"none" }}>
        {DAYS.map(d=>{
          const active=selectedDay===d, isToday=d===today;
          const hasLog=(weekLog[d]||[]).length>0;
          const hasPlan=Object.values(weekPlan?.[d]||{}).some(Boolean);
          return (
            <button key={d} onClick={()=>{setSelectedDay(d);setAddOpen(false);setEditMeal(null);}} style={{
              flexShrink:0, flex:1, minWidth:52, padding:"14px 0 12px",
              border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
              borderBottom:`2px solid ${active?t.accent:"transparent"}`, marginBottom:-1, textAlign:"center",
            }}>
              <div style={{ fontSize:12, letterSpacing:1, textTransform:"uppercase", color:active?t.accent:isToday?t.textMid:t.textDim, fontWeight:active?600:400 }}>{d}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:3, marginTop:5, height:6, alignItems:"center" }}>
                {hasLog&&<div style={{ width:5, height:5, borderRadius:"50%", background:active?t.accent:t.textMid }}/>}
                {hasPlan&&!hasLog&&<div style={{ width:5, height:5, borderRadius:"50%", border:`1.5px solid ${active?t.accent:t.textDim}` }}/>}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:"0 24px" }}>

        {/* Macro totals */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", borderBottom:`1px solid ${t.border}` }}>
          {[
            {l:"kcal", v:totals.cal,     p:plannedTotals.cal,     c:t.ring},
            {l:"pro",  v:totals.protein, p:plannedTotals.protein, c:t.protein},
            {l:"carb", v:totals.carbs,   p:plannedTotals.carbs,   c:t.carbs},
            {l:"fat",  v:totals.fat,     p:plannedTotals.fat,     c:t.fat},
          ].map((m,i)=>(
            <div key={m.l} style={{ padding:"16px 0", textAlign:"center", borderRight:i<3?`1px solid ${t.border}`:"none" }}>
              <div style={{ fontSize:22, fontWeight:200, letterSpacing:-0.5, fontFamily:"'Georgia','Times New Roman',serif", color:m.v>0?m.c:t.textDim }}>{m.v}</div>
              {hasPlanned&&m.p>0&&<div style={{ fontSize:11, color:t.textDim, marginTop:1, fontStyle:"italic" }}>/ {m.p}</div>}
              <Over t={t} style={{ marginTop:4 }}>{m.l}</Over>
            </div>
          ))}
        </div>

        {/* Slot-based meal list */}
        <div style={{ marginTop:8 }}>
          {["Breakfast","Lunch","Dinner","Snack"].map(slot=>{
            const slotKey=slot.toLowerCase();
            const planned=plannedSlots.find(s=>s.slot===slotKey)||null;
            // Meals explicitly logged to this slot + any fuzzy-matched meal from plan
            const planMatch=slotMatches[slotKey]||null;
            const explicitLogged=dayLog.filter(m=>(m.type||"Other")===slot&&!claimedIds.has(m.id));
            const allLogged=planMatch?[planMatch,...explicitLogged]:explicitLogged;

            if(!planned&&!allLogged.length) return null;

            const exactMatch=planMatch&&namesMatch(planMatch.name,planned?.name||'')&&normStr(planMatch.name)===normStr(planned?.name||'');

            return (
              <div key={slot}>
                <Over t={t} color={t.textDim} style={{ padding:"16px 0 6px", letterSpacing:2 }}>{slot}</Over>
                {allLogged.length>0 ? (
                  <>
                    {allLogged.map(m=>(
                      m.skipped
                        ? <SkippedMealRow key={m.id} t={t} name={m.name} onUndo={()=>unskipPlanned(m.id)}/>
                        : <LoggedMealRow key={m.id} t={t} meal={m} onEdit={()=>openEdit(m)} onDelete={()=>deleteMeal(m)}/>
                    ))}
                    {planned&&!exactMatch&&allLogged.some(m=>!m.skipped)&&(
                      <div style={{ padding:"5px 0 10px", fontSize:12, color:t.textDim, fontStyle:"italic" }}>
                        ↳ planned: {planned.name}{planned.meal?` · ${planned.meal.cal}cal`:""}
                      </div>
                    )}
                  </>
                ) : (
                  <ProjectedMealRow t={t} name={planned.name} meal={planned.meal}
                    onLog={()=>logPlanned(slotKey, planned.meal, planned.name)}
                    onSkip={()=>skipPlanned(slotKey, planned.name)}/>
                )}
              </div>
            );
          })}

          {/* Other / unslotted — exclude anything already claimed by a planned slot */}
          {(()=>{
            const other=dayLog.filter(m=>!["Breakfast","Lunch","Dinner","Snack"].includes(m.type)&&!claimedIds.has(m.id));
            if(!other.length) return null;
            return (
              <div>
                <Over t={t} color={t.textDim} style={{ padding:"16px 0 6px", letterSpacing:2 }}>Other</Over>
                {other.map(m=>(
                  <LoggedMealRow key={m.id} t={t} meal={m} onEdit={()=>openEdit(m)} onDelete={()=>deleteMeal(m)}/>
                ))}
              </div>
            );
          })()}

          {dayLog.length===0&&!hasPlanned&&(
            <div style={{ padding:"40px 0", color:t.textDim, fontSize:15, fontWeight:300, textAlign:"center" }}>
              Nothing logged yet — tap + to add a meal.
            </div>
          )}
        </div>

        {/* Edit sheet */}
        <AnimatePresence>
          {editMeal&&(
            <motion.div initial={{ y:40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:40, opacity:0 }}
              style={{ padding:"20px", background:t.elevated, borderRadius:16, marginBottom:24, boxShadow:t.shadow }}>
              <Over t={t} style={{ marginBottom:16, color:t.accent }}>Edit Meal</Over>
              <TxtInput t={t} placeholder="Meal name" value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} style={{ marginBottom:12 }}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                {[["cal","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"]].map(([k,ph])=>(
                  <TxtInput key={k} t={t} placeholder={ph} type="number" value={editForm[k]||""} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}/>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {SLOTS.map(s=>(
                  <button key={s} onClick={()=>setEditForm(p=>({...p,type:s}))} style={{
                    padding:"6px 10px", borderRadius:20, border:`1px solid ${editForm.type===s?t.accent:t.border}`,
                    background:editForm.type===s?`${t.accent}18`:t.elevated, color:editForm.type===s?t.accent:t.textDim,
                    fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <SolidBtn t={t} onClick={saveEdit} style={{ flex:2, textAlign:"center", padding:"9px 16px" }}>Save</SolidBtn>
                <GhostBtn t={t} onClick={()=>{deleteMeal(dayLog.find(m=>m.id===editMeal));setEditMeal(null);}} style={{ flex:1, textAlign:"center", padding:"9px 16px", color:t.over, borderColor:t.over }}>Delete</GhostBtn>
                <GhostBtn t={t} onClick={()=>setEditMeal(null)} style={{ flex:1, textAlign:"center", padding:"9px 16px" }}>Cancel</GhostBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add meal panel */}
        <AnimatePresence>
          {addOpen&&(
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
              style={{ paddingTop:16 }}>
              <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, marginBottom:20 }}>
                {["library","custom"].map(m=>(
                  <button key={m} onClick={()=>setMode(m)} style={{
                    flex:1, padding:"12px 0", border:"none", background:"transparent",
                    borderBottom:`2px solid ${mode===m?t.accent:"transparent"}`,
                    color:mode===m?t.text:t.textDim, fontSize:11, letterSpacing:3, textTransform:"uppercase",
                    cursor:"pointer", fontFamily:"inherit", fontWeight:mode===m?600:400, marginBottom:-1,
                  }}>{m==="library"?"Library":"Custom"}</button>
                ))}
              </div>
              {mode==="library"&&(
                <>
                  <TxtInput t={t} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search meals..." style={{ marginBottom:16 }}/>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {mealLibrary.filter(m=>m.name.toLowerCase().includes(search.toLowerCase())).map((meal,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:`1px solid ${t.border}` }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:300, color:t.text }}>{meal.name}</div>
                          <div style={{ fontSize:12, color:t.textDim, marginTop:3 }}>P{meal.protein} · C{meal.carbs} · F{meal.fat}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                          <div style={{ fontSize:15, fontWeight:200, color:t.textMid }}>{meal.cal}</div>
                          <button onClick={()=>setDayLog(p=>[...p,{...meal,id:crypto.randomUUID(),type:"Other"}])} style={{ width:26, height:26, borderRadius:"50%", background:"transparent", border:`1px solid ${t.accent}`, color:t.accent, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {mode==="custom"&&(
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <TxtInput t={t} placeholder="Meal name" value={custom.name} onChange={e=>setCustom(p=>({...p,name:e.target.value}))} style={{ marginBottom:8 }}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    {[["cal","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"]].map(([k,ph])=>(
                      <TxtInput key={k} t={t} placeholder={ph} type="number" value={custom[k]} onChange={e=>setCustom(p=>({...p,[k]:e.target.value}))}/>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                    {SLOTS.map(s=>(
                      <button key={s} onClick={()=>setCustom(p=>({...p,type:s}))} style={{
                        padding:"6px 10px", borderRadius:20, border:`1px solid ${custom.type===s?t.accent:t.border}`,
                        background:custom.type===s?`${t.accent}18`:t.elevated, color:custom.type===s?t.accent:t.textDim,
                        fontSize:11, letterSpacing:1, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                      }}>{s}</button>
                    ))}
                  </div>
                  <SolidBtn t={t} onClick={()=>{
                    if(!custom.name||!custom.cal)return;
                    setDayLog(p=>[...p,{id:crypto.randomUUID(),name:custom.name,cal:+custom.cal,protein:+(custom.protein||0),carbs:+(custom.carbs||0),fat:+(custom.fat||0),type:custom.type}]);
                    setCustom({name:"",cal:"",protein:"",carbs:"",fat:"",type:"Other"});
                    setAddOpen(false);
                  }} style={{ width:"100%", textAlign:"center" }}>Add to {selectedDay}</SolidBtn>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating add button */}
      <motion.button whileTap={{ scale:0.93 }} onClick={()=>{setAddOpen(p=>!p);setEditMeal(null);}} style={{
        position:"sticky", bottom:72, left:"50%", transform:"translateX(-50%)", display:"block",
        margin:"20px auto 0", padding:"12px 32px",
        background:addOpen?t.elevated:t.accent, color:addOpen?t.textDim:"#fff",
        border:`1px solid ${addOpen?t.border:t.accent}`, borderRadius:32,
        fontSize:13, letterSpacing:3, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
        boxShadow:t.shadow, transition:"all 0.2s", width:"fit-content",
      }}>
        {addOpen?"Close":"+ Add Meal"}
      </motion.button>

      <AnimatePresence>
        {undoItem&&<UndoToast t={t} item={undoItem} onUndo={undoDelete}/>}
      </AnimatePresence>
    </div>
  );
}
