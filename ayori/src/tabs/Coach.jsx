import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { DAYS, WORKOUT_TYPES } from "../lib/constants";
import { callClaude, buildSystemPrompt, parseMeals, parseGrocery, parseWeek, parseLog, stripJson, estimateMacros, sumLog } from "../lib/helpers";
import { Over, Surface, SolidBtn, GhostBtn } from "../components/ui";

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

function EatingOut({ t, todayLog, setTodayLog, targets }) {
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
    <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 40px" }}>
      <div style={{ padding:"8px 0 24px", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ fontSize:28, fontWeight:200, letterSpacing:-1.5, color:t.text, lineHeight:1.2, fontFamily:"'Georgia','Times New Roman',serif", marginBottom:12 }}>Eating out?</div>
        <div style={{ fontSize:12, fontWeight:300, color:t.textMid, lineHeight:1.7 }}>Describe or photograph what you ate. Claude estimates the macros and logs it.</div>
      </div>

      {remaining<200&&<div style={{ padding:"12px 0", borderBottom:`1px solid ${t.border}`, fontSize:11, color:t.over, letterSpacing:0.5 }}>Only {remaining} kcal left today — damage control.</div>}

      <div style={{ padding:"20px 0", borderBottom:`1px solid ${t.border}` }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const url=ev.target.result;setImgPreview(url);setImgData(url.split(",")[1]);setImgType(f.type);};r.readAsDataURL(f);}} style={{ display:"none" }}/>
        <button onClick={()=>fileRef.current.click()} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:8, padding:"10px 16px", color:t.textDim, fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
          {imgPreview?"Photo ready — change":"+ Photo"}
        </button>
        {imgPreview&&<img src={imgPreview} alt="meal" style={{ width:"100%", borderRadius:8, marginBottom:16, maxHeight:160, objectFit:"cover" }}/>}
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe what you ate..." rows={3}
          style={{ width:"100%", padding:"12px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:13, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.6, fontWeight:300 }}/>
      </div>

      <div style={{ padding:"20px 0" }}>
        <SolidBtn t={t} onClick={async()=>{if(!desc&&!imgData)return;setLoading(true);setError(null);setResult(null);try{setResult(await estimateMacros(desc,imgData,imgType));}catch{setError("Couldn't estimate.");}setLoading(false);}} disabled={loading||(!desc&&!imgData)}>
          {loading?"Estimating...":"Estimate Macros"}
        </SolidBtn>
        {error&&<div style={{ marginTop:16, fontSize:11, color:t.over }}>{error}</div>}
      </div>

      {result&&(
        <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:20 }}>
          <div style={{ fontSize:18, fontWeight:300, color:t.text, marginBottom:4 }}>{result.name}</div>
          <div style={{ fontSize:11, color:t.textMid, marginBottom:20, lineHeight:1.6, fontStyle:"italic" }}>{result.note}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", marginBottom:20 }}>
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
          <SolidBtn t={t} onClick={()=>{setTodayLog(p=>[...p,{...result,id:crypto.randomUUID(),social:true}]);setResult(null);setDesc("");setImgPreview(null);setImgData(null);}}>
            Log This Meal
          </SolidBtn>
        </div>
      )}
    </div>
  );
}

export default function CoachScreen({ t, appState, mealLibrary, setMealLibrary, setWeekPlan, setWeekLog, setActiveTab, messages, setMessages, groceryList, setGroceryList, todayLog, setTodayLog, targets }) {
  const [view,setView]=useState("chat");
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [pendingMeals,setPendingMeals]=useState(null);
  const [pendingWeek,setPendingWeek]=useState(null);
  const [pendingLog,setPendingLog]=useState(null);
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
      if(log?.length) setPendingLog(log);
    } catch(err){setMessages(p=>[...p,{role:"assistant",content:`Error: ${err.message}`}]);}
    setLoading(false);
  };

  const confirmPlan=()=>{
    if(!pendingMeals)return;
    const ex=new Set(mealLibrary.map(m=>m.name.toLowerCase()));
    const newM=pendingMeals.filter(m=>!ex.has(m.name.toLowerCase()));
    setMealLibrary(p=>[...p,...newM]);
    if(pendingWeek) setWeekPlan(pendingWeek);
    setMessages(p=>[...p,{role:"assistant",content:`Plan confirmed. ${newM.length} meals added to your library. Head to Meals to see your schedule.`}]);
    setPendingMeals(null);setPendingWeek(null);
  };

  const confirmLog=()=>{
    if(!pendingLog)return;
    pendingLog.forEach(entry=>{
      const {day,...meal}=entry;
      if(day&&DAYS.includes(day)) setWeekLog(p=>({...p,[day]:[...(p[day]||[]),{...meal,id:meal.id||crypto.randomUUID()}]}));
    });
    const names=pendingLog.map(e=>e.name).join(", ");
    setMessages(p=>[...p,{role:"assistant",content:`Logged: ${names}`}]);
    setPendingLog(null);
  };

  const hasGrocery=Object.keys(groceryList).length>0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
        {[{k:"chat",l:"Plan"},{k:"list",l:`List${hasGrocery?" ·":""}`},{k:"out",l:"Eating Out"}].map(tab=>(
          <button key={tab.k} onClick={()=>setView(tab.k)} style={{
            flex:1, padding:"16px 0", border:"none", background:"transparent",
            borderBottom:`2px solid ${view===tab.k?t.accent:"transparent"}`,
            color:view===tab.k?t.text:t.textDim,
            fontSize:12, letterSpacing:3, textTransform:"uppercase",
            cursor:"pointer", fontFamily:"inherit", fontWeight:view===tab.k?600:400,
            marginBottom:-1, transition:"all 0.2s",
          }}>{tab.l}</button>
        ))}
      </div>

      {view==="out" ? <EatingOut t={t} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets}/> : view==="list" ? <GroceryList t={t} groceryList={groceryList}/> : (
        <>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"80%", padding:"12px 16px", fontSize:15, lineHeight:1.7,
                  fontWeight:300,
                  borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",
                  background:m.role==="user"?t.accent:t.elevated,
                  color:m.role==="user"?t.bg:t.text,
                }}>
                  {m.role==="user" ? m.content : (
                    <ReactMarkdown components={{
                      p:({children})=><p style={{margin:"0 0 8px",lineHeight:1.7}}>{children}</p>,
                      ul:({children})=><ul style={{margin:"0 0 8px",paddingLeft:18}}>{children}</ul>,
                      ol:({children})=><ol style={{margin:"0 0 8px",paddingLeft:18}}>{children}</ol>,
                      li:({children})=><li style={{marginBottom:4}}>{children}</li>,
                      strong:({children})=><strong style={{fontWeight:600}}>{children}</strong>,
                      h1:({children})=><div style={{fontSize:15,fontWeight:600,margin:"0 0 8px"}}>{children}</div>,
                      h2:({children})=><div style={{fontSize:14,fontWeight:600,margin:"0 0 6px"}}>{children}</div>,
                      h3:({children})=><div style={{fontSize:13,fontWeight:600,margin:"0 0 4px"}}>{children}</div>,
                    }}>{m.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{ display:"flex", gap:6, padding:"12px 4px" }}>
                {[0,1,2].map(i=><div key={i} style={{ width:4, height:4, borderRadius:"50%", background:t.textDim, animation:`pulse 1.2s ease ${i*0.2}s infinite` }}/>)}
              </div>
            )}
            {pendingLog&&(
              <Surface t={t} style={{ padding:"16px 20px" }}>
                <Over t={t} style={{ marginBottom:12, color:t.accent }}>Log {pendingLog.length} meal{pendingLog.length>1?"s":""}</Over>
                <div style={{ display:"flex", flexDirection:"column", gap:0, marginBottom:16 }}>
                  {pendingLog.map((e,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"8px 0", borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ display:"flex", gap:8, alignItems:"baseline" }}>
                        <Over t={t} color={t.textDim} style={{ width:28 }}>{e.day}</Over>
                        <span style={{ fontSize:15, fontWeight:300, color:t.text }}>{e.name}</span>
                      </div>
                      <span style={{ fontSize:13, color:t.textMid, flexShrink:0 }}>{e.cal}cal · P{e.protein}g</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <SolidBtn t={t} onClick={confirmLog} style={{ flex:2, textAlign:"center" }}>Log It</SolidBtn>
                  <GhostBtn t={t} onClick={()=>setPendingLog(null)} style={{ flex:1, textAlign:"center" }}>Cancel</GhostBtn>
                </div>
              </Surface>
            )}
            {pendingMeals&&(
              <Surface t={t} style={{ padding:"16px 20px" }}>
                <Over t={t} style={{ marginBottom:16, color:t.accent }}>
                  {pendingMeals.length} meals · {pendingWeek?"week plan ready":"no week schedule"}
                </Over>

                {pendingWeek ? (
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
              style={{ flex:1, padding:"10px 0", border:"none", borderBottom:`1px solid ${t.border}`, background:"transparent", color:t.text, fontSize:15, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.5, overflow:"hidden", fontWeight:300 }}/>
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
