export type UserRole = 'investigator' | 'reviewer';

export interface Bank {
  id: string;
  code: string;
  name: string;
  is_participating: boolean;
  created_at: string;
}

export type AccountType = 'SAVINGS' | 'CURRENT' | 'MERCHANT' | 'WALLET';

export interface Account {
  id: string;
  pseudo_id: string;
  bank_id: string;
  bank_code?: string;
  bank_name?: string;
  account_type: AccountType;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export type TransactionStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'CANCELLED' | 'REVERSED';
export type PaymentChannel = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'INTERNAL' | 'ATM' | 'MERCHANT_POS' | 'WALLET';

export interface Transaction {
  id: string;
  transaction_ref: string;
  sender_account_id: string;
  receiver_account_id: string;
  sender_pseudo_id?: string;
  receiver_pseudo_id?: string;
  sender_bank_code?: string;
  receiver_bank_code?: string;
  sender_bank_name?: string;
  receiver_bank_name?: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: TransactionStatus;
  channel: PaymentChannel;
  payment_reference?: string;
  description?: string;
  is_reversal: boolean;
  reversal_of_id?: string;
  ingested_at: string;
}

export type CaseStatus = 'OPEN' | 'TRACING' | 'TRACED' | 'CLOSED' | 'RETRACTED';

export interface Origin {
  id: string;
  origin_ref: string;
  case_id: string;
  seed_transaction_id: string;
  origin_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface Case {
  id: string;
  case_ref: string;
  title: string;
  description?: string;
  status: CaseStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  origins: Origin[];
  trace_count: number;
}

export type LotStatus = 'ACTIVE' | 'SPLIT' | 'CONSUMED' | 'REVERSED' | 'RETRACTED';

export interface FundLot {
  id: string;
  lot_ref: string;
  origin_id: string;
  parent_lot_id?: string;
  current_account_id: string;
  current_account_pseudo_id?: string;
  current_account_bank?: string;
  attributed_amount: number;
  remaining_amount: number;
  status: LotStatus;
  source_transaction_id?: string;
  hop_count: number;
  created_at: string;
}

export type AssessmentCategory =
  | 'LIKELY_MULE'
  | 'LEGITIMATE_COUNTERPARTY'
  | 'UNRESOLVED'
  | 'MERCHANT'
  | 'SEED_ACCOUNT';

export interface AccountAssessment {
  id: string;
  trace_run_id: string;
  account_id: string;
  account_pseudo_id?: string;
  bank_code?: string;
  bank_name?: string;
  account_type?: string;
  category: AssessmentCategory;
  confidence_score: number;
  behavioral_score: number;
  temporal_score: number;
  graph_score: number;
  fund_score: number;
  relationship_score: number;
  evidence?: any;
  attributed_amount: number;
  attributed_fraction: number;
  patterns_detected?: string[];
  created_at: string;
}

export type EndpointCategory =
  | 'ATM_WITHDRAWAL'
  | 'MERCHANT_PAYMENT'
  | 'WALLET_TRANSFER'
  | 'EXTERNAL_BANK'
  | 'CROSS_BORDER'
  | 'RETAINED_BALANCE'
  | 'NO_FURTHER_RECORD';

export interface EndpointObservation {
  id: string;
  trace_run_id: string;
  lot_id: string;
  account_id: string;
  account_pseudo_id?: string;
  bank_name?: string;
  category: EndpointCategory;
  attributed_amount: number;
  last_transaction_id?: string;
  last_transaction_ref?: string;
  reason: string;
  created_at: string;
}

export interface GraphNodeData {
  id: string;
  label: string;
  pseudo_id: string;
  account_id: string;
  bank_code: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
  assessment_category: AssessmentCategory;
  confidence_score: number;
  attributed_amount: number;
  is_seed: boolean;
  is_endpoint: boolean;
  endpoint_type?: string;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  transaction_id: string;
  transaction_ref: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: string;
  channel: string;
  attributed_amount: number;
  is_reversal: boolean;
}

export interface GraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  summary: {
    trace_run_id: string;
    origin_ref: string;
    status: string;
    allocation_policy: string;
    total_attributed: number;
    discovered_accounts: number;
    endpoints_count: number;
    cycles_detected: number;
    reconciliation: ReconciliationSummary;
  };
}

export interface ReconciliationSummary {
  origin_ref?: string;
  origin_amount: number;
  terminal_offramps?: number;
  retained_balance?: number;
  total_endpoints: number;
  total_reversed: number;
  unresolved_active?: number;
  total_accounted?: number;
  total_allocated?: number;
  total_retained?: number;
  total_residual?: number;
  is_balanced: boolean;
  discrepancy: number;
  policy_used?: string;
  details: {
    category: string;
    amount: number;
    account_id: string;
    reason: string;
  }[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IdentityRequest {
  id: string;
  case_id: string;
  account_id: string;
  account_pseudo_id?: string;
  requested_by: string;
  justification: string;
  status: RequestStatus;
  reviewed_by?: string;
  review_notes?: string;
  disclosed_fields?: string[];
  requested_at: string;
  reviewed_at?: string;
  disclosed_data?: Record<string, string>;
}

export interface ScreeningCandidate {
  account_id: string;
  pseudo_id: string;
  bank_code: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
  behavioral_score: number;
  detected_patterns: string[];
  pattern_details: any[];
  potential_seeds: {
    id: string;
    transaction_ref: string;
    amount: number;
    timestamp: string;
    sender_pseudo_id: string;
    receiver_pseudo_id: string;
    channel: string;
  }[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  result: string;
  reason?: string;
  timestamp: string;
  ip_address?: string;
}
