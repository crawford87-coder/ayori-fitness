import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase, dbLoad, dbSaveWeekLog, dbSaveHabits, dbSaveLibrary, dbSaveWeekPlan, dbSaveMeasurements, dbSaveReadiness, dbLoadMessages, dbSaveMessages, dbLoadSettings, dbSaveSettings } from "./lib/supabase";
import { weekDatesInTz, weekKeyInTz, dayIndexInTz } from "./lib/dates";
import { THEMES, DAYS, DEFAULT_LIBRARY, DEFAULT_SCHEDULE, BASE, SOCIAL_DAYS } from "./lib/constants";
import { getTargets } from "./lib/helpers";
import Auth from "./Auth";
import Today from "./tabs/Today";
import Coach from "./tabs/Coach";
import Meals from "./tabs/Meals";
import Habits from "./tabs/Habits";
import Body from "./tabs/Body";
import Stats from "./tabs/Stats";
import Settings from "./tabs/Settings";
import { Over } from "./components/ui";

const DEFAULT_SETTINGS = {
  timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  units:         "metric",
  base_calories: BASE.cal,
  base_protein:  BASE.protein,
  base_carbs:    BASE.carbs,
  base_fat:      BASE.fat,
  schedule:      DEFAULT_SCHEDULE,
};

export default function App() {
  const [theme,setTheme]=useState(()=>new Date().getHours()>=18?"night":"day");
  const [activeTab,setActiveTab]=useState("dashboard");
  const [isDesktop,setIsDesktop]=useState(()=>window.matchMedia("(min-width:1024px)").matches);
  useEffect(()=>{const mq=window.matchMedia("(min-width:1024px)");const h=e=>setIsDesktop(e.matches);mq.addEventListener("change",h);return()=>mq.removeEventListener("change",h);},[]);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [readiness,setReadiness]=useState(null);
  const [weekLog,setWeekLog]=useState(Object.fromEntries(DAYS.map(d=>[d,[]])));
  const [weekHabits,setWeekHabits]=useState(Object.fromEntries(DAYS.map(d=>[d,{}])));
  const [measurements,setMeasurements]=useState([]);
  const [mealLibrary,setMealLibrary]=useState(DEFAULT_LIBRARY);
  const [weekPlan,setWeekPlan]=useState(Object.fromEntries(DAYS.map(d=>[d,{breakfast:null,lunch:null,dinner:null,snack:null}])));
  const [coachMessages,setCoachMessages]=useState([{role:"assistant",content:"What are we working with this week? Tell me what's in your fridge, recipes to test, social plans."}]);
  const [groceryList,setGroceryList]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 800], [0, -120]);

  // All date values derived from the user's saved timezone — update automatically when tz changes
  const tz           = settings.timezone;
  const weekDates    = useMemo(() => weekDatesInTz(tz), [tz]);
  const weekKey      = useMemo(() => weekKeyInTz(tz),   [tz]);
  const adjustedIndex= useMemo(() => dayIndexInTz(tz),  [tz]);
  const today        = DAYS[adjustedIndex];

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
        // Load settings first so we know the user's timezone before fetching week data
        const savedSettings = await dbLoadSettings(user.id);
        const resolvedTz = savedSettings?.timezone || DEFAULT_SETTINGS.timezone;
        if(savedSettings) setSettings({
          timezone:      savedSettings.timezone,
          units:         savedSettings.units,
          base_calories: savedSettings.base_calories,
          base_protein:  savedSettings.base_protein,
          base_carbs:    savedSettings.base_carbs,
          base_fat:      savedSettings.base_fat,
          schedule:      savedSettings.schedule,
        });

        // Now load week data using the correct timezone
        const data = await dbLoad(user.id, resolvedTz);
        setWeekLog(data.weekLog);
        setWeekHabits(data.weekHabits);
        if(data.mealLibrary.length) setMealLibrary(data.mealLibrary);
        setWeekPlan(data.weekPlan);
        setMeasurements(data.measurements);
        if(data.readiness!==null) setReadiness(data.readiness);
        setLoaded(true); // only set on success — prevents saves firing with empty state

        const wKey = weekKeyInTz(resolvedTz);
        dbLoadMessages(user.id, wKey).then(msgs=>{if(msgs?.length)setCoachMessages(msgs);});
      } catch(e){
        console.error('Load error:',e);
        // do not set loaded=true — app stays on splash until next retry
      }
    })();
  },[user]);

  useEffect(()=>{ if(loaded&&user) dbSaveWeekLog(user.id,weekLog,weekDates); },[weekLog,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveHabits(user.id,weekHabits,weekDates); },[weekHabits,weekDates,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveMeasurements(user.id,measurements); },[measurements,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveLibrary(user.id,mealLibrary); },[mealLibrary,loaded]);
  useEffect(()=>{ if(loaded&&user&&readiness!==null) dbSaveReadiness(user.id,readiness,weekDates[today]); },[readiness,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveWeekPlan(user.id,weekPlan,weekKey); },[weekPlan,loaded]);
  useEffect(()=>{ if(loaded&&user&&coachMessages.length>1) dbSaveMessages(user.id,weekKey,coachMessages); },[coachMessages,loaded]);
  useEffect(()=>{ if(loaded&&user) dbSaveSettings(user.id,settings); },[settings,loaded]);

  const t=THEMES[theme];
  const schedule=settings.schedule;
  const base={ cal:settings.base_calories, protein:settings.base_protein, carbs:settings.base_carbs, fat:settings.base_fat };
  const todayLog=weekLog[today]||[];
  const setTodayLog=fn=>setWeekLog(p=>({...p,[today]:typeof fn==="function"?fn(p[today]):fn}));
  const isSocialNight=!!SOCIAL_DAYS[today]&&SOCIAL_DAYS[today].includes("night");
  const targets=getTargets(schedule[today],readiness,isSocialNight,base);
  const socialFlag=SOCIAL_DAYS[today]||null;
  const appState={today,schedule,readiness,weekLog,mealLibrary,measurements,weekPlan};

  const tabs=[
    {key:"dashboard",label:"Today"},
    {key:"coach",    label:"Coach"},
    {key:"log",      label:"Meals"},
    {key:"habits",   label:"Habits"},
    {key:"body",     label:"Body"},
    {key:"progress", label:"Stats"},
  ];

  if(authLoading||(user&&!loaded)) return (
    <div style={{ background:THEMES[theme].bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Over t={THEMES[theme]}>Ayori</Over>
    </div>
  );

  if(!user) return <Auth />;

  if(activeTab==="settings") return (
    <div style={{ fontFamily:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", minHeight:"100vh", maxWidth:480, margin:"0 auto", color:t.text, background:t.bg, position:"relative" }}>
      <style>{`*{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}input::placeholder{color:${t.textDim};}::-webkit-scrollbar{display:none;}`}</style>
      <motion.div style={{ position:"fixed", inset:0, background:t.bgGradient, zIndex:0, pointerEvents:"none" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        <Settings t={t} settings={settings} setSettings={setSettings} onBack={()=>setActiveTab("dashboard")}/>
      </div>
    </div>
  );

  const globalStyles=`
    @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
    input::placeholder,textarea::placeholder{color:${t.textDim};}
    input[type=date]{color-scheme:${t.name==="day"?"light":"dark"};}
    ::-webkit-scrollbar{display:none;}
  `;

  const headerJsx=(
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 16px", borderBottom:`1px solid ${t.border}`, backdropFilter:"blur(12px)", background:`${t.bg}cc`, position:"sticky", top:0, zIndex:5 }}>
      <div style={{ fontSize:11, letterSpacing:4, textTransform:"uppercase", color:t.accent, fontWeight:600 }}>Ayori</div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <motion.button whileTap={{ scale:0.93 }} onClick={()=>setActiveTab("settings")} style={{ background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", color:t.textDim, fontSize:16, padding:"4px 8px", minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center" }}>⚙</motion.button>
        <motion.button whileTap={{ scale:0.93 }} onClick={()=>setTheme(theme==="day"?"night":"day")} style={{ background:t.elevated, border:`1px solid ${t.border}`, borderRadius:20, padding:"7px 14px", cursor:"pointer", fontFamily:"inherit", color:t.textDim, fontSize:8, letterSpacing:3, textTransform:"uppercase", boxShadow:t.shadowSm, minHeight:36 }}>{t.label}</motion.button>
      </div>
    </div>
  );

  const bottomNavJsx=(
    <div style={{ background:t.bg, borderTop:`1px solid ${t.border}`, display:"flex", backdropFilter:"blur(12px)" }}>
      {tabs.map(tab=>{
        const active=activeTab===tab.key;
        return (
          <motion.button key={tab.key} whileTap={{ scale:0.92 }} onClick={()=>setActiveTab(tab.key)} style={{
            flex:1, padding:"15px 0 13px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
            color:active?t.accent:t.textDim, minHeight:44,
            fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontWeight:active?700:400,
            borderTop:`2px solid ${active?t.accent:"transparent"}`,
            marginTop:-1, transition:"color 0.15s",
          }}>{tab.label}</motion.button>
        );
      })}
    </div>
  );

  if(isDesktop) return (
    <div style={{ fontFamily:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", minHeight:"100vh", color:t.text, background:t.bg, display:"grid", gridTemplateColumns:"480px 1fr", position:"relative" }}>
      <style>{globalStyles}</style>
      <motion.div style={{ y:bgY, position:"fixed", inset:"-30% 0 0 0", background:t.bgGradient, zIndex:0, pointerEvents:"none" }}/>

      {/* Left: always Today */}
      <div style={{ borderRight:`1px solid ${t.border}`, overflowY:"auto", height:"100vh", position:"sticky", top:0, zIndex:1 }}>
        {headerJsx}
        <Today t={t} today={today} dayIdx={adjustedIndex} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets} readiness={readiness} setReadiness={setReadiness} schedule={schedule} weekHabits={weekHabits} setActiveTab={setActiveTab} socialFlag={socialFlag} mealLibrary={mealLibrary}/>
      </div>

      {/* Right: nav + active tab */}
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", position:"relative", zIndex:1 }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, background:`${t.bg}cc`, backdropFilter:"blur(12px)" }}>
            {tabs.filter(tab=>tab.key!=="dashboard").map(tab=>{
              const active=activeTab===tab.key||(tab.key==="coach"&&activeTab==="dashboard");
              return (
                <motion.button key={tab.key} whileTap={{ scale:0.93 }} onClick={()=>setActiveTab(tab.key)} style={{
                  padding:"18px 24px", border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
                  borderBottom:`2px solid ${active?t.accent:"transparent"}`, marginBottom:-1,
                  color:active?t.accent:t.textDim, fontSize:9, letterSpacing:2, textTransform:"uppercase",
                  fontWeight:active?700:400, transition:"all 0.15s", minHeight:44,
                }}>{tab.label}</motion.button>
              );
            })}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {(activeTab==="coach"||activeTab==="dashboard")&&<Coach t={t} appState={appState} mealLibrary={mealLibrary} setMealLibrary={setMealLibrary} setWeekPlan={setWeekPlan} setWeekLog={setWeekLog} setActiveTab={setActiveTab} messages={coachMessages} setMessages={setCoachMessages} groceryList={groceryList} setGroceryList={setGroceryList} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets}/>}
          {activeTab==="log"      &&<Meals t={t} weekLog={weekLog} setWeekLog={setWeekLog} today={today} schedule={schedule} readiness={readiness} mealLibrary={mealLibrary} base={base}/>}
          {activeTab==="progress" &&<Stats t={t} weekLog={weekLog} weekHabits={weekHabits} measurements={measurements} schedule={schedule} today={today} base={base}/>}
          {activeTab==="habits"   &&<Habits t={t} weekHabits={weekHabits} setWeekHabits={setWeekHabits} today={today}/>}
          {activeTab==="body"     &&<Body t={t} measurements={measurements} setMeasurements={setMeasurements} units={settings.units}/>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", minHeight:"100vh", maxWidth:480, margin:"0 auto", paddingBottom:60, color:t.text, position:"relative", overflow:"hidden" }}>
      <style>{globalStyles}</style>
      <motion.div style={{ y:bgY, position:"fixed", inset:"-30% 0 0 0", background:t.bgGradient, zIndex:0, pointerEvents:"none" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        {headerJsx}
        {activeTab==="dashboard"&&<Today t={t} today={today} dayIdx={adjustedIndex} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets} readiness={readiness} setReadiness={setReadiness} schedule={schedule} weekHabits={weekHabits} setActiveTab={setActiveTab} socialFlag={socialFlag} mealLibrary={mealLibrary}/>}
        {activeTab==="coach"    &&<Coach t={t} appState={appState} mealLibrary={mealLibrary} setMealLibrary={setMealLibrary} setWeekPlan={setWeekPlan} setWeekLog={setWeekLog} setActiveTab={setActiveTab} messages={coachMessages} setMessages={setCoachMessages} groceryList={groceryList} setGroceryList={setGroceryList} todayLog={todayLog} setTodayLog={setTodayLog} targets={targets}/>}
        {activeTab==="log"      &&<Meals t={t} weekLog={weekLog} setWeekLog={setWeekLog} today={today} schedule={schedule} readiness={readiness} mealLibrary={mealLibrary} base={base}/>}
        {activeTab==="progress" &&<Stats t={t} weekLog={weekLog} weekHabits={weekHabits} measurements={measurements} schedule={schedule} today={today} base={base}/>}
        {activeTab==="habits"   &&<Habits t={t} weekHabits={weekHabits} setWeekHabits={setWeekHabits} today={today}/>}
        {activeTab==="body"     &&<Body t={t} measurements={measurements} setMeasurements={setMeasurements} units={settings.units}/>}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, zIndex:10 }}>
          {bottomNavJsx}
        </div>
      </div>
    </div>
  );
}
