(function () {
  const params = new URLSearchParams(location.search);
  const profiles = window.SNOOP_PROFILES || {};
  const posts = window.SNOOP_POSTS || [];
  // On me.html the page shows the viewer's own file.
  const id = (document.body.dataset.me && window.SNOOP_VIEWER?.id) || params.get("id") || Object.keys(profiles)[0];
  const p = profiles[id];
  const root = document.getElementById("profile");

  if (!p) {
    root.innerHTML = `<p class="empty">No profile found.</p>`;
    return;
  }

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));
  const num = (n) => n.toLocaleString("en-US").replace(/,/g, " ");
  const profileUrl = (pid) => `profile.html?id=${encodeURIComponent(pid)}`;

  // Deterministic pseudo-random numbers per person, so the fiction is stable between reloads.
  let seed = [...(p.idNumber + id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  const categoryList = p.categories || window.SNOOP_DEFAULT_CATEGORIES;
  const catTitle = Object.fromEntries(
    [...categoryList, { id: "public-reception", title: "Public Reception" }].map((c) => [c.id, c.title])
  );
  const findings = posts.filter((x) => x.subject === id);
  const firstName = p.name.split(" ")[0];
  const fileNo = `SB-${String(seed % 100000).padStart(5, "0")}`;

  document.title = `${p.name} – Snoop Book`;

  /* ---------- Identity ---------- */
  const summary = p.summary
    .map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`)
    .join("");

  const tags = [
    `<span class="tag tag--mono">ID ${esc(p.idNumber)}</span>`,
    ...(p.nicknames || []).map((n) => `<span class="tag">aka ${esc(n)}</span>`),
  ].join("");

  // Map: full route if we have one, otherwise a "last seen" pin.
  const map = p.movement || { map: "assets/map-oslo.png" };
  const pin = { x: 20 + rand() * 60, y: 25 + rand() * 50, mins: 3 + Math.floor(rand() * 55) };
  const movement = `
    <figure class="movement" aria-label="${p.movement?.route ? "Movement pattern" : "Last known location"}">
      <img class="movement__map" src="${esc(map.map)}" alt="Map of Oslo">
      ${
        map.route
          ? `<img class="movement__route" src="${esc(map.route)}" alt="" width="243.623" height="205.375">`
          : `<span class="movement__pin" style="left:${pin.x}%;top:${pin.y}%"></span>`
      }
      <figcaption class="movement__caption">
        <span class="live-dot" aria-hidden="true"></span>
        ${map.route ? "Movement · last 7 days" : `Last seen ${pin.mins} min ago`}
      </figcaption>
    </figure>`;

  /* ---------- Scores ---------- */
  const scores = p.scores
    .map(
      (s) => `
      <div class="card card--score" id="${esc(s.id)}">
        <span class="card__title">${esc(s.title)}</span>
        <span class="card__desc">${esc(s.description)}</span>
        <span class="score__trend score__trend--${esc(s.trend)}">
          <span aria-hidden="true">${s.trend === "above" ? "▲" : "▼"}</span> ${esc(s.trend)} average
        </span>
        <span class="score__value">${s.value.toFixed(1)}%</span>
        <span class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.value}" aria-label="${esc(s.title)} score">
          <span class="meter__fill" style="width:${s.value}%"></span>
          <span class="meter__avg" title="Average: 50%"></span>
        </span>
      </div>`
    )
    .join("");

  /* ---------- Records by source (single-series bar chart) ---------- */
  const sources = [
    ["Messages", 18000 + rand() * 60000],
    ["Card transactions", 6000 + rand() * 20000],
    ["Location pings", 40000 + rand() * 140000],
    ["Search queries", 9000 + rand() * 40000],
    ["Health records", 20 + rand() * 300],
  ].map(([label, v]) => [label, Math.round(v)]);
  const maxRec = Math.max(...sources.map((s) => s[1]));
  const totalRec = sources.reduce((a, s) => a + s[1], 0);
  const records = `
    <section class="card records" aria-labelledby="records-title">
      <h2 class="records__title" id="records-title">Records indexed</h2>
      <p class="records__total">${num(totalRec)}</p>
      <ul class="bars">
        ${sources
          .map(
            ([label, v]) => `
          <li class="bar" data-tip="${num(v)} ${label.toLowerCase()} decrypted">
            <span class="bar__label">${esc(label)}</span>
            <span class="bar__track"><span class="bar__fill" style="width:${Math.max(1.5, (v / maxRec) * 100)}%"></span></span>
            <span class="bar__value">${fmt(v)}</span>
          </li>`
          )
          .join("")}
      </ul>
    </section>`;

  /* ---------- Network / relations ---------- */
  const relations = ((window.SNOOP_RELATIONS || {})[id] || []).filter((r) => profiles[r.id]);
  const hiddenCount = relations.filter((r) => r.hidden).length;
  const network = `
    <section class="card network" aria-labelledby="network-title">
      <h2 class="network__title" id="network-title">Network</h2>
      <p class="network__count">${relations.length} connection${relations.length === 1 ? "" : "s"}${
        hiddenCount ? ` · <span class="network__hidden">${hiddenCount} hidden</span>` : ""
      }</p>
      ${
        relations.length
          ? `<ul class="relations">
        ${relations
          .map((r) => {
            const rp = profiles[r.id];
            return `
          <li>
            <a class="relation ${r.hidden ? "relation--hidden" : ""}" href="${profileUrl(r.id)}">
              <img class="relation__photo" src="${esc(rp.photo)}" alt="" width="48" height="48">
              <span class="relation__info">
                <strong>${esc(rp.name)}, ${esc(rp.age)}</strong>
                <small>${esc(r.note || "")}</small>
              </span>
              <span class="relation__type">${r.hidden ? '<span aria-hidden="true">●</span> ' : ""}${esc(r.relation)}</span>
            </a>
          </li>`;
          })
          .join("")}
      </ul>`
          : `<p class="network__empty">No connections indexed yet.</p>`
      }
    </section>`;

  /* ---------- Categories ---------- */
  const TL = window.SnoopTimeline;
  const timelines = Object.fromEntries(categoryList.map((c) => [c.id, TL ? TL.build(id, c.id) : { events: [] }]));

  const categories = categoryList
    .map((c) => {
      const n = findings.filter((f) => f.category === c.id).length;
      const ev = timelines[c.id].events.length;
      return `
      <a class="card card--category" href="#${esc(c.id)}" data-category="${esc(c.id)}" aria-expanded="false" aria-controls="view">
        <span class="card__title">${esc(c.title)}</span>
        <span class="card__desc">${esc(c.description)}</span>
        <span class="badge ${n ? "badge--hot" : ""}">${n ? `${n} finding${n === 1 ? "" : "s"}` : `${ev} events`}</span>
      </a>`;
    })
    .join("");

  root.innerHTML = `
    <section class="identity">
      <div class="identity__left">
        <div class="avatar-wrap">
          <img class="avatar" src="${esc(p.photo)}" alt="Profile photo of ${esc(p.name)}" width="273" height="273">
          <span class="stamp" aria-hidden="true">Decrypted</span>
        </div>
        <h2 class="summary__heading">Summary</h2>
        <ul class="summary">${summary}</ul>
      </div>

      <div class="identity__main">
        <p class="eyebrow">Subject file ${fileNo} · updated ${1 + Math.floor(rand() * 11)} h ago</p>
        <h1 class="name">${esc(p.name)}, ${esc(p.gender)}, ${esc(p.age)}</h1>
        <div class="tags">${tags}</div>
        ${movement}
        ${records}
      </div>

      <div class="identity__scores">${scores}${network}</div>
    </section>

    <section class="categories" aria-label="Categories">${categories}</section>

    <section class="view" id="view" aria-live="polite" hidden></section>

    <section class="findings" id="findings" aria-labelledby="findings-title">
      <div class="findings__head">
        <h2 class="section-title" id="findings-title">Findings about ${esc(firstName)}</h2>
      </div>
      <div class="findings__list" id="findings-list"></div>
    </section>
  `;

  /* ---------- Findings list ---------- */
  document.getElementById("findings-list").innerHTML = findings.length
    ? findings
        .map((f) => {
          const a = profiles[f.author];
          return `
        <article class="finding" id="finding-${esc(f.id)}">
          <p class="finding__meta"><span class="chip">${esc(catTitle[f.category] || f.category)}</span> ${esc(f.time)} ago</p>
          <p class="finding__text">${esc(f.text)}</p>
          <figure class="evidence">
            <figcaption class="evidence__label"><span class="evidence__tag">Decrypted</span> ${esc(f.evidence.source)}</figcaption>
            <pre class="evidence__body">${esc(f.evidence.body)}</pre>
          </figure>
          <p class="finding__foot">
            <a class="finding__author" href="${profileUrl(f.author)}">
              <img src="${esc(a.photo)}" alt="" width="28" height="28"> Found by <strong>${esc(a.name)}</strong>
            </a>
            <span>${fmt(f.verified)} verified</span>
          </p>
        </article>`;
        })
        .join("")
    : `<p class="findings__empty">No verified findings yet. The archive is still indexing ${esc(firstName)}.</p>`;

  /* ---------- Category views ---------- */
  const view = document.getElementById("view");
  const cards = root.querySelectorAll(".card--category");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (d) => (d.length > 4 ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : d);
  const nok = (v) => `${v < 0 ? "−" : ""}NOK ${num(Math.abs(Math.round(v)))}`;
  const nokShort = (v) => `${v < 0 ? "−" : ""}${Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(1) + "m" : Math.round(Math.abs(v) / 1000) + "k"}`;
  let current = null;

  function eventHtml(e) {
    const person = e.person && profiles[e.person];
    const tag = e.finding
      ? `<a class="tl-tag tl-tag--finding" href="#finding-${esc(e.finding.id)}">Finding · ${fmt(e.finding.verified)} verified</a>`
      : e.hidden
      ? `<span class="tl-tag tl-tag--hidden">Hidden</span>`
      : "";
    return `
      <li class="tl-event ${e.hidden || e.finding ? "is-flagged" : ""}">
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-body">
          <p class="tl-date">${esc(fmtDate(e.date))} ${tag}</p>
          <p class="tl-title">${esc(e.title)}</p>
          ${e.detail ? `<p class="tl-detail">${esc(e.detail)}</p>` : ""}
          <p class="tl-foot">
            ${e.source ? `<span class="tl-source">Decrypted · ${esc(e.source.replace(/\s*\(decrypted\)/i, ""))}</span>` : ""}
            ${typeof e.amount === "number" ? `<span class="tl-amount">${e.amount > 0 ? "+" : ""}${nok(e.amount)}</span>` : ""}
            ${person ? `<a class="tl-person" href="${profileUrl(e.person)}"><img src="${esc(person.photo)}" alt="" width="24" height="24">${esc(person.name)}</a>` : ""}
          </p>
        </div>
      </li>`;
  }

  function timelineHtml(events) {
    if (!events.length) return `<p class="findings__empty">Nothing indexed in this category yet.</p>`;
    const years = [];
    events.forEach((e) => {
      const y = e.date.slice(0, 4);
      if (!years.length || years[years.length - 1].y !== y) years.push({ y, items: [] });
      years[years.length - 1].items.push(e);
    });
    return `<ol class="timeline">${years
      .map((g) => `<li class="tl-year"><h3 class="tl-year__label">${g.y}</h3><ol class="tl-events">${g.items.map(eventHtml).join("")}</ol></li>`)
      .join("")}</ol>`;
  }

  function openView(cat, scroll = true) {
    const c = categoryList.find((x) => x.id === cat);
    if (!c) return;
    current = cat;
    const t = timelines[cat];
    const ev = t.events;
    const hidden = ev.filter((e) => e.hidden || e.finding).length;
    const sources = new Set(ev.map((e) => e.source).filter(Boolean)).size;
    const span = ev.length ? `${ev[ev.length - 1].date.slice(0, 4)}–${ev[0].date.slice(0, 4)}` : "–";

    let economy = "";
    if (t.balance) {
      const b = t.balance;
      const last = b[b.length - 1].value;
      const change = last - b[0].value;
      const low = b.reduce((m, x) => (x.value < m.value ? x : m), b[0]);
      economy = `
        <div class="econ">
          <div class="econ__stats">
            <div class="stat"><span class="stat__label">Current balance</span><span class="stat__value">${nok(last)}</span></div>
            <div class="stat"><span class="stat__label">Change, 24 months</span><span class="stat__value stat__value--sm">${change >= 0 ? "▲ +" : "▼ "}${nok(change)}</span></div>
            <div class="stat"><span class="stat__label">Lowest point</span><span class="stat__value stat__value--sm">${nok(low.value)} <small>${esc(fmtDate(low.month))}</small></span></div>
          </div>
          <figure class="chart" aria-label="Account balance over the last 24 months">
            <figcaption class="chart__title">Account balance · last 24 months</figcaption>
            <div class="chart__plot" id="chart-plot"></div>
          </figure>
        </div>`;
    }

    view.innerHTML = `
      <div class="view__head">
        <div>
          <p class="eyebrow">${esc(p.name)} · category file</p>
          <h2 class="section-title">${esc(c.title)}</h2>
          <p class="view__desc">${esc(c.description)}</p>
        </div>
        <button type="button" class="view__close" aria-label="Close ${esc(c.title)}">✕</button>
      </div>
      <dl class="view__stats">
        <div><dt>Events</dt><dd>${ev.length}</dd></div>
        <div><dt>Hidden or flagged</dt><dd class="${hidden ? "is-bad" : ""}">${hidden}</dd></div>
        <div><dt>Sources</dt><dd>${sources}</dd></div>
        <div><dt>Span</dt><dd>${span}</dd></div>
      </dl>
      ${economy}
      ${t.balance ? `<h3 class="view__sub">Transactions</h3>` : ""}
      ${timelineHtml(ev)}
    `;
    view.hidden = false;
    cards.forEach((card) => {
      const on = card.dataset.category === cat;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-expanded", String(on));
    });
    view.querySelector(".view__close").addEventListener("click", closeView);
    if (t.balance) drawBalance(document.getElementById("chart-plot"), t.balance, ev);
    history.replaceState(null, "", `#${cat}`);
    if (scroll) view.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeView() {
    current = null;
    view.hidden = true;
    view.innerHTML = "";
    cards.forEach((card) => {
      card.classList.remove("is-active");
      card.setAttribute("aria-expanded", "false");
    });
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ---------- Balance chart (single series line, SVG) ---------- */
  function niceTicks(min, max, count = 4) {
    const raw = (max - min) / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
    return ticks;
  }

  function drawBalance(el, series, events) {
    const W = el.clientWidth;
    const H = 280;
    const m = { t: 16, r: 16, b: 30, l: 64 };
    const vals = series.map((d) => d.value);
    const ticks = niceTicks(Math.min(0, ...vals), Math.max(...vals));
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const x = (i) => m.l + (i / (series.length - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const line = series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
    const area = `${line}L${x(series.length - 1)},${y(Math.max(0, y0))}L${x(0)},${y(Math.max(0, y0))}Z`;
    const marks = series
      .map((d, i) => ({ d, i, evs: events.filter((e) => typeof e.amount === "number" && e.date === d.month) }))
      .filter((o) => o.evs.length);

    el.innerHTML = `
      <svg class="chart__svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of account balance">
        ${ticks
          .map(
            (t) => `<line class="chart__grid ${t === 0 ? "is-zero" : ""}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>
          <text class="chart__ylabel" x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${t === 0 ? "0" : nokShort(t)}</text>`
          )
          .join("")}
        ${series
          .map((d, i) => (i % 6 === 0 ? `<text class="chart__xlabel" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}">${MONTHS[Number(d.month.slice(5)) - 1]} ${d.month.slice(2, 4)}</text>` : ""))
          .join("")}
        <path class="chart__area" d="${area}"/>
        <path class="chart__line" d="${line}"/>
        ${marks
          .map((o) => `<circle class="chart__mark ${o.evs.some((e) => e.hidden) ? "is-hidden" : ""}" cx="${x(o.i)}" cy="${y(o.d.value)}" r="5"/>`)
          .join("")}
        <line class="chart__cross" id="chart-cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
        <circle class="chart__focus" id="chart-focus" r="5" visibility="hidden"/>
        <rect class="chart__hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}"/>
      </svg>
      <div class="chart__tip" id="chart-tip" hidden></div>`;

    const svg = el.querySelector("svg");
    const cross = el.querySelector("#chart-cross");
    const focus = el.querySelector("#chart-focus");
    const tip = el.querySelector("#chart-tip");
    const hit = el.querySelector(".chart__hit");

    function show(i) {
      const d = series[i];
      const cx = x(i), cy = y(d.value);
      cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
      focus.setAttribute("cx", cx); focus.setAttribute("cy", cy); focus.setAttribute("visibility", "visible");
      const evs = events.filter((e) => typeof e.amount === "number" && e.date === d.month);
      tip.innerHTML = `<strong>${esc(fmtDate(d.month))}</strong><span>${nok(d.value)}</span>${evs
        .map((e) => `<em class="${e.hidden ? "is-hidden" : ""}">${esc(e.title)} · ${e.amount > 0 ? "+" : ""}${nok(e.amount)}</em>`)
        .join("")}`;
      tip.hidden = false;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.min(Math.max(cx - tw / 2, 0), W - tw)}px`;
      tip.style.top = `${Math.max(cy - tip.offsetHeight - 14, 0)}px`;
    }
    function hide() {
      cross.setAttribute("visibility", "hidden");
      focus.setAttribute("visibility", "hidden");
      tip.hidden = true;
    }
    function nearest(evt) {
      const r = svg.getBoundingClientRect();
      const px = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
      return Math.max(0, Math.min(series.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (series.length - 1))));
    }
    hit.addEventListener("mousemove", (e) => show(nearest(e)));
    hit.addEventListener("touchstart", (e) => show(nearest(e)), { passive: true });
    hit.addEventListener("mouseleave", hide);
  }

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (current === "economy") drawBalance(document.getElementById("chart-plot"), timelines.economy.balance, timelines.economy.events);
    }, 150);
  });

  cards.forEach((c) =>
    c.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = c.dataset.category;
      cat === current ? closeView() : openView(cat);
    })
  );

  const initial = location.hash.slice(1);
  if (initial && timelines[initial]) openView(initial, false);
})();
