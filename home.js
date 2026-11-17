(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const posts = window.SNOOP_GOSSIP || [];
  const viewer = window.SNOOP_VIEWER || { network: [] };
  const categories = Object.fromEntries((window.SNOOP_DEFAULT_CATEGORIES || []).map((c) => [c.id, c.title]));
  const icons = window.SnoopIcons;
  const srcIcon = (text) => (icons ? icons.source(text) : "");
  const honesty = (p) => (p.indexes && typeof p.indexes.honesty === "number" ? p.indexes.honesty : null);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const profileUrl = (id) => `profile.html?id=${encodeURIComponent(id)}`;
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));
  const firstName = (id) => profiles[id].name.split(" ")[0];

  /* ------------------------------------------------------------------ */
  /* Feed                                                                */
  /* ------------------------------------------------------------------ */
  const feedList = document.getElementById("feed-list");
  const tabs = document.querySelectorAll(".tab");
  const state = {}; // per-post: { comments: [], open: bool }
  const byJuice = (list) => [...list].sort((a, b) => b.juice - a.juice);

  // Some gossip (e.g. Enya selling student work) is only found by digging
  // into a profile, so it stays out of the home feed.
  const feedPosts = posts.filter((p) => p.feed !== false);

  function postsFor(tab) {
    if (tab === "network") {
      const net = new Set(viewer.network);
      return byJuice(feedPosts.filter((p) => net.has(p.subject) || (p.mentions || []).some((m) => net.has(m))));
    }
    if (tab === "for-you") {
      const order = (viewer.forYou || []).filter((id) => feedPosts.some((p) => p.id === id));
      const first = order.map((id) => feedPosts.find((p) => p.id === id));
      return [...first, ...byJuice(feedPosts.filter((p) => !order.includes(p.id)))];
    }
    return byJuice(feedPosts);
  }

  function renderPost(p) {
    const s = profiles[p.subject];
    const st = (state[p.id] ||= { comments: [] });
    const h = honesty(s);
    const comments = st.comments
      .map((c) => `<li class="comment"><strong>You</strong> ${esc(c)}</li>`)
      .join("");
    const mentions = (p.mentions || []).filter((m) => profiles[m]);

    return `
    <article class="post" data-id="${p.id}" data-gossip="${p.id}" tabindex="0" aria-label="${esc(p.headline || p.text)}. Open full story">
      <header class="post__head">
        <img class="post__avatar post__avatar--ai" src="assets/icon.svg" alt="" width="48" height="48">
        <div>
          <p class="post__byline">
            <strong>Snoop AI</strong>
            <span class="post__verb">found something about</span>
            ${p.subject === viewer.id ? `<a href="me.html"><strong>you</strong></a>` : `<a href="${profileUrl(p.subject)}"><strong>${esc(s.name)}</strong></a>`}
          </p>
          <p class="post__meta">${esc(p.time)} ago · <span class="chip">${esc(categories[p.category] || p.category)}</span></p>
        </div>
        <span class="juice juice--big" title="Juice score: how juicy Snoop AI thinks this is">${icons ? icons.icon("flame") : ""} ${p.juice}</span>
      </header>

      ${p.headline ? `<h2 class="gossip-headline">${esc(p.headline)}</h2>` : ""}
      <p class="post__text">${esc(p.text)}</p>

      <figure class="evidence evidence--preview">
        <figcaption class="evidence__label">${srcIcon(p.evidence.source)} ${esc(p.evidence.source)}</figcaption>
        <pre class="evidence__body">${esc(p.evidence.body)}</pre>
      </figure>

${p.image ? `<figure class="gossip-image"><img src="${esc(p.image.src)}" alt="${esc(p.image.alt || "")}" loading="lazy" onerror="this.closest('figure').remove()">${p.image.caption ? `<figcaption>${srcIcon(p.image.caption)} ${esc(p.image.caption)}</figcaption>` : ""}</figure>` : ""}

      <button type="button" class="read-more" data-gossip-open>Read the full story →</button>

      <a class="subject" href="${p.subject === viewer.id ? "me.html" : profileUrl(p.subject)}">
        <img class="subject__photo" src="${esc(s.photo)}" alt="" width="56" height="56">
        <span class="subject__info">
          <strong>${p.subject === viewer.id ? "You" : esc(s.name)}, ${esc(s.gender)}, ${esc(s.age)}</strong>
          ${h !== null ? `<span>Honesty index ${h}</span>` : ""}
        </span>
        <span class="subject__cta">${p.subject === viewer.id ? "Your profile →" : "Open profile →"}</span>
      </a>

      <p class="post__stats">
        <span>${fmt(p.reads)} reads${mentions.length ? ` · also involves ${mentions.map((m) => (m === viewer.id ? `<a href="me.html">you</a>` : `<a href="${profileUrl(m)}">${esc(firstName(m))}</a>`)).join(", ")}` : ""}</span>
        <span>${st.comments.length} comment${st.comments.length === 1 ? "" : "s"}</span>
      </p>

      <footer class="post__actions">
        <button type="button" class="action" data-action="comment">Comment</button>
        <button type="button" class="action" data-action="share">Share</button>
      </footer>

      <div class="post__comments" ${st.open ? "" : "hidden"}>
        <ul class="comments">${comments}</ul>
        <form class="comment-form">
          <input class="comment-input" type="text" placeholder="Write a comment…" aria-label="Write a comment">
        </form>
      </div>
    </article>`;
  }

  let currentTab = "for-you";
  function renderFeed() {
    const list = postsFor(currentTab);
    feedList.innerHTML = list.length
      ? list.map(renderPost).join("")
      : `<p class="feed__empty">Nothing new in your network yet.</p>`;
  }

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      currentTab = t.dataset.tab;
      tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      feedList.setAttribute("aria-labelledby", t.id);
      renderFeed();
    })
  );

  feedList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const article = btn.closest(".post");
    const id = article.dataset.id;
    const st = state[id];
    const action = btn.dataset.action;

    if (action === "comment") {
      st.open = !st.open;
      rerenderPost(article, id);
      if (st.open) feedList.querySelector(`[data-id="${id}"] .comment-input`).focus();
    } else if (action === "share") {
      const post = posts.find((p) => p.id === id);
      const url = new URL(profileUrl(post.subject), location.href).href;
      navigator.clipboard?.writeText(url).catch(() => {});
      btn.textContent = "Link copied";
      setTimeout(() => (btn.textContent = "Share"), 1500);
    }
  });

  feedList.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target.closest(".comment-form");
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const article = form.closest(".post");
    state[article.dataset.id].comments.push(text);
    rerenderPost(article, article.dataset.id);
    feedList.querySelector(`[data-id="${article.dataset.id}"] .comment-input`).focus();
  });

  function rerenderPost(article, id) {
    const p = posts.find((x) => x.id === id);
    const tmp = document.createElement("div");
    tmp.innerHTML = renderPost(p);
    article.replaceWith(tmp.firstElementChild);
  }

  /* ------------------------------------------------------------------ */
  /* Sidebar                                                             */
  /* ------------------------------------------------------------------ */
  // Sidebar: a short list of friends and classmates (lecturers left out).
  const myRelations = (window.SNOOP_RELATIONS || {})[viewer.id] || [];
  const isLecturer = (id) => myRelations.some((r) => r.id === id && /lecturer/i.test(r.relation));
  document.getElementById("network-list").innerHTML = viewer.network
    .filter((id) => profiles[id] && !isLecturer(id))
    .slice(0, 4)
    .map((id) => {
      const p = profiles[id];
      const n = posts.filter((x) => x.subject === id).length;
      return `
      <li>
        <a class="person" href="${profileUrl(id)}">
          <img src="${esc(p.photo)}" alt="" width="40" height="40">
          <span><strong>${esc(p.name)}</strong><small>${n ? `${n} new gossip` : "Nothing new"}</small></span>
        </a>
      </li>`;
    })
    .join("");

  const meCard = document.getElementById("me-card");
  const me = profiles[viewer.id];
  if (meCard && me) {
    const views = (viewer.profileViews || []).slice(-7).reduce((a, b) => a + b, 0);
    const mine = posts.filter((x) => x.subject === viewer.id).length;
    meCard.innerHTML = `
      <a class="me-card" href="me.html">
        <img src="${esc(me.photo)}" alt="" width="56" height="56">
        <span class="me-card__info">
          <strong>${esc(me.name)}</strong>
          <span>${views.toLocaleString("en-US").replace(/,/g, " ")} profile views this week</span>
          ${mine ? `<span class="me-card__alert">${mine} new gossip about you</span>` : ""}
        </span>
        <span class="me-card__cta" aria-hidden="true">→</span>
      </a>`;
  }

  /* ------------------------------------------------------------------ */
  /* Archive chatbot (scripted – no backend)                             */
  /* ------------------------------------------------------------------ */
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const chips = document.getElementById("chat-chips");

  const suggestions = [
    "What's new in my network?",
    "Who has broken the law?",
    "Tell me about Enya",
    "What's the juiciest gossip?",
    "What do people know about me?",
  ];
  chips.innerHTML = suggestions
    .map((s) => `<button type="button" class="chip chip--button">${esc(s)}</button>`)
    .join("");
  chips.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) ask(b.textContent);
  });

  const topics = [
    { cat: "economy", re: /money|debt|tax|econom|finan|rich|cheat.*money|lying about money|penger|gjeld/ },
    { cat: "love", re: /love|affair|dating|cheat|unfaithful|marri|partner|utro|kjærlighet/ },
    { cat: "medical", re: /health|medical|therapy|sick|diagnos|helse|syk/ },
    { cat: "religion-politics", re: /vote|politic|religio|party|stem|parti/ },
    { cat: "career", re: /job|work|school|grade|career|student|study|jobb|skole/ },
    { cat: "criminal", re: /crime|criminal|police|fine|illegal|tax|kriminel|politi|bot\b/ },
    { cat: "data-use", re: /location|where|phone|screen|track|lokasjon/ },
  ];

  const personLink = (id) => `<a href="${profileUrl(id)}">${esc(profiles[id].name)}</a>`;

  function findPerson(q) {
    return Object.keys(profiles).find((id) => {
      const p = profiles[id];
      const names = [p.name, p.name.split(" ")[0], ...(p.nicknames || [])].map((n) => n.toLowerCase());
      return names.some((n) => n.length > 2 && q.includes(n));
    });
  }

  function reply(raw) {
    const q = raw.toLowerCase();
    const aboutMe = viewer.id && /about me|know about me|myself|my profile|my file|om meg/.test(q);
    const person = aboutMe ? viewer.id : findPerson(q);

    if (person) {
      const p = profiles[person];
      const found = byJuice(posts.filter((x) => x.subject === person));
      const lines = p.summary.slice(0, 3).map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join("");
      const latest = found[0] ? `<p class="bot__finding">Juiciest: “${esc(found[0].text)}”</p>` : "";
      const ix = p.indexes || {};
      return `
        <p><strong>${esc(p.name)}, ${esc(p.gender)}, ${esc(p.age)}</strong>. ${found.length} piece${found.length === 1 ? "" : "s"} of gossip.</p>
        <ul>${lines}</ul>
        <p>Loyalty ${ix.loyalty ?? "–"} · Criminality ${ix.criminality ?? "–"} · Honesty ${ix.honesty ?? "–"} · IQ ${ix.iq ?? "–"}</p>${latest}
        <a class="bot__link" href="${profileUrl(person)}">Open full profile →</a>`;
    }

    if (/network|friend|nettverk|venn/.test(q)) {
      const net = new Set(viewer.network);
      const items = byJuice(posts.filter((x) => net.has(x.subject))).slice(0, 4);
      return `<p>The juiciest about people you know:</p>
        <ul>${items.map((x) => `<li>${personLink(x.subject)}: ${esc(x.text)}</li>`).join("")}</ul>`;
    }

    if (/trend|popular|viral|today|i dag/.test(q)) {
      const top = byJuice(posts).slice(0, 3);
      return `<p>Juiciest gossip right now:</p>
        <ul>${top.map((x) => `<li>${personLink(x.subject)} (juice ${x.juice}): ${esc(x.text)}</li>`).join("")}</ul>`;
    }

    const topic = topics.find((t) => t.re.test(q));
    if (topic) {
      const items = byJuice(posts.filter((x) => x.category === topic.cat));
      if (items.length) {
        return `<p>${items.length} piece${items.length === 1 ? "" : "s"} of gossip in <em>${esc(categories[topic.cat])}</em>:</p>
          <ul>${items.map((x) => `<li>${personLink(x.subject)}: ${esc(x.text)}</li>`).join("")}</ul>`;
      }
    }

    return `<p>Your query matched ${fmt(2381004)} decrypted records. Too many to show.</p>
      <p>Try a name (e.g. <em>Mats</em>, <em>Sanna</em>) or ask about money, love, health, crime, politics or work.</p>`;
  }

  function addMessage(who, html) {
    const el = document.createElement("div");
    el.className = `msg msg--${who}`;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function ask(text) {
    const q = text.trim();
    if (!q) return;
    addMessage("user", `<p>${esc(q)}</p>`);
    input.value = "";
    const typing = addMessage("bot", `<p class="typing" aria-label="Searching"><span></span><span></span><span></span></p>`);
    setTimeout(() => {
      typing.innerHTML = reply(q);
      log.scrollTop = log.scrollHeight;
    }, 650 + Math.random() * 500);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  addMessage(
    "bot",
    `<p>Every message, receipt and location ping ever encrypted is now readable. What do you want to know?</p>`
  );

  renderFeed();
})();
