"""Tests for the 5 synthetic mule typologies."""

from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction
from app.services.graph_engine import GraphEngine
from app.services.pattern_detector import PatternDetector


def test_rapid_passthrough_detected_on_primary_mule(db: Session):
    """Test Pattern 1: Rapid pass-through on primary mule account."""
    mule_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-MULE-01").first()
    all_txs = db.query(Transaction).all()

    res = PatternDetector.detect_rapid_passthrough(mule_acc, all_txs, max_delay_hours=24.0)
    assert res["detected"] is True
    assert res["score"] >= 0.70
    assert len(res["evidence"]) > 0
    # Check that pass-through ratio is >= 90%
    assert res["evidence"][0]["passthrough_ratio"] >= 0.90


def test_fan_out_on_payroll_lookalike(db: Session):
    """Test Pattern 3: Fan-out on payroll account and verify lookalike risk flag."""
    payroll_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-PAYROLL-01").first()
    all_txs = db.query(Transaction).all()

    res = PatternDetector.detect_fan_out(payroll_acc, all_txs, min_counterparties=3)
    assert res["detected"] is True
    # Crucial safeguard: commercial / corporate current account flagged as legitimate lookalike
    assert res["lookalike_risk"] is True


def test_circular_flow_detected_on_cycle_nodes(db: Session):
    """Test Pattern 5: Circular flow detected on accounts participating in cycles."""
    all_accs = db.query(Account).all()
    all_txs = db.query(Transaction).all()

    G = GraphEngine.build_transaction_graph(all_accs, all_txs)
    cycles = GraphEngine.detect_cycles(G)
    assert len(cycles) > 0

    cyc_acc = db.query(Account).filter(Account.pseudo_id == "PSEUDO-CYC-A").first()
    res = PatternDetector.detect_circular_flow(cyc_acc, cycles)
    assert res["detected"] is True
    assert res["score"] > 0.0
