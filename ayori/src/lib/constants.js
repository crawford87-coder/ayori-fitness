export const THEMES = {
  day: {
    name:"day", label:"Day",
    bg:        "#f2f1f8",
    surface:   "#eceaf5",
    elevated:  "#f8f7ff",
    border:    "rgba(100,80,180,0.10)",
    borderMid: "rgba(100,80,180,0.22)",
    text:      "#1e1b3a",
    textMid:   "#6b6488",
    textDim:   "#a09ab8",
    accent:    "#8b6fd4",
    accentB:   "#5b9bd4",
    accentC:   "#c47eb8",
    ring:      "#8b6fd4",
    protein:   "#8b6fd4",
    carbs:     "#5b9bd4",
    fat:       "#c47eb8",
    good:      "#5bb88a",
    warn:      "#c4944a",
    over:      "#c05868",
    shadow:    "8px 8px 20px rgba(100,80,180,0.18), -8px -8px 20px rgba(255,255,255,0.95)",
    shadowSm:  "4px 4px 12px rgba(100,80,180,0.14), -4px -4px 12px rgba(255,255,255,0.9)",
    shadowInset:"inset 4px 4px 12px rgba(100,80,180,0.18), inset -4px -4px 12px rgba(255,255,255,0.85)",
    bgGradient:"radial-gradient(ellipse at 30% 20%, #f8f7ff 0%, #f2f1f8 55%, #eae8f5 100%)",
  },
  night: {
    name:"night", label:"Night",
    bg:        "#1a1730",
    surface:   "#221f3a",
    elevated:  "#2a2648",
    border:    "rgba(180,160,255,0.10)",
    borderMid: "rgba(180,160,255,0.22)",
    text:      "#f0eeff",
    textMid:   "#9890c8",
    textDim:   "#605878",
    accent:    "#a88ee8",
    accentB:   "#6ea8e8",
    accentC:   "#d87eb8",
    ring:      "#a88ee8",
    protein:   "#a88ee8",
    carbs:     "#6ea8e8",
    fat:       "#d87eb8",
    good:      "#68c898",
    warn:      "#c8a060",
    over:      "#d06878",
    shadow:    "8px 8px 20px rgba(0,0,0,0.45), -6px -6px 16px rgba(80,70,140,0.14)",
    shadowSm:  "4px 4px 12px rgba(0,0,0,0.35), -3px -3px 10px rgba(80,70,140,0.12)",
    shadowInset:"inset 4px 4px 12px rgba(0,0,0,0.45), inset -4px -4px 12px rgba(80,70,140,0.14)",
    bgGradient:"radial-gradient(ellipse at 30% 20%, #2a2648 0%, #1a1730 55%, #100e24 100%)",
  }
};

export const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export const FULL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export const WORKOUT_TYPES = {
  PT:      { label:"PT Session",  intensity:"high",     calBonus:200, carbBonus:30 },
  PILATES: { label:"Pilates",     intensity:"moderate", calBonus:100, carbBonus:15 },
  PADEL:   { label:"Padel",       intensity:"moderate", calBonus:120, carbBonus:20 },
  SWIM:    { label:"Swimming",    intensity:"moderate", calBonus:130, carbBonus:20 },
  CARDIO:  { label:"Cardio",      intensity:"moderate", calBonus:150, carbBonus:25 },
  REST:    { label:"Rest",        intensity:"none",     calBonus:0,   carbBonus:0  },
};

export const DEFAULT_SCHEDULE = { Mon:"PT", Tue:"REST", Wed:"PT", Thu:"PILATES", Fri:"PT", Sat:"PILATES", Sun:"REST" };
export const BASE = { cal:1300, protein:120, carbs:90, fat:45 };
export const SOCIAL_DAYS = { Tue:"Lunch", Wed:"Date night", Fri:"Date night" };

export const HABITS = [
  { key:"noAlcohol", label:"No Alcohol",  dayCol:"#c8956a", nightCol:"#8870d0" },
  { key:"gym",       label:"Gym",         dayCol:"#a07855", nightCol:"#5878c8" },
  { key:"steps",     label:"10k Steps",   dayCol:"#887060", nightCol:"#8870d0" },
  { key:"swim",      label:"Swim",        dayCol:"#c8956a", nightCol:"#5878c8" },
  { key:"padel",     label:"Padel",       dayCol:"#a07855", nightCol:"#c06888" },
  { key:"pilates",   label:"Pilates",     dayCol:"#887060", nightCol:"#8870d0" },
];

export const DEFAULT_LIBRARY = [
  { name:"Greek Yogurt Protein Bowl",        cal:430, protein:40, carbs:42, fat:8  },
  { name:"Protein Smoothie",                 cal:430, protein:35, carbs:48, fat:9  },
  { name:"Scrambled Eggs + Rice Cakes",      cal:280, protein:22, carbs:24, fat:12 },
  { name:"Chicken Caesar Wrap",              cal:450, protein:38, carbs:32, fat:14 },
  { name:"Turkey Taco Bowl",                 cal:490, protein:40, carbs:45, fat:12 },
  { name:"Herby Couscous + Scallion Dress.", cal:420, protein:14, carbs:62, fat:14 },
  { name:"Mushroom Stuffed Peppers",         cal:480, protein:18, carbs:58, fat:16 },
  { name:"Burger Bowl + Roasted Potatoes",   cal:480, protein:36, carbs:38, fat:18 },
  { name:"Braised Fennel + White Beans",     cal:420, protein:18, carbs:52, fat:12 },
  { name:"Blistered Tomato Sweetcorn Pasta", cal:480, protein:16, carbs:72, fat:14 },
  { name:"Chilled Melon Soup + Eggs",        cal:380, protein:18, carbs:38, fat:14 },
  { name:"Edamame + Jerky",                  cal:140, protein:18, carbs:8,  fat:4  },
  { name:"Baby Carrots + Cottage Cheese",    cal:130, protein:14, carbs:12, fat:2  },
  { name:"Hard Boiled Eggs (x2)",            cal:140, protein:12, carbs:1,  fat:10 },
];

export const DAMAGE_CONTROL = [
  { name:"Greek Yogurt + Berries",    cal:180, protein:22, carbs:18, fat:2 },
  { name:"Grilled Chicken + Veg",     cal:240, protein:36, carbs:8,  fat:6 },
  { name:"Tuna + Rice Cakes",         cal:200, protein:28, carbs:16, fat:2 },
];

export const SLOTS = ["breakfast","lunch","dinner","snack"];
export const SLOT_LABELS = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snack:"Snack" };
