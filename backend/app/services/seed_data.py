"""Synthetic seed data generator for Mule Matrix MVP.

Generates:
1. 5 participating banks + 1 external non-participating bank
2. Accounts (victims, mules, merchants, legitimate lookalikes, payroll, fundraiser)
3. Bank-side protected synthetic identity mappings
4. Main demo scenario transactions (₹1,00,000 seed, splits, ATM, merchant, external bank)
5. Edge-case scenarios: cycle (A->B->C->A), reversal, mixed balance, failed/pending txs
6. Ground truth records for evaluation
7. Pre-created Case ready for 1-click demonstration
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Tuple
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.account import Account, AccountType
from app.models.bank import Bank
from app.models.case import Case, CaseStatus
from app.models.ground_truth import AccountRole, GroundTruthAccount, GroundTruthPath
from app.models.identity import IdentityMapping
from app.models.origin import Origin, OriginStatus
from app.models.transaction import PaymentChannel, Transaction, TransactionStatus
from app.services.provenance_engine import ProvenanceEngine, quantize_amount


def seed_database(db: Session) -> Dict[str, any]:
    """Populate database with complete synthetic demo scenario data."""
    # Check if already seeded
    existing_banks = db.query(Bank).count()
    if existing_banks > 0:
        return {"status": "already_seeded", "bank_count": existing_banks}

    base_time = datetime(2026, 11, 4, 9, 0, 0, tzinfo=timezone.utc)

    # 1. Banks
    banks_data = [
        {"code": "APEX", "name": "State Apex Bank of India", "is_participating": True},
        {"code": "BTRU", "name": "Bharat Trust Commercial Bank", "is_participating": True},
        {"code": "CITI", "name": "City Union National Bank", "is_participating": True},
        {"code": "DELT", "name": "Delta Mercantile Bank", "is_participating": True},
        {"code": "EAST", "name": "Eastern Cooperative Bank", "is_participating": True},
        {"code": "GLOB", "name": "Global Offshore Bank", "is_participating": False},  # Non-participating
    ]

    banks = {}
    for b in banks_data:
        bank = Bank(
            code=b["code"],
            name=b["name"],
            is_participating=b["is_participating"],
            created_at=base_time - timedelta(days=30),
        )
        db.add(bank)
        banks[b["code"]] = bank
    db.flush()

    # 2. Accounts & Identity Mappings
    # (pseudo_id, bank_code, account_type, opening_bal, real_name, real_acc_num, phone, role, is_mule)
    accounts_meta = [
        # Main Demo Scenario
        ("PSEUDO-VIC-01", "APEX", AccountType.SAVINGS, Decimal("250000.00"), "Ramesh Kumar Sharma", "10023456789", "+91-98110-12345", AccountRole.VICTIM, False),
        ("PSEUDO-MULE-01", "BTRU", AccountType.SAVINGS, Decimal("1500.00"), "Vikram Pratap Singh", "20034567890", "+91-98220-23456", AccountRole.MULE, True),
        ("PSEUDO-MULE-02", "CITI", AccountType.SAVINGS, Decimal("500.00"), "Sanjay D. Verma", "30045678901", "+91-98330-34567", AccountRole.MULE, True),
        ("PSEUDO-MULE-03", "DELT", AccountType.SAVINGS, Decimal("200.00"), "Amit Baburao Patil", "40056789012", "+91-98440-45678", AccountRole.MULE, True),
        ("PSEUDO-MERCH-01", "EAST", AccountType.MERCHANT, Decimal("850000.00"), "QuickMart Retail Supermarket Pvt Ltd", "50067890123", "+91-11-2345-6789", AccountRole.MERCHANT, False),
        ("PSEUDO-EXT-01", "GLOB", AccountType.CURRENT, Decimal("12000.00"), "Zephyr Trading International", "60078901234", "+44-20-7946-0912", AccountRole.UNKNOWN, False),

        # Legitimate lookalikes
        ("PSEUDO-LEGIT-01", "APEX", AccountType.SAVINGS, Decimal("50000.00"), "Pooja Ananya Iyer", "10098765432", "+91-98550-56789", AccountRole.LEGITIMATE, False),
        ("PSEUDO-PAYROLL-01", "CITI", AccountType.CURRENT, Decimal("1200000.00"), "TechLogix Global Solutions Pvt Ltd", "30087654321", "+91-80-4123-4567", AccountRole.LEGITIMATE, False),
        ("PSEUDO-FUND-01", "EAST", AccountType.CURRENT, Decimal("350000.00"), "Asha Foundation Welfare Trust", "50087654321", "+91-44-2812-3456", AccountRole.LEGITIMATE, False),

        # Circular Flow Cycle Accounts (T09)
        ("PSEUDO-CYC-A", "BTRU", AccountType.SAVINGS, Decimal("1000.00"), "Rahul Kishor Joshi", "20011223344", "+91-98660-67890", AccountRole.MULE, True),
        ("PSEUDO-CYC-B", "CITI", AccountType.SAVINGS, Decimal("800.00"), "Deepak Manohar Sawant", "30022334455", "+91-98770-78901", AccountRole.MULE, True),
        ("PSEUDO-CYC-C", "DELT", AccountType.SAVINGS, Decimal("400.00"), "Nitin Anand Deshmukh", "40033445566", "+91-98880-89012", AccountRole.MULE, True),

        # Reversal Test Account (T11)
        ("PSEUDO-REV-01", "EAST", AccountType.SAVINGS, Decimal("3000.00"), "Sunil Mohan Rathi", "50044556677", "+91-98990-90123", AccountRole.LEGITIMATE, False),

        # Payroll Employees (Fan-Out Lookalike)
        ("PSEUDO-EMP-01", "APEX", AccountType.SAVINGS, Decimal("15000.00"), "Arun Kumar", "10055667788", "+91-99000-01234", AccountRole.LEGITIMATE, False),
        ("PSEUDO-EMP-02", "BTRU", AccountType.SAVINGS, Decimal("22000.00"), "Bhavna Patel", "20066778899", "+91-99110-12345", AccountRole.LEGITIMATE, False),
        ("PSEUDO-EMP-03", "CITI", AccountType.SAVINGS, Decimal("18000.00"), "Chirag Mehta", "30077889900", "+91-99220-23456", AccountRole.LEGITIMATE, False),

        # Donors (Fan-In Lookalike)
        ("PSEUDO-DONOR-01", "DELT", AccountType.SAVINGS, Decimal("75000.00"), "Divya Reddy", "40088990011", "+91-99330-34567", AccountRole.LEGITIMATE, False),
        ("PSEUDO-DONOR-02", "EAST", AccountType.SAVINGS, Decimal("90000.00"), "Eshwar Rao", "50099001122", "+91-99440-45678", AccountRole.LEGITIMATE, False),
    ]

    accounts = {}
    for p_id, b_code, acc_type, op_bal, r_name, r_acc, phone, role, is_mule in accounts_meta:
        bank = banks[b_code]
        acc = Account(
            pseudo_id=p_id,
            bank_id=bank.id,
            account_type=acc_type,
            opening_balance=op_bal,
            current_balance=op_bal,
            is_active=True,
            created_at=base_time - timedelta(days=20),
        )
        db.add(acc)
        accounts[p_id] = acc
        db.flush()

        # Bank-side protected synthetic identity mapping
        ident = IdentityMapping(
            account_id=acc.id,
            real_name=r_name,
            real_account_number=r_acc,
            bank_branch=f"{bank.name} Central Branch",
            phone=phone,
            email=f"{r_name.lower().replace(' ', '.')}@example.com",
            address="Synthetic Address 123, Mumbai, Maharashtra",
            id_type="AADHAAR",
            id_number=f"XXXX-XXXX-{r_acc[-4:]}",
            created_at=base_time - timedelta(days=20),
        )
        db.add(ident)

        # Ground truth record
        gt = GroundTruthAccount(
            account_id=acc.id,
            true_role=role,
            is_mule_network_member=is_mule,
            network_id="NET-MULE-ALPHA" if is_mule else None,
            notes=f"Synthetic ground truth: {role.value}",
        )
        db.add(gt)
    db.flush()

    # 3. Transactions
    # Helper to insert and adjust balance
    tx_list = []
    def add_tx(ref, s_id, r_id, amt, t_offset_mins, chan=PaymentChannel.UPI, status=TransactionStatus.POSTED, desc=None, rev_of=None, is_rev=False, pay_ref=None):
        sender = accounts[s_id]
        receiver = accounts[r_id]
        amt_d = quantize_amount(Decimal(str(amt)))
        t_time = base_time + timedelta(minutes=t_offset_mins)

        tx = Transaction(
            transaction_ref=ref,
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            sender_bank_id=sender.bank_id,
            receiver_bank_id=receiver.bank_id,
            amount=amt_d,
            currency="INR",
            timestamp=t_time,
            status=status,
            channel=chan,
            payment_reference=pay_ref or f"UPI-{ref}",
            description=desc,
            reversal_of_id=rev_of.id if rev_of else None,
            is_reversal=is_rev,
            ingested_at=t_time + timedelta(seconds=2),
        )
        db.add(tx)
        db.flush()

        if status == TransactionStatus.POSTED:
            sender.current_balance = quantize_amount(sender.current_balance - amt_d)
            receiver.current_balance = quantize_amount(receiver.current_balance + amt_d)

        tx_list.append(tx)
        return tx

    # --- MAIN DEMO SCENARIO ---
    # T00: Seed Transaction - ₹1,00,000 sent by victim to primary mule
    seed_tx = add_tx(
        ref="TX-SEED-001",
        s_id="PSEUDO-VIC-01",
        r_id="PSEUDO-MULE-01",
        amt=100000.00,
        t_offset_mins=0,
        chan=PaymentChannel.UPI,
        desc="Victim transfer reported under cyber complaint (Seed Origin)",
        pay_ref="UPI/CR/20261104/001",
    )

    # T01-A: Primary mule splits ₹45,000 to Layering Mule PSEUDO-MULE-02 (after 2 minutes)
    tx_split_1 = add_tx(
        ref="TX-SPLIT-01",
        s_id="PSEUDO-MULE-01",
        r_id="PSEUDO-MULE-02",
        amt=45000.00,
        t_offset_mins=2,
        chan=PaymentChannel.IMPS,
        desc="Mule split transfer to intermediary layer 1",
    )

    # T01-B: Primary mule splits ₹35,000 to Legitimate Merchant QuickMart POS (after 3 minutes)
    tx_split_2 = add_tx(
        ref="TX-SPLIT-02",
        s_id="PSEUDO-MULE-01",
        r_id="PSEUDO-MERCH-01",
        amt=35000.00,
        t_offset_mins=3,
        chan=PaymentChannel.MERCHANT_POS,
        desc="Electronics / luxury goods POS payment at QuickMart Retail",
        pay_ref="POS-TERM-MUM-88",
    )

    # T01-C: Primary mule sends ₹20,000 to Non-participating External Bank (after 4 minutes)
    tx_split_3 = add_tx(
        ref="TX-SPLIT-03",
        s_id="PSEUDO-MULE-01",
        r_id="PSEUDO-EXT-01",
        amt=20000.00,
        t_offset_mins=4,
        chan=PaymentChannel.NEFT,
        desc="Outbound transfer to non-participating institution",
    )

    # T02: Layering intermediary PSEUDO-MULE-02 forwards ₹40,000 to Cash-out Mule PSEUDO-MULE-03 (after 8 minutes)
    # Retains ₹5,000 as commission / fee
    tx_layer_1 = add_tx(
        ref="TX-LAYER-01",
        s_id="PSEUDO-MULE-02",
        r_id="PSEUDO-MULE-03",
        amt=40000.00,
        t_offset_mins=8,
        chan=PaymentChannel.UPI,
        desc="Layering intermediary forward to cash-out mule",
    )

    # T03: Cash-out mule withdraws ₹40,000 via ATM (after 15 minutes) -> ATM Endpoint
    tx_atm = add_tx(
        ref="TX-ATM-01",
        s_id="PSEUDO-MULE-03",
        r_id="PSEUDO-MULE-03",  # Self debit / terminal
        amt=40000.00,
        t_offset_mins=15,
        chan=PaymentChannel.ATM,
        desc="ATM Cash Withdrawal at Terminal ATM-MUM-401",
        pay_ref="ATM-TXN-90214",
    )

    # --- EDGE CASE: Circular Flow Cycle (T09) ---
    tx_cyc_1 = add_tx("TX-CYC-01", "PSEUDO-CYC-A", "PSEUDO-CYC-B", 25000.00, 30, PaymentChannel.UPI, desc="Circular transfer A->B")
    tx_cyc_2 = add_tx("TX-CYC-02", "PSEUDO-CYC-B", "PSEUDO-CYC-C", 24000.00, 35, PaymentChannel.UPI, desc="Circular transfer B->C")
    tx_cyc_3 = add_tx("TX-CYC-03", "PSEUDO-CYC-C", "PSEUDO-CYC-A", 23500.00, 40, PaymentChannel.UPI, desc="Circular return flow C->A")

    # --- EDGE CASE: Reversal / Compensating Event (T11) ---
    orig_rev_tx = add_tx("TX-REV-ORIG", "PSEUDO-MULE-01", "PSEUDO-REV-01", 12000.00, 50, PaymentChannel.IMPS, desc="Original transfer prior to dispute")
    comp_rev_tx = add_tx("TX-REV-COMP", "PSEUDO-REV-01", "PSEUDO-MULE-01", 12000.00, 70, PaymentChannel.IMPS, status=TransactionStatus.REVERSED, desc="Compensating reversal of disputed transfer", rev_of=orig_rev_tx, is_rev=True)

    # --- EDGE CASE: Pending / Failed Transactions (T13) ---
    add_tx("TX-FAIL-01", "PSEUDO-MULE-02", "PSEUDO-LEGIT-01", 10000.00, 25, PaymentChannel.UPI, status=TransactionStatus.FAILED, desc="Failed payment attempt due to network timeout")
    add_tx("TX-PEND-01", "PSEUDO-MULE-03", "PSEUDO-LEGIT-01", 5000.00, 26, PaymentChannel.UPI, status=TransactionStatus.PENDING, desc="Pending authorization transaction")

    # --- LOOKALIKE: Fan-Out Payroll (Pattern 3 Lookalike) ---
    add_tx("TX-PAY-01", "PSEUDO-PAYROLL-01", "PSEUDO-EMP-01", 55000.00, 60, PaymentChannel.NEFT, desc="Monthly payroll disbursement")
    add_tx("TX-PAY-02", "PSEUDO-PAYROLL-01", "PSEUDO-EMP-02", 65000.00, 61, PaymentChannel.NEFT, desc="Monthly payroll disbursement")
    add_tx("TX-PAY-03", "PSEUDO-PAYROLL-01", "PSEUDO-EMP-03", 48000.00, 62, PaymentChannel.NEFT, desc="Monthly payroll disbursement")

    # --- LOOKALIKE: Fan-In Fundraiser (Pattern 2 Lookalike) ---
    add_tx("TX-DON-01", "PSEUDO-DONOR-01", "PSEUDO-FUND-01", 25000.00, 10, PaymentChannel.UPI, desc="Charitable medical contribution")
    add_tx("TX-DON-02", "PSEUDO-DONOR-02", "PSEUDO-FUND-01", 35000.00, 12, PaymentChannel.UPI, desc="Charitable educational contribution")

    # 4. Create Pre-configured Case & Origin for Hackathon Demo
    demo_case = Case(
        case_ref="CASE-2026-001",
        title="Operation Falcon: Cross-Bank Fraud Mule Ring",
        description="Victim complaint reporting ₹1,00,000 unauthorized debit traced across multi-bank intermediary splits, ATM cash-out, and merchant off-ramp.",
        status=CaseStatus.OPEN,
        created_by="lead_investigator",
        created_at=base_time + timedelta(minutes=5),
        updated_at=base_time + timedelta(minutes=5),
    )
    db.add(demo_case)
    db.flush()

    # Pre-create origin for seed transaction
    origin = ProvenanceEngine.create_origin(
        db=db,
        case_id=demo_case.id,
        seed_tx=seed_tx,
        origin_amount=seed_tx.amount,
    )

    # Create root lot
    ProvenanceEngine.create_initial_lot(db, origin, seed_tx.receiver_account_id)

    # Ground truth path
    gt_path = GroundTruthPath(
        origin_id=origin.id,
        path_description="VIC-01 -> MULE-01 -> [MULE-02 (Layering) -> MULE-03 (ATM), MERCH-01 (Merchant POS), EXT-01 (External Bank)]",
        expected_endpoints=[
            {"category": "ATM_WITHDRAWAL", "amount": 40000.00, "account": "PSEUDO-MULE-03"},
            {"category": "RETAINED_BALANCE", "amount": 5000.00, "account": "PSEUDO-MULE-02"},
            {"category": "MERCHANT_PAYMENT", "amount": 35000.00, "account": "PSEUDO-MERCH-01"},
            {"category": "EXTERNAL_BANK", "amount": 20000.00, "account": "PSEUDO-EXT-01"},
        ],
        expected_total_attributed=Decimal("100000.00"),
    )
    db.add(gt_path)

    db.commit()

    return {
        "status": "success",
        "banks_count": len(banks),
        "accounts_count": len(accounts),
        "transactions_count": len(tx_list),
        "demo_case_ref": demo_case.case_ref,
        "seed_tx_ref": seed_tx.transaction_ref,
        "origin_ref": origin.origin_ref,
    }
