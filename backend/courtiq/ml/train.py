"""Train one model per prop market and persist artifacts to models/.

Targets are counting stats, so we use XGBoost's Poisson objective, which
predicts a non-negative mean we can plug straight into prob_over().
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

import joblib
import numpy as np
from xgboost import XGBRegressor

from ..config import MARKETS, MODELS_DIR
from . import features as F

log = logging.getLogger(__name__)
MODEL_VERSION = "xgb-poisson-v1"


@dataclass
class ModelArtifact:
    market: str
    stat: str
    group: str
    feature_columns: list[str]
    opp_factor: dict
    league_mean: float
    model: object
    model_version: str
    trained_at: str
    n_rows: int
    fallback_mean: float  # used when a player lacks enough history


def _model_path(market: str):
    return MODELS_DIR / f"{market}.joblib"


def train_market(logs_by_player: dict[int, list], market: str) -> ModelArtifact | None:
    spec = MARKETS[market]
    stat = spec["stat"]
    frame, opp = F.build_training_frame(logs_by_player, stat)
    if frame.empty or len(frame) < 30:
        log.warning("Not enough data to train %s (rows=%d)", market, len(frame))
        return None

    cols = F.feature_columns(stat)
    X = frame[cols].to_numpy(dtype=float)
    y = frame["target"].to_numpy(dtype=float)

    model = XGBRegressor(
        objective="count:poisson",
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_lambda=1.0,
        n_jobs=0,
        random_state=42,
    )
    model.fit(X, y)

    artifact = ModelArtifact(
        market=market,
        stat=stat,
        group=spec["group"],
        feature_columns=cols,
        opp_factor=opp.get("opp_factor", {}),
        league_mean=float(opp.get("league_mean", float(np.mean(y)))),
        model=model,
        model_version=MODEL_VERSION,
        trained_at=datetime.utcnow().isoformat(),
        n_rows=int(len(frame)),
        fallback_mean=float(np.mean(y)),
    )
    joblib.dump(artifact, _model_path(market))
    log.info("Trained %s on %d rows -> %s", market, len(frame), _model_path(market).name)
    return artifact


def train_all(logs_by_group: dict[str, dict[int, list]]) -> dict[str, ModelArtifact]:
    """Train every market. logs_by_group maps 'hitting'/'pitching' -> {player_id: logs}."""
    trained: dict[str, ModelArtifact] = {}
    for market, spec in MARKETS.items():
        logs = logs_by_group.get(spec["group"], {})
        art = train_market(logs, market)
        if art:
            trained[market] = art
    return trained


def load_model(market: str) -> ModelArtifact | None:
    path = _model_path(market)
    if not path.exists():
        return None
    return joblib.load(path)
