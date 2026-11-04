# MULE MATRIX

### CBDC-Inspired Fund Provenance & Cross-Bank Mule-Network Investigation System

> **National Hackathon MVP Prototype**  
> *Single Source of Truth: `Mule_Matrix_MVP_Build_Specification_v2.pdf`*

---

## 1. Executive Summary & Mission

**Mule Matrix** is a privacy-conscious, CBDC-inspired fund provenance and cross-bank mule-network investigation platform. Using synthetic banking data across multiple simulated institutions, it enables financial fraud investigators to:
1. Reconstruct the observable downstream movement of suspicious funds across accounts, banks, splits, and transaction chains.
2. Track estimated suspicious value using a logical **fund-lot provenance overlay** inspired by CBDC unit-level tracking.
3. Apply **time-respecting temporal graph traversal** to identify multi-hop intermediary mules that were not present in upstream alert feeds.
4. Distinguish suspicious fund exposure from account culpability using **deterministic 5-dimensional evidence scoring**.
5. Classify observable off-ramp endpoints (ATM withdrawals, commercial merchant settlements, external non-participating banks, retained balances) with explicit boundary reporting.
6. Safeguard customer privacy with **pseudonymous investigation layers** and an audited, **bank-controlled identity resolution workflow**.

---

## 2. Core Architecture & Modules

```
                    ┌────────────────────────────────────────────────────────┐
                    │               SIMULATED BANKING NETWORK               │
                    │  APEX (State Apex) • BTRU (Bharat Trust) • CITI        │
                    │  DELT (Delta Mercantile) • EAST (Eastern) • GLOB (Ext) │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                    ┌────────────────────────────────────────────────────────┐
                    │         5-TYPOLOGY SYNTHETIC SCREENING FEED           │
                    │ 1. Rapid Pass-through  2. Fan-In  3. Fan-Out          │
                    │ 4. Layering Chain     5. Circular Return Flow          │
                    └──────────────────────────┬─────────────────────────────┘
                                               │ (Seed Transaction Reported)
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MULE MATRIX CORE                                          │
│                                                                                              │
│   ┌───────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐   │
│   │   CBDC Provenance Engine  │   │   Temporal Graph Engine   │   │  Assessment Engine   │   │
│   │  • Root & Child Fund Lots │   │  • NetworkX DiGraph       │   │ • 5 Evidence Scores  │   │
│   │  • FIFO / Proportional    │   │  • Time-Respecting Edges  │   │ • Likely Mule vs     │   │
│   │  • 100% Invariant Balance │   │  • Cycle Detection (T09)  │   │   Merchant vs Legit  │   │
│   │  • Compensating Reversals │   │  • Off-Ramp Classifiers   │   │ • Non-Guilt Rules    │   │
│   └─────────────┬─────────────┘   └─────────────┬─────────────┘   └──────────┬───────────┘   │
│                 │                               │                            │               │
│                 └───────────────────────┬───────┴────────────────────────────┘               │
│                                         ▼                                                    │
│                        REST API (FastAPI + Pydantic v2)                                      │
└─────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
┌──────────────────────────────────────┐      ┌──────────────────────────────────────────────┐
│  REACT INVESTIGATION DASHBOARD       │      │ BANK-CONTROLLED IDENTITY RESOLUTION          │
│ • React Flow Node-Link Canvas        │      │ • Separate Bank Identity Store               │
│ • Parent-Child Provenance Tree       │      │ • Investigator Submission (Statutory Ground) │
│ • 5-Typology Screening Feed          │      │ • Compliance Reviewer Gate (Approve/Reject)  │
│ • Chronological Velocity Timeline    │      │ • Least-Privilege Field Masking              │
│ • Off-Ramp Endpoint Classifiers      │      │ • Tamper-Evident Audit Trail                 │
└──────────────────────────────────────┘      └──────────────────────────────────────────────┘
```

---

## 3. Technology Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2 (mapped columns, UUID PKs, exact `NUMERIC(18,2)` via `Decimal`), NetworkX, Pydantic v2, Alembic, Pytest.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, `@xyflow/react` (React Flow), Lucide React.
- **Database**: PostgreSQL 16 (production/docker) and SQLite (zero-config local runtime / test isolation).
- **Deployment**: Docker Compose for local PostgreSQL.

---

## 4. Non-Negotiable Engineering Rules Enforced

| Rule | Implementation Guarantee |
| :--- | :--- |
| **No Float Money** | Python `Decimal` and `Numeric(18,2)` with `ROUND_HALF_UP` used everywhere. |
| **No Over-Allocation** | Invariant check raises `InvariantViolationError` if allocated amount exceeds remaining lot balance or transaction amount. |
| **No Negative Lots** | Validated at lot creation and splitting. |
| **Status Gating** | Only `POSTED` transactions transfer funds. `FAILED` and `PENDING` transactions do not affect lot attribution. |
| **Separate Origins** | Each origin maintains its own dedicated tree of child lots. Merges never collapse origin identifiers. |
| **Reversals** | Compensating reversal events append to lineage history without deleting prior transactions. |
| **Merchant Safeguard** | Receiving suspicious funds does **not** make a merchant a mule. Merchants are classified as `MERCHANT` with low suspicion. |
| **Identity Privacy** | Central APIs return only stable pseudonyms (`PSEUDO-XXXX`). Clear identity records require reviewer authorization. |

---

## 5. Quick Start & Local Execution

### Prerequisites
- Python 3.11+
- Node.js v18+ and pnpm

### Step 1: Clone and Configure Environment
```bash
git clone <repo_url> "Mule Matrix"
cd "Mule Matrix"

# Copy environment template
cp .env.example .env
```

### Step 2: Run Backend
```bash
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start FastAPI application
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation is available at: `http://localhost:8000/docs`*

### Step 3: Run Frontend
```bash
cd ../frontend

# Install frontend packages (using pnpm)
pnpm install

# Start Vite dev server
pnpm run dev
```
*Dashboard will open at: `http://localhost:5173`*

---

## 6. Demo Roles & Credentials

Mule Matrix implements role-based access control directly in the navigation bar:

| Role | Responsibilities | Controls Available |
| :--- | :--- | :--- |
| **Investigator** | Case analysis, graph exploration, executing traces, submitting identity requests. | Trace parameters, graph inspection, filter controls, "Request Authorized De-anonymisation". |
| **Compliance Reviewer** | Bank-side authorization, reviewing justification, approving/rejecting disclosure, selecting permitted fields. | "Review & Approve / Reject" modal, least-privilege field toggles (`real_name`, `phone`, `account_no`). |

*Switch between roles in 1 click using the role toggle in the top-right header.*

---

## 7. Verification & Test Suite Execution

All business rules, invariants, and endpoints are verified via Pytest:

```bash
# Run the complete test suite
python -m pytest backend/tests -v
```

### Actual Test Results (21 of 21 Passed):
```
backend/tests/test_api.py::test_health_check_function PASSED             [  4%]
backend/tests/test_api.py::test_list_banks_endpoint PASSED               [  9%]
backend/tests/test_api.py::test_list_accounts_endpoint PASSED            [ 14%]
backend/tests/test_api.py::test_case_lifecycle_endpoints PASSED          [ 19%]
backend/tests/test_api.py::test_screening_candidates_endpoint PASSED     [ 23%]
backend/tests/test_api.py::test_identity_workflow_endpoints PASSED       [ 28%]
backend/tests/test_api.py::test_audit_events_endpoint PASSED             [ 33%]
backend/tests/test_assessment.py::test_merchant_not_classified_as_mule PASSED [ 38%]
backend/tests/test_assessment.py::test_mule_classified_as_likely_mule PASSED [ 42%]
backend/tests/test_assessment.py::test_seed_account_classified_as_seed PASSED [ 47%]
backend/tests/test_identity.py::test_identity_request_workflow PASSED    [ 52%]
backend/tests/test_identity.py::test_identity_request_rejection PASSED   [ 57%]
backend/tests/test_patterns.py::test_rapid_passthrough_detected_on_primary_mule PASSED [ 61%]
backend/tests/test_patterns.py::test_fan_out_on_payroll_lookalike PASSED [ 66%]
backend/tests/test_patterns.py::test_circular_flow_detected_on_cycle_nodes PASSED [ 71%]
backend/tests/test_provenance.py::test_origin_and_initial_lot_creation PASSED [ 76%]
backend/tests/test_provenance.py::test_lot_split_and_invariants PASSED   [ 80%]
backend/tests/test_provenance.py::test_fifo_vs_proportional_allocation PASSED [ 85%]
backend/tests/test_provenance.py::test_reversal_handling PASSED          [ 90%]
backend/tests/test_trace.py::test_full_trace_execution PASSED            [ 95%]
backend/tests/test_trace.py::test_cycles_detected_safely PASSED          [100%]

============================= 21 passed in 24.30s =============================
```

---

## 8. Hackathon Evaluator Demonstration Script

Follow this step-by-step walkthrough to present the MVP to evaluators:

### Step 1: Overview & Preloaded Case
1. Open `http://localhost:5173`. Point out the active status: **6 Banks Connected** (State Apex, Bharat Trust, City Union, Delta Mercantile, Eastern Cooperative, and Global Offshore).
2. Point out the pre-created case: `CASE-2026-001` (*"Operation Falcon: Cross-Bank Fraud Mule Ring"*).
3. Click **"Launch Preloaded Demo Case"**.

### Step 2: Investigation Workspace & React Flow Graph
1. Explain the graph layout:
   - **Indigo Node**: `PSEUDO-VIC-01` (Victim seed account at Apex Bank).
   - **Rose Nodes**: `PSEUDO-MULE-01`, `PSEUDO-MULE-02`, `PSEUDO-MULE-03` (Flagged as Likely Mules with high suspicion %).
   - **Amber Node**: `PSEUDO-MERCH-01` (QuickMart Supermarket POS — commercial counterparty, NOT classified as mule!).
   - **Green Node**: `PSEUDO-EXT-01` (Global Offshore Bank — external non-participating institution boundary).
2. Click on `PSEUDO-MULE-01` node: Show the slide-out drawer displaying attributed value (₹1,00,000) and the 5 evidence score dimensions.
3. Switch accounting policy from `FIFO` to `PROPORTIONAL` and click **"Execute Provenance Trace"** to demonstrate real-time recalculation.

### Step 3: Fund Lineage & Exact Invariant Conservation
1. Navigate to **"Fund Lineage & Provenance"** in the sidebar.
2. Show the mathematical reconciliation card:
   - **Origin Introduced**: ₹1,00,000.00
   - **Terminal Off-ramps**: ₹95,000.00 (₹40k ATM + ₹35k Merchant + ₹20k External Bank)
   - **Retained Balance**: ₹5,000.00 (in Mule-02)
   - **Discrepancy**: **₹0.00 (100% Balanced)**.
3. Show the parent-child split lot tree (`LOT-ROOT` → child split lots).

### Step 4: 5 Synthetic Behavioral Typologies
1. Navigate to **"5-Pattern Screening"**.
2. Walk through the 5 typologies:
   - *Rapid Pass-Through* (Mule-01 forwards 100% in 4 minutes).
   - *Fan-In* (Fundraiser lookalike).
   - *Fan-Out* (TechLogix Payroll lookalike).
   - *Layering Chain* (Mule-01 → Mule-02 → Mule-03).
   - *Circular Flow* (3-node cycle A→B→C→A detected safely).

### Step 5: Authorized De-anonymisation & Reviewer Gate
1. Navigate to **"Identity Resolution"** (or click "Request Authorized De-anonymisation" from a node).
2. Fill in justification: *"Cyber Crime Complaint #401/2026 — freeze order requested."*
3. Submit request. Note that status is **PENDING** and identity fields are locked.
4. In the top navbar, switch role to **"Compliance Reviewer"**.
5. Click **"Review & Approve / Reject"**:
   - Check permitted fields: `real_name`, `phone`, `real_account_number`.
   - Click **"Confirm Decision"**.
6. Show the unlocked **Authorized Synthetic Identity Card**: *"Vikram Pratap Singh, Account #20034567890, Phone +91-98220-23456"*. Show that unapproved fields remain masked (least privilege).

### Step 6: Case Dossier & Audit Log
1. Navigate to **"Case Dossier & Audit"**.
2. Show the executive summary, reconciliation table, and the immutable audit log recording every trace and disclosure action.
3. Click **"Print / Export PDF Dossier"** to generate the exportable dossier.

---

## 9. Known Assumptions & Limitations (Section 17)

1. **Synthetic Data**: All account holders, bank names, balances, and payment events are generated synthetic test data. The system does not integrate with live RBI e₹, MuleHunter, or production core banking networks.
2. **Decision Support**: Algorithmic suspicion scores provide evidence-based prioritization for human investigators, not an automated determination of legal guilt.
3. **Accounting Conventions**: Under mixed balances, fund attribution reflects modeled estimates under declared FIFO or Proportional conventions, not physical tracking of currency notes.
4. **Boundary Reporting**: Stopping at an external bank or cash withdrawal reflects available evidence boundaries; it does not assume funds cannot move beyond that point.

---

## 10. License & Intellectual Property

Built as a prototype for national hackathon evaluation. Inspired by RBI / CBDC provenance research and open financial crime typologies.
