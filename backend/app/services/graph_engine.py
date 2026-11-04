"""NetworkX-based graph engine for Mule Matrix.

Builds directed temporal transaction graphs and detects cycles safely.
"""

from typing import Dict, List, Set, Tuple
from uuid import UUID
import networkx as nx
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus


class GraphEngine:
    @staticmethod
    def build_transaction_graph(
        accounts: List[Account],
        transactions: List[Transaction],
    ) -> nx.DiGraph:
        """Construct a directed graph G=(V, E) from accounts and transactions."""
        G = nx.DiGraph()

        # Add account nodes
        for acc in accounts:
            G.add_node(
                acc.pseudo_id,
                account_id=str(acc.id),
                pseudo_id=acc.pseudo_id,
                bank_code=acc.bank.code if acc.bank else "UNKNOWN",
                bank_name=acc.bank.name if acc.bank else "Unknown Bank",
                account_type=acc.account_type.value,
                current_balance=float(acc.current_balance),
                opening_balance=float(acc.opening_balance),
            )

        # Add transaction edges (only POSTED transactions represent actual money movement)
        for tx in transactions:
            if tx.status != TransactionStatus.POSTED:
                continue

            sender_pseudo = tx.sender_account.pseudo_id if tx.sender_account else None
            receiver_pseudo = tx.receiver_account.pseudo_id if tx.receiver_account else None

            if not sender_pseudo or not receiver_pseudo:
                continue

            edge_key = f"{tx.transaction_ref}"
            G.add_edge(
                sender_pseudo,
                receiver_pseudo,
                key=edge_key,
                transaction_id=str(tx.id),
                transaction_ref=tx.transaction_ref,
                amount=float(tx.amount),
                currency=tx.currency,
                timestamp=tx.timestamp.isoformat(),
                timestamp_dt=tx.timestamp,
                channel=tx.channel.value,
                status=tx.status.value,
                is_reversal=tx.is_reversal,
            )

        return G

    @staticmethod
    def detect_cycles(G: nx.DiGraph) -> List[List[str]]:
        """Find simple cycles in the directed graph safely."""
        try:
            # simple_cycles returns an iterator of cycles
            cycles = list(nx.simple_cycles(G))
            # Sort cycles by length
            return sorted(cycles, key=len)
        except Exception:
            return []

    @staticmethod
    def get_forward_subgraph(G: nx.DiGraph, root_pseudo_id: str, max_depth: int = 10) -> Set[str]:
        """Get set of node pseudo_ids reachable forward from root within max_depth."""
        if root_pseudo_id not in G:
            return set()

        visited = set()
        queue = [(root_pseudo_id, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if curr in visited or depth > max_depth:
                continue
            visited.add(curr)

            for neighbor in G.successors(curr):
                if neighbor not in visited:
                    queue.append((neighbor, depth + 1))

        return visited

    @staticmethod
    def get_backward_subgraph(G: nx.DiGraph, target_pseudo_id: str, max_depth: int = 10) -> Set[str]:
        """Get set of node pseudo_ids contributing backward to target within max_depth."""
        if target_pseudo_id not in G:
            return set()

        visited = set()
        queue = [(target_pseudo_id, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if curr in visited or depth > max_depth:
                continue
            visited.add(curr)

            for predecessor in G.predecessors(curr):
                if predecessor not in visited:
                    queue.append((predecessor, depth + 1))

        return visited
