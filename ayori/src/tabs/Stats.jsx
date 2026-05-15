import { DAYS, HABITS } from "../lib/constants";
import { sumLog, getTargets } from "../lib/helpers";
import { Over } from "../components/ui";

function Sparkline({ data, color, width=300, height=48 }) {
  if(data.length<2) return null;
  const min=Math.min(...data), max=Math.max(...data);
  const range=max-min||1;
  const pts=data.map((v,i)=>{
    const x=(i/(data.length-1))*width;
    const y=height-((v-min)/range)*(height-8)-4;
    return `${x},${y}`;
  }).join(" ");
  const lastX=(1-(1/(data.length)))*width+(width/(data.length));
  const lastY=height-((data[data.length-1]-min)/range)*(height-8)-4;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastX>width?width:lastX} cy={lastY} r={3} fill={color}/>
    </svg>
  );
}

function HitBar({ value, max, color, t }) {
  const pct=max>0?Math.round((value/max)*100):0;
  return (
    <div>
      <div style={{ height:4, background:t.elevated, borderRadius:4, overflow:"hidden", boxShadow:t.shadowInset }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:4, transition:"width 0.7s ease" }}/>
      </div>
      <div style={{ fontSize:9, color:t.textDim, marginTop:4, textAlign:"right", letterSpacing:1 }}>{pct}%</div>
    </div>
  );
}

export default function Progress({ t, weekLog, weekHabits, measurements, schedule, today, base }) {
  const weekStats = DAYS.map(d=>{
    const tots=sumLog(weekLog[d]||[]);
    const tgt=getTargets(schedule[d],null,false,base);
    return { day:d, ...tots, target:tgt.total, logged:(weekLog[d]||[]).length>0 };
  });
  const logged=weekStats.filter(d=>d.logged);
  const avgCal=logged.length?Math.round(logged.reduce((a,d)=>a+d.cal,0)/logged.length):0;
  const avgProt=logged.length?Math.round(logged.reduce((a,d)=>a+d.protein,0)/logged.length):0;
  const onTarget=logged.filter(d=>d.cal>=d.target*0.85&&d.cal<=d.target*1.1).length;
  const maxBar=Math.max(...weekStats.map(d=>Math.max(d.cal,d.target)),1);

  const habitStats=HABITS.map(h=>({...h,done:DAYS.filter(d=>weekHabits[d]?.[h.key]).length}));
  const habitScore=habitStats.reduce((a,h)=>a+h.done,0);

  const weightData=measurements.filter(m=>m.weight).map(m=>+m.weight);
  const latest=measurements[measurements.length-1];
  const prev=measurements[measurements.length-2];
  const weightDelta=latest&&prev?+(latest.weight-prev.weight).toFixed(1):null;

  const hasAnyData=logged.length>0||measurements.length>0||habitScore>0;

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 28px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:8 }}>This Week</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>Progress</div>
      </div>

      {/* Empty state */}
      {!hasAnyData&&(
        <div style={{ padding:"60px 0", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:16, opacity:0.2 }}>◎</div>
          <div style={{ fontSize:14, fontWeight:300, color:t.textDim, lineHeight:1.8, maxWidth:240, margin:"0 auto" }}>
            Start logging meals and habits to see your week at a glance.
          </div>
        </div>
      )}

      {/* Weight sparkline */}
      {weightData.length>=2&&(
        <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
            <Over t={t}>Weight Trend</Over>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontSize:20, fontWeight:200, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>{latest.weight}</span>
              <span style={{ fontSize:10, color:t.textDim }}>kg</span>
              {weightDelta!==null&&weightDelta!==0&&<span style={{ fontSize:11, color:weightDelta<0?t.good:t.over }}>{weightDelta>0?`+${weightDelta}`:weightDelta}</span>}
            </div>
          </div>
          <Sparkline data={weightData} color={t.accent} height={56}/>
        </div>
      )}

      {/* Calorie bar chart */}
      {hasAnyData&&(
        <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
            <Over t={t}>Daily Calories</Over>
            {logged.length>0&&<Over t={t} color={t.accent}>{avgCal} avg / {avgProt}g prot</Over>}
          </div>
          {logged.length>0&&(
            <div style={{ marginBottom:16 }}>
              <HitBar value={onTarget} max={logged.length} color={t.good} t={t}/>
              <div style={{ fontSize:10, color:t.textDim, letterSpacing:0.5 }}>{onTarget} of {logged.length} logged days on target</div>
            </div>
          )}
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
          <div style={{ fontSize:9, color:t.textDim, letterSpacing:1.5, marginTop:8 }}>— target line</div>
        </div>
      )}

      {/* Habit hit rates */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
          <Over t={t}>Habits This Week</Over>
          <Over t={t} color={t.accent}>{habitScore} / {HABITS.length*7}</Over>
        </div>
        {habitScore===0 ? (
          <div style={{ fontSize:12, color:t.textDim, lineHeight:1.8, padding:"8px 0" }}>No habits checked this week yet.</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {habitStats.map(h=>{
              const col=t.name==="day"?h.dayCol:h.nightCol;
              return (
                <div key={h.key}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <Over t={t}>{h.label}</Over>
                    <span style={{ fontSize:10, color:h.done>0?col:t.textDim, letterSpacing:0.5 }}>{h.done} / 7</span>
                  </div>
                  <HitBar value={h.done} max={7} color={col} t={t}/>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Body snapshot */}
      {latest ? (
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
      ) : (
        <div style={{ padding:"28px 0", textAlign:"center" }}>
          <div style={{ fontSize:12, color:t.textDim, lineHeight:1.8 }}>No measurements logged yet.<br/>Head to Body to record your first entry.</div>
        </div>
      )}
    </div>
  );
}
