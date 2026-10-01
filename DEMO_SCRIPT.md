# Judge demo script

Three to five minutes. Click **Next**. The demo does not autoplay.

## Opening

“This is not a waste classifier. We are building a decision engine that asks what should happen to a chemically characterized waste stream.”

## Step 1 — Sample

Launch Judge Demo, then Next. Sample A loads from the illustrative catalog. Say that the composition was entered, not photographed.

## Step 2 — Composition

Chemical Intelligence shows the material balance. Element contributions are calculated from repeat units. The Other fraction stays uncharacterized.

## Step 3 — Analysis

Next runs validation, the selected model, pathway metrics, a bounded optimization, and a grounded explanation. Each line on the overview is a finished service call.

## Step 4 — Prediction

Oil, gas, char, and other products. The banner says these are model estimates on the illustrative dataset. If the selected model is not a random forest, say that ensemble spread is unavailable rather than reading out a confidence percentage.

## Step 5 — Pathways

Pyrolysis shows the prediction. Mechanical recycling and energy recovery show “Insufficient data” wherever a yield, price, or emission factor is absent. If sample D is loaded later, a Dulong heating value can appear because that blend has no Other fraction.

## Step 6 — Optimize

The search stays inside the training range printed on the page. The objective in the demo is predicted oil plus gas, labeled as a mass-fraction proxy, not megajoules.

## Step 7 — What-if

Next moves temperature inside the training range and waits for a new prediction. Before and after are both model outputs.

## Step 8 — Explain

The answer cites permutation importance and a one-at-a-time model response. It does not add a citation or a laboratory mechanism.

## Step 9 — Report

Generate the HTML report. Close on:

“CHEM2ENERGY converts waste composition into actionable recovery intelligence.”

## If a judge asks for the numbers’ origin

The training file is generated. The model, the split, and the metrics are real computations on that file. They are not experimental accuracy. Model Trust shows the three candidates and which one won.
