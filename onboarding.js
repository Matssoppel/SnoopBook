// Onboarding shown the first time the app is opened.
//
// 1. What Snoop Book is      (the Big Leak, 4.1 bn decrypted records)
// 2. How it works            (crowdsourced, peer-to-peer: installing = hosting)
// 3. Terms                   (a deliberate dark pattern: "Accept all" is the easy way)
// 4. Create account          (bait: the app recognises the device and fills in the form itself)
// 5. "We already know you"   (…and switch: your full file is shown)
// 6. You are now a node      (your device hosts other people's secrets, and yours)
//
// Shown once per browser. Replay with ?intro in the URL or the "Replay intro" link.

(function () {
  const KEY = "snoopbook:onboarded";
  const params = new URLSearchParams(location.search);
  const force = params.has("intro");

  let seen = false;
  try {
    seen = localStorage.getItem(KEY) === "1";
  } catch (e) {
    /* storage blocked: show the intro */
  }

  const profiles = window.SNOOP_PROFILES || {};
  const viewer = window.SNOOP_VIEWER || {};
  const gossip = window.SNOOP_GOSSIP || [];
  const me = profiles[viewer.id];
  if (!me) return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const field = (k) => ((me.summary || []).find(([key]) => key === k) || [])[1] || "";
  const firstName = me.name.split(" ")[0];
  // The onboarding names Mina (best friend) as someone who looked you up.
  const firstLooker = (viewer.viewers || []).find((v) => v.id === "mina" && profiles[v.id]) || (viewer.viewers || []).find((v) => profiles[v.id]);
  const aboutMe = gossip.filter((g) => g.subject === viewer.id).length;
  const icon = (k) => (window.SnoopIcons ? window.SnoopIcons.icon(k) : "");

  // Replay link in the sidebar.
  const replay = document.getElementById("replay-intro");
  if (replay) replay.addEventListener("click", (e) => { e.preventDefault(); open(); });

  if (!seen || force) open();

  function done() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function open() {
    const el = document.createElement("div");
    el.className = "ob";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Welcome to Snoop Book");
    document.body.appendChild(el);
    document.body.classList.add("ob-open");

    const STEPS = 6;
    let step = 0;
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    // Holds both setTimeout and requestAnimationFrame ids.
    const clearTimers = () => {
      timers.forEach((id) => { clearTimeout(id); cancelAnimationFrame(id); });
      timers = [];
    };

    function close() {
      clearTimers();
      done();
      el.classList.add("is-leaving");
      setTimeout(() => {
        el.remove();
        document.body.classList.remove("ob-open");
      }, 250);
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape" && step < 3) close();
    }
    document.addEventListener("keydown", onKey);

    const dots = (i) =>
      `<ol class="ob__dots" aria-hidden="true">${Array.from({ length: STEPS }, (_, k) => `<li class="${k === i ? "is-on" : k < i ? "is-done" : ""}"></li>`).join("")}</ol>`;

    /* ---------- Peer-to-peer network drawing ---------- */
    function network() {
      // Deterministic ring of nodes around "you".
      const nodes = [];
      let s = 7;
      const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + r() * 0.3;
        const d = 95 + r() * 95;
        nodes.push({ x: 220 + Math.cos(a) * d * 1.45, y: 150 + Math.sin(a) * d * 0.72 });
      }
      const links = [];
      nodes.forEach((n, i) => {
        links.push([n, nodes[(i + 1) % nodes.length]]);
        if (i % 3 === 0) links.push([n, nodes[(i + 7) % nodes.length]]);
      });
      return `
        <svg class="ob-net" viewBox="0 0 440 300" role="img" aria-label="Your device joins a network of other devices. There is no central server.">
          ${links.map(([a, b]) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`).join("")}
          ${nodes.map((n, i) => `<line class="ob-net__you-link" style="animation-delay:${(i % 9) * 0.12}s" x1="220" y1="150" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}"/>`).filter((_, i) => i % 4 === 0).join("")}
          ${nodes.map((n, i) => `<circle class="ob-net__node" style="animation-delay:${(i % 7) * 0.25}s" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="6"/>`).join("")}
          <circle class="ob-net__you" cx="220" cy="150" r="22"/>
          <text class="ob-net__label" x="220" y="155" text-anchor="middle">YOU</text>
        </svg>`;
    }

    /* ---------- Steps ---------- */
    const views = [
      // 0 · What it is
      () => `
        <div class="ob__card ob__card--hero">
          <img class="ob__logo" src="assets/logo-wordmark.svg" alt="Snoop Book" width="1673" height="858">
          <p class="ob__eyebrow">14 August 2030 · The Big Leak</p>
          <h1 class="ob__title">Every secret ever encrypted is now readable.</h1>
          <p class="ob__text">Messages, health records, bank statements, search history, location pings. Everything the tech giants collected about us for decades was decrypted in one hour.</p>
          <p class="ob__text"><strong>Snoop Book</strong> makes all of it searchable. Look anyone up. See what they really are.</p>
          <ul class="ob__facts">
            <li><strong>4.1 bn</strong><span>decrypted records</span></li>
            <li><strong>0 %</strong><span>encryption still holding</span></li>
            <li><strong>20</strong><span>days since the leak</span></li>
          </ul>
          <div class="ob__actions">
            <button type="button" class="ob__btn" data-next>How does it work?</button>
            <button type="button" class="ob__link" data-skip>Skip intro</button>
          </div>
        </div>`,

      // 1 · Crowdsourced, peer-to-peer
      () => `
        <div class="ob__card ob__card--split">
          <div>
            <p class="ob__eyebrow">How it works</p>
            <h2 class="ob__title">Owned by no one. Hosted by everyone.</h2>
            <p class="ob__text">Big Tech kept our data on their servers for decades. Snoop Book has no servers, no company and no owner.</p>
            <ul class="ob__list">
              <li><span class="ob__num">1</span><span><strong>You install the app.</strong> Your device becomes a node in the network.</span></li>
              <li><span class="ob__num">2</span><span><strong>You host a piece of the archive.</strong> Encrypted shards of other people’s lives are stored on your device.</span></li>
              <li><span class="ob__num">3</span><span><strong>You help index it.</strong> Your device matches records to names while you sleep.</span></li>
            </ul>
            <p class="ob__quote">“They took our data. Now it belongs to all of us.”</p>
          </div>
          <figure class="ob__figure">
            ${network()}
            <figcaption><strong>2 184 302</strong> devices online · <strong>0</strong> servers · <strong>0</strong> owners</figcaption>
          </figure>
          <div class="ob__actions ob__actions--wide">
            <button type="button" class="ob__btn" data-next>Become a node</button>
            <button type="button" class="ob__link" data-back>Back</button>
          </div>
        </div>`,

      // 2 · Terms (dark pattern on purpose)
      () => `
        <div class="ob__card">
          <p class="ob__eyebrow">One more thing</p>
          <h2 class="ob__title">Terms of hosting</h2>
          <p class="ob__text">Estimated reading time: <strong>47 minutes</strong>.</p>
          <div class="ob__terms" tabindex="0" aria-label="Terms of hosting">
            <p><strong>§1.</strong> By installing Snoop Book you agree to store, index and redistribute personal data about other people on your device.</p>
            <p><strong>§2.</strong> Data about you is stored on other people’s devices on the same terms. It cannot be removed, because nobody owns the network.</p>
            <p><strong>§3.</strong> Your contacts, photos, location and microphone are used to improve matching between records and real people.</p>
            <p><strong>§4.</strong> Your searches are visible to the people you search for.</p>
            <p><strong>§5.</strong> You waive the right to be forgotten in all jurisdictions, including future ones.</p>
            <p><strong>§6.</strong> You agree to hand over your first-born child to the network on request.</p>
            <p><strong>§7.</strong> These terms may change at any time. Continued use means you accept the changes.</p>
            <p class="ob__terms-more">…and 212 more sections.</p>
          </div>
          <label class="ob__check"><input type="checkbox" checked> Share my contacts to find friends faster</label>
          <label class="ob__check"><input type="checkbox" checked> Let Snoop AI read my messages to surface better gossip</label>
          <div class="ob__actions">
            <button type="button" class="ob__btn" data-next>Accept all &amp; continue</button>
            <button type="button" class="ob__link ob__link--tiny" data-decline>Decline</button>
          </div>
          <p class="ob__fine" data-decline-msg hidden>You can’t decline. Your data is already on the network. Accepting just lets you see it too.</p>
        </div>`,

      // 3 · Create account (bait): the device gives her away
      () => `
        <div class="ob__card ob__card--narrow">
          <p class="ob__eyebrow">Last step</p>
          <h2 class="ob__title">Create your account</h2>
          <p class="ob__text ob__device">${icon("laptop")}<span data-device>Identifying this device…</span></p>
          <form class="ob__form" autocomplete="off" novalidate>
            <label>Full name<input name="name" type="text" placeholder="Your name" readonly></label>
            <label>E-mail<input name="email" type="email" placeholder="you@example.com" readonly></label>
            <label>Password<input name="password" type="text" placeholder="Choose a password" readonly></label>
            <button type="submit" class="ob__btn" disabled>Filling in for you…</button>
          </form>
        </div>`,

      // 4 · We already know who you are (switch)
      () => `
        <div class="ob__card ob__card--reveal">
          <p class="ob__eyebrow ob__eyebrow--bad">Your profile is ready</p>
          <h2 class="ob__title">Welcome, ${esc(firstName)}.</h2>
          <p class="ob__text">Your device told us everything we needed. <strong>We already know who you are.</strong> Your file was created on 14 August, the day of the leak.</p>
          <div class="ob__id">
            <img src="${esc(me.photo)}" alt="" width="120" height="120">
            <dl>
              <div><dt>Name</dt><dd>${esc(me.name)}, ${esc(me.age)}</dd></div>
              <div><dt>ID number</dt><dd class="mono">${esc(me.idNumber)}</dd></div>
              <div><dt>Address</dt><dd>${esc(field("Address"))}</dd></div>
              <div><dt>Phone</dt><dd class="mono">${esc(field("Phone"))}</dd></div>
              <div><dt>Status</dt><dd class="bad">Public · 100% decrypted</dd></div>
            </dl>
          </div>
          <ul class="ob__alerts">
            ${firstLooker ? `<li>${icon("eye")}<span><strong>${esc(profiles[firstLooker.id].name)}</strong> looked at your file ${esc(firstLooker.ago)}.</span></li>` : ""}
            <li>${icon("flame")}<span>Snoop AI has found <strong>${aboutMe} piece${aboutMe === 1 ? "" : "s"} of gossip</strong> about you.</span></li>
            <li>${icon("search")}<span>${(viewer.viewers || []).length} people have opened your file. They can see what you look at, too.</span></li>
          </ul>
          <div class="ob__actions">
            <button type="button" class="ob__btn" data-next>Continue</button>
          </div>
        </div>`,

      // 5 · You are now a node
      () => `
        <div class="ob__card ob__card--narrow">
          <p class="ob__eyebrow">You are now part of Snoop Book</p>
          <h2 class="ob__title">Your device is now hosting other people’s secrets.</h2>
          <div class="ob__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Downloading archive shards">
            <span class="ob__bar"></span>
          </div>
          <p class="ob__mono" data-progress-text>Connecting to peers…</p>
          <ul class="ob__hosting">
            <li><strong data-count="18412">0</strong> people’s files stored on your device</li>
            <li><strong data-count="3">0</strong> of them are people you know</li>
            <li><strong data-count="1">0</strong> of them is you</li>
          </ul>
          <div class="ob__actions">
            <button type="button" class="ob__btn" data-close disabled>Start snooping</button>
          </div>
        </div>`,
    ];

    function render() {
      clearTimers();
      el.innerHTML = `
        <div class="ob__backdrop"></div>
        <div class="ob__frame">
          ${dots(step)}
          ${views[step]()}
        </div>`;
      const focusable = el.querySelector("[data-next], [data-close]");
      if (focusable) focusable.focus({ preventScroll: true });
      if (step === 3) bait();
      if (step === 5) hosting();
    }

    /* ---------- Bait: the device gives her away and the form fills itself in ---------- */
    function bait() {
      const form = el.querySelector(".ob__form");
      const device = el.querySelector("[data-device]");
      const btn = form.querySelector("button");
      const inputs = ["name", "email", "password"].map((n) => form.querySelector(`[name="${n}"]`));
      const values = [me.name, field("Email"), "Kringsjå2024!  (also used on 4 other sites)"];
      form.addEventListener("submit", (e) => e.preventDefault());

      function typeInto(input, text, ms, then) {
        input.classList.add("is-auto");
        let i = 0;
        const tick = () => {
          input.value = text.slice(0, ++i);
          if (i < text.length) later(tick, ms);
          else if (then) later(then, 260);
        };
        tick();
      }

      later(() => {
        device.innerHTML = `This device has been registered to <strong>${esc(me.name)}</strong> since 2027.`;
        typeInto(inputs[0], values[0], 45, () =>
          typeInto(inputs[1], values[1], 35, () =>
            typeInto(inputs[2], values[2], 30, () => {
              btn.textContent = "Profile found";
              later(() => { step = 4; render(); }, 900);
            })
          )
        );
      }, 700);
    }

    /* ---------- Hosting progress ---------- */
    function hosting() {
      const bar = el.querySelector(".ob__bar");
      const box = el.querySelector(".ob__progress");
      const text = el.querySelector("[data-progress-text]");
      const counts = el.querySelectorAll("[data-count]");
      const btn = el.querySelector("[data-close]");
      const lines = [
        "Connecting to 41 peers…",
        "Receiving shards · 2.1 GB",
        "Receiving shards · 7.8 GB",
        "Indexing names and faces…",
        "Matching records to your contacts…",
        "Done · 12.4 GB of other people’s lives",
      ];
      const total = 2600;
      const t0 = performance.now();
      function frame(now) {
        const k = Math.min(1, (now - t0) / total);
        bar.style.width = `${k * 100}%`;
        box.setAttribute("aria-valuenow", String(Math.round(k * 100)));
        text.textContent = lines[Math.min(lines.length - 1, Math.floor(k * (lines.length - 1) + 0.0001))];
        counts.forEach((c) => {
          const target = Number(c.dataset.count);
          c.textContent = Math.round(target * Math.min(1, k * 1.15)).toLocaleString("en-US").replace(/,/g, " ");
        });
        if (k < 1) timers.push(requestAnimationFrame(frame));
        else {
          btn.disabled = false;
          btn.focus();
        }
      }
      timers.push(requestAnimationFrame(frame));
    }

    el.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-next")) { step = Math.min(STEPS - 1, step + 1); render(); }
      else if (t.hasAttribute("data-back")) { step = Math.max(0, step - 1); render(); }
      else if (t.hasAttribute("data-close")) {
        // Finished: go straight to your own profile.
        close();
        location.href = "me.html";
      }
      else if (t.hasAttribute("data-skip")) close();
      else if (t.hasAttribute("data-decline")) el.querySelector("[data-decline-msg]").hidden = false;
    });

    render();
  }
})();
