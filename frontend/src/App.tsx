import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SaathiChat } from "./components/saathi/SaathiChat";
import { Shell } from "./components/Shell";
import { GuidedDemoProvider } from "./workflow/GuidedDemo";
import { JudgeTourProvider } from "./workflow/JudgeTourController";
import { Carbon } from "./pages/Carbon";
import { Chemical } from "./pages/Chemical";
import { Impact } from "./pages/Impact";
import { Judge } from "./pages/Judge";
import { Landing } from "./pages/Landing";
import { Optimize } from "./pages/Optimize";
import { Overview } from "./pages/Overview";
import { Pathways } from "./pages/Pathways";
import { Predictions } from "./pages/Predictions";
import { Reports } from "./pages/Reports";
import { Samples } from "./pages/Samples";
import { Settings } from "./pages/Settings";
import { Trust } from "./pages/Trust";
import { WhatIf } from "./pages/WhatIf";

function Pages() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="samples" element={<Samples />} />
        <Route path="chemical" element={<Chemical />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="pathways" element={<Pathways />} />
        <Route path="optimize" element={<Optimize />} />
        <Route path="simulate" element={<WhatIf />} />
        <Route path="carbon" element={<Carbon />} />
        <Route path="impact" element={<Impact />} />
        <Route path="reports" element={<Reports />} />
        <Route path="trust" element={<Trust />} />
        <Route path="judge" element={<Judge />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/app/*"
        element={
          <GuidedDemoProvider>
            <JudgeTourProvider>
              <Shell>
                <Pages />
                <SaathiChat />
              </Shell>
            </JudgeTourProvider>
          </GuidedDemoProvider>
        }
      />
    </Routes>
  );
}
