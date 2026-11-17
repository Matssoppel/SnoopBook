// Full-story view for a piece of gossip. Shared by the home feed, profiles
// and "My profile". Anything with [data-gossip="<id>"] opens it on click, and
// a URL hash like #gossip=g12 opens it on load (handy for the live demo).
(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const gossip = window.SNOOP_GOSSIP || [];
  const me = (window.SNOOP_VIEWER || {}).id;
  const categories = Object.fromEntries((window.SNOOP_DEFAULT_CATEGORIES || []).map((c) => [c.id, c.title]));
  const icons = window.SnoopIcons;
  const icon = (k) => (icons ? icons.icon(k) : "");
  const srcIcon = (t) => (icons ? icons.source(t) : "");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const profileUrl = (id) => `profile.html?id=${encodeURIComponent(id)}`;
  const num = (n) => Number(n).toLocaleString("en-US").replace(/,/g, " ");

  const dialog = document.createElement("dialog");
  dialog.className = "gd";
  dialog.setAttribute("aria-labelledby", "gd-title");
  document.body.appendChild(dialog);

  let lastFocus = null;

  function person(id, role) {
    const p = profiles[id];
    if (!p) return "";
    return `
      <li>
        <a class="gd__person" href="${id === me ? "me.html" : profileUrl(id)}">
          <img src="${esc(p.photo)}" alt="" width="44" height="44">
          <span><strong>${id === me ? "You" : esc(p.name)}</strong><small>${esc(role)}</small></span>
          <span class="gd__go" aria-hidden="true">→</span>
        </a>
      </li>`;
  }

  function render(g) {
    const s = profiles[g.subject];
    const details = (g.details || []).map((d) => `<li>${esc(d)}</li>`).join("");
    const people = [person(g.subject, "Subject"), ...(g.mentions || []).map((m) => person(m, "Also involved"))].join("");
    return `
      <div class="gd__bar">
        <span class="gd__ai"><img class="gd__ai-logo" src="assets/icon.svg" alt="" width="28" height="28"> Snoop AI · full story</span>
        <button type="button" class="gd__close" data-gd-close aria-label="Close">${icon("x")}</button>
      </div>
      <div class="gd__body">
        <p class="gd__meta">
          <span class="chip">${esc(categories[g.category] || g.category)}</span>
          <span>Surfaced ${esc(g.time)} ago</span>
          <span class="juice juice--big" title="Juice score from Snoop AI">${icon("flame")} ${g.juice}</span>
        </p>
        <h2 class="gd__title" id="gd-title">${esc(g.headline || g.text)}</h2>
        ${g.headline ? `<p class="gd__lead">${esc(g.text)}</p>` : ""}

        <figure class="evidence gd__evidence">
          <figcaption class="evidence__label">${srcIcon(g.evidence.source)} ${esc(g.evidence.source)}</figcaption>
          <pre class="evidence__body">${esc(g.evidence.body)}</pre>
        </figure>

${g.image ? `<figure class="gossip-image"><img src="${esc(g.image.src)}" alt="${esc(g.image.alt || "")}" loading="lazy" onerror="this.closest('figure').remove()">${g.image.caption ? `<figcaption>${srcIcon(g.image.caption)} ${esc(g.image.caption)}</figcaption>` : ""}</figure>` : ""}

        ${details ? `<h3 class="gd__h">What else Snoop AI found</h3><ul class="gd__details">${details}</ul>` : ""}

        <h3 class="gd__h">People in this story</h3>
        <ul class="gd__people">${people}</ul>

        <p class="gd__stats">${icon("eye")} ${num(g.reads)} people have read this${g.subject === me ? " · including people you know" : s ? ` · ${esc(s.name.split(" ")[0])} has been notified` : ""}</p>
      </div>`;
  }

  function open(id) {
    const g = gossip.find((x) => x.id === id);
    if (!g) return;
    lastFocus = document.activeElement;
    dialog.innerHTML = render(g);
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    document.body.classList.add("gd-open");
    dialog.querySelector(".gd__body").scrollTop = 0;
    dialog.querySelector("[data-gd-close]").focus();
  }

  function close() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  dialog.addEventListener("close", () => {
    document.body.classList.remove("gd-open");
    if (/^#gossip=/.test(location.hash)) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });

  dialog.addEventListener("click", (e) => {
    // Click on the backdrop (the dialog element itself, outside the content).
    if (e.target === dialog || e.target.closest("[data-gd-close]")) close();
  });

  // Fallback Escape handling when <dialog> isn't supported natively.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialog.hasAttribute("open") && typeof dialog.showModal !== "function") close();
  });

  // Any element with data-gossip opens the story, unless the click was on a
  // real link or button inside it.
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-gossip]");
    if (!trigger || dialog.contains(trigger)) return;
    const inner = e.target.closest("a, button, input, form, label");
    if (inner && inner !== trigger && trigger.contains(inner) && !inner.hasAttribute("data-gossip-open")) return;
    e.preventDefault();
    open(trigger.dataset.gossip);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const t = e.target;
    if (t && t.matches && t.matches("[data-gossip][tabindex]")) {
      e.preventDefault();
      open(t.dataset.gossip);
    }
  });

  window.SnoopGossip = { open, close };

  const m = location.hash.match(/^#gossip=([\w-]+)/);
  if (m) setTimeout(() => open(m[1]), 0);
})();
