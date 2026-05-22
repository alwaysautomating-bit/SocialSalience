// Types for Social Salience application

export interface SocialSignal {
  id: string;
  signal: string;          // fldpnrIJFTCikox3A
  connections?: string[];  // flduhkW2UNpKPbO8Z (linked record IDs)
  topic?: string;          // flduNi6ttv9SuK1ZT
  painPoint?: string;      // fldDWZAzsB1njgLHX
  sourceLink?: string;      // fldoO89AlVfKXNFul
  sourcePlatform?: string;  // fld8K6x20GEzXd09C
  languageUsed?: string;    // fldl3ZRXRzLdpjdu5
  dateCaptured?: string;    // fld2eAy6hqMhyiIFE
  signalStrength?: string | number; // fldPka3Ne2f5P9FsL
}

export interface SuggestedConnection {
  connection_name: string;
  matched_insight_title: string;
  connection_type: 'Validates' | 'Contradicts' | 'Extends' | 'Challenges' | 'Names';
  why_it_connects: string;
  gap_opportunity: string;
  suggested_angle: string;
  strength_score: number; // 1 to 5
  draft_brief: string;
}

export interface ApprovedConnection {
  id?: string;
  connectionName: string;
  externalSignal: string[]; // array of external signal record IDs
  whyItConnects: string;
  gapOpportunity: string;
  suggestedAngle: string;
  outputType: string; // 'LinkedIn Post' or other
  reviewStatus: 'Approved' | 'Rejected' | 'Pending';
  internalInsight: string;
  insightUrl?: string;
  strengthScore: number;
  createDraftBrief: string;
}

export interface Audience {
  id: string;
  name: string;
  description?: string;
  painPoints?: string;
  languageStyle?: string;
  cares?: string;
  resists?: string;
  exampleHooks?: string;
}

export interface GeneratedDraft {
  audience_id: string;
  audience_name: string;
  platform: string;
  hook: string;
  post_draft: string;
  cta: string;
  why_this_angle_works: string;
}

export const INTERNAL_INSIGHTS = [
  "AI suggests. Systems enforce. Humans approve.",
  "Proof before payment.",
  "The computer can execute nonsense just fine. Humans cannot collaborate inside nonsense for very long.",
  "Most software conventions are human coordination systems, not machine requirements.",
  "Yellow is a workspace, not a status.",
  "Enforcement should live in architecture, not buttons.",
  "Dashboards don’t create operational truth. Structured consequence layers do.",
  "Money does not move until identity is verified against the vendor record, not the invoice.",
  "Capture can be wide. Authority must be narrow.",
  "Most AI automation problems are actually decision-design problems.",
  "Agents should gather and sort, not decide.",
  "Tiny, constrained agents are safer and more useful than giant autonomous ones.",
  "The real product is often the connection layer, not the visible feature.",
  "Importance is subjective. Patterns are universal. Data is truth.",
  "Better systems let importance emerge from connection density and reuse.",
  "Salience is observed significance across inputs.",
  "Divergence is the moment an abstract idea becomes a concrete system, feature, or app.",
  "Emergence is where internal ideas collide with external conversation and become relevant in time.",
  "Signals are cheap. Connections are valuable.",
  "The most valuable ideas repeatedly reappear across domains, contexts, and time.",
  "Software should reduce cognitive burden, not create dashboard theater.",
  "Status updates are often performative. Audit trails and operational memory are more truthful.",
  "Operational truth should persist independently of presentation layers.",
  "Most businesses do not have a software problem. They have a structure, trust, and operational memory problem.",
  "The strongest systems do not force meaning onto data. They reveal the structures already emerging underneath it."
];
