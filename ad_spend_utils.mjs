export const AD_SPEND_PERIODS = Object.freeze(["30d", "7d", "yesterday", "today", "all"]);

export const AD_SPEND_SORT_KEYS = Object.freeze(["cap_ratio", "budget", "spend", "net", "capped_net", "impressions", "clicks", "installs", "payers"]);

export function adSpendCount(value, modeled = false) {
  const n = finiteMoney(value);
  return n === null ? "N/A" : `${modeled ? "≈" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function adSpendView(snapshot, period = "30d", now = Date.now()) {
  const key = AD_SPEND_PERIODS.includes(period) ? period : "30d";
  if (["today", "yesterday"].includes(key) && snapshot?.snapshot_utc) {
    const at = Date.parse(snapshot.snapshot_utc);
    const day = new Intl.DateTimeFormat("en-CA", {timeZone:"America/New_York", year:"numeric", month:"2-digit", day:"2-digit"});
    if (!Number.isFinite(at) || day.format(at) !== day.format(now)) return null;
  }
  if (snapshot?.schema === 2) return snapshot.views?.[key] ?? null;
  // Never relabel an old all-time snapshot as a 30-day cohort.
  return key === "all" ? snapshot : null;
}

// Snapshot-only view: opening this tab never calls an advertising service.
function rowNetwork(row) {
  const id = row.id ?? "";
  if (id.startsWith("meta:") || id.startsWith("meta-intl:")) return "meta";
  if (id.startsWith("google:")) return "google";
  if (id.startsWith("unity:")) return "unity";
  return null;
}

function rowPlatform(row) {
  if (["ios", "android"].includes(row.platform)) return row.platform;
  const id = row.id ?? "";
  if (id.startsWith("meta-intl:")) return "ios";
  if (id.startsWith("unity:")) return "android";
  if (id.startsWith("google:")) return id.split(":").at(-1);
  if (id.startsWith("meta:")) {
    const match = /^Meta · US (Android|iOS) ·/.exec(row.label ?? "");
    return match ? match[1].toLowerCase() : null;
  }
  return null;
}

export function adSpendRows(snapshot, showPaused = false, platform = "all", network = "all", sortKey = "cap_ratio", direction = "desc") {
  const key = AD_SPEND_SORT_KEYS.includes(sortKey) ? sortKey : "cap_ratio";
  const multiplier = direction === "asc" ? 1 : -1;
  const sortValue = (row) => key === "cap_ratio" ? capRatio(row) : finiteMoney(row[key]);
  const wantedPlatform = ["ios", "android"].includes(platform) ? platform : "all";
  const wantedNetwork = ["meta", "google", "unity"].includes(network) ? network : "all";
  return (snapshot?.rows ?? []).filter((r) => showPaused || !["paused", "ended", "retired"].includes(r.status))
    .filter((r) => wantedPlatform === "all" || rowPlatform(r) === wantedPlatform)
    .filter((r) => wantedNetwork === "all" || rowNetwork(r) === wantedNetwork)
    .slice().sort((a, b) => {
      const ar = sortValue(a), br = sortValue(b);
      if (ar === null && br !== null) return 1;
      if (br === null && ar !== null) return -1;
      return ((ar ?? 0) - (br ?? 0)) * multiplier || a.label.localeCompare(b.label);
    });
}

export function finiteMoney(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function capRatio(row) {
  const spend = finiteMoney(row.spend), cap = finiteMoney(row.capped_net);
  return spend !== null && spend > 0 && cap !== null ? cap / spend : null;
}

export function adSpendMoney(value, modeled = false, partial = false) {
  const n = finiteMoney(value);
  return n === null ? "N/A" : `${modeled ? "≈" : ""}${n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })}${partial ? "*" : ""}`;
}

export function adSpendCap(row) {
  const ratio = capRatio(row);
  if (ratio === null) return finiteMoney(row.spend) === 0 ? "—" : "N/A";
  return `${row.modeled || row.net_estimated ? "≈" : ""}${Math.round(ratio * 100)}%${row.partial ? "*" : ""}`;
}

export function snapshotAge(snapshot, now = Date.now()) {
  const at = Date.parse(snapshot?.snapshot_utc);
  if (!Number.isFinite(at)) return "Not refreshed yet";
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  return `${minutes >= 180 ? "Stale · " : ""}Updated ${new Date(at).toLocaleString()} · ${minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`} ago`;
}


export function adSpendTotals(rows) {
  const total = (values, partial = false, modeled = false) => {
    const known = values.map(finiteMoney).filter(v => v !== null);
    return { value: known.length ? known.reduce((a, b) => a + b, 0) : null,
      partial: partial || known.length !== values.length, modeled };
  };
  const groups = new Map();
  for (const row of rows) {
    if (row.budget_excluded) continue;
    const key = row.budget_key ?? row.adset_id ?? row.id ?? row.label;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finiteMoney(row.budget));
  }
  const budgets = [...groups.values()].map(values => {
    const positive = values.filter(v => v !== null && v > 0);
    if (positive.length) return Math.max(...positive);
    return values.every(v => v === 0) ? 0 : null;
  });
  return {
    budget: total(budgets), spend: total(rows.map(r => r.spend)),
    net: total(rows.map(r => r.net), rows.some(r => r.partial), rows.some(r => (r.modeled || r.net_estimated) && finiteMoney(r.net) !== null)),
  };
}
