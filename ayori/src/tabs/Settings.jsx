import { useState } from "react";
import { supabase } from "../lib/supabase";
import { DAYS, WORKOUT_TYPES } from "../lib/constants";
import { Over, SolidBtn, GhostBtn } from "../components/ui";

const WORKOUT_KEYS = Object.keys(WORKOUT_TYPES);

const COMMON_TIMEZONES = [
  "UTC","Europe/London","Europe/Madrid","Europe/Paris","Europe/Berlin",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Australia/Sydney","Asia/Tokyo","Asia/Dubai",
];

const TABLES = ["meal_logs","habits","meal_library","week_plans","body_measurements","oura_readiness","coach_sessions","user_settings"];

async function exportData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const fetches = await Promise.all(TABLES.map(t => supabase.from(t).select("*").eq("user_id", user.id)));
  const payload = {
    exported_at: new Date().toISOString(),
    data: Object.fromEntries(TABLES.map((t, i) => [t, fetches[i].data || []])),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ayori-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings({ t, settings, setSettings, onBack }) {
  const [form, setForm] = useState({
    base_calories: settings.base_calories,
    base_protein:  settings.base_protein,
    base_carbs:    settings.base_carbs,
    base_fat:      settings.base_fat,
    units:         settings.units,
    timezone:      settings.timezone,
    schedule:      { ...settings.schedule },
  });
  const [saved, setSaved] = useState(false);

  const cycleWorkout = day => {
    const keys = WORKOUT_KEYS;
    const cur = form.schedule[day] || "REST";
    const next = keys[(keys.indexOf(cur) + 1) % keys.length];
    setForm(p => ({ ...p, schedule: { ...p.schedule, [day]: next } }));
  };

  const save = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding:"0 24px 80px" }}>
      {/* Header */}
      <div style={{ padding:"24px 0 28px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <Over t={t} style={{ marginBottom:8 }}>Preferences</Over>
          <div style={{ fontSize:32, fontWeight:200, letterSpacing:-1.5, color:t.text, fontFamily:"'Georgia','Times New Roman',serif" }}>Settings</div>
        </div>
        <GhostBtn t={t} onClick={onBack} style={{ padding:"9px 16px" }}>← Back</GhostBtn>
      </div>

      {/* Units */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:16 }}>Units</Over>
        <div style={{ display:"flex", gap:8 }}>
          {["metric","imperial"].map(u => {
            const active = form.units === u;
            return (
              <button key={u} onClick={() => setForm(p=>({...p,units:u}))} style={{
                flex:1, padding:"12px 0", border:`1px solid ${active?t.accent:t.border}`,
                borderRadius:12, background:active?`${t.accent}12`:t.elevated,
                color:active?t.accent:t.textDim, fontSize:11, letterSpacing:2,
                textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                fontWeight:active?600:400,
                boxShadow:active?`inset 2px 2px 8px ${t.accent}20`:t.shadowSm,
                transition:"all 0.15s",
              }}>{u}</button>
            );
          })}
        </div>
      </div>

      {/* Timezone */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:16 }}>Timezone</Over>
        <select value={form.timezone} onChange={e=>setForm(p=>({...p,timezone:e.target.value}))} style={{
          width:"100%", padding:"12px 0", background:"transparent",
          border:"none", borderBottom:`1px solid ${t.border}`,
          color:t.text, fontSize:14, fontFamily:"inherit", outline:"none", cursor:"pointer",
        }}>
          {COMMON_TIMEZONES.map(tz => (
            <option key={tz} value={tz} style={{ background:t.bg, color:t.text }}>{tz}</option>
          ))}
        </select>
        <div style={{ fontSize:10, color:t.textDim, marginTop:8, letterSpacing:0.5 }}>
          Device: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </div>
      </div>

      {/* Base targets */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:4 }}>Daily Base Targets</Over>
        <div style={{ fontSize:11, color:t.textDim, marginBottom:20, letterSpacing:0.5 }}>
          Workout bonuses are added on top of these.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {[
            ["base_calories","Calories"],
            ["base_protein","Protein (g)"],
            ["base_carbs","Carbs (g)"],
            ["base_fat","Fat (g)"],
          ].map(([key, label]) => (
            <div key={key}>
              <Over t={t} style={{ marginBottom:8 }}>{label}</Over>
              <input
                type="number"
                value={form[key]}
                onChange={e => setForm(p=>({...p,[key]:+e.target.value}))}
                style={{
                  width:"100%", padding:"8px 0", border:"none",
                  borderBottom:`1px solid ${t.border}`,
                  background:"transparent", color:t.text,
                  fontSize:20, fontFamily:"inherit", outline:"none",
                  fontWeight:200, letterSpacing:-0.5,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Workout schedule */}
      <div style={{ padding:"28px 0", borderBottom:`1px solid ${t.border}` }}>
        <Over t={t} style={{ marginBottom:4 }}>Weekly Schedule</Over>
        <div style={{ fontSize:11, color:t.textDim, marginBottom:20, letterSpacing:0.5 }}>
          Tap a day to cycle through workout types.
        </div>
        <div style={{ display:"flex", flexDirection:"column" }}>
          {DAYS.map(day => {
            const key = form.schedule[day] || "REST";
            const workout = WORKOUT_TYPES[key];
            return (
              <button key={day} onClick={() => cycleWorkout(day)} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"14px 0", background:"none", border:"none",
                borderBottom:`1px solid ${t.border}`, cursor:"pointer", fontFamily:"inherit",
              }}>
                <Over t={t} color={t.textMid}>{day}</Over>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:300, color:key==="REST"?t.textDim:t.text }}>{workout.label}</span>
                  <span style={{ fontSize:10, color:t.textDim }}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div style={{ paddingTop:28 }}>
        <SolidBtn t={t} onClick={save} color={saved?t.good:t.accent} style={{ width:"100%", textAlign:"center" }}>
          {saved ? "Saved ✓" : "Save Settings"}
        </SolidBtn>
      </div>

      {/* Export */}
      <div style={{ padding:"32px 0 0", borderTop:`1px solid ${t.border}`, marginTop:32 }}>
        <Over t={t} style={{ marginBottom:8 }}>Your Data</Over>
        <div style={{ fontSize:12, color:t.textDim, marginBottom:20, lineHeight:1.7 }}>
          Download a full JSON export of all your meals, habits, measurements, and coach history.
        </div>
        <GhostBtn t={t} onClick={exportData} style={{ width:"100%", textAlign:"center" }}>
          Download my data
        </GhostBtn>
      </div>

      {/* Sign out */}
      <div style={{ padding:"32px 0 0", borderTop:`1px solid ${t.border}`, marginTop:32 }}>
        <GhostBtn t={t} onClick={()=>supabase.auth.signOut()} style={{ width:"100%", textAlign:"center", color:t.over, borderColor:t.over }}>
          Sign Out
        </GhostBtn>
      </div>
    </div>
  );
}
