export type Sample = {
  id: string;
  name: string;
  category: string;
  sourceLabel: string;
  origin: "demo" | "upload" | "manual";
  createdAt: string;
  inputs: Record<string, number | string | null>;
  validation: Validation | null;
  prediction: Prediction | null;
  pathways: PathwayComparison | null;
  flows: MassFlows | null;
  optimization: Optimization | null;
  explanation: Explanation | null;
  scenarios: Scenario[];
  reportHtml: string | null;
  intelligence?: ScientificIntelligence | null;
};

export type Validation = {
  prediction_allowed: boolean;
  blocking_reasons: string[];
  quality_score: number;
  source_label: string;
  category: string;
  parsed: Record<string, number | null>;
  detected: {
    required_present: number;
    required_total: number;
    invalid_values: number;
    optional_missing: string[];
    extrapolation: string[];
  };
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
  model_features: string[];
};

export type PredictionOutput = {
  key: string;
  label: string;
  value: number;
  unit: string;
  kind: string;
};

export type Prediction = {
  available: boolean;
  reason?: string;
  kind?: string;
  disclaimer?: string;
  illustrative?: boolean;
  model?: string;
  outputs?: PredictionOutput[];
  output_map?: Record<string, number>;
  ensemble_spread?: Record<string, { label: string; std_percentage_points: number; note: string }> | null;
  extrapolation?: Array<{ feature: string; label: string; message: string }>;
  validation?: Validation;
};

export type Metric = {
  name: string;
  available: boolean;
  reason?: string;
  kind?: string;
  value?: number;
  unit?: string;
  values?: unknown;
  equation?: string;
  source?: string;
  formula?: string;
  notes?: Array<string | null>;
};

export type Pathway = {
  id: string;
  name: string;
  summary: string;
  metrics: Metric[];
  assumptions: string[];
  model_source: string;
  data_requirements: string[];
  limitations: string[];
};

export type PathwayComparison = {
  elemental: ElementalProfile;
  heating_value: HeatingValue;
  context: Array<{ topic: string; detail: string }>;
  pathways: Pathway[];
  intelligence?: ScientificIntelligence | null;
};

export type ElementalProfile = {
  calculated: {
    basis: string;
    method: string;
    label: string;
    elements_wt_pct: Record<string, number>;
    identified_mass_pct: number;
    uncharacterized_mass_pct: number;
    note: string;
  };
  uploaded_elements: Record<string, { value: number; kind: string }>;
  carbon_fractions: Record<string, { label: string; value: number; kind: string }>;
  carbon_fraction_status: string;
};

export type HeatingValue = {
  available: boolean;
  reason?: string;
  value_mj_per_kg?: number;
  kind?: string;
  method?: string;
  equation?: string;
  source?: string;
  basis?: string;
  sulfur_assumption?: string;
  chlorine_note?: string;
};

export type MassFlows = {
  available: boolean;
  reason?: string;
  feed_rate_kg_h?: number;
  flows?: Array<{ key: string; label: string; kg_per_h: number; kind: string; formula: string }>;
  disclaimer?: string;
};

export type Optimization = {
  available: boolean;
  objective?: string;
  objective_id?: string;
  proxy?: string;
  proxy_note?: string;
  reason?: string;
  evaluated?: number;
  boundary?: {
    source: string;
    note: string;
    ranges: Record<string, { min: number; max: number; unit: string; label: string }>;
  };
  best?: {
    configuration: Record<string, number>;
    score: number;
    score_unit: string;
    prediction: Prediction;
  };
  current?: {
    inside_boundary: boolean;
    score: number | null;
    configuration: Record<string, number | null>;
    prediction: Prediction;
  };
  top?: Array<{ configuration: Record<string, number>; score: number; outputs: Record<string, number> }>;
  decision?: {
    available: boolean;
    pathway_under_study: string;
    statement: string;
    configuration: Record<string, number>;
    objective: string;
    proxy: string;
    score: number;
    model: string;
    evidence: string[];
    limitations: string[];
  };
};

export type Scenario = {
  name: string;
  configuration?: Record<string, unknown>;
  outputs?: Record<string, number> | null;
  kind?: string;
};

export type Explanation = {
  answer: { answer: string; grounded?: boolean; model?: string; importance_method?: string };
  importance?: ImportanceRow[];
  local_effects?: LocalEffect[];
  interpreter?: string;
  model?: string;
  dataset_label?: string;
};

export type ImportanceRow = {
  feature: string;
  label: string;
  unit: string;
  group: string;
  mean_mae_increase: number;
  std_mae_increase: number;
};

export type LocalEffect = {
  feature: string;
  label: string;
  unit: string;
  from: number;
  to: number;
  output_delta_percentage_points: Record<string, number>;
  kind: string;
};

export type ModelMeta = {
  dataset: { id: string; label: string; nature: string; rows: number; complete_rows: number; disclaimer: string };
  features: string[];
  omitted_features: Array<{ feature: string; reason: string }>;
  targets: string[];
  split: {
    strategy: string;
    test_size: number;
    n_train: number;
    n_validation_holdout: number;
    cv_folds: number;
  };
  candidates: Array<{ model: string; mae: number; rmse: number; r2: number }>;
  selected: { model: string; reason: string };
  holdout_metrics: {
    mae: number;
    rmse: number;
    r2: number;
    per_target: Record<string, { label: string; mae: number; rmse: number; r2: number }>;
  };
  feature_importance: { method: string; label: string; scoring: string; rows: ImportanceRow[] };
  optimization_boundary: {
    source: string;
    note: string;
    ranges: Record<string, { min: number; max: number; unit: string; label: string }>;
  };
  feature_ranges: Record<string, { min: number; max: number; unit: string; label: string }>;
  supports_ensemble_spread: boolean;
  postprocess: string;
  intended_use: string;
  non_intended_use: string;
};

export type Stage = {
  id: string;
  label: string;
  status: "running" | "complete" | "skipped";
  detail?: string;
  payload?: {
    validation?: Validation;
    prediction?: Prediction;
    importance?: ImportanceRow[];
    optimization?: Optimization;
  };
};

export type Simulation = {
  before: Prediction;
  after: Prediction;
  before_flows: MassFlows;
  after_flows: MassFlows;
};

export type Profile = {
  validation: Validation;
  elemental: ElementalProfile;
  heating_value: HeatingValue;
  intelligence?: ScientificIntelligence | null;
};

export type ScientificIntelligence = {
  contamination: {
    dechlorination: {
      pvc_pct: number;
      feed_mass_kg: number;
      pvc_mass_kg: number;
      hcl_yield_kg: number;
      caoh2_sorbent_req_kg: number;
      safety_factor: number;
      risk_level: "HIGH" | "NORMAL";
      alert: "ACID_GAS_CORROSION_RISK" | "NORMAL_OPERATION";
      recommendation: string;
      neutralization_reaction: string;
      stoichiometric_basis: string;
    };
    sublimation: {
      pet_pct: number;
      risk_level: "HIGH" | "LOW";
      alert: "SOLID_DEPOSITION_RISK" | "MINIMAL_SUBLIMATION_RISK";
      detail: string;
      mitigation: string;
    };
    synergy: {
      classification: "HIGH_SYNERGY" | "NEUTRAL" | "ANTAGONISTIC";
      polyolefin_pct: number;
      ps_pct: number;
      synergy_score: number;
      mechanism: string;
    };
    hcl_corrosion_risk: boolean;
    caoh2_daily_kg: number;
  };
  thermodynamics: {
    elemental_blend: { C: number; H: number; O: number; Cl: number };
    feedstock_hhv: { hhv_mj_kg: number; formula: string; method: string };
    autarky: {
      feed_mass_kg: number;
      temperature_c: number;
      gas_mass_kg: number;
      oil_mass_kg: number;
      e_gas_recovered_mj: number;
      e_oil_recovered_mj: number;
      q_total_thermal_demand_mj: number;
      parasitic_elec_mj: number;
      thermal_autarky_pct: number;
      autarky_ratio: number;
      net_energy_ratio_ner: number;
      self_sustained: boolean;
      assessment: string;
      thermal_breakdown: {
        q_sensible_mj: number;
        q_reaction_mj: number;
        q_casing_loss_mj: number;
        q_total_thermal_mj: number;
        cp_kj_kg_k: number;
        delta_h_rxn_kj_kg: number;
        loss_factor_pct: number;
      };
    };
  };
  oil_quality: {
    oil_elemental: { C_oil_wt: number; H_oil_wt: number; O_oil_wt: number; Cl_oil_wt: number };
    hc_ratio: {
      hc_atomic_ratio: number;
      classification: string;
      color_badge: "emerald" | "amber" | "rose";
      c_oil_wt: number;
      h_oil_wt: number;
    };
    pona: {
      paraffins_pct: number;
      olefins_pct: number;
      aromatics_pct: number;
      naphthenes_oxygenates_pct: number;
      pona_sum_pct: number;
      dominant_fraction: string;
    };
    refinery_verdict: {
      route_id: "steam_cracker" | "hydroprocessing" | "industrial_fuel_oil";
      verdict: string;
      tier: string;
      hydrotreatment_mandatory: boolean;
    };
  };
  lca: {
    basis: string;
    plant_daily_tpd: number;
    carbon_fraction_used: number;
    pathways: Array<{
      id: "landfill" | "incineration" | "pyrolysis";
      name: string;
      gross_carbon_emissions_ton_co2e?: number;
      grid_displacement_credit_ton_co2e?: number;
      process_footprint_ton_co2e?: number;
      naphtha_displacement_credit_ton_co2e?: number;
      net_carbon_emissions_ton_co2e: number;
      net_carbon_kg_per_kg: number;
      energy_gain_mj: number;
      circular_polymer_yield_pct: number;
      badge: string;
      advantages?: string[];
      disadvantages?: string[];
    }>;
    net_carbon_avoided_vs_incineration_ton_per_ton: number;
    net_carbon_avoided_daily_ton_co2e: number;
    methodology: string;
  };
};
