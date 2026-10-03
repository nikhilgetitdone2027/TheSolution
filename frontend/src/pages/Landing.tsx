import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedBackground } from "../components/layout/AnimatedBackground";

const FLOW = [
  ["01", "Waste sample", "Composition and process inputs"],
  ["02", "Chemical profile", "Materials, then calculated elements where valid"],
  ["03", "AI engine", "Several regression models, one selected by validation error"],
  ["04", "Prediction", "Oil, gas, char, and other products"],
  ["05", "Optimization", "Search inside the training range"],
  ["06", "Recovery decision", "A configuration to evaluate, with the evidence beside it"],
];

export function Landing() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % FLOW.length), 1800);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <AnimatedBackground />
      <div className="relative z-10">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 md:px-10">
        <div>
          <p className="font-serif text-lg">CHEM2ENERGY <span className="text-muted">AI</span></p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Waste and energy</p>
        </div>
        <Link className="border border-ink px-3 py-1.5 text-sm" to="/app">
          Enter
        </Link>
      </header>
      <main className="grid gap-10 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-16">
        <section>
          <p className="text-[11px] uppercase tracking-[0.18em] text-copper">Mixed plastic · Pyrolysis intelligence</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-tight md:text-6xl">
            Turn Waste Composition Into Recovery Decisions.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            CHEM2ENERGY AI uses chemical and process data to predict conversion outcomes, compare recovery pathways, and simulate better resource-recovery decisions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="bg-pine px-5 py-3 text-sm text-white" to="/app/samples">
              Analyze a Waste Stream
            </Link>
            <Link className="border border-ink px-5 py-3 text-sm" to="/app/judge">
              Explore Demo
            </Link>
          </div>
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            {["AI prediction", "Chemical intelligence", "What-if simulation", "Explainable decisions"].map((item) => (
              <li key={item} className="border-t border-line pt-2">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-xl font-serif text-xl leading-8">
            We don't just identify what the waste is. We predict what can happen to it — and help evaluate what should happen next.
          </p>
        </section>
        <section className="instrument border border-line p-4 md:p-6" aria-label="Analysis flow">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Decision path</p>
          <ol className="mt-4">
            {FLOW.map(([index, title, detail], position) => (
              <li key={index} className={`border-t border-line py-3 ${position === step || reduced ? "rail-live" : ""}`}>
                <div className="flex gap-4">
                  <span className="font-mono text-xs text-muted">{index}</span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted">{detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <section className="grid gap-6 border-t border-line px-5 py-10 md:grid-cols-3 md:px-10">
        <article>
          <h2 className="font-serif text-2xl">The problem</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Calling a stream “plastic waste” does not tell an operator which recovery route is worth evaluating. Composition and process conditions change the outcome.
          </p>
        </article>
        <article>
          <h2 className="font-serif text-2xl">What the model does</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            A regression model estimates pyrolysis product mass fractions. An optimizer searches only inside the range of the training data. An explanation layer quotes those results.
          </p>
        </article>
        <article>
          <h2 className="font-serif text-2xl">What it will not do</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            It does not read elemental composition from a photograph. It does not invent yields, prices, or emission savings when the data does not support them.
          </p>
        </article>
      </section>
      </div>
    </div>
  );
}
