(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const posts = window.SNOOP_POSTS || [];
  const viewer = window.SNOOP_VIEWER || { network: [] };
  const categories = Object.fromEntries(
    [...(window.SNOOP_DEFAULT_CATEGORIES || []), { id: "public-reception", title: "Public Reception" }].map((c) => [c.id, c.title])
  );

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
  const state = {}; // per-post: { vote: "verify" | "dispute" | null, comments: [] }

  function postsFor(tab) {
    if (tab === "network") {
      const net = new Set(viewer.network);
      return posts.filter((p) => net.has(p.subject) || net.has(p.author));
    }
    return [...posts].sort((a, b) => b.verified - a.verified);
  }

  function renderPost(p) {
    const a = profiles[p.author];
    const s = profiles[p.subject];
    const st = (state[p.id] ||= { vote: null, comments: [] });
    const verified = p.verified + (st.vote === "verify" ? 1 : 0);
    const disputed = p.disputed + (st.vote === "dispute" ? 1 : 0);
    const accuracy = Math.round((verified / (verified + disputed)) * 100);
    const comments = st.comments
      .map((c) => `<li class="comment"><strong>You</strong> ${esc(c)}</li>`)
      .join("");

    return `
    <article class="post" data-id="${p.id}">
      <header class="post__head">
        <a href="${profileUrl(p.author)}"><img class="post__avatar" src="${esc(a.photo)}" alt="" width="48" height="48"></a>
        <div>
          <p class="post__byline">
            <a href="${profileUrl(p.author)}"><strong>${esc(a.name)}</strong></a>
            <span class="post__verb">snooped on</span>
            <a href="${profileUrl(p.subject)}"><strong>${esc(s.name)}</strong></a>
          </p>
          <p class="post__meta">${esc(p.time)} · <span class="chip">${esc(categories[p.category] || p.category)}</span></p>
        </div>
      </header>

      <p class="post__text">${esc(p.text)}</p>

      <figure class="evidence">
        <figcaption class="evidence__label"><span class="evidence__tag">Decrypted</span> ${esc(p.evidence.source)}</figcaption>
        <pre class="evidence__body">${esc(p.evidence.body)}</pre>
      </figure>

      <a class="subject" href="${profileUrl(p.subject)}">
        <img class="subject__photo" src="${esc(s.photo)}" alt="" width="56" height="56">
        <span class="subject__info">
          <strong>${esc(s.name)}, ${esc(s.gender)}, ${esc(s.age)}</strong>
          <span>Public Reception ${s.scores[1].value.toFixed(1)}%</span>
        </span>
        <span class="subject__cta">Open profile →</span>
      </a>

      <p class="post__stats">
        <span>${fmt(verified)} verified · ${fmt(disputed)} disputed · ${accuracy}% accuracy</span>
        <span>${fmt(p.comments + st.comments.length)} comments</span>
      </p>

      <footer class="post__actions">
        <button type="button" class="action ${st.vote === "verify" ? "is-on" : ""}" data-action="verify" aria-pressed="${st.vote === "verify"}">✓ Verify</button>
        <button type="button" class="action ${st.vote === "dispute" ? "is-on is-dispute" : ""}" data-action="dispute" aria-pressed="${st.vote === "dispute"}">✕ Dispute</button>
        <button type="button" class="action" data-action="comment">Comment</button>
        <button type="button" class="action" data-action="share">Share</button>
      </footer>

      <div class="post__comments" ${st.open ? "" : "hidden"}>
        <ul class="comments">${comments}</ul>
        <form class="comment-form">
          <input class="comment-input" type="text" placeholder="Add context or another finding…" aria-label="Write a comment">
        </form>
      </div>
    </article>`;
  }

  let currentTab = "trending";
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

    if (action === "verify" || action === "dispute") {
      st.vote = st.vote === action ? null : action;
      rerenderPost(article, id);
    } else if (action === "comment") {
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
  document.getElementById("network-list").innerHTML = viewer.network
    .filter((id) => profiles[id])
    .map((id) => {
      const p = profiles[id];
      const n = posts.filter((x) => x.subject === id).length;
      return `
      <li>
        <a class="person" href="${profileUrl(id)}">
          <img src="${esc(p.photo)}" alt="" width="40" height="40">
          <span><strong>${esc(p.name)}</strong><small>${n} new finding${n === 1 ? "" : "s"}</small></span>
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
          ${mine ? `<span class="me-card__alert">${mine} new finding${mine === 1 ? "" : "s"} about you</span>` : ""}
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
    "Who is lying about money?",
    "Tell me about Jan Thomas",
    "What's trending today?",
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
      const found = posts.filter((x) => x.subject === person);
      const lines = p.summary.slice(0, 3).map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join("");
      const latest = found[0] ? `<p class="bot__finding">Latest finding: “${esc(found[0].text)}”</p>` : "";
      return `
        <p><strong>${esc(p.name)}, ${esc(p.gender)}, ${esc(p.age)}</strong>. ${fmt(18000 + p.age * 731)} records indexed, ${found.length} crowd-verified finding${found.length === 1 ? "" : "s"}.</p>
        <ul>${lines}</ul>${latest}
        <a class="bot__link" href="${profileUrl(person)}">Open full profile →</a>`;
    }

    if (/network|friend|nettverk|venn/.test(q)) {
      const net = new Set(viewer.network);
      const items = posts.filter((x) => net.has(x.subject)).slice(0, 4);
      return `<p>${items.length} new findings about people you know:</p>
        <ul>${items.map((x) => `<li>${personLink(x.subject)}: ${esc(x.text)}</li>`).join("")}</ul>`;
    }

    if (/trend|popular|viral|today|i dag/.test(q)) {
      const top = [...posts].sort((a, b) => b.verified - a.verified).slice(0, 3);
      return `<p>Most verified findings right now:</p>
        <ul>${top.map((x) => `<li>${personLink(x.subject)} (${fmt(x.verified)} verified): ${esc(x.text)}</li>`).join("")}</ul>`;
    }

    const topic = topics.find((t) => t.re.test(q));
    if (topic) {
      const items = posts.filter((x) => x.category === topic.cat);
      if (items.length) {
        return `<p>${items.length} matching finding${items.length === 1 ? "" : "s"} in <em>${esc(categories[topic.cat])}</em>:</p>
          <ul>${items.map((x) => `<li>${personLink(x.subject)}: ${esc(x.text)}</li>`).join("")}</ul>`;
      }
    }

    return `<p>Your query matched ${fmt(2381004)} decrypted records. Too many to show.</p>
      <p>Try a name (e.g. <em>Ingrid</em>, <em>Petter</em>) or ask about money, love, health, politics or work.</p>`;
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
