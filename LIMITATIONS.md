# Limitations

- Model quality depends on the training data. The shipped training table is an illustrative simulator, because no experimental dataset was in the repository.
- Predictions are not laboratory measurements. The interface says “model estimate” or “demo prediction — illustrative dataset.”
- Extrapolation outside the training distribution is risky. Those points are labeled and are not returned as optimizer recommendations.
- Chemical composition must come from a file or from values that are entered. The software does not infer elemental composition from a photograph.
- Elemental masses for PE, PP, PET, PS, and PVC are stoichiometric calculations. The Other fraction has no assumed formula.
- A feedstock heating value is shown only when elemental coverage is complete, and only as a Dulong-formula estimate. It is not a bomb-calorimeter result and it is not recovered energy.
- Economic estimates are not shown. No prices are included. Optional weights, if you type them, are your weights.
- Carbon-fraction fields (biogenic, fossil, inert) are unavailable unless those columns are uploaded. Pathway carbon impacts are not calculated, because no emission factors are included.
- Mechanical recycling has no yield model in this build. The comparison says so instead of displaying a suitability score.
- The platform is a decision-support system. It is not a replacement for industrial engineering or laboratory validation.
- The language layer, when an API key is configured, is only allowed to rephrase the evidence packet. Without a key, explanations are assembled from the sample, the prediction, and the computed importance.
