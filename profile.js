(function () {
  const params = new URLSearchParams(location.search);
  const profiles = window.SNOOP_PROFILES || {};
  const gossipAll = window.SNOOP_GOSSIP || [];
  const icons = window.SnoopIcons;
  const srcIcon = (text, extra) => (icons ? icons.source(text, extra) : "");
  // On me.html the page shows the viewer's own file.
  const isMe = Boolean(document.body.dataset.me && window.SNOOP_VIEWER?.id);
  const id = (isMe && window.SNOOP_VIEWER.id) || params.get("id") || Object.keys(profiles)[0];
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
  const catTitle = Object.fromEntries(categoryList.map((c) => [c.id, c.title]));
  // Gossip about this person, juiciest first.
  // `profile: false` keeps a story off profiles (it only shows in the feed).
  const gossip = gossipAll.filter((x) => x.subject === id && x.profile !== false).sort((a, b) => b.juice - a.juice);
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

  /* ---------- Indexes (AI-estimated) ---------- */
  const indexDefs = window.SNOOP_INDEXES || [];
  const vals = p.indexes || {};
  const indexes = `
    <section class="card records indexes" aria-labelledby="indexes-title">
      <h2 class="records__title" id="indexes-title">Snoop indexes</h2>
      <p class="indexes__sub">Estimated by Snoop AI from ${num(Math.round(180000 + rand() * 220000))} decrypted records</p>
      <ul class="bars">
        ${indexDefs
          .filter((d) => typeof vals[d.id] === "number")
          .map((d) => {
            const v = vals[d.id];
            const pct = ((v - d.min) / (d.max - d.min)) * 100;
            const avgPct = ((d.avg - d.min) / (d.max - d.min)) * 100;
            const isBad = d.bad === "high" ? v > d.avg : v < d.avg;
            const vs = v === d.avg ? "average" : `${v > d.avg ? "above" : "below"} average (${d.avg})`;
            return `
          <li class="bar index ${isBad ? "is-bad" : ""}" data-tip="${esc(`${d.title}: ${v}, ${vs}. Based on ${d.basis.toLowerCase()}.`)}">
            <span class="bar__label">${esc(d.title)}<small>${esc(d.basis)}</small></span>
            <span class="bar__track" role="meter" aria-valuemin="${d.min}" aria-valuemax="${d.max}" aria-valuenow="${v}" aria-label="${esc(d.title)}">
              <span class="bar__fill" style="width:${Math.max(1.5, pct)}%"></span>
              <span class="index__avg" style="left:${avgPct}%" title="Average: ${d.avg}"></span>
            </span>
            <span class="bar__value">${v}</span>
          </li>`;
          })
          .join("")}
      </ul>
    </section>`;

  /* ---------- Network / relations ---------- */
  // On "My profile" the lecturers are left out of your own network.
  const relations = ((window.SNOOP_RELATIONS || {})[id] || []).filter(
    (r) => profiles[r.id] && !(isMe && /lecturer/i.test(r.relation))
  );
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

  /* ---------- Camera roll (only on "My profile") ---------- */
  const photos = (isMe && window.SNOOP_VIEWER.gallery) || [];
  const SHOW = 6;
  const gallery = photos.length
    ? `
    <section class="gallery" aria-labelledby="gallery-title">
      <h2 class="summary__heading" id="gallery-title">Camera roll</h2>
      <p class="gallery__sub">${srcIcon("iCloud")} ${num(window.SNOOP_VIEWER.galleryTotal || photos.length)} photos from your iCloud backup</p>
      <ul class="gallery__grid">
        ${photos
          .map(
            (ph, i) => `
          <li class="photo"${i >= SHOW ? " hidden" : ""}>
            <button type="button" class="photo__btn" data-photo="${i}" aria-label="${esc(ph.caption || "Photo")}, ${esc(ph.date || "")}">
              <img src="${esc(ph.src)}" alt="" loading="lazy" onerror="this.closest('.photo').classList.add('is-missing')">
              <span class="photo__missing">${esc(ph.src)}</span>
            </button>
          </li>`
          )
          .join("")}
      </ul>
      ${photos.length > SHOW ? `<button type="button" class="gallery__more" data-more aria-expanded="false">See more +</button>` : ""}
    </section>`
    : "";

  /* ---------- Categories ---------- */
  const TL = window.SnoopTimeline;
  const timelines = Object.fromEntries(categoryList.map((c) => [c.id, TL ? TL.build(id, c.id) : { events: [] }]));

  const categories = categoryList
    .map((c) => {
      const n = gossip.filter((f) => f.category === c.id).length;
      const ev = timelines[c.id].events.length;
      return `
      <a class="card card--category" href="#${esc(c.id)}" data-category="${esc(c.id)}" aria-expanded="false" aria-controls="view">
        <span class="card__title">${esc(c.title)}</span>
        <span class="card__desc">${esc(c.description)}</span>
        <span class="badge ${n ? "badge--hot" : ""}">${n ? `${n} gossip` : `${ev} events`}</span>
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
        ${gallery}
      </div>

      <div class="identity__head">
        <p class="eyebrow">Subject file ${fileNo} · updated ${1 + Math.floor(rand() * 11)} h ago</p>
        <h1 class="name">${esc(p.name)}, ${esc(p.gender)}, ${esc(p.age)}</h1>
        <div class="tags">${tags}</div>
      </div>

      <div class="identity__main">
        ${movement}
        ${indexes}
      </div>

      <div class="identity__scores">${network}</div>
    </section>

    <section class="categories" aria-label="Categories">${categories}</section>

    <section class="view" id="view" aria-live="polite" hidden></section>

    <section class="findings" id="findings" aria-labelledby="findings-title">
      <div class="findings__head">
        <h2 class="section-title" id="findings-title">Juiciest gossip about ${esc(firstName)}</h2>
        <p class="findings__sub">${srcIcon("Snoop AI")} Curated by Snoop AI · ranked by juice, trending first</p>
      </div>
      <div class="findings__list" id="findings-list"></div>
    </section>

  `;

  /* ---------- Gossip list (curated by Snoop AI) ---------- */
  const mentionHtml = (ids) =>
    (ids || [])
      .filter((m) => profiles[m])
      .map((m) => `<a class="mention" href="${profileUrl(m)}" title="${esc(profiles[m].name)}"><img src="${esc(profiles[m].photo)}" alt="${esc(profiles[m].name)}" width="28" height="28"></a>`)
      .join("");
  document.getElementById("findings-list").innerHTML = gossip.length
    ? gossip
        .map((f, i) => `
        <article class="finding gossip" id="gossip-${esc(f.id)}" data-gossip="${esc(f.id)}" tabindex="0" aria-label="${esc(f.headline || f.text)}. Open full story">
          <p class="finding__meta">
            <span class="gossip__rank">#${i + 1}</span>
            <span class="chip">${esc(catTitle[f.category] || f.category)}</span>
            <span class="juice" title="Juice score from Snoop AI">${icons ? icons.icon("flame") : ""} ${f.juice}</span>
            <span class="gossip__time">${esc(f.time)} ago</span>
          </p>
          ${f.headline ? `<h3 class="gossip-headline">${esc(f.headline)}</h3>` : ""}
          <p class="finding__text">${esc(f.text)}</p>
          <figure class="evidence evidence--preview">
            <figcaption class="evidence__label">${srcIcon(f.evidence.source)} ${esc(f.evidence.source)}</figcaption>
            <pre class="evidence__body">${esc(f.evidence.body)}</pre>
          </figure>
          ${f.image ? `<figure class="gossip-image"><img src="${esc(f.image.src)}" alt="${esc(f.image.alt || "")}" loading="lazy" onerror="this.closest('figure').remove()">${f.image.caption ? `<figcaption>${srcIcon(f.image.caption)} ${esc(f.image.caption)}</figcaption>` : ""}</figure>` : ""}
          <p class="finding__foot">
            <span class="gossip__mentions">${f.mentions && f.mentions.length ? `Also involved ${mentionHtml(f.mentions)}` : ""}</span>
            <span>${fmt(f.reads)} reads</span>
          </p>
          <button type="button" class="read-more" data-gossip-open>Read the full story →</button>
        </article>`)
        .join("")
    : `<p class="findings__empty">Snoop AI has found nothing juicy yet. It is still indexing ${esc(firstName)}.</p>`;

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
    const tag = e.gossip
      ? `<a class="tl-tag tl-tag--finding" href="#gossip-${esc(e.gossip.id)}" data-gossip="${esc(e.gossip.id)}">Gossip · juice ${e.gossip.juice}</a>`
      : e.hidden
      ? `<span class="tl-tag tl-tag--hidden">Hidden</span>`
      : "";
    return `
      <li class="tl-event ${e.hidden || e.gossip ? "is-flagged" : ""}">
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-body">
          <p class="tl-date">${esc(fmtDate(e.date))} ${tag}</p>
          <p class="tl-title">${esc(e.title)}</p>
          ${e.detail ? `<p class="tl-detail">${esc(e.detail)}</p>` : ""}
          <p class="tl-foot">
            ${e.source ? `<span class="tl-source">${srcIcon(e.source, e.title)} ${esc(e.source.replace(/\s*\(decrypted\)/i, ""))}</span>` : ""}
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
    const hidden = ev.filter((e) => e.hidden || e.gossip).length;
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

  /* ---------- Camera roll: see more + photo viewer ---------- */
  if (photos.length) {
    const galleryEl = root.querySelector(".gallery");
    const dlg = document.createElement("dialog");
    dlg.className = "gd photo-view";
    document.body.appendChild(dlg);
    galleryEl.addEventListener("click", (e) => {
      const more = e.target.closest("[data-more]");
      if (more) {
        const open = more.getAttribute("aria-expanded") !== "true";
        galleryEl.querySelectorAll(".photo").forEach((li, i) => (li.hidden = !open && i >= SHOW));
        more.setAttribute("aria-expanded", String(open));
        more.textContent = open ? "Show less −" : "See more +";
        return;
      }
      const b = e.target.closest("[data-photo]");
      if (!b || b.closest(".is-missing")) return;
      const ph = photos[Number(b.dataset.photo)];
      dlg.innerHTML = `
        <div class="gd__bar">
          <span class="gd__ai">${srcIcon("iCloud")} ${esc(ph.date || "")}${ph.place ? ` · ${esc(ph.place)}` : ""}</span>
          <button type="button" class="gd__close" data-close-photo aria-label="Close">${icons ? icons.icon("x") : "×"}</button>
        </div>
        <img class="photo-view__img" src="${esc(ph.src)}" alt="${esc(ph.caption || "")}">
        ${ph.caption ? `<p class="photo-view__cap">${esc(ph.caption)}</p>` : ""}`;
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    });
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-close-photo]")) {
        if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
      }
    });
  }
})();
