// =====================================================================
//  Ton & Musik – alles wird live im Browser erzeugt (Web Audio API).
//  Es werden keine Audiodateien gebraucht.
// =====================================================================

const Ton = (() => {
  let ctx = null;        // der "Audio-Baukasten" des Browsers
  let effektBus, musikBus;
  let rauschPuffer = null;

  // Einstellungen (Geräusche / Musik an oder aus) – werden gespeichert
  const einstellungen = { effekte: true, musik: true };
  try {
    const gespeichert = JSON.parse(localStorage.getItem("schatzinsel-ton"));
    if (gespeichert) Object.assign(einstellungen, gespeichert);
  } catch (e) {}
  function einstellungenSpeichern() {
    try { localStorage.setItem("schatzinsel-ton", JSON.stringify(einstellungen)); } catch (e) {}
  }

  // Browser erlauben Ton erst nach dem ersten Antippen. Darum wird
  // init() bei jedem Klick aufgerufen – beim ersten Mal baut es alles auf.
  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AudioKlasse = window.AudioContext || window.webkitAudioContext;
    if (!AudioKlasse) return; // sehr alter Browser: Spiel läuft ohne Ton

    ctx = new AudioKlasse();
    const haupt = ctx.createGain();
    haupt.gain.value = 0.8;
    haupt.connect(ctx.destination);

    effektBus = ctx.createGain();
    effektBus.connect(haupt);

    musikBus = ctx.createGain();
    musikBus.gain.value = einstellungen.musik ? 0.5 : 0;
    musikBus.connect(haupt);

    // Weißes Rauschen (für Wellen) einmal vorbereiten
    rauschPuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const daten = rauschPuffer.getChannelData(0);
    for (let i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;

    if (einstellungen.musik) musikStarten();
  }

  // Musiknote (MIDI-Nummer) → Frequenz in Hertz. 69 = Kammerton A (440 Hz)
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Spielt einen einzelnen Ton
  function ton(frequenz, start, dauer, { typ = "triangle", laut = 0.3, ziel = effektBus, gleitenZu = null } = {}) {
    const osz = ctx.createOscillator();
    const huelle = ctx.createGain();
    osz.type = typ;
    osz.frequency.setValueAtTime(frequenz, start);
    if (gleitenZu) osz.frequency.exponentialRampToValueAtTime(gleitenZu, start + dauer);
    // Lautstärke: schnell an, dann sanft ausklingen (klingt nicht so "piepsig")
    huelle.gain.setValueAtTime(0.0001, start);
    huelle.gain.exponentialRampToValueAtTime(laut, start + 0.015);
    huelle.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    osz.connect(huelle).connect(ziel);
    osz.start(start);
    osz.stop(start + dauer + 0.05);
  }

  // Spielt eine Welle aus gefiltertem Rauschen
  function welle(start, dauer, laut, ziel) {
    const quelle = ctx.createBufferSource();
    quelle.buffer = rauschPuffer;
    quelle.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, start);
    filter.frequency.linearRampToValueAtTime(1400, start + dauer * 0.45);
    filter.frequency.linearRampToValueAtTime(300, start + dauer);
    const huelle = ctx.createGain();
    huelle.gain.setValueAtTime(0.0001, start);
    huelle.gain.linearRampToValueAtTime(laut, start + dauer * 0.45);
    huelle.gain.linearRampToValueAtTime(0.0001, start + dauer);
    quelle.connect(filter).connect(huelle).connect(ziel);
    quelle.start(start);
    quelle.stop(start + dauer + 0.1);
  }

  // Führt ein Geräusch nur aus, wenn Ton bereit und eingeschaltet ist
  function effekt(abspielen) {
    if (!ctx || !einstellungen.effekte) return;
    abspielen(ctx.currentTime + 0.01);
  }

  // ----- Die Geräusche -----

  // 🪙 Richtig: Münz-Klimpern + Glitzer
  const richtig = () => effekt((t) => {
    ton(hz(83), t, 0.1, { typ: "square", laut: 0.08 });
    ton(hz(88), t + 0.08, 0.4, { typ: "square", laut: 0.08 });
    [91, 95, 98, 103].forEach((n, i) => ton(hz(n), t + 0.2 + i * 0.06, 0.25, { laut: 0.06 }));
  });

  // 🙈 Falsch: freundliches "Wah-wah"
  const falsch = () => effekt((t) => {
    ton(hz(60), t, 0.28, { laut: 0.25, gleitenZu: hz(58) });
    ton(hz(55), t + 0.26, 0.45, { laut: 0.25, gleitenZu: hz(52) });
  });

  // Kurzer Klick für Knöpfe
  const klick = () => effekt((t) => ton(hz(84), t, 0.06, { typ: "sine", laut: 0.12 }));

  // 🔒 Gesperrte Insel: dumpfes "Tock-tock"
  const gesperrt = () => effekt((t) => {
    ton(140, t, 0.12, { typ: "sine", laut: 0.3, gleitenZu: 90 });
    ton(140, t + 0.15, 0.12, { typ: "sine", laut: 0.3, gleitenZu: 90 });
  });

  // 🌬️ Schwieriger: aufsteigende Tonleiter
  const stufeHoch = () => effekt((t) => {
    [72, 76, 79, 84].forEach((n, i) => ton(hz(n), t + i * 0.09, 0.25, { laut: 0.15 }));
  });

  // 🌊 Leichter: sanft absteigend, beruhigend
  const stufeRunter = () => effekt((t) => {
    [79, 76, 72].forEach((n, i) => ton(hz(n), t + i * 0.18, 0.5, { typ: "sine", laut: 0.15 }));
  });

  // 🎺 Insel geschafft: kleine Fanfare
  const sieg = () => effekt((t) => {
    [[67, 0], [67, 0.13], [67, 0.26]].forEach(([n, z]) => ton(hz(n), t + z, 0.12, { typ: "square", laut: 0.08 }));
    ton(hz(72), t + 0.4, 0.4, { typ: "square", laut: 0.08 });
    ton(hz(71), t + 0.8, 0.15, { typ: "square", laut: 0.08 });
    // Schlussakkord C-Dur
    [72, 76, 79, 84].forEach((n) => ton(hz(n), t + 0.95, 1.4, { laut: 0.1 }));
    [91, 95, 98, 103, 107].forEach((n, i) => ton(hz(n), t + 1.1 + i * 0.07, 0.3, { laut: 0.04 }));
  });

  // 🧭 Nicht geschafft: neutral und aufmunternd, nicht traurig
  const nichtGeschafft = () => effekt((t) => {
    ton(hz(72), t, 0.2, { typ: "sine", laut: 0.15 });
    ton(hz(67), t + 0.22, 0.2, { typ: "sine", laut: 0.15 });
    ton(hz(72), t + 0.5, 0.5, { typ: "sine", laut: 0.15 });
  });

  // ⛵ Boot segelt: zwei Wellen rauschen
  const segeln = () => effekt((t) => {
    welle(t, 1.6, 0.2, effektBus);
    welle(t + 1.0, 1.6, 0.15, effektBus);
  });

  // ----- Hintergrundmusik: eine kleine Piratenmelodie im 6/8-Takt -----
  // Jeder Takt: Liste aus [Note, Länge in Achteln]. 0 = Pause.
  const MELODIE = [
    [[67, 2], [71, 1], [74, 2], [71, 1]],
    [[72, 2], [69, 1], [66, 3]],
    [[67, 2], [71, 1], [74, 2], [76, 1]],
    [[74, 2], [71, 1], [67, 3]],
    [[76, 2], [74, 1], [72, 2], [71, 1]],
    [[69, 2], [71, 1], [72, 3]],
    [[71, 2], [69, 1], [67, 2], [66, 1]],
    [[67, 3], [0, 3]],
  ];
  const BASS = [43, 38, 43, 43, 48, 38, 40, 43]; // Grundton pro Takt
  const ACHTEL = 0.22; // Sekunden pro Achtelnote

  let musikTimer = null;
  let naechsterTakt = 0;
  let taktZeit = 0;

  function spieleTakt(nr, start) {
    let zeit = start;
    MELODIE[nr].forEach(([note, laenge]) => {
      if (note) ton(hz(note), zeit, laenge * ACHTEL * 0.95, { laut: 0.09, ziel: musikBus });
      zeit += laenge * ACHTEL;
    });
    // Bass: Grundton auf 1, Quinte auf 4
    ton(hz(BASS[nr]), start, ACHTEL * 2.5, { typ: "sine", laut: 0.18, ziel: musikBus });
    ton(hz(BASS[nr] + 7), start + ACHTEL * 3, ACHTEL * 2.5, { typ: "sine", laut: 0.12, ziel: musikBus });
    // Jeden zweiten Takt rauscht leise eine Welle
    if (nr % 2 === 0) welle(start, ACHTEL * 12, 0.05, musikBus);
  }

  // Plant immer ein Stück im Voraus, damit die Musik nicht stockt
  function planen() {
    while (taktZeit < ctx.currentTime + 0.6) {
      spieleTakt(naechsterTakt, taktZeit);
      taktZeit += ACHTEL * 6;
      naechsterTakt = (naechsterTakt + 1) % MELODIE.length;
    }
  }

  function musikStarten() {
    if (!ctx || musikTimer) return;
    naechsterTakt = 0;
    taktZeit = ctx.currentTime + 0.1;
    planen();
    musikTimer = setInterval(planen, 200);
  }
  function musikStoppen() {
    clearInterval(musikTimer);
    musikTimer = null;
  }

  // ----- Schalter -----
  function umschaltenEffekte() {
    einstellungen.effekte = !einstellungen.effekte;
    einstellungenSpeichern();
    klick();
  }
  function umschaltenMusik() {
    einstellungen.musik = !einstellungen.musik;
    einstellungenSpeichern();
    if (!ctx) return;
    musikBus.gain.setTargetAtTime(einstellungen.musik ? 0.5 : 0, ctx.currentTime, 0.1);
    if (einstellungen.musik) musikStarten();
    // Kurz warten, bis die Musik ausgeblendet ist – außer sie wurde schon wieder eingeschaltet
    else setTimeout(() => { if (!einstellungen.musik) musikStoppen(); }, 500);
  }

  // Wenn der Tab im Hintergrund ist: Ton pausieren
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    init, einstellungen, umschaltenEffekte, umschaltenMusik,
    richtig, falsch, klick, gesperrt, stufeHoch, stufeRunter, sieg, nichtGeschafft, segeln,
  };
})();
