# Dataset

## What is in the repository

The project was started from an empty folder. No laboratory or plant dataset was provided.

`ml/data/demo_dataset.csv` is created by `app.simulator.generate_demo_frame` the first time the model is trained. Every row is tagged `Hackathon Demo Dataset — Illustrative`.

The product targets in that file are outputs of a documented response surface plus noise. They are not experimental measurements. Coefficients live in `ml/app/simulator.py` and are simulator parameters.

## What the simulator is for

It exists so the training, validation, inference, optimization, and explanation path can run on a real scikit-learn model during the hackathon. Metrics in Model Trust describe how well that model recovers the simulator. They are not laboratory accuracy.

## Replacing it

Keep the column names in `dataset_schema.md`, point training at the new file, and retrain:

```bash
cd ml
python -m app.train
```

If a column is absent, training omits it and the API reports that part of the model as disabled. Do not fill the gap with invented values.

Elemental composition for PE, PP, PET, PS, and PVC can be calculated from repeat-unit stoichiometry. The Other fraction has no assumed formula. Heating value is calculated with the Dulong equation only when elemental coverage is complete.

## Demo samples

Four input recipes ship in `ml/app/simulator.py` (`A` through `D`). They contain composition and process inputs only. Product yields shown in the interface are predictions from the trained model, not values stored on those recipes.
