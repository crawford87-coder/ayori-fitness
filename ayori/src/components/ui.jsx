import { motion } from "framer-motion";

export const Rule = ({ t }) => <div style={{ height:1, background:t.border, margin:"0" }}/>;

export const Over = ({ t, children, color, style={} }) => (
  <div style={{ fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:color||t.textDim, fontWeight:500, ...style }}>{children}</div>
);

export const BigNum = ({ t, value, color, size=52 }) => (
  <div style={{ fontSize:size, fontWeight:200, letterSpacing:-2, color:color||t.text, lineHeight:0.95, fontFamily:"'Georgia', 'Times New Roman', serif" }}>{value}</div>
);

export function Arc({ value, max, size=100, sw=5, color, bg, label, sub, t }) {
  const r=(size-sw)/2, circ=2*Math.PI*r, pct=Math.min(1,value/max), over=value>max;
  const col = over?"#c05868":color;
  const dimCol = t ? t.textDim : "rgba(150,140,180,0.5)";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0,
      borderRadius:"50%", boxShadow: t ? t.shadow : undefined }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg||"rgba(150,140,180,0.15)"} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:size>90?22:14, fontWeight:200, color:col, letterSpacing:-1, fontFamily:"'Georgia','Times New Roman',serif", lineHeight:1 }}>{value}</div>
        {sub&&<div style={{ fontSize:8, color:dimCol, letterSpacing:1, marginTop:3 }}>/{sub}</div>}
        {label&&<div style={{ fontSize:7, letterSpacing:2.5, textTransform:"uppercase", color:dimCol, marginTop:4 }}>{label}</div>}
      </div>
    </div>
  );
}

export function Bar({ value, target, color, t }) {
  const pct=Math.min(100,(value/target)*100), over=value>target;
  const trackColor = t ? (t.name==="day" ? "rgba(100,80,180,0.10)" : "rgba(180,160,255,0.08)") : "rgba(150,140,180,0.15)";
  return (
    <div style={{ height:5, borderRadius:99, background:trackColor, overflow:"hidden",
      boxShadow: t ? t.shadowInset : undefined }}>
      <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:over?"#c05868":color,
        transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
        boxShadow:`0 0 8px ${over?"#c05868":color}80` }}/>
    </div>
  );
}

export const GlossySphere = ({ size=24, color, pulse=false }) => (
  <motion.div
    animate={pulse ? { boxShadow: [
      `2px 3px 12px ${color}60, -1px -1px 4px rgba(255,255,255,0.7), inset 0 1px 3px rgba(255,255,255,0.6)`,
      `2px 3px 20px ${color}90, -1px -1px 4px rgba(255,255,255,0.8), inset 0 1px 3px rgba(255,255,255,0.7)`,
      `2px 3px 12px ${color}60, -1px -1px 4px rgba(255,255,255,0.7), inset 0 1px 3px rgba(255,255,255,0.6)`,
    ]} : {}}
    transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
    whileHover={{ scale: 1.12, boxShadow: `2px 3px 22px ${color}95, -1px -1px 6px rgba(255,255,255,0.9)` }}
    style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:`radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, ${color} 45%, ${color}cc 100%)`,
      boxShadow:`2px 3px 12px ${color}60, -1px -1px 4px rgba(255,255,255,0.7), inset 0 1px 3px rgba(255,255,255,0.6)`,
    }}
  />
);

const cardVariants = {
  hidden: { opacity:0, y:20 },
  visible: { opacity:1, y:0, transition:{ duration:0.45, ease:[0.4,0,0.2,1] } }
};

export const Card = ({ children, style={}, t }) => (
  <motion.div
    variants={cardVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once:true, margin:"-30px" }}
    style={{ background:t.elevated, borderRadius:20, boxShadow:t.shadow, ...style }}
  >
    {children}
  </motion.div>
);

export const Surface = ({ t, children, style={} }) => (
  <div style={{ background:t.elevated, borderRadius:20, padding:"20px",
    boxShadow:t.shadow, ...style }}>{children}</div>
);

export const GhostBtn = ({ t, children, onClick, accent, style={} }) => (
  <motion.button onClick={onClick} whileTap={{ scale:0.97 }}
    style={{
      padding:"11px 20px", borderRadius:40,
      border:`1px solid ${accent||t.borderMid}`,
      background:t.elevated, color:accent||t.textMid,
      fontSize:11, letterSpacing:2, textTransform:"uppercase",
      cursor:"pointer", fontFamily:"inherit", fontWeight:500,
      boxShadow:t.shadowSm,
      transition:"box-shadow 0.18s",
      ...style
    }}>{children}</motion.button>
);

export const SolidBtn = ({ t, children, onClick, disabled, color, style={} }) => {
  const c = color||t.accent;
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileTap={disabled ? {} : { scale:0.97, boxShadow:t.shadowInset }}
      whileHover={disabled ? {} : { scale:1.02 }}
      style={{
        padding:"13px 24px", borderRadius:40, border:"none",
        background:`radial-gradient(circle at 40% 35%, ${c}dd 0%, ${c} 60%, ${c}bb 100%)`,
        color:"#fff", fontSize:11, letterSpacing:2, textTransform:"uppercase",
        cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:600,
        opacity:disabled?0.35:1,
        boxShadow:disabled?"none":`4px 6px 16px ${c}55, -2px -2px 8px rgba(255,255,255,0.7), inset 0 1px 2px rgba(255,255,255,0.4)`,
        transition:"opacity 0.15s",
        ...style
      }}>{children}</motion.button>
  );
};

export const TxtInput = ({ t, style={}, ...props }) => (
  <input {...props} style={{
    width:"100%", padding:"13px 0", borderRadius:0,
    border:"none", borderBottom:`1px solid ${t.border}`,
    background:"transparent", color:t.text, fontSize:14,
    fontFamily:"inherit", outline:"none", boxSizing:"border-box",
    ...style
  }}/>
);

export function Shimmer({ t, height=16, width="100%", borderRadius=8, style={} }) {
  return (
    <div style={{
      height, width, borderRadius, background:`linear-gradient(90deg,${t.elevated} 25%,${t.surface} 50%,${t.elevated} 75%)`,
      backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite linear",
      ...style
    }}/>
  );
}
