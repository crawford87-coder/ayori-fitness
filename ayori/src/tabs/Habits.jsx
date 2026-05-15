import { motion, AnimatePresence } from "framer-motion";
import { DAYS, HABITS } from "../lib/constants";
import { BigNum, GlossySphere, Over } from "../components/ui";

export default function Habits({ t, weekHabits, setWeekHabits, today }) {
  const toggle=(day,key)=>{
    navigator.vibrate?.(1);
    setWeekHabits(p=>({...p,[day]:{...p[day],[key]:!p[day]?.[key]}}));
  };
  const getStreak=key=>{let s=0;for(let i=DAYS.indexOf(today);i>=0;i--){if(weekHabits[DAYS[i]]?.[key])s++;else break;}return s;};
  const todayHabits=weekHabits[today]||{};
  const total=Object.values(todayHabits).filter(Boolean).length;

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
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

      {/* Today habit toggles */}
      <div style={{ display:"flex", flexDirection:"column", marginBottom:40 }}>
        {HABITS.map(h=>{
          const done=todayHabits[h.key],streak=getStreak(h.key);
          const col=t.name==="day"?h.dayCol:h.nightCol;
          return (
            <motion.button key={h.key} onClick={()=>toggle(today,h.key)} whileTap={{ scale:0.97 }} style={{
              display:"flex", alignItems:"center", gap:16, background:"transparent",
              border:"none", borderBottom:`1px solid ${t.border}`,
              padding:"18px 0", cursor:"pointer", fontFamily:"inherit", textAlign:"left",
            }}>
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div key="filled" initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.6, opacity:0 }}
                    transition={{ type:"spring", stiffness:400, damping:22 }}>
                    <GlossySphere size={14} color={col} pulse />
                  </motion.div>
                ) : (
                  <motion.div key="outline" initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.6, opacity:0 }}
                    transition={{ type:"spring", stiffness:400, damping:22 }}
                    style={{ width:14, height:14, borderRadius:"50%", flexShrink:0, border:`2px solid ${col}60`, background:"transparent" }}/>
                )}
              </AnimatePresence>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:300, color:done?t.text:t.textMid }}>{h.label}</div>
                {streak>0&&<div style={{ fontSize:9, color:col, marginTop:4, letterSpacing:2, textTransform:"uppercase" }}>{streak} day streak</div>}
              </div>
              {done&&<motion.div initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} style={{ fontSize:9, color:col, letterSpacing:2, textTransform:"uppercase" }}>Done</motion.div>}
            </motion.button>
          );
        })}
      </div>

      {/* This Week grid */}
      <Over t={t} style={{ marginBottom:16 }}>This Week</Over>
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:340 }}>
          <div style={{ display:"grid", gridTemplateColumns:`90px repeat(${DAYS.length},1fr)`, borderBottom:`1px solid ${t.border}` }}>
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
                  return (
                    <motion.button key={d} onClick={()=>toggle(d,h.key)} whileTap={{ scale:0.85 }} style={{ padding:"14px 4px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <motion.div animate={{ background:done?col:`${col}00`, borderColor:done?col:`${col}80` }}
                        transition={{ type:"spring", stiffness:300, damping:20 }}
                        style={{ width:10, height:10, borderRadius:"50%", border:`2px solid ${done?col:`${col}60`}` }}/>
                    </motion.button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
