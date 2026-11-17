(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const gossip = window.SNOOP_GOSSIP || [];
  const viewer = window.SNOOP_VIEWER || {};
  const me = profiles[viewer.id];
  const root = document.getElementById("me");
  if (!me) return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));
  const num = (n) => n.toLocaleString("en-US").replace(/,/g, " ");
  const profileUrl = (pid) => `profile.html?id=${encodeURIComponent(pid)}`;
  const firstName = me.name.split(" ")[0];
  const catTitle = Object.fromEntries((window.SNOOP_DEFAULT_CATEGORIES || []).map((c) => [c.id, c.title]));
  const icons = window.SnoopIcons;
  const srcIcon = (text) => (icons ? icons.source(text) : "");

  document.title = "My profile – Snoop Book";

  /* ---------- Numbers ---------- */
  const views = viewer.profileViews || [];
  const thisWeek = views.slice(-7).reduce((a, b) => a + b, 0);
  const lastWeek = views.slice(-14, -7).reduce((a, b) => a + b, 0) || 1;
  const growth = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  const aboutMe = gossip.filter((g) => g.subject === viewer.id && g.profile !== false).sort((a, b) => b.juice - a.juice);
  // Lecturers are not listed on "My profile".
  const myRelations = (window.SNOOP_RELATIONS || {})[viewer.id] || [];
  const isLecturer = (pid) => myRelations.some((r) => r.id === pid && /lecturer/i.test(r.relation));
  const mentionsMe = gossip.filter((g) => g.subject !== viewer.id && (g.mentions || []).includes(viewer.id));
  const lookers = (viewer.viewers || []).filter((v) => profiles[v.id] && !isLecturer(v.id));
  const lookedAt = (viewer.lookedAt || []).filter((v) => profiles[v.id] && !isLecturer(v.id));
  const honestyDef = (window.SNOOP_INDEXES || []).find((d) => d.id === "honesty");
  const honesty = me.indexes && me.indexes.honesty;

  /* ---------- Views chart (single series bars) ---------- */
  const today = new Date(2030, 8, 3);
  const dayLabel = (i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (views.length - 1 - i));
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const maxViews = Math.max(...views);
  const bars = views
    .map((v, i) => {
      const gid = (viewer.gossipDays || {})[i];
      const g = gid && gossip.find((x) => x.id === gid);
      const tip = `${dayLabel(i)}: ${num(v)} views${g ? ` · Snoop AI surfaced gossip about you (${catTitle[g.category] || g.category})` : ""}`;
      return `
      <li class="vbar ${g ? "is-spike" : ""}" data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip)}">
        ${g ? `<span class="vbar__flag">Gossip</span>` : ""}
        <span class="vbar__fill" style="height:${Math.max(2, (v / maxViews) * 100)}%"></span>
      </li>`;
    })
    .join("");

  /* ---------- Gossip about you ---------- */
  const gossipCard = (g) => `
    <article class="alert" data-id="${esc(g.id)}" data-gossip="${esc(g.id)}" tabindex="0" aria-label="${esc(g.headline || g.text)}. Open full story">
      <p class="alert__meta">
        <span class="alert__new">New</span>
        <span class="chip">${esc(catTitle[g.category] || g.category)}</span>
        <span class="juice">${icons ? icons.icon("flame") : ""} ${g.juice}</span>
        Surfaced by Snoop AI ${esc(g.time)} ago
      </p>
      ${g.headline ? `<h3 class="gossip-headline">${esc(g.headline)}</h3>` : ""}
      <p class="alert__text">${esc(g.text)}</p>
      <figure class="evidence evidence--preview">
        <figcaption class="evidence__label">${srcIcon(g.evidence.source)} ${esc(g.evidence.source)}</figcaption>
        <pre class="evidence__body">${esc(g.evidence.body)}</pre>
      </figure>
      <p class="alert__stats">${fmt(g.reads)} people have read this</p>
      <div class="alert__actions">
        <button type="button" class="read-more" data-gossip-open>Read the full story →</button>
        <button type="button" class="tag tag--button" data-act="dispute">Dispute</button>
        <button type="button" class="tag tag--button" data-act="context">Add context</button>
      </div>
      <div class="alert__panel" hidden></div>
    </article>`;

  /* ---------- Who looked at you, and exactly what they saw ---------- */
  const lookerCard = (v) => {
    const p = profiles[v.id];
    const items = (v.items || [])
      .map(
        (it) => `
        <li class="seen${it.gossip ? " seen--story" : ""}"${it.gossip ? ` data-gossip="${esc(it.gossip)}" tabindex="0"` : ""}>
          ${srcIcon(it.source || it.section)}
          <span class="seen__body">
            <span class="seen__section">${esc(it.section)}</span>
            <strong class="seen__what">${esc(it.what)}</strong>
            ${it.detail ? `<span class="seen__detail">${esc(it.detail)}</span>` : ""}
            ${it.gossip ? `<span class="seen__open">Read what they read →</span>` : ""}
          </span>
        </li>`
      )
      .join("");
    return `
      <li class="looker-card" id="looker-${esc(v.id)}">
        <a class="looker" href="${profileUrl(v.id)}">
          <img src="${esc(p.photo)}" alt="" width="44" height="44">
          <span class="looker__info">
            <strong>${esc(p.name)}</strong>
            <span>${v.visits || 1} visit${(v.visits || 1) === 1 ? "" : "s"}${v.duration ? ` · ${esc(v.duration)} on your file` : ""}</span>
            ${v.note ? `<span class="looker__note">${esc(v.note)}</span>` : ""}
          </span>
          <span class="looker__ago">${esc(v.ago)}</span>
        </a>
        ${items ? `<p class="seen__label">What ${esc(p.name.split(" ")[0])} looked at</p><ul class="seen-list">${items}</ul>` : ""}
      </li>`;
  };

  /* ---------- Profiles you have looked at ---------- */
  const snooped = lookedAt.length
    ? lookedAt
        .map((v) => {
          const s = profiles[v.id];
          return `
        <li>
          <a class="looker" href="${profileUrl(v.id)}">
            <img src="${esc(s.photo)}" alt="" width="44" height="44">
            <span class="looker__info">
              <strong>${esc(s.name)}</strong>
              <span>You looked at <em>${esc(v.what)}</em></span>
            </span>
            <span class="looker__ago">${esc(v.ago)}</span>
          </a>
        </li>`;
        })
        .join("")
    : `<li class="contrib__empty">You haven't looked anyone up yet.</li>`;

  root.innerHTML = `
    <section class="me__head">
      <div>
        <p class="eyebrow">Your statistics</p>
        <h2 class="me__title">Here is what everyone knows about you, ${esc(firstName)}.</h2>
      </div>
      <p class="me__status"><span class="live-dot" aria-hidden="true"></span> Your file is public · 100% decrypted</p>
    </section>

    <section class="tiles" aria-label="Your numbers">
      <div class="tile">
        <span class="tile__label">Profile views this week</span>
        <span class="tile__value">${num(thisWeek)}</span>
        <span class="tile__sub tile__sub--bad">▲ ${growth}% vs last week</span>
      </div>
      <div class="tile">
        <span class="tile__label">People who looked at you</span>
        <span class="tile__value">${lookers.length}</span>
        <span class="tile__sub tile__sub--bad">${lookers.reduce((a, v) => a + (v.visits || 1), 0)} visits · see exactly what below</span>
      </div>
      <div class="tile">
        <span class="tile__label">Gossip about you</span>
        <span class="tile__value">${aboutMe.length}</span>
        <span class="tile__sub tile__sub--bad">${fmt(aboutMe.reduce((a, g) => a + g.reads, 0))} reads${mentionsMe.length ? ` · mentioned in ${mentionsMe.length} more` : ""}</span>
      </div>
      <div class="tile">
        <span class="tile__label">Your Honesty index</span>
        <span class="tile__value">${typeof honesty === "number" ? honesty : "–"}</span>
        <span class="tile__sub ${honestyDef && honesty < honestyDef.avg ? "tile__sub--bad" : ""}">${
          honestyDef && typeof honesty === "number" ? `${honesty < honestyDef.avg ? "▼ below" : "▲ above"} average (${honestyDef.avg})` : ""
        }</span>
      </div>
    </section>

    <div class="me__grid">
      <div class="me__main">
        <section class="panel">
          <h2 class="panel__title">Who looked at you</h2>
          <p class="panel__sub">Everyone who opened your file, and exactly what they looked at.</p>
          <ul class="looker-cards">${lookers.map(lookerCard).join("")}</ul>
        </section>

        <section class="panel">
          <h2 class="panel__title">Gossip about you</h2>
          <p class="panel__sub">Snoop AI picked these out of your decrypted data. You can dispute them or add context.</p>
          <div class="alerts">${aboutMe.map(gossipCard).join("") || `<p class="panel__sub">Nothing juicy. For now.</p>`}</div>
        </section>
      </div>

      <aside class="me__side">
        <section class="panel">
          <h2 class="panel__title">Profile views · last 14 days</h2>
          <p class="panel__sub">Views jump every time Snoop AI surfaces gossip about you.</p>
          <ol class="vbars" aria-label="Profile views per day">${bars}</ol>
          <div class="vbars__axis"><span>${dayLabel(0)}</span><span>Today</span></div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Profiles you looked at</h2>
          <p class="panel__sub">${num(viewer.searchesThisWeek || 0)} searches this week. They can see this too.</p>
          <ul class="lookers">${snooped}</ul>
        </section>
      </aside>
    </div>

  `;


  /* ---------- Interactions ---------- */
  root.querySelector(".alerts")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".alert");
    const panel = card.querySelector(".alert__panel");
    const act = btn.dataset.act;

    if (act === "dispute") {
      panel.innerHTML = `<p><strong>Snoop AI re-checked 4 sources.</strong> The gossip stands. Your dispute is now shown to everyone who reads it.</p>`;
      btn.disabled = true;
      btn.textContent = "Disputed";
    } else if (act === "context") {
      panel.innerHTML = `
        <form class="context-form">
          <input class="me-input" type="text" placeholder="Your side of the story…" aria-label="Add context">
        </form>`;
      panel.querySelector("input").focus();
    }
    panel.hidden = false;
  });

  root.addEventListener("submit", (e) => {
    const form = e.target.closest(".context-form");
    if (!form) return;
    e.preventDefault();
    const text = form.querySelector("input").value.trim();
    if (!text) return;
    form.parentElement.innerHTML = `<p><strong>Your context:</strong> “${esc(text)}”</p><p class="context-note">Your context is shown below the gossip, marked “Subject's claim”.</p>`;
  });

  // Jump to a viewer from the home page ("Enya looked at your file").
  const target = location.hash.match(/^#looker-([\w-]+)/);
  if (target) {
    const el = document.getElementById(`looker-${target[1]}`);
    if (el) {
      el.classList.add("is-target");
      el.scrollIntoView({ block: "center" });
    }
  }
})();
