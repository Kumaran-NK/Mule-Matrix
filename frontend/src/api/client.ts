import {
  Bank,
  Account,
  Transaction,
  Case,
  GraphResponse,
  FundLot,
  EndpointObservation,
  AccountAssessment,
  ReconciliationSummary,
  IdentityRequest,
  ScreeningCandidate,
  AuditEvent,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Banks
  getBanks: () => fetchJson<Bank[]>(`${API_BASE}/banks`),

  // Accounts
  getAccounts: (bankId?: string) =>
    fetchJson<Account[]>(`${API_BASE}/accounts${bankId ? `?bank_id=${bankId}` : ''}`),
  getAccount: (idOrPseudo: string) => fetchJson<Account>(`${API_BASE}/accounts/${idOrPseudo}`),

  // Transactions
  getTransactions: (accountPseudoId?: string) =>
    fetchJson<Transaction[]>(
      `${API_BASE}/transactions${accountPseudoId ? `?account_pseudo_id=${accountPseudoId}` : ''}`
    ),

  // Cases
  getCases: () => fetchJson<Case[]>(`${API_BASE}/cases`),
  getCase: (idOrRef: string) => fetchJson<Case>(`${API_BASE}/cases/${idOrRef}`),
  createCase: (data: { title: string; description?: string; seed_transaction_ref?: string }) =>
    fetchJson<Case>(`${API_BASE}/cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Trace & Graph
  runTrace: (
    caseId: string,
    params: { allocation_policy: 'FIFO' | 'PROPORTIONAL'; direction?: string; max_hops?: number }
  ) =>
    fetchJson<any>(`${API_BASE}/cases/${caseId}/trace`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getCaseGraph: (caseId: string) => fetchJson<GraphResponse>(`${API_BASE}/cases/${caseId}/graph`),
  getCaseLots: (caseId: string) => fetchJson<FundLot[]>(`${API_BASE}/cases/${caseId}/lots`),
  getCaseEndpoints: (caseId: string) =>
    fetchJson<EndpointObservation[]>(`${API_BASE}/cases/${caseId}/endpoints`),
  getCaseAssessments: (caseId: string) =>
    fetchJson<AccountAssessment[]>(`${API_BASE}/cases/${caseId}/assessments`),
  getCaseReconciliation: (caseId: string) =>
    fetchJson<ReconciliationSummary>(`${API_BASE}/cases/${caseId}/reconciliation`),

  // Screening
  getScreeningCandidates: () =>
    fetchJson<{
      total_screened_accounts: number;
      total_flagged_candidates: number;
      pattern_breakdown: Record<string, number>;
      candidates: ScreeningCandidate[];
    }>(`${API_BASE}/screening/candidates`),

  // Identity Requests
  getIdentityRequests: (caseId?: string) =>
    fetchJson<IdentityRequest[]>(
      `${API_BASE}/identity/requests${caseId ? `?case_id=${caseId}` : ''}`
    ),
  submitIdentityRequest: (data: {
    case_id: string;
    account_pseudo_id: string;
    requested_by: string;
    justification: string;
  }) =>
    fetchJson<IdentityRequest>(`${API_BASE}/identity/requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewIdentityRequest: (
    requestId: string,
    data: {
      status: 'APPROVED' | 'REJECTED';
      reviewed_by: string;
      review_notes?: string;
      disclosed_fields?: string[];
    }
  ) =>
    fetchJson<IdentityRequest>(`${API_BASE}/identity/requests/${requestId}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Audit Log
  getAuditEvents: () => fetchJson<AuditEvent[]>(`${API_BASE}/audit`),

  // Simulator
  getSimulatorStatus: () =>
    fetchJson<{
      is_active: boolean;
      banks_count: number;
      accounts_count: number;
      transactions_count: number;
      total_simulated_liquidity: number;
      status: string;
    }>(`${API_BASE}/simulator/status`),
  triggerSeed: () =>
    fetchJson<any>(`${API_BASE}/simulator/seed`, {
      method: 'POST',
    }),
  resetSimulator: () =>
    fetchJson<any>(`${API_BASE}/simulator/reset`, {
      method: 'POST',
    }),
  executeTransfer: (data: {
    sender_pseudo_id: string;
    receiver_pseudo_id: string;
    amount: number;
    channel?: string;
    description?: string;
  }) =>
    fetchJson<any>(`${API_BASE}/simulator/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
