"""Betting math: odds conversion, over/under probabilities, and edge (EV)."""
from __future__ import annotations

import math


def american_to_decimal(odds: int) -> float:
    if odds > 0:
        return 1.0 + odds / 100.0
    return 1.0 + 100.0 / abs(odds)


def american_to_implied_prob(odds: int) -> float:
    """Implied probability (includes the book's vig)."""
    if odds > 0:
        return 100.0 / (odds + 100.0)
    return abs(odds) / (abs(odds) + 100.0)


def american_from_prob(p: float) -> int:
    """Inverse of american_to_implied_prob — price a probability as US odds."""
    p = min(max(p, 0.02), 0.98)
    if p >= 0.5:
        return -round(100.0 * p / (1.0 - p))
    return round(100.0 * (1.0 - p) / p)


def poisson_cdf(k: int, lam: float) -> float:
    """P(X <= k) for X ~ Poisson(lam)."""
    if lam <= 0:
        return 1.0
    total = 0.0
    term = math.exp(-lam)
    for i in range(0, k + 1):
        if i > 0:
            term *= lam / i
        total += term
    return min(1.0, total)


def prob_over(predicted: float, line: float, dispersion: float = 1.0) -> float:
    """P(stat > line) given a predicted mean.

    Counting stats (Ks, hits, HR...) are modelled as Poisson around the
    predicted mean. `dispersion` >1 widens the distribution toward the
    line for over-dispersed stats (kept simple here).
    """
    lam = max(predicted * dispersion, 1e-6)
    # Lines are typically x.5, so "over" means count >= floor(line)+1.
    floor_line = math.floor(line)
    p_over = 1.0 - poisson_cdf(floor_line, lam)
    return min(max(p_over, 1e-6), 1 - 1e-6)


def expected_value(prob_win: float, american_odds: int) -> float:
    """EV per $1 stake. Positive = +EV bet."""
    dec = american_to_decimal(american_odds)
    return prob_win * (dec - 1.0) - (1.0 - prob_win)


def best_edge(
    prob_over_val: float,
    over_odds: int | None,
    under_odds: int | None,
) -> tuple[str, float]:
    """Pick the side with higher EV; return (recommendation, edge).

    Edge here is the EV per $1 on the recommended side. If only one side has
    odds, evaluate that side. 'Pass' when neither side is +EV.
    """
    prob_under_val = 1.0 - prob_over_val
    candidates: list[tuple[str, float]] = []
    if over_odds is not None:
        candidates.append(("Over", expected_value(prob_over_val, over_odds)))
    if under_odds is not None:
        candidates.append(("Under", expected_value(prob_under_val, under_odds)))
    if not candidates:
        return "Pass", 0.0
    rec, edge = max(candidates, key=lambda c: c[1])
    if edge <= 0:
        return "Pass", edge
    return rec, edge
