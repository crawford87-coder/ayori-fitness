import { useState } from "react";
import { Over, TxtInput, SolidBtn } from "../components/ui";
import { kgToLbs, cmToIn } from "../lib/units";

function WeightChart({ measurements, color, t }) {
  if(measurements.length<2) return null;
  const wts=measurements.map(m=>+m.weight);
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

export default function Body({ t, measurements, setMeasurements, units="metric" }) {
  const imperial=units==="imperial";
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const yesterdayStr=yesterday.toISOString().split("T")[0];
  const todayStr=new Date().toISOString().split("T")[0];

  const [form,setForm]=useState({weight:"",waist:"",hips:"",chest:"",arms:"",date:todayStr});
  const [saved,setSaved]=useState(false);
  const [histOpen,setHistOpen]=useState(false);

  const wUnit=imperial?"lbs":"kg";
  const mUnit=imperial?"in":"cm";
  const dispW=v=>v?+(imperial?kgToLbs(+v):+v).toFixed(1):null;
  const dispM=v=>v?+(imperial?cmToIn(+v):+v).toFixed(1):null;

  const save=()=>{
    if(!form.weight)return;
    setMeasurements(p=>[...p,{...form,weight:+form.weight,waist:+form.waist||0,hips:+form.hips||0,chest:+form.chest||0,arms:+form.arms||0}]);
    setForm({weight:"",waist:"",hips:"",chest:"",arms:"",date:todayStr});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const latest=measurements[measurements.length-1];
  const prev=measurements[measurements.length-2];
  const diff=key=>(!latest||!prev)?null:+(latest[key]-prev[key]).toFixed(1);

  return (
    <div style={{ padding:"0 24px 48px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 20px", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:8 }}>Check-in</Over>
        <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>Body</div>
      </div>

      {/* Weight trend chart (above all else) */}
      {measurements.length>=2&&(
        <div style={{ padding:"24px 0", borderBottom:`1px solid ${t.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <Over t={t}>Weight Trend</Over>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
              <span style={{ fontSize:22, fontWeight:200, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>{dispW(latest?.weight)}</span>
              <span style={{ fontSize:10, color:t.textDim }}>{wUnit}</span>
              {diff("weight")!==null&&diff("weight")!==0&&(
                <span style={{ fontSize:10, color:diff("weight")<0?t.good:t.over }}>{diff("weight")>0?`+${diff("weight")}`:diff("weight")}</span>
              )}
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
            {[
              {label:"Weight",key:"weight",unit:wUnit,disp:dispW,invert:true},
              {label:"Waist", key:"waist", unit:mUnit,disp:dispM,invert:true},
              {label:"Hips",  key:"hips",  unit:mUnit,disp:dispM,invert:true},
              {label:"Chest", key:"chest", unit:mUnit,disp:dispM},
              {label:"Arms",  key:"arms",  unit:mUnit,disp:dispM},
            ].filter(m=>latest[m.key]).map(m=>{
              const d=diff(m.key),good=d===null?null:(m.invert?d<0:d>0);
              return (
                <div key={m.key} style={{ borderBottom:`1px solid ${t.border}`, paddingBottom:14 }}>
                  <Over t={t} style={{ marginBottom:6 }}>{m.label}</Over>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:24, fontWeight:200, color:t.text, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif" }}>{m.disp(latest[m.key])}</span>
                    <span style={{ fontSize:10, color:t.textDim }}>{m.unit}</span>
                    {d!==null&&d!==0&&<span style={{ fontSize:10, color:good?t.good:t.over }}>{d>0?`+${d}`:d}</span>}
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
        <TxtInput t={t} placeholder={`Weight (${wUnit})`} type="number" step="0.1" value={form.weight} onChange={e=>setForm(p=>({...p,weight:e.target.value}))} style={{ marginBottom:12 }}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:4 }}>
          {[["waist",`Waist (${mUnit})`],["hips",`Hips (${mUnit})`],["chest",`Chest (${mUnit})`],["arms",`Arms (${mUnit})`]].map(([k,ph])=>(
            <TxtInput key={k} t={t} placeholder={ph} type="number" step="0.1" value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>
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
                    <span style={{ color:t.text }}>{dispW(m.weight)}{wUnit}</span>
                    {m.waist?<span style={{ color:t.textDim }}>{dispM(m.waist)}{mUnit[0]}w</span>:null}
                    {m.hips?<span style={{ color:t.textDim }}>{dispM(m.hips)}{mUnit[0]}h</span>:null}
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
