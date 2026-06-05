import { useState } from "react";
import { Over, TxtInput, SolidBtn } from "../components/ui";
import { kgToLbs, lbsToKg, cmToIn, inToCm } from "../lib/units";

const MEASURE_FIELDS = [
  { key:"ribcage",  label:"Ribcage"  },
  { key:"bust",     label:"Bust"     },
  { key:"waist",    label:"Waist"    },
  { key:"hipbones", label:"Hipbones" },
  { key:"thighs",   label:"Thighs"  },
];

const EMPTY_FORM = { weight:"", ribcage:"", bust:"", waist:"", hipbones:"", thighs:"" };

function WeightChart({ measurements, color, t }) {
  if(measurements.length<2) return null;
  const wts=measurements.map(m=>kgToLbs(+m.weight));
  const mn=Math.min(...wts), mx=Math.max(...wts), range=mx-mn||1;
  const W=300, H=64;
  const pts=wts.map((v,i)=>{
    const x=(i/(wts.length-1))*W;
    const y=H-((v-mn)/range)*(H-10)-5;
    return `${x},${y}`;
  }).join(" ");
  const lastX=(1/(wts.length))*W*(wts.length-1);
  const lastY=H-((wts[wts.length-1]-mn)/range)*(H-10)-5;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display:"block", marginTop:12 }}>
      <defs>
        <linearGradient id="wgt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${lastX},${H}`} fill="url(#wgt)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastX} cy={lastY} r={3} fill={color}/>
    </svg>
  );
}

export default function Body({ t, measurements, setMeasurements }) {
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const yesterdayStr=yesterday.toISOString().split("T")[0];
  const todayStr=new Date().toISOString().split("T")[0];

  const [form,setForm]=useState({...EMPTY_FORM,date:todayStr});
  const [weightUnit,setWeightUnit]=useState("lbs");
  const [measureUnit,setMeasureUnit]=useState("cm");
  const [saved,setSaved]=useState(false);
  const [histOpen,setHistOpen]=useState(false);

  const dispW=kg=>kg?kgToLbs(+kg):null;
  const diff=key=>(!measurements.length||measurements.length<2)?null:+(measurements[measurements.length-1][key]-measurements[measurements.length-2][key]).toFixed(1);

  const save=()=>{
    if(!form.weight)return;
    const weightKg=weightUnit==="lbs"?lbsToKg(+form.weight):+form.weight;
    const toCm=v=>v?(measureUnit==="in"?inToCm(+v):+v):0;
    setMeasurements(p=>[...p,{
      ...form,
      date:form.date,
      weight:weightKg,
      ribcage:toCm(form.ribcage),
      bust:toCm(form.bust),
      waist:toCm(form.waist),
      hipbones:toCm(form.hipbones),
      thighs:toCm(form.thighs),
    }]);
    setForm({...EMPTY_FORM,date:todayStr});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const latest=measurements[measurements.length-1];

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 20px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:8 }}>Check-in</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>Body</div>
      </div>

      {/* Weight trend chart */}
      {measurements.length>=2&&(
        <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <Over t={t}>Weight Trend</Over>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
              <span style={{ fontSize:22, fontWeight:200, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>{dispW(latest?.weight)}</span>
              <span style={{ fontSize:10, color:t.textDim }}>lbs</span>
              {diff("weight")!==null&&diff("weight")!==0&&(()=>{
                const d=+kgToLbs(diff("weight")).toFixed(1);
                return <span style={{ fontSize:10, color:d<0?t.good:t.over }}>{d>0?`+${d}`:d}</span>;
              })()}
            </div>
          </div>
          <WeightChart measurements={measurements} color={t.accent} t={t}/>
        </div>
      )}

      {/* Latest stats */}
      {latest&&(
        <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
          <Over t={t} style={{ marginBottom:20 }}>Latest · {latest.date}</Over>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {latest.weight&&(()=>{
              const d=diff("weight"),dlbs=d!==null?+kgToLbs(d).toFixed(1):null;
              return (
                <div style={{ borderBottom:`1px solid ${t.border}`, paddingBottom:14 }}>
                  <Over t={t} style={{ marginBottom:6 }}>Weight</Over>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:24, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{dispW(latest.weight)}</span>
                    <span style={{ fontSize:10, color:t.textDim }}>lbs</span>
                    {dlbs!==null&&dlbs!==0&&<span style={{ fontSize:10, color:dlbs<0?t.good:t.over }}>{dlbs>0?`+${dlbs}`:dlbs}</span>}
                  </div>
                </div>
              );
            })()}
            {MEASURE_FIELDS.filter(f=>latest[f.key]).map(f=>{
              const d=diff(f.key);
              return (
                <div key={f.key} style={{ borderBottom:`1px solid ${t.border}`, paddingBottom:14 }}>
                  <Over t={t} style={{ marginBottom:6 }}>{f.label}</Over>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:24, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{latest[f.key]}</span>
                    <span style={{ fontSize:10, color:t.textDim }}>cm</span>
                    {d!==null&&d!==0&&<span style={{ fontSize:10, color:t.textDim }}>{d>0?`+${d}`:d}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log form */}
      <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:16 }}>Log Check-In</Over>

        {/* Date picker */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button onClick={()=>setForm(p=>({...p,date:todayStr}))} style={{
            padding:"6px 14px", borderRadius:20, border:`1px solid ${form.date===todayStr?t.accent:t.border}`,
            background:form.date===todayStr?`${t.accent}18`:t.elevated, color:form.date===todayStr?t.accent:t.textDim,
            fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
          }}>Today</button>
          <button onClick={()=>setForm(p=>({...p,date:yesterdayStr}))} style={{
            padding:"6px 14px", borderRadius:20, border:`1px solid ${form.date===yesterdayStr?t.accent:t.border}`,
            background:form.date===yesterdayStr?`${t.accent}18`:t.elevated, color:form.date===yesterdayStr?t.accent:t.textDim,
            fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
          }}>Yesterday</button>
          <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
            style={{ flex:1, padding:"6px 8px", border:`1px solid ${t.border}`, borderRadius:8, background:t.elevated, color:t.text, fontSize:11, fontFamily:"inherit", outline:"none" }}/>
        </div>

        {/* Weight with unit toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
          <TxtInput t={t} placeholder={`Weight (${weightUnit})`} type="number" step="0.1" value={form.weight} onChange={e=>setForm(p=>({...p,weight:e.target.value}))} style={{ flex:1, marginBottom:0 }}/>
          <div style={{ display:"flex", borderRadius:20, overflow:"hidden", border:`1px solid ${t.border}`, flexShrink:0 }}>
            {["lbs","kg"].map(u=>(
              <button key={u} onClick={()=>setWeightUnit(u)} style={{
                padding:"8px 14px", border:"none", background:weightUnit===u?t.accent:t.elevated,
                color:weightUnit===u?"#fff":t.textDim, fontSize:10, letterSpacing:1.5,
                textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}>{u}</button>
            ))}
          </div>
        </div>

        {/* Body measurements with unit toggle */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <Over t={t}>Measurements</Over>
          <div style={{ display:"flex", borderRadius:20, overflow:"hidden", border:`1px solid ${t.border}` }}>
            {["cm","in"].map(u=>(
              <button key={u} onClick={()=>setMeasureUnit(u)} style={{
                padding:"6px 12px", border:"none", background:measureUnit===u?t.accent:t.elevated,
                color:measureUnit===u?"#fff":t.textDim, fontSize:10, letterSpacing:1.5,
                textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}>{u}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {MEASURE_FIELDS.map(f=>(
            <TxtInput key={f.key} t={t} placeholder={`${f.label} (${measureUnit})`} type="number" step="0.1" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
          ))}
        </div>

        <SolidBtn t={t} onClick={save} color={saved?t.good:t.accent} style={{ marginTop:20, width:"100%", textAlign:"center" }}>
          {saved?"Saved ✓":"Save Check-In"}
        </SolidBtn>
      </div>

      {/* Collapsible history */}
      {measurements.length>0&&(
        <div style={{ paddingTop:24 }}>
          <button onClick={()=>setHistOpen(p=>!p)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", padding:"0 0 16px" }}>
            <Over t={t}>History ({measurements.length})</Over>
            <span style={{ fontSize:14, color:t.textDim, lineHeight:1 }}>{histOpen?"−":"+"}</span>
          </button>
          {histOpen&&(
            <div style={{ display:"flex", flexDirection:"column" }}>
              {[...measurements].reverse().map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${t.border}` }}>
                  <Over t={t}>{m.date}</Over>
                  <div style={{ display:"flex", gap:12, fontSize:12, fontWeight:300 }}>
                    <span style={{ color:t.text }}>{dispW(m.weight)}lbs</span>
                    {m.waist?<span style={{ color:t.textDim }}>{m.waist}w</span>:null}
                    {m.hipbones?<span style={{ color:t.textDim }}>{m.hipbones}h</span>:null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
