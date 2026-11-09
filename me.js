(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const posts = window.SNOOP_POSTS || [];
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
  const catTitle = Object.fromEntries(
    [...(window.SNOOP_DEFAULT_CATEGORIES || []), { id: "public-reception", title: "Public Reception" }].map((c) => [c.id, c.title])
  );

  document.title = "My profile – Snoop Book";

  /* ---------- Numbers ---------- */
  const views = viewer.profileViews || [];
  const thisWeek = views.slice(-7).reduce((a, b) => a + b, 0);
  const lastWeek = views.slice(-14, -7).reduce((a, b) => a + b, 0) || 1;
  const growth = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  const aboutMe = posts.filter((p) => p.subject === viewer.id);
  const byMe = posts.filter((p) => p.author === viewer.id);
  const reception = me.scores.find((s) => s.id === "public-reception");

  /* ---------- Views chart (single series bars) ---------- */
  const today = new Date(2026, 10, 9);
  const dayLabel = (i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (views.length - 1 - i));
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const maxViews = Math.max(...views);
  const bars = views
    .map((v, i) => {
      const fid = (viewer.findingDays || {})[i];
      const f = fid && posts.find((p) => p.id === fid);
      const tip = `${dayLabel(i)}: ${num(v)} views${f ? ` · finding posted by ${profiles[f.author].name}` : ""}`;
      return `
      <li class="vbar ${f ? "is-spike" : ""}" data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip)}">
        ${f ? `<span class="vbar__flag">Finding</span>` : ""}
        <span class="vbar__fill" style="height:${Math.max(2, (v / maxViews) * 100)}%"></span>
      </li>`;
    })
    .join("");

  /* ---------- Findings about you ---------- */
  const findingCard = (f) => {
    const a = profiles[f.author];
    return `
    <article class="alert" data-id="${esc(f.id)}">
      <p class="alert__meta">
        <span class="alert__new">New</span>
        <span class="chip">${esc(catTitle[f.category] || f.category)}</span>
        <a class="alert__author" href="${profileUrl(f.author)}"><img src="${esc(a.photo)}" alt="" width="24" height="24">${esc(a.name)}</a>
        posted this ${esc(f.time)} ago
      </p>
      <p class="alert__text">${esc(f.text)}</p>
      <figure class="evidence">
        <figcaption class="evidence__label"><span class="evidence__tag">Decrypted</span> ${esc(f.evidence.source)}</figcaption>
        <pre class="evidence__body">${esc(f.evidence.body)}</pre>
      </figure>
      <p class="alert__stats">${fmt(f.verified)} people verified this · ${fmt(f.comments)} comments</p>
      <div class="alert__actions">
        <button type="button" class="tag tag--button" data-act="dispute">Dispute</button>
        <button type="button" class="tag tag--button" data-act="context">Add context</button>
        <button type="button" class="tag tag--button tag--premium" data-act="hide">Hide · NOK 499/mo</button>
      </div>
      <div class="alert__panel" hidden></div>
    </article>`;
  };

  /* ---------- Who looked at you ---------- */
  const viewers = (viewer.viewers || [])
    .filter((v) => profiles[v.id])
    .map((v) => {
      const p = profiles[v.id];
      return `
      <li>
        <a class="looker" href="${profileUrl(v.id)}">
          <img src="${esc(p.photo)}" alt="" width="44" height="44">
          <span class="looker__info">
            <strong>${esc(p.name)}</strong>
            <span>looked at your <em>${esc(v.looked)}</em></span>
            ${v.note ? `<span class="looker__note">${esc(v.note)}</span>` : ""}
          </span>
          <span class="looker__ago">${esc(v.ago)}</span>
        </a>
      </li>`;
    })
    .join("");

  /* ---------- Your contributions ---------- */
  const contributions = byMe.length
    ? byMe
        .map((f) => {
          const s = profiles[f.subject];
          return `
        <li class="contrib">
          <a class="contrib__subject" href="${profileUrl(f.subject)}"><img src="${esc(s.photo)}" alt="" width="36" height="36"></a>
          <div>
            <p class="contrib__text">You snooped on <a href="${profileUrl(f.subject)}"><strong>${esc(s.name)}</strong></a>: ${esc(f.text)}</p>
            <p class="contrib__stats">${fmt(f.verified)} verified · ${fmt(f.comments)} comments · ${esc(f.time)} ago</p>
          </div>
        </li>`;
        })
        .join("")
    : `<li class="contrib__empty">You haven't posted any findings yet.</li>`;

  root.innerHTML = `
    <section class="me__head">
      <img class="me__avatar" src="${esc(me.photo)}" alt="" width="88" height="88">
      <div>
        <p class="eyebrow">My profile</p>
        <h1 class="me__title">Here is what everyone knows about you, ${esc(firstName)}.</h1>
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
        <span class="tile__label">Findings about you</span>
        <span class="tile__value">${aboutMe.length}</span>
        <span class="tile__sub tile__sub--bad">${aboutMe.length} new · ${fmt(aboutMe.reduce((a, f) => a + f.verified, 0))} verifications</span>
      </div>
      <div class="tile">
        <span class="tile__label">Your Public Reception</span>
        <span class="tile__value">${reception.value.toFixed(1)}%</span>
        <span class="tile__sub tile__sub--bad">▼ 6.2 pts since the last finding</span>
      </div>
      <div class="tile">
        <span class="tile__label">Your snooper rank</span>
        <span class="tile__value">Top 8%</span>
        <span class="tile__sub">${byMe.length} finding${byMe.length === 1 ? "" : "s"} posted · ${num(viewer.verificationsGiven || 0)} verifications given</span>
      </div>
    </section>

    <div class="me__grid">
      <div class="me__main">
        <section class="panel">
          <h2 class="panel__title">Profile views · last 14 days</h2>
          <p class="panel__sub">Views jump every time someone posts a finding about you.</p>
          <ol class="vbars" aria-label="Profile views per day">${bars}</ol>
          <div class="vbars__axis"><span>${dayLabel(0)}</span><span>Today</span></div>
        </section>

        <section class="panel">
          <h2 class="panel__title">New findings about you</h2>
          <p class="panel__sub">The crowd decides what is true. You can dispute, add context, or pay to hide.</p>
          <div class="alerts">${aboutMe.map(findingCard).join("") || `<p class="panel__sub">Nothing new. For now.</p>`}</div>
        </section>
      </div>

      <aside class="me__side">
        <section class="panel">
          <h2 class="panel__title">Who looked at you</h2>
          <ul class="lookers">${viewers}</ul>
          <div class="anon">
            <span class="anon__icon" aria-hidden="true">?</span>
            <span><strong>+${viewer.anonymousViewers || 0} anonymous viewers</strong><small>this week</small></span>
            <button type="button" class="tag tag--button tag--premium" id="anon-btn">See who · NOK 99</button>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Your contributions</h2>
          <ul class="contribs">${contributions}</ul>
        </section>
      </aside>
    </div>

    <div class="me__divider">
      <h2 class="section-title">Your file</h2>
      <p>This is exactly what everyone else sees when they look you up.</p>
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
      panel.innerHTML = `<p><strong>Dispute submitted.</strong> The crowd decides: 0 of 500 votes needed. Disputes are visible to everyone who has verified this finding.</p>`;
      btn.disabled = true;
      btn.textContent = "Disputed";
    } else if (act === "context") {
      panel.innerHTML = `
        <form class="context-form">
          <input class="me-input" type="text" placeholder="Your side of the story…" aria-label="Add context">
        </form>`;
      panel.querySelector("input").focus();
    } else if (act === "hide") {
      panel.innerHTML = `
        <div class="premium">
          <p><strong>Snoop Premium</strong> hides this finding from users who don't pay. Your network will still see it.</p>
          <p class="premium__price">NOK 499 / month</p>
          <div class="premium__actions">
            <button type="button" class="btn" data-act="subscribe">Subscribe</button>
            <button type="button" class="tag tag--button" data-act="cancel">Cancel</button>
          </div>
        </div>`;
    } else if (act === "subscribe") {
      panel.innerHTML = `<p><strong>Premium active.</strong> Hidden from free users. 3 people in your network have already seen it.</p>`;
      card.classList.add("is-hidden");
      const hide = card.querySelector('[data-act="hide"]');
      hide.disabled = true;
      hide.textContent = "Hidden · Premium";
    } else if (act === "cancel") {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
  });

  root.addEventListener("submit", (e) => {
    const form = e.target.closest(".context-form");
    if (!form) return;
    e.preventDefault();
    const text = form.querySelector("input").value.trim();
    if (!text) return;
    form.parentElement.innerHTML = `<p><strong>Your context:</strong> “${esc(text)}”</p><p class="premium__note">Context from the subject is shown below the finding, marked “Subject's claim”.</p>`;
  });

  root.querySelector("#anon-btn")?.addEventListener("click", (e) => {
    e.currentTarget.outerHTML = `<small class="anon__locked">Names unlock with Snoop Premium</small>`;
  });
})();
