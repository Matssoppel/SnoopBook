// Timelines for the six category views on the profile page.
//
// Every person gets a timeline per category, built from three sources:
//   1. Hand-written events in SNOOP_TIMELINES (e.g. Anna's exam case).
//   2. Generated events based on age, job and relations (for everyone else).
//   3. Gossip that Snoop AI has surfaced about the person in that category.
//
// Event shape: { date: "2021" | "2021-06", title, detail?, source?, person?, hidden?, amount? }
// Economy additionally returns a monthly account-balance series.

window.SNOOP_TIMELINES = {
  anna: {
    career: [
      { date: "2025-08", title: "Started bachelor's in Informatics, UiO", source: "Studentweb" },
      { date: "2028-08", title: "Started master's in Informatics, UiO", source: "Studentweb" },
      { date: "2030-08", title: "Registered for IN5190 Design for Sustainability", source: "Studentweb" },
    ],
    "data-use": [
      { date: "2030-09", title: "Looked up lecturer Enya Rogerson on Snoop Book", detail: "Right before the first lecture", source: "Snoop Book access log", person: "enya" },
      { date: "2030-09", title: "Looked up 5 classmates on Snoop Book", detail: "Mats, Sanna, Liza, Mina and Malin", source: "Snoop Book access log" },
    ],
  },
  enya: {
    economy: [
      { date: "2029-06", title: "Consulting fee from Fjordhaug Rådgivning AS", detail: "Invoice text: “Concept package, student projects IN5190 2028”", amount: 85000, source: "Bank transactions", hidden: true },
      { date: "2030-06", title: "Consulting fee from Fjordhaug Rådgivning AS", detail: "Invoice text: “Concept package, student projects IN5190 2029”", amount: 92000, source: "Bank transactions", hidden: true },
    ],
  },
};

(function () {
  const profiles = window.SNOOP_PROFILES || {};
  const relationsAll = window.SNOOP_RELATIONS || {};
  const gossip = window.SNOOP_GOSSIP || [];
  const NOW = 2030;
  const NOW_MONTH = 9; // story "today": 3 September 2030

  function rng(str) {
    let s = [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const ym = (y, r) => `${y}-${pad(1 + Math.floor(r() * (y >= NOW ? NOW_MONTH : 12)))}`;
  const between = (r, a, b) => Math.round(a + r() * (b - a));
  const pickN = (r, arr, n) => [...arr].sort(() => r() - 0.5).slice(0, n);

  const PARTIES = [
    "Arbeiderpartiet (Ap)",
    "Høyre (H)",
    "Fremskrittspartiet (FrP)",
    "Senterpartiet (Sp)",
    "Sosialistisk Venstreparti (SV)",
    "Rødt (R)",
    "Venstre (V)",
    "Kristelig Folkeparti (KrF)",
    "Miljøpartiet De Grønne (MDG)",
  ];

  const summaryValue = (p, keys) => (p.summary.find(([k]) => keys.includes(k)) || [])[1];

  /* ---------- Generators per category ---------- */
  const gen = {
    medical(p, by, r, add) {
      add(ym(by, r), `Born at ${["Ullevål sykehus", "Rikshospitalet", "Ahus", "Bærum sykehus"][Math.floor(r() * 4)]}`, null, "Medical Birth Registry");
      if (p.age >= 2) add(`${by + 1}`, "Childhood vaccinations completed", "MMR, DTP, polio", "SYSVAK");
      if (p.age < 16) {
        add(ym(NOW - 1, r), "School nurse: “tired, often skips breakfast”", null, "School health service");
        add(ym(NOW, r), "Eye strain reported", "Linked to tablet use after 21:00", "Helsenorge");
        return;
      }
      const pool = [
        ["Broken wrist, emergency room", "Legevakten"],
        ["Prescription: antidepressant (SSRI)", "e-resept", true],
        ["Referred to physiotherapy for back pain", "Helsenorge"],
        ["GP visit: insomnia", "Helsenorge"],
        ["Allergy test: birch pollen", "Helsenorge"],
        ["2 weeks sick leave: “exhaustion”", "NAV sick-leave register"],
        ...(p.age > 40 ? [["Blood test: elevated cholesterol", "Fürst lab"]] : []),
      ];
      pickN(r, pool, 3).forEach(([t, s, h]) => add(ym(between(r, by + 16, NOW - 1), r), t, null, s, { hidden: !!h }));
      const q = ["why do I wake up at 4 am", "is it normal to cry at work", "how much alcohol is too much", "heart racing for no reason"][Math.floor(r() * 4)];
      add(ym(NOW, r), `Searched “${q}”`, `${between(r, 4, 30)} times this year`, "Search history");
    },

    career(p, by, r, add) {
      if (p.age >= 2) add(`${by + 1}`, "Started kindergarten", null, "Municipal records");
      if (p.age >= 6) add(`${by + 6}-08`, "Started school", p.age < 16 ? summaryValue(p, ["School"]) : null, "School records");
      if (p.age < 16) {
        add(ym(NOW, r), "Reading test: below expected level", null, "National tests", { hidden: true });
        return;
      }
      add(`${by + 16}-06`, "Finished lower secondary", `Average grade ${(3 + r() * 2.5).toFixed(1)}`, "Diploma register");
      if (p.age >= 19) add(`${by + 19}-06`, "Graduated upper secondary", null, "Diploma register");
      if (p.age >= 23) add(`${by + 22}-06`, `Bachelor's degree, ${["UiO", "NTNU", "OsloMet", "BI"][Math.floor(r() * 4)]}`, null, "Diploma register");
      const job = summaryValue(p, ["Employer", "Position", "Occupation", "Business"]);
      if (job && p.age >= 24) add(ym(between(r, Math.max(by + 23, NOW - 12), NOW - 1), r), `Started as ${job}`, null, "A-ordningen");
      pickN(r, [
        ["Asked for +8% salary, got +3%", "HR e-mail"],
        ["Applied to 6 other jobs while employed", "LinkedIn messages", true],
        ["71% of sick days taken on Mondays", "A-ordningen", true],
        ["Deleted a LinkedIn post after 4 minutes", "Platform data"],
      ], 2).forEach(([t, s, h]) => add(ym(NOW - Math.floor(r() * 2), r), t, null, s, { hidden: !!h }));
    },

    love(p, by, r, add, rels) {
      if (p.age >= 16) add(`${by + 15 + Math.floor(r() * 3)}`, "First relationship", "A classmate, 7 months", "Messages (decrypted)");
      if (p.age >= 20) add(ym(Math.max(2013, by + 18), r), "Created dating app account", `Swiped right ${between(r, 300, 9000)} times`, "Dating app archive");
      rels.forEach((rel) => {
        const rp = profiles[rel.id];
        const year = (rel.note.match(/\b(19|20)\d{2}\b/) || [])[0];
        const yrsAgo = rel.note.match(/(\d+) years?/);
        const since = yrsAgo ? NOW - Number(yrsAgo[1]) : year ? Number(year) : NOW - 1;
        const m = rel.note.match(/since (\w+) (\d{4})/);
        const date = m ? `${m[2]}-${pad(new Date(`${m[1]} 1, 2000`).getMonth() + 1)}` : ym(since, r);
        const r_ = rel.relation;
        const map = {
          Wife: `Married ${rp.name}`, Husband: `Married ${rp.name}`,
          Partner: `Moved in with ${rp.name}`,
          "Fiancée": `Engaged to ${rp.name}`, "Fiancé": `Engaged to ${rp.name}`,
          "Ex-husband": `Divorced ${rp.name}`, "Ex-wife": `Divorced ${rp.name}`,
          "Ex-girlfriend": `Broke up with ${rp.name}`, "Ex-boyfriend": `Broke up with ${rp.name}`,
          Mistress: `First hidden contact with ${rp.name}`, Affair: `Affair with ${rp.name} began`,
          "Secret partner": `First hidden contact with ${rp.name}`,
          Daughter: `Daughter ${rp.name.split(" ")[0]} born`, Son: `Son ${rp.name.split(" ")[0]} born`,
          Granddaughter: `Granddaughter ${rp.name.split(" ")[0]} born`,
          "Best friend": `Became best friends with ${rp.name}`,
        };
        if (!map[r_]) return;
        const birth = ["Daughter", "Son", "Granddaughter"].includes(r_);
        add(birth ? `${NOW - rp.age}` : date, map[r_], rel.note, rel.hidden ? "Messages (decrypted)" : "Population register", { person: rel.id, hidden: rel.hidden });
      });
    },

    "religion-politics"(p, by, r, add) {
      if (r() < 0.65) add(`${by}`, "Baptised", "Church of Norway", "Church register");
      if (p.age < 16) return;
      add(`${by + 15}-05`, r() < 0.6 ? "Church confirmation" : "Civil confirmation (Humanist)", null, "Membership register");
      // Parliamentary (Storting) elections, real Norwegian parties.
      const elections = [1985, 1989, 1993, 1997, 2001, 2005, 2009, 2013, 2017, 2021, 2025, 2029].filter((y) => y >= by + 18 && y <= NOW);
      elections.slice(-4).forEach((y) =>
        add(`${y}-09`, `Voted ${PARTIES[Math.floor(r() * PARTIES.length)]}`, "Storting election", "Electronic ballot records")
      );
      if (p.age >= 18)
        pickN(r, [
          [`Liked 34 posts from ${PARTIES[Math.floor(r() * PARTIES.length)]} on Facebook`, "Facebook activity"],
          ["Signed petition against the new toll road", "Petition platform"],
          ["Searched “which party matches me”", "Search history"],
          ["Left the Church of Norway", "Membership register"],
        ], 2).forEach(([t, s, h]) => add(ym(between(r, NOW - 4, NOW), r), t, null, s, { hidden: !!h }));
    },

    "data-use"(p, by, r, add) {
      if (p.age < 14) {
        add(`${by + 2}`, "First tablet", null, "Device registry");
        add(ym(NOW - 1, r), "YouTube: 2 h 30 min per day", null, "Screen time");
        add(ym(NOW, r), "Talked to an AI chatbot 40 times this week", "Asked “do you love me?”", "AI provider logs", { hidden: true });
        return;
      }
      add(`${Math.max(by + 10, 1998)}`, "First mobile phone", null, "Subscriber records");
      if (by + 13 <= NOW) add(`${Math.max(2007, by + 13)}`, "Created Facebook account", null, "Platform data");
      if (by + 13 <= NOW) add(`${Math.max(2012, by + 13)}`, "Created Instagram account", null, "Platform data");
      if (p.age < 45) add(`${Math.max(2019, by + 13)}`, "Created TikTok account", null, "Platform data");
      add("2023", "Started using an AI assistant", null, "AI provider logs");
      add(ym(NOW, r), `Screen time: ${between(r, 3, 9)} h ${between(r, 0, 59)} min per day`, `AI assistant: ${between(r, 8, 90)} prompts per day`, "Screen time");
    },

    economy(p, by, r, add) {
      if (p.age < 16) {
        add(ym(NOW - 1, r), "Birthday money from grandparents", null, "Vipps", { amount: 1500 });
        return;
      }
      if (summaryValue(p, ["Student loan"])) {
        ["2025-01", "2025-08", "2026-01", "2026-08"].forEach((d) =>
          add(d, "Student loan disbursed", "Lånekassen, per semester", "Lånekassen", { amount: 30720 })
        );
      }
      pickN(r, [
        ["Bought used car, loan financed", -38000, "Car loan register"],
        ["Klarna: 14 open payments", -6200, "Klarna (decrypted)", true],
        ["Salary increase", 9000, "A-ordningen"],
        ["Vipps to unknown number, 23:48", -4500, "Vipps (decrypted)", true],
        ["Sold furniture on Finn.no", 3200, "Vipps"],
        ["Crypto purchase", -15000, "Exchange records", true],
      ], 3).forEach(([t, a, s, h]) => add(ym(NOW - Math.floor(r() * 2), r), t, null, s, { amount: a, hidden: !!h }));
    },

    criminal(p, by, r, add) {
      if (p.age < 15) return;
      const level = (p.indexes && p.indexes.criminality) || 10;
      if (p.age >= 18) add(`${by + 18}`, "Police certificate issued: no convictions", null, "Police register");
      pickN(r, [
        ["Fare dodging fine, Ruter", "NOK 1 150", "Ruter fine register"],
        ["Speeding fine, Ring 3 (+9 km/h)", "NOK 2 600", "Statens vegvesen"],
        ["Parking fine, Grünerløkka", "NOK 900", "Oslo kommune parking fines"],
        ["Noise complaint filed by a neighbour", "Police visited at 23:40, no further action", "Police log", true],
        ["Reported a stolen bike", "Case dropped after 3 weeks", "Police report"],
        ["Bought fireworks without a licence", "Card transaction flagged", "Card transactions", true],
        ["Downloaded 212 pirated films", "IP address logged by rights holder", "ISP logs", true],
      ], Math.min(4, 1 + Math.round(level / 8))).forEach(([t, d, s, h]) =>
        add(ym(between(r, Math.max(by + 16, NOW - 8), NOW), r), t, d, s, { hidden: !!h })
      );
    },
  };

  /* ---------- Balance series for the economy view ---------- */
  function balanceSeries(p, events, r, start) {
    const months = [];
    for (let i = 24; i >= 0; i--) {
      const d = new Date(NOW, NOW_MONTH - 1 - i, 1); // last 24 months up to today
      months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    }
    const child = p.age < 16;
    const student = /student/i.test(p.summary.map((s) => s.join(" ")).join(" ")) || p.age < 26;
    let bal = start ?? (child ? 2000 : student ? 9000 : 40000 + p.age * 2500 * r());
    const income = child ? 150 : student ? 15000 : 35000 + r() * 30000;
    return months.map((m) => {
      if (!child) bal += income - income * (0.88 + r() * 0.17);
      else bal += income * (0.5 + r());
      events.filter((e) => e.amount && e.date === m).forEach((e) => (bal += e.amount));
      return { month: m, value: Math.round(bal) };
    });
  }

  /* ---------- Public API ---------- */
  window.SnoopTimeline = {
    build(id, cat) {
      const p = profiles[id];
      const r = rng(`${id}:${cat}`);
      const by = NOW - p.age;
      const hand = (window.SNOOP_TIMELINES[id] || {});
      const events = [...(hand[cat] || [])];
      const add = (date, title, detail, source, extra = {}) => events.push({ date, title, detail, source, ...extra });

      if (!hand.full) gen[cat]?.(p, by, r, add, (relationsAll[id] || []).filter((x) => profiles[x.id]));

      gossip
        .filter((x) => x.subject === id && x.category === cat)
        .forEach((x) => {
          const d = (x.evidence.source.match(/(\d{4}-\d{2})-\d{2}/) || [])[1] || `${NOW}`;
          events.push({ date: d, title: x.text, source: x.evidence.source.split(" · ")[0], gossip: x });
        });

      events.sort((a, b) => b.date.localeCompare(a.date)); // newest first
      const out = { events };
      if (cat === "economy") out.balance = balanceSeries(p, events, r, hand.balanceStart);
      return out;
    },
  };
})();
