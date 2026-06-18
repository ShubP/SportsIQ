"""Turn a trained model + a player's history + a sportsbook line into an edge."""
from __future__ import annotations

import numpy as np

from .probability import best_edge, prob_over
from .train import ModelArtifact
from . import features as F


def predict_one(
    artifact: ModelArtifact,
    logs: list,
    line: float,
    over_odds: int | None,
    under_odds: int | None,
    is_home: int,
    opponent_team_id: int | None,
) -> dict | None:
    """Predict one player/market vs a line. Returns None if history is too thin."""
    feat = F.build_prediction_features(
        logs, artifact.stat, is_home, opponent_team_id, artifact.opp_factor
    )
    if feat is None:
        return None

    x = np.array([[feat.get(c, 0.0) for c in artifact.feature_columns]], dtype=float)
    predicted = float(artifact.model.predict(x)[0])
    predicted = max(predicted, 0.0)

    p_over = prob_over(predicted, line)
    recommendation, edge = best_edge(p_over, over_odds, under_odds)

    return {
        "predicted_value": round(predicted, 2),
        "prob_over": round(p_over, 4),
        "prob_under": round(1.0 - p_over, 4),
        "edge": round(edge, 4),
        "recommendation": recommendation,
        "model_version": artifact.model_version,
    }
