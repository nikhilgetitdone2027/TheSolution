export interface IntentResult {
  matched: boolean;
  intent: "set_temperature" | "run_analysis" | "download_report" | "open_what_if" | "chemical_question" | "none";
  value?: number;
  questionType?: "hcl_risk" | "energy_positive" | "refinery_oil";
  feedback: {
    en: string;
    hi: string;
    hinglish: string;
  };
  warning?: string;
}

export function detectVoiceIntent(
  text: string,
  tempBoundary: { min: number; max: number } = { min: 400, max: 700 }
): IntentResult {
  const clean = text.toLowerCase().trim();

  // 1. SET TEMPERATURE INTENT
  // Matches: "set temperature to 520", "temperature 520 degree karo", "temp 480 karo", "520 degree celsius"
  const tempRegexes = [
    /(?:set\s+)?(?:temp(?:erature)?|taapmaan)\s+(?:to\s+)?(\d+(?:\.\d+)?)/i,
    /(?:temperature|temp|taapmaan)\s+(\d+(?:\.\d+)?)\s*(?:degree|celsius|°c|karo|set)?/i,
    /(\d{3}(?:\.\d+)?)\s*(?:degree|celsius|°c)/i,
  ];

  for (const rx of tempRegexes) {
    const match = clean.match(rx);
    if (match && match[1]) {
      const rawVal = parseFloat(match[1]);
      if (!isNaN(rawVal) && rawVal >= 100) {
        // Enforce safety training boundary check
        let finalVal = rawVal;
        let warning: string | undefined = undefined;

        if (rawVal < tempBoundary.min) {
          finalVal = tempBoundary.min;
          warning = `Temperature ${rawVal}°C is below the model training bound (${tempBoundary.min}°C). Capped to ${tempBoundary.min}°C for scientific validity.`;
        } else if (rawVal > tempBoundary.max) {
          finalVal = tempBoundary.max;
          warning = `Temperature ${rawVal}°C exceeds the model training bound (${tempBoundary.max}°C). Capped to ${tempBoundary.max}°C for safety.`;
        }

        const fb = warning
          ? {
              en: `${warning} Updating simulation.`,
              hi: `Taapmaan training boundary (${tempBoundary.min}-${tempBoundary.max}°C) ke anusar ${finalVal}°C set kiya gaya hai.`,
              hinglish: `Temperature bounds ke hisaab se ${finalVal}°C set kar diya hai aur simulation update ho raha hai.`,
            }
          : {
              en: `Setting pyrolysis temperature to ${finalVal}°C and updating simulation.`,
              hi: `Pyrolysis taapmaan ${finalVal}°C set kar diya gaya hai aur simulation update ho raha hai.`,
              hinglish: `Temperature ${finalVal}°C set kar diya hai aur simulation refresh ho raha hai.`,
            };

        return {
          matched: true,
          intent: "set_temperature",
          value: finalVal,
          feedback: fb,
          warning,
        };
      }
    }
  }

  // 2. RUN ANALYSIS INTENT
  // Matches: "analyze sample", "run analysis", "analysis start karo", "sample analyze karo"
  if (
    clean.includes("analyze sample") ||
    clean.includes("run analysis") ||
    clean.includes("start analysis") ||
    clean.includes("analysis start") ||
    clean.includes("analyze karo") ||
    clean.includes("analysis chalao") ||
    clean.includes("analysis karo") ||
    clean.includes("predict yield")
  ) {
    return {
      matched: true,
      intent: "run_analysis",
      feedback: {
        en: "Executing end-to-end ML prediction on the active waste sample.",
        hi: "Active waste sample par ML prediction shuru kar rahe hain.",
        hinglish: "Sample par ML analysis start kar diya hai, predictions calculate ho rahe hain.",
      },
    };
  }

  // 3. DOWNLOAD REPORT INTENT
  // Matches: "download report", "report banao", "generate report", "report download karo"
  if (
    clean.includes("download report") ||
    clean.includes("generate report") ||
    clean.includes("report banao") ||
    clean.includes("report download") ||
    clean.includes("make report") ||
    clean.includes("export report")
  ) {
    return {
      matched: true,
      intent: "download_report",
      feedback: {
        en: "Compiling full techno-economic recovery intelligence report for download.",
        hi: "Complete recovery intelligence report compile karke taiyaar ki ja rahi hai.",
        hinglish: "Techno-economic recovery report generate kar rahe hain download ke liye.",
      },
    };
  }

  // 4. OPEN WHAT-IF LAB
  if (
    clean.includes("what if") ||
    clean.includes("simulation lab") ||
    clean.includes("simulate karo") ||
    clean.includes("open simulation")
  ) {
    return {
      matched: true,
      intent: "open_what_if",
      feedback: {
        en: "Opening the 3D Pyrolysis What-If Simulation Lab.",
        hi: "3D Pyrolysis What-If Simulation Lab khol rahe hain.",
        hinglish: "What-If Simulation Lab open kar rahe hain.",
      },
    };
  }

  // 5. CHEMICAL DEEP QUESTIONS
  // HCl corrosion risk
  if (
    clean.includes("hcl") ||
    clean.includes("corrosion") ||
    clean.includes("sorbent") ||
    clean.includes("lime") ||
    clean.includes("acid gas")
  ) {
    return {
      matched: true,
      intent: "chemical_question",
      questionType: "hcl_risk",
      feedback: {
        en: "PVC dehydrochlorinates stoichiometrically (36.46/62.50 ratio), releasing ~0.58 kg HCl per kg PVC. To neutralize this and prevent severe chloride stress corrosion, hydrated lime Ca(OH)₂ is dosed at a 1.20 safety factor. For PVC > 0.5%, a two-stage thermal treatment with 300°C isothermal pre-dechlorination is mandatory prior to main pyrolysis.",
        hi: "PVC dehydrochlorination se ~0.58 kg HCl prati kg PVC release hota hai. Is acid gas corrosion ko neutralize karne ke liye Ca(OH)₂ sorbent 1.20 safety factor par lagta hai. Agar PVC 0.5% se zyada hai to 300°C par two-stage pre-dechlorination zaroori hai.",
        hinglish: "PVC se stoichiometrically ~0.58 kg HCl per kg PVC release hota hai. Severe chloride corrosion rokne ke liye Ca(OH)₂ lime bed 1.20 safety margin par size kiya jata hai. PVC > 0.5% hone par 300°C par two-stage pre-dechlorination mandatory hai.",
      },
    };
  }

  // Energy positive / Thermal Autarky
  if (
    clean.includes("energy positive") ||
    clean.includes("thermal autarky") ||
    clean.includes("autarky") ||
    clean.includes("self sustained") ||
    clean.includes("parasitic heat") ||
    clean.includes("ner")
  ) {
    return {
      matched: true,
      intent: "chemical_question",
      questionType: "energy_positive",
      feedback: {
        en: "Yes, the process achieves up to 100% Thermal Autarky with a Net Energy Ratio (NER) > 10. Non-condensable syngas (LHV 32 MJ/kg) generated during cracking exceeds the reactor parasitic duty (sensible heat at cp 2.1 kJ/kg-K + endothermic reaction heat of 1050 kJ/kg + 15% casing loss), allowing self-sustained operation without auxiliary natural gas.",
        hi: "Haan, yeh process 100% Thermal Autarky achieve karta hai jiska Net Energy Ratio (NER) 10 se adhik hai. Cracking ke dauraan bana non-condensable syngas (LHV 32 MJ/kg) reactor ki total thermal heat duty ko poori tarah offset karta hai, jisse bahar se natural gas ki zaroorat nahi padti.",
        hinglish: "Haan, process 100% Thermally Autarkic hai aur Net Energy Ratio (NER) > 10 hai. Non-condensable syngas (LHV 32 MJ/kg) reactor ki sensible heat aur 1050 kJ/kg cracking demand ko fully cover karta hai, jisse plant bina external fuel ke self-sustained chalta hai.",
      },
    };
  }

  // Refinery oil quality / H/C ratio
  if (
    clean.includes("refinery") ||
    clean.includes("steam cracker") ||
    clean.includes("hydrotreat") ||
    clean.includes("h/c") ||
    clean.includes("pona") ||
    clean.includes("crude")
  ) {
    return {
      matched: true,
      intent: "chemical_question",
      questionType: "refinery_oil",
      feedback: {
        en: "Suitability depends on the effective H/C atomic ratio. Polyolefin-rich feedstocks yield an H/C ≥ 1.85 (high aliphatic paraffin/olefin cut) suitable for steam cracker blending up to 10% without hydrotreatment. Mixed or polystyrene-rich streams (H/C < 1.85) require hydroprocessing (dewaxing and dearomatization) to meet EN 590 transportation diesel specifications.",
        hi: "Refinery suitability effective H/C atomic ratio par nirbhar karti hai. Agar polyolefin zyada hai to H/C ≥ 1.85 hota hai jo bina hydrotreatment ke 10% tak steam cracker blending ke yogy hai. PS ya mixed feed mein hydroprocessing mandatory hai taaki EN 590 diesel compliance mil sake.",
        hinglish: "Refinery entry H/C atomic ratio par depend karti hai. High PE/PP blend par H/C ≥ 1.85 milta hai jo direct steam cracker blending ke liye suitable hai bina hydrotreating ke. Agar aromatics ya contaminants zyada hain to EN 590 diesel specs ke liye hydroprocessing zaroori hogi.",
      },
    };
  }

  return {
    matched: false,
    intent: "none",
    feedback: { en: "", hi: "", hinglish: "" },
  };
}
