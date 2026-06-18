import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, fmtGameDate, fmtOdds, fmtPct } from "@/lib/utils";
import { fetchPlayerHistory, type Pick, type PlayerHistory } from "@/lib/api";

// Mirrors backend MARKETS -> game-log stat column.
const MARKET_STAT: Record<string, string> = {
  pitcher_strikeouts: "strikeouts",
  batter_hits_runs_rbis: "hits_runs_rbis",
};

function edgeColor(edge: number): string {
  if (edge >= 0.08) return "text-[var(--color-pos)]";
  if (edge > 0) return "text-[var(--color-pos)]/80";
  return "text-[var(--color-muted)]";
}

export function PickRow({ pick }: { pick: Pick }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [loading, setLoading] = useState(false);

  const isOver = pick.recommendation === "Over";
  const recOdds = isOver ? pick.over_odds : pick.under_odds;
  const prob = isOver ? pick.prob_over : pick.prob_under;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !history) {
      setLoading(true);
      try {
        setHistory(await fetchPlayerHistory(pick.player_id, MARKET_STAT[pick.market] ?? "hits"));
      } finally {
        setLoading(false);
      }
    }
  };

  const initials = pick.player_name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/70 overflow-hidden hover:border-[var(--color-accent)]/40 transition-colors">
      <button
        onClick={toggle}
        className="w-full grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1.4fr_1fr_auto_auto] items-center gap-3 p-3 text-left"
      >
        {/* Player */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-2)] grid place-items-center overflow-hidden">
            {pick.headshot_url ? (
              <img
                src={pick.headshot_url}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <span className="text-xs text-[var(--color-muted)]">{initials}</span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="font-semibold truncate">{pick.player_name}</div>
          <div className="text-xs text-[var(--color-muted)] truncate">
            {pick.team} vs {pick.opponent} · {fmtGameDate(pick.game_date)} · {pick.market_label}
          </div>
        </div>

        {/* Line + prediction */}
        <div className="hidden sm:block text-sm">
          <div className="text-[var(--color-muted)] text-xs">Line {pick.line}</div>
          <div>
            Proj <span className="font-semibold">{pick.predicted_value}</span>
          </div>
        </div>

        {/* Recommendation */}
        <div className="flex flex-col items-end gap-1">
          <Badge variant={isOver ? "over" : "under"}>
            {isOver ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {pick.recommendation} {pick.line}
          </Badge>
          <span className="text-[11px] text-[var(--color-muted)]">
            {fmtOdds(recOdds)} · {fmtPct(prob)} model
          </span>
        </div>

        {/* Edge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={cn("text-lg font-bold tabular-nums", edgeColor(pick.edge))}>
              {pick.edge_pct > 0 ? "+" : ""}
              {pick.edge_pct}%
            </div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">edge</div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--color-muted)] transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)]/40">
          {loading && <div className="text-sm text-[var(--color-muted)]">Loading recent games…</div>}
          {history && history.history.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Last {history.history.length} games · {pick.market_label}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  avg <span className="text-[#e6edf6] font-semibold">{history.average}</span> · line{" "}
                  {pick.line}
                </div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history.history} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                    <XAxis
                      dataKey="opponent"
                      tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(_, p) => (p?.[0] ? `vs ${p[0].payload.opponent} · ${p[0].payload.game_date}` : "")}
                    />
                    <ReferenceLine y={pick.line} stroke="var(--color-accent)" strokeDasharray="4 4" />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {history.history.map((h, i) => (
                        <Cell
                          key={i}
                          fill={h.value > pick.line ? "var(--color-pos)" : "var(--color-neg)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-[var(--color-muted)]">
                Model projects <span className="text-[#e6edf6] font-semibold">{pick.predicted_value}</span>{" "}
                {pick.market_label.toLowerCase()} vs a line of {pick.line} ({pick.bookmaker}). Recommended{" "}
                <span className={isOver ? "text-[var(--color-pos)]" : "text-[var(--color-neg)]"}>
                  {pick.recommendation}
                </span>{" "}
                at {fmtOdds(recOdds)} → {pick.edge_pct}% expected value.
              </div>
            </>
          )}
          {history && history.history.length === 0 && (
            <div className="text-sm text-[var(--color-muted)]">No recent game data available.</div>
          )}
        </div>
      )}
    </div>
  );
}
