chrome.storage.local.get(["clarity_result", "clarity_url"], ({ clarity_result, clarity_url }) => {
  const content = document.getElementById("content");

  if (!clarity_result) {
    content.innerHTML = `<p class="empty">No analysis yet.<br/>Visit a page to scan it.</p>`;
    return;
  }

  const { patterns, overall_manipulation_score, summary, ai_enhanced } = clarity_result;

  const scoreColor =
    overall_manipulation_score >= 75 ? "#EF4444"
    : overall_manipulation_score >= 50 ? "#F59E0B"
    : overall_manipulation_score >= 25 ? "#3B82F6"
    : "#374151";

  const scoreLabel =
    overall_manipulation_score >= 75 ? "Heavy pressure"
    : overall_manipulation_score >= 50 ? "Strong signals"
    : overall_manipulation_score >= 25 ? "Mild signals"
    : "Clean";

  // Count by type for the breakdown section
  const typeCounts = {};
  for (const p of patterns) {
    typeCounts[p.pattern_type] = (typeCounts[p.pattern_type] || 0) + 1;
  }

  const TYPE_META = {
    urgency:        { label: "Urgency / Deadline",  dot: "#F59E0B" },
    scarcity:       { label: "False Scarcity",       dot: "#EF4444" },
    social_proof:   { label: "Social Pressure",      dot: "#8B5CF6" },
    confirmshaming: { label: "Confirmshaming",       dot: "#EC4899" },
    hidden_costs:   { label: "Hidden Costs",         dot: "#3B82F6" },
  };

  const breakdownRows = Object.entries(typeCounts).map(([type, count]) => {
    const meta = TYPE_META[type] || { label: type, dot: "#9CA3AF" };
    return `
      <div class="pattern-row">
        <div class="pattern-dot" style="background:${meta.dot}"></div>
        <span class="pattern-name">${meta.label}</span>
        <span class="pattern-count">${count}</span>
      </div>`;
  }).join("");

  const SEV_BADGE = {
    high:   { bg: "#FEE2E2", text: "#991B1B" },
    medium: { bg: "#FEF3C7", text: "#92400E" },
    low:    { bg: "#DBEAFE", text: "#1E40AF" },
  };

  const patternCards = patterns.length === 0
    ? `<p class="empty">No signals detected on this page.</p>`
    : patterns.map(p => {
        const sev = SEV_BADGE[p.severity] || SEV_BADGE.low;
        return `
          <div class="card">
            <div class="card-header">
              <span class="card-type">${p.pattern_type.replace(/_/g, " ")}</span>
              <span class="card-sev" style="background:${sev.bg};color:${sev.text}">${p.severity}</span>
            </div>
            <p class="card-msg">${p.human_message}</p>
            <p class="card-match">&#x21B3; "${p.matched_text}"</p>
          </div>`;
      }).join("");

  const displayUrl = clarity_url
    ? `<p class="scan-url" title="${clarity_url}">${truncateUrl(clarity_url)}</p>`
    : "";

  content.innerHTML = `
    <div class="score-section">
      <div class="score-ring">
        <span class="score-num" style="color:${scoreColor}">${overall_manipulation_score}</span>
        <span class="score-denom">/100</span>
      </div>
      <div class="score-info">
        <span class="score-label" style="color:${scoreColor}">${scoreLabel}</span>
        <span class="score-sub">${patterns.length} signal${patterns.length !== 1 ? "s" : ""} detected</span>
        ${ai_enhanced ? '<span class="ai-badge">&#x2726; AI-enhanced</span>' : ""}
      </div>
    </div>

    <p class="summary">${summary}</p>
    ${displayUrl}

    ${breakdownRows ? `
    <div class="section">
      <div class="section-title">Detected Types</div>
      ${breakdownRows}
    </div>` : ""}

    <div class="section">
      <div class="section-title">Signal Details</div>
      <div class="cards">${patternCards}</div>
    </div>
  `;
});

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.length > 20 ? u.pathname.slice(0, 20) + "…" : u.pathname;
    return host + path;
  } catch {
    return url.slice(0, 40);
  }
}
