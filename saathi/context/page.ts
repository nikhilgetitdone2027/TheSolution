import type { PageId } from "../schemas/types.js";

const PAGE_SENSE: Record<PageId, string> = {
  overview: "The user is on the decision overview.",
  samples: "The user is choosing a waste sample.",
  chemical: "The user is inspecting chemical composition.",
  predictions: "The user is reading the model prediction.",
  pathways: "The user is comparing recovery pathways.",
  optimize: "The user is reviewing the optimization result.",
  what_if_lab: "The user is modifying process parameters.",
  carbon: "The user is inspecting carbon information.",
  impact: "The user is reviewing impact estimates.",
  reports: "The user is looking at the report.",
  trust: "The user is investigating model reliability.",
  judge: "The user is in the judge walkthrough.",
  settings: "The user is in settings.",
  unknown: "The current page is not identified.",
};

export function pageSense(page: PageId): string {
  return PAGE_SENSE[page];
}
