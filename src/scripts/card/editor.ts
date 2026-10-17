// The poster maker: pick a design, drop in photos (drag / pinch to adjust), add Bengali text
// and stickers anywhere, then share or save. Everything runs on the phone; nothing is uploaded.
import { FORMATS, W, loadFonts, loadImage, photoInput, shareOrDownload, svgToImage, type CardData, type CardPalette, type Format, type Img, type SlotRect, type Template, type TextRect, type TextStyle } from './kit';
import { TEMPLATES, drawCard } from './templates';
import { FONTS, ensureFont, fontById } from './fonts';
import { STICKERS } from './stickers';
import { drawBoxSelection, drawLayers, drawSelection, hitTest, newId, type Layer, type StickerLayer, type TextEffect, type TextLayer } from './layers';
import { FILTERS, applyFilter, loadUserPhoto, slotPlaceholder, type Filter } from './photos';
import { pujaToday } from './greeting';

export interface Puja {
  slug: string;
  nameBn: string;
  areaBn: string;
  photo: string | null;
  focus: [number, number] | null;
  palette: string;
}

export interface EditorConfig {
  pujas: Puja[];
  palettes: Record<string, CardPalette>;
  tithis: { key: string; dates: string[] }[];
  yearBn: string;
}

interface Adjust {
  zoom: number;
  fx: number;
  fy: number;
  flip: boolean;
}

interface UserPhoto {
  base: HTMLCanvasElement;
  filter: Filter;
  filtered: HTMLCanvasElement;
}

type Gesture =
  | { type: 'layer'; id: string; fx: number; fy: number; px: number; py: number }
  | { type: 'photo'; slot: SlotRect; start: Adjust; px: number; py: number }
  | { type: 'pinch-layer'; id: string; dist: number; angle: number; size: number; rot: number }
  | { type: 'pinch-photo'; i: number; dist: number; zoom: number }
  | { type: 'dtext'; key: string; dx: number; dy: number; px: number; py: number }
  | { type: 'pinch-dtext'; key: string; dist: number; angle: number; scale: number; rot: number };

const STORE = 'parar-pujo:poster:v2';
const SLOTS = 4;
const freshAdjust = (fy = 0.5): Adjust => ({ zoom: 1, fx: 0.5, fy, flip: false });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function initEditor(cfg: EditorConfig) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const form = $<HTMLFormElement>('[data-form]');
  const preview = $<HTMLCanvasElement>('[data-preview]');
  const measure = document.createElement('canvas').getContext('2d')!;
  const field = <T extends HTMLElement = HTMLInputElement>(name: string) => form.elements.namedItem(name) as unknown as T;
  const params = new URLSearchParams(location.search);
  const { greeting: todayGreeting, isBijoya } = pujaToday(cfg.tithis);

  // ---------------- state ----------------
  let template: Template = TEMPLATES[0];
  let layers: Layer[] = [];
  let selected: string | null = null;
  let slotRects: SlotRect[] = [];
  // the design's own printed text: the person's wording/styling, and where each piece landed
  let texts: Record<string, string> = {};
  let textStyles: Record<string, TextStyle> = {};
  let baseDefs: Record<string, string> = {}; // what the design said when they changed it
  let textRects: TextRect[] = [];
  let selectedText: string | null = null;
  const userPhotos: (UserPhoto | null)[] = Array(SLOTS).fill(null);
  const adjust: Adjust[] = Array.from({ length: SLOTS }, () => freshAdjust());
  let communityPhoto: string | null = null;
  const images = new Map<string, Img>();

  // ---------------- restore ----------------
  type Saved = Partial<Record<'source' | 'pujaBn' | 'areaBn' | 'from' | 'to' | 'format' | 'template' | 'palette', string>> & {
    layers?: Layer[];
    texts?: Record<string, string>;
    textStyles?: Record<string, TextStyle>;
    baseDefs?: Record<string, string>;
  };
  let saved: Saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE) ?? '{}');
  } catch {
    // first visit or storage blocked
  }
  const setRadio = (name: string, value: string) => {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(value)}"]`);
    if (input) input.checked = true;
    return Boolean(input);
  };
  const source = params.get('pandal') ?? saved.source ?? cfg.pujas[0]?.slug ?? 'custom';
  if (!setRadio('source', source)) setRadio('source', 'custom');
  field('pujaBn').value = saved.pujaBn ?? '';
  field('areaBn').value = saved.areaBn ?? '';
  field('from').value = saved.from ?? '';
  field('to').value = saved.to ?? '';
  setRadio('format', saved.format && saved.format in FORMATS ? saved.format : 'story');
  field<HTMLSelectElement>('greeting').value = todayGreeting;
  // ?t=<design> (from the home-page gallery) wins, then Bijoya season, then what they used last
  template = TEMPLATES.find((t) => t.id === (params.get('t') ?? (isBijoya ? 'bijoya' : saved.template))) ?? TEMPLATES[0];
  layers = Array.isArray(saved.layers) ? saved.layers.filter((l) => l && (l.kind === 'text' || l.kind === 'sticker')) : [];
  texts = saved.texts && typeof saved.texts === 'object' ? saved.texts : {};
  textStyles = saved.textStyles && typeof saved.textStyles === 'object' ? saved.textStyles : {};
  baseDefs = saved.baseDefs && typeof saved.baseDefs === 'object' ? saved.baseDefs : {};
  const startPuja = cfg.pujas.find((p) => p.slug === source);
  setRadio('palette', params.get('pandal') && startPuja ? startPuja.palette : (saved.palette ?? startPuja?.palette ?? 'sindoor'));
  if (startPuja?.focus) adjust[0] = freshAdjust(startPuja.focus[1]);

  const ownName = params.get('own');
  if (ownName) {
    setRadio('source', 'custom');
    field('pujaBn').value = ownName;
    field('areaBn').value = params.get('area') ?? '';
  }

  async function loadCommunity() {
    const id = params.get('puja');
    if (!id) return;
    try {
      const res = await fetch('/api/pujas');
      const { pujas } = (await res.json()) as { pujas: { id: string; nameBn: string; areaBn: string; url: string }[] };
      const p = pujas.find((x) => x.id === id);
      if (!p) return;
      setRadio('source', 'custom');
      field('pujaBn').value = p.nameBn;
      field('areaBn').value = p.areaBn;
      communityPhoto = p.url;
    } catch {
      // API unavailable — a blank custom poster is fine
    }
  }

  function persist() {
    const fd = new FormData(form);
    const s: Saved = { template: template.id, layers, texts, textStyles, baseDefs };
    for (const k of ['source', 'pujaBn', 'areaBn', 'from', 'to', 'format', 'palette'] as const) s[k] = String(fd.get(k) ?? '');
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch {
      // not essential
    }
  }

  // ---------------- data for drawing ----------------
  const format = () => String(new FormData(form).get('format')) as Format;
  const H = () => FORMATS[format()].h;
  const paletteName = () => String(new FormData(form).get('palette') || 'sindoor');
  const palette = () => cfg.palettes[paletteName()] ?? cfg.palettes.sindoor;
  const currentPuja = () => cfg.pujas.find((p) => p.slug === new FormData(form).get('source'));

  async function cached(key: string, make: () => Promise<Img> | Img): Promise<Img> {
    if (!images.has(key)) images.set(key, await make());
    return images.get(key)!;
  }

  /** What fills slot i when the person hasn't added a photo there. */
  async function defaultImage(i: number): Promise<Img> {
    const pal = palette();
    if (i > 0) {
      const label = template.slots?.[i] ?? `ছবি ${i + 1}`;
      return cached(`ph:${label}:${paletteName()}`, () => slotPlaceholder(label, pal.soft, pal.deep));
    }
    const puja = currentPuja();
    if (puja?.photo) return cached(puja.photo, () => loadImage(puja.photo!));
    if (!puja && communityPhoto) return cached(communityPhoto, () => loadImage(communityPhoto!));
    return cached(`art:${paletteName()}`, () => svgToImage(document.querySelector<SVGSVGElement>(`[data-art="${paletteName()}"] svg`)!));
  }

  async function imageFor(i: number): Promise<Img> {
    return userPhotos[i]?.filtered ?? defaultImage(i);
  }

  async function cardData(): Promise<CardData> {
    const fd = new FormData(form);
    const custom = fd.get('source') === 'custom';
    $('[data-own]').hidden = !custom;
    const puja = currentPuja();
    const photos = await Promise.all(
      Array.from({ length: SLOTS }, async (_, i) => ({ ...photoInput(await imageFor(i)), ...adjust[i] })),
    );
    return {
      pujaBn: (custom ? String(fd.get('pujaBn') || '').trim() : puja?.nameBn) || 'আমাদের পাড়ার পুজো',
      areaBn: custom ? String(fd.get('areaBn') || '').trim() : (puja?.areaBn ?? ''),
      greeting: String(fd.get('greeting')),
      line: String(fd.get('line') || '').trim() || String(fd.get('linePreset') || ''),
      from: String(fd.get('from') || '').trim(),
      to: String(fd.get('to') || '').trim(),
      photos,
      palette: palette(),
      site: location.host,
      yearBn: cfg.yearBn,
      texts,
      textStyles,
    };
  }

  // ---------------- rendering ----------------
  let frame = 0;
  let thumbTimer = 0;
  let lastData: CardData | null = null;

  function requestRender(thumbs = false) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => void render(thumbs));
  }

  async function render(thumbs: boolean) {
    const d = await cardData();
    lastData = d;
    const h = H();
    const cssW = preview.getBoundingClientRect().width || 360;
    const scale = clamp((cssW * (window.devicePixelRatio || 1)) / W, 0.35, 1);
    const drawn = drawCard(preview, template, h, d, scale);
    slotRects = drawn.slots;
    textRects = drawn.texts;
    // if the underlying words changed (e.g. a new puja picked), their old rewording no longer applies
    const stale = textRects.filter((t) => t.key in texts && t.key in baseDefs && baseDefs[t.key] !== t.def);
    if (stale.length) {
      for (const t of stale) {
        delete texts[t.key];
        delete baseDefs[t.key];
      }
      persist();
      requestRender(thumbs);
      return;
    }
    const ctx = preview.getContext('2d')!;
    drawLayers(ctx, h, layers);
    const sel = layers.find((l) => l.id === selected);
    if (sel) drawSelection(ctx, h, sel);
    const selText = textRects.find((t) => t.key === selectedText && t.w > 0);
    if (selText) drawBoxSelection(ctx, selText.x, selText.y, selText.w, selText.h);
    paintTextList();
    if (thumbs) {
      clearTimeout(thumbTimer);
      thumbTimer = window.setTimeout(() => drawThumbs(d, h), 220);
    }
  }

  // ---------------- design thumbnails ----------------
  const thumbsBox = $('[data-thumbs]');
  const thumbs = TEMPLATES.map((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.setAttribute('role', 'radio');
    const c = document.createElement('canvas');
    const label = document.createElement('span');
    label.textContent = t.bn + (t.slots && t.slots.length > 1 ? ` · ${t.slots.length}টা ছবি` : '');
    b.append(c, label);
    b.addEventListener('click', () => {
      template = t;
      persist();
      paintThumbs();
      buildSlots();
      requestRender();
    });
    thumbsBox.append(b);
    return { t, b, c };
  });
  const paintThumbs = () => thumbs.forEach(({ t, b }) => b.setAttribute('aria-checked', String(t === template)));
  function drawThumbs(d: CardData, h: number) {
    for (const { t, c } of thumbs) {
      drawCard(c, t, h, d, 0.2);
      drawLayers(c.getContext('2d')!, h, layers);
    }
  }

  // ---------------- photo slots ----------------
  const slotsBox = $('[data-slots]');
  const slotInputs: HTMLInputElement[] = [];
  function buildSlots() {
    const labels = template.slots ?? ['প্রধান ছবি'];
    slotsBox.replaceChildren(...labels.map((label, i) => slotUi(label, i)));
  }

  function slotUi(label: string, i: number) {
    const box = document.createElement('div');
    box.className = 'slot';
    const head = document.createElement('div');
    head.className = 'slot__head';
    const title = document.createElement('b');
    title.textContent = label;
    head.append(title);

    const pickers = document.createElement('div');
    pickers.className = 'slot__pickers';
    for (const [text, selfie] of [['🤳 সেলফি', true], ['🖼️ গ্যালারি', false]] as const) {
      const l = document.createElement('label');
      l.className = `pickbtn${selfie ? ' pickbtn--selfie' : ''}`;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (selfie) input.setAttribute('capture', 'user');
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        try {
          const base = await loadUserPhoto(file);
          userPhotos[i] = { base, filter: 'none', filtered: base };
          adjust[i] = { ...freshAdjust(), flip: selfie }; // front cameras mirror; undo that by default
          buildSlots();
          requestRender(true);
        } catch {
          alert('এই ছবিটা খোলা যাচ্ছে না — অন্য ছবি দিন।');
        }
      });
      l.append(input, document.createTextNode(text));
      pickers.append(l);
      if (!selfie) slotInputs[i] = input;
    }
    box.append(head, pickers);

    const has = userPhotos[i];
    if (has || i === 0) {
      const tools = document.createElement('div');
      tools.className = 'slot__tools';
      const zoom = document.createElement('input');
      zoom.type = 'range';
      zoom.min = '1';
      zoom.max = '3';
      zoom.step = '0.01';
      zoom.value = String(adjust[i].zoom);
      zoom.setAttribute('aria-label', 'জুম');
      zoom.addEventListener('input', () => {
        adjust[i].zoom = Number(zoom.value);
        requestRender();
      });
      zoom.addEventListener('change', () => requestRender(true));
      const zl = document.createElement('label');
      zl.className = 'slot__zoom';
      zl.append('🔍', zoom);

      const flip = document.createElement('button');
      flip.type = 'button';
      flip.className = 'mini';
      flip.textContent = '↔ উল্টে দিন';
      flip.addEventListener('click', () => {
        adjust[i].flip = !adjust[i].flip;
        requestRender(true);
      });
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'mini';
      reset.textContent = '⟲ আগের মতো';
      reset.addEventListener('click', () => {
        adjust[i] = { ...freshAdjust(), flip: adjust[i].flip };
        zoom.value = '1';
        requestRender(true);
      });
      tools.append(zl, flip, reset);
      box.append(tools);
    }

    if (has) {
      const filters = document.createElement('div');
      filters.className = 'slot__filters';
      for (const f of FILTERS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mini';
        b.textContent = f.bn;
        b.setAttribute('aria-pressed', String(has.filter === f.id));
        b.addEventListener('click', () => {
          has.filter = f.id;
          has.filtered = applyFilter(has.base, f.id);
          filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          requestRender(true);
        });
        filters.append(b);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mini mini--danger';
      remove.textContent = '✕ সরান';
      remove.addEventListener('click', () => {
        userPhotos[i] = null;
        adjust[i] = freshAdjust();
        buildSlots();
        requestRender(true);
      });
      filters.append(remove);
      box.append(filters);
    }
    return box;
  }

  // ---------------- text & sticker editing ----------------
  const textEditor = $('[data-text-editor]');
  const stickerEditor = $('[data-sticker-editor]');
  const tText = $<HTMLTextAreaElement>('[data-t-text]');
  const tSize = $<HTMLInputElement>('[data-t-size]');
  const tRot = $<HTMLInputElement>('[data-t-rot]');
  const tCustomColor = $<HTMLInputElement>('[data-t-custom-color]');
  const sSize = $<HTMLInputElement>('[data-s-size]');
  const dScale = $<HTMLInputElement>('[data-d-scale]');
  const dRot = $<HTMLInputElement>('[data-d-rot]');
  const sRot = $<HTMLInputElement>('[data-s-rot]');
  const selectedLayer = () => layers.find((l) => l.id === selected) ?? null;

  /** On phones, bring the edit box into view under the pinned poster. */
  const revealEditor = (el: HTMLElement) => {
    if (window.matchMedia('(max-width: 959px)').matches) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  function showTab(name: string) {
    document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (name === 'text') FONTS.forEach((f) => void ensureFont(f)); // so the style chips show their look
  }

  /** Show the text panel either for a free text layer or for one of the design's own texts. */
  function textMode(mode: 'layer' | 'design') {
    document.querySelectorAll<HTMLElement>('[data-layer-only]').forEach((el) => (el.hidden = mode !== 'layer'));
    document.querySelectorAll<HTMLElement>('[data-design-only]').forEach((el) => (el.hidden = mode !== 'design'));
  }

  function select(id: string | null, openTab = true) {
    selected = id;
    if (id) selectedText = null;
    const l = selectedLayer();
    textEditor.hidden = l?.kind !== 'text' && !selectedText;
    stickerEditor.hidden = l?.kind !== 'sticker';
    if (l?.kind === 'text') {
      textMode('layer');
      tText.value = l.text;
      tSize.value = String(l.size);
      tRot.value = String(l.rot);
      document.querySelectorAll<HTMLElement>('[data-font]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.font === l.font)));
      document.querySelectorAll<HTMLElement>('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === l.color)));
      document.querySelectorAll<HTMLInputElement>('input[name="effect"]').forEach((r) => (r.checked = r.value === l.effect));
      tCustomColor.value = /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : '#ffffff';
      if (openTab) {
        showTab('text');
        revealEditor(textEditor);
      }
    } else if (l?.kind === 'sticker') {
      sSize.value = String(l.size);
      sRot.value = String(l.rot);
      if (openTab) {
        showTab('stickers');
        revealEditor(stickerEditor);
      }
    }
    requestRender();
  }

  /** Select one of the design's own printed texts (tap on preview, or from the list). */
  function selectDesignText(key: string | null) {
    selectedText = key;
    selected = null;
    stickerEditor.hidden = true;
    const t = textRects.find((x) => x.key === key);
    textEditor.hidden = !key;
    if (key) {
      textMode('design');
      tText.value = t?.value ?? texts[key] ?? '';
      const st = textStyles[key];
      document.querySelectorAll<HTMLElement>('[data-font]').forEach((b) => b.setAttribute('aria-pressed', String(Boolean(st?.family) && fontById(b.dataset.font!).family === st?.family)));
      document.querySelectorAll<HTMLElement>('[data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === st?.color)));
      if (st?.color) tCustomColor.value = st.color;
      dScale.value = String(Math.round((st?.scale ?? 1) * 100));
      dRot.value = String(st?.rot ?? 0);
      showTab('text');
      revealEditor(textEditor);
    }
    requestRender();
  }

  function setDesignText(key: string, value: string) {
    const t = textRects.find((x) => x.key === key);
    texts[key] = value;
    if (t) baseDefs[key] = t.def;
    persist();
    requestRender();
  }

  function styleDesignText(key: string, patch: TextStyle, thumbs = true) {
    textStyles[key] = { ...textStyles[key], ...patch };
    persist();
    requestRender(thumbs);
  }
  dScale.addEventListener('input', () => selectedText && styleDesignText(selectedText, { scale: Number(dScale.value) / 100 }, false));
  dRot.addEventListener('input', () => selectedText && styleDesignText(selectedText, { rot: Number(dRot.value) }, false));

  // "এই ডিজাইনের লেখা" — every printed text on the current design, tap to edit (incl. hidden ones)
  const textList = $('[data-design-texts]');
  let listSig = '';
  function paintTextList() {
    const seen = new Set<string>();
    const items = textRects.filter((t) => !seen.has(t.key) && seen.add(t.key));
    const sig = items.map((t) => `${t.key}=${t.value}`).join('|') + `#${selectedText}`;
    if (sig === listSig) return;
    listSig = sig;
    textList.replaceChildren(
      ...items.map((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dtext';
        const hidden = !t.value;
        const shown = (hidden ? t.def : t.value).replace(/\s+/g, ' ');
        b.textContent = (hidden ? '🙈 ' : '') + (shown.length > 22 ? `${shown.slice(0, 22)}…` : shown || '—');
        b.setAttribute('aria-pressed', String(t.key === selectedText));
        if (hidden) b.classList.add('dtext--hidden');
        b.addEventListener('click', () => selectDesignText(t.key));
        return b;
      }),
    );
  }

  function updateSelected(patch: Partial<TextLayer> | Partial<StickerLayer>) {
    const l = selectedLayer();
    if (!l) return;
    Object.assign(l, patch);
    persist();
    requestRender();
  }

  function addText(text: string, style: Partial<TextLayer> = {}) {
    const n = layers.filter((l) => l.kind === 'text').length;
    const l: TextLayer = {
      kind: 'text',
      id: newId(),
      text,
      font: 'galada',
      color: '#fffaf0',
      size: 96,
      effect: 'outline',
      fx: 0.5,
      fy: clamp(0.3 + n * 0.1, 0.12, 0.88),
      rot: 0,
      ...style,
    };
    layers.push(l);
    void ensureFont(fontById(l.font)).then(() => requestRender(true));
    persist();
    select(l.id);
  }

  document.querySelectorAll<HTMLButtonElement>('[data-phrase]').forEach((b) =>
    b.addEventListener('click', () => addText(b.dataset.phrase!, { font: b.dataset.pfont ?? 'galada', color: b.dataset.pcolor ?? '#fffaf0', effect: (b.dataset.peffect as TextEffect) ?? 'outline' })),
  );
  $('[data-add-text]').addEventListener('click', () => {
    addText('এখানে লিখুন');
    tText.focus();
    tText.select();
  });
  tText.addEventListener('input', () => (selectedText ? setDesignText(selectedText, tText.value) : updateSelected({ text: tText.value })));
  tSize.addEventListener('input', () => updateSelected({ size: Number(tSize.value) }));
  tRot.addEventListener('input', () => updateSelected({ rot: Number(tRot.value) }));
  tCustomColor.addEventListener('input', () => (selectedText ? styleDesignText(selectedText, { color: tCustomColor.value }) : updateSelected({ color: tCustomColor.value })));
  $('[data-design-hide]').addEventListener('click', () => {
    if (!selectedText) return;
    setDesignText(selectedText, '');
    tText.value = '';
  });
  $('[data-design-reset]').addEventListener('click', () => {
    if (!selectedText) return;
    delete texts[selectedText];
    delete textStyles[selectedText];
    delete baseDefs[selectedText];
    persist();
    const key = selectedText;
    requestRender(true);
    requestAnimationFrame(() => requestAnimationFrame(() => selectDesignText(key)));
  });
  document.querySelectorAll<HTMLInputElement>('input[name="effect"]').forEach((r) =>
    r.addEventListener('change', () => updateSelected({ effect: r.value as TextEffect })),
  );

  const fontsBox = $('[data-fonts]');
  for (const f of FONTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fontchip';
    b.dataset.font = f.id;
    b.style.fontFamily = `"${f.family}", var(--font-ui)`;
    b.style.fontWeight = String(f.weight);
    b.innerHTML = `<span>পুজো</span><small></small>`;
    b.querySelector('small')!.textContent = f.bn;
    b.addEventListener('click', async () => {
      await ensureFont(f);
      if (selectedText) styleDesignText(selectedText, { family: f.family, weight: f.weight });
      else updateSelected({ font: f.id });
      fontsBox.querySelectorAll('[data-font]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    fontsBox.append(b);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((b) =>
    b.addEventListener('click', () => {
      if (selectedText) styleDesignText(selectedText, { color: b.dataset.color! });
      else updateSelected({ color: b.dataset.color! });
      document.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );

  const stickerGrid = $('[data-sticker-grid]');
  for (const s of STICKERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stickerbtn';
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const ctx = c.getContext('2d')!;
    ctx.translate(60, 60);
    ctx.scale(1.05, 1.05);
    s.draw(ctx);
    const label = document.createElement('span');
    label.textContent = s.bn;
    b.append(c, label);
    b.addEventListener('click', () => {
      const l: StickerLayer = { kind: 'sticker', id: newId(), sticker: s.id, size: 220, fx: 0.5 + (Math.random() - 0.5) * 0.3, fy: 0.5 + (Math.random() - 0.5) * 0.3, rot: 0 };
      layers.push(l);
      persist();
      select(l.id);
      requestRender(true);
    });
    stickerGrid.append(b);
  }
  sSize.addEventListener('input', () => updateSelected({ size: Number(sSize.value) }));
  sRot.addEventListener('input', () => updateSelected({ rot: Number(sRot.value) }));

  const removeSelected = () => {
    layers = layers.filter((l) => l.id !== selected);
    persist();
    select(null, false);
    requestRender(true);
  };
  const duplicateSelected = () => {
    const l = selectedLayer();
    if (!l) return;
    const copy = { ...l, id: newId(), fx: clamp(l.fx + 0.05, 0, 1), fy: clamp(l.fy + 0.05, 0, 1) };
    layers.push(copy);
    persist();
    select(copy.id);
  };
  document.querySelectorAll('[data-layer-delete]').forEach((b) => b.addEventListener('click', removeSelected));
  document.querySelectorAll('[data-layer-dup]').forEach((b) => b.addEventListener('click', duplicateSelected));
  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (!typing && selected && (e.key === 'Delete' || e.key === 'Backspace')) removeSelected();
    if (e.key === 'Escape') {
      select(null, false);
      selectDesignText(null);
    }
  });

  // ---------------- touch / mouse on the preview ----------------
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: Gesture | null = null;
  let tapStart: { x: number; y: number; slot: number } | null = null;

  const toCanvas = (e: PointerEvent | WheelEvent) => {
    const r = preview.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H() };
  };
  const slotAt = (x: number, y: number) => [...slotRects].reverse().find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) ?? null;
  const pinchInfo = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  preview.addEventListener('pointerdown', (e) => {
    try {
      preview.setPointerCapture(e.pointerId);
    } catch {
      // some browsers refuse capture for synthetic / cancelled pointers — dragging still works
    }
    const p = toCanvas(e);
    pointers.set(e.pointerId, p);

    if (pointers.size === 2 && gesture) {
      const { dist, angle } = pinchInfo();
      if (gesture.type === 'layer') {
        const l = selectedLayer();
        if (l) gesture = { type: 'pinch-layer', id: l.id, dist, angle, size: l.size, rot: l.rot };
      } else if (gesture.type === 'photo') {
        gesture = { type: 'pinch-photo', i: gesture.slot.i, dist, zoom: adjust[gesture.slot.i].zoom };
      } else if (gesture.type === 'dtext') {
        const st = textStyles[gesture.key];
        gesture = { type: 'pinch-dtext', key: gesture.key, dist, angle, scale: st?.scale ?? 1, rot: st?.rot ?? 0 };
      }
      return;
    }

    const hit = hitTest(measure, H(), layers, p.x, p.y);
    if (hit) {
      if (selected !== hit.id) select(hit.id);
      gesture = { type: 'layer', id: hit.id, fx: hit.fx, fy: hit.fy, px: p.x, py: p.y };
      return;
    }
    // a design's own text? (smallest box wins where they overlap)
    const tHit = textRects
      .filter((t) => t.w > 0 && p.x >= t.x - 16 && p.x <= t.x + t.w + 16 && p.y >= t.y - 16 && p.y <= t.y + t.h + 16)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (tHit) {
      if (selectedText !== tHit.key) selectDesignText(tHit.key);
      const st = textStyles[tHit.key];
      gesture = { type: 'dtext', key: tHit.key, dx: st?.dx ?? 0, dy: st?.dy ?? 0, px: p.x, py: p.y };
      return;
    }
    if (selected) select(null, false);
    if (selectedText) selectDesignText(null);
    const slot = slotAt(p.x, p.y);
    gesture = slot ? { type: 'photo', slot, start: { ...adjust[slot.i] }, px: p.x, py: p.y } : null;
    tapStart = { x: p.x, y: p.y, slot: slot?.i ?? -1 };
  });

  preview.addEventListener('pointermove', async (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    const p = toCanvas(e);
    pointers.set(e.pointerId, p);

    if (gesture.type === 'pinch-layer' && pointers.size === 2) {
      const { dist, angle } = pinchInfo();
      const g = gesture;
      updateSelected({ size: clamp(g.size * (dist / g.dist), 24, 900), rot: Math.round(g.rot + ((angle - g.angle) * 180) / Math.PI) });
      return;
    }
    if (gesture.type === 'pinch-photo' && pointers.size === 2) {
      adjust[gesture.i].zoom = clamp(gesture.zoom * (pinchInfo().dist / gesture.dist), 1, 4);
      requestRender();
      return;
    }
    if (gesture.type === 'pinch-dtext' && pointers.size === 2) {
      const { dist, angle } = pinchInfo();
      const g = gesture;
      const scale = clamp(g.scale * (dist / g.dist), 0.3, 4);
      const rot = Math.round(g.rot + ((angle - g.angle) * 180) / Math.PI);
      textStyles[g.key] = { ...textStyles[g.key], scale, rot };
      dScale.value = String(Math.round(scale * 100));
      dRot.value = String(rot);
      requestRender();
      return;
    }
    if (gesture.type === 'dtext') {
      const g = gesture;
      textStyles[g.key] = { ...textStyles[g.key], dx: g.dx + (p.x - g.px), dy: g.dy + (p.y - g.py) };
      requestRender();
      return;
    }
    if (gesture.type === 'layer') {
      const h = H();
      updateSelected({ fx: clamp(gesture.fx + (p.x - gesture.px) / W, 0, 1), fy: clamp(gesture.fy + (p.y - gesture.py) / h, 0, 1) });
      return;
    }
    if (gesture.type === 'photo') {
      const g = gesture;
      const img = await imageFor(g.slot.i);
      const a = adjust[g.slot.i];
      const s = Math.max(g.slot.w / img.width, g.slot.h / img.height) * a.zoom;
      const overX = img.width - g.slot.w / s;
      const overY = img.height - g.slot.h / s;
      const dx = (p.x - g.px) / s;
      const dy = (p.y - g.py) / s;
      if (overX > 0.5) a.fx = clamp(g.start.fx - ((a.flip ? -1 : 1) * dx) / overX, 0, 1);
      if (overY > 0.5) a.fy = clamp(g.start.fy - dy / overY, 0, 1);
      requestRender();
    }
  });

  const endPointer = (e: PointerEvent) => {
    // a tap (no drag) on an empty photo slot opens the camera / gallery for it
    if (e.type === 'pointerup' && tapStart && tapStart.slot >= 0 && pointers.size === 1 && !userPhotos[tapStart.slot]) {
      const p = toCanvas(e);
      if (Math.hypot(p.x - tapStart.x, p.y - tapStart.y) < 12) slotInputs[tapStart.slot]?.click();
    }
    if (pointers.size <= 1) tapStart = null;
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && gesture) {
      const wasPhoto = gesture.type === 'photo' || gesture.type === 'pinch-photo';
      gesture = null;
      persist();
      if (wasPhoto) buildSlots(); // keep the zoom slider in step with a pinch
      requestRender(true);
    } else if (pointers.size === 1 && gesture && gesture.type.startsWith('pinch')) {
      gesture = null; // lifted one finger — wait for a fresh touch
    }
  };
  preview.addEventListener('pointerup', endPointer);
  preview.addEventListener('pointercancel', endPointer);

  preview.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const l = selectedLayer();
      const f = Math.exp(-e.deltaY * 0.0015);
      if (selectedText) {
        const sc = clamp((textStyles[selectedText]?.scale ?? 1) * f, 0.3, 4);
        styleDesignText(selectedText, { scale: sc }, false);
        dScale.value = String(Math.round(sc * 100));
        return;
      }
      if (l) {
        updateSelected({ size: clamp(l.size * f, 24, 900) });
        return;
      }
      const p = toCanvas(e);
      const slot = slotAt(p.x, p.y);
      if (slot) {
        adjust[slot.i].zoom = clamp(adjust[slot.i].zoom * f, 1, 4);
        requestRender();
      }
    },
    { passive: false },
  );

  // ---------------- form, tabs, export ----------------
  form.addEventListener('input', (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (!name || name === 'effect') return;
    if (name === 'source') {
      const puja = cfg.pujas.find((p) => p.slug === (e.target as HTMLInputElement).value);
      if (puja) {
        setRadio('palette', puja.palette);
        if (!userPhotos[0]) adjust[0] = freshAdjust(puja.focus?.[1] ?? 0.5);
      }
    }
    if (name === 'linePreset') field('line').value = '';
    persist();
    requestRender(true);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab!)));

  async function exportCanvas(): Promise<HTMLCanvasElement> {
    const d = lastData ?? (await cardData());
    const out = document.createElement('canvas');
    const h = H();
    drawCard(out, template, h, d, 1);
    drawLayers(out.getContext('2d')!, h, layers);
    return out;
  }
  const filename = () => `parar-pujo-${template.id}-${format()}.jpg`;
  // count it for the home-page "পোস্টার বানানো হয়েছে" number (fire and forget)
  const countPoster = () => void fetch('/api/poster', { method: 'POST', keepalive: true }).catch(() => {});
  $('[data-share]').addEventListener('click', async () => {
    countPoster();
    void shareOrDownload(await exportCanvas(), filename(), 'পাড়ার পুজো', 'share');
  });
  $('[data-save]').addEventListener('click', async () => {
    countPoster();
    void shareOrDownload(await exportCanvas(), filename(), 'পাড়ার পুজো', 'save');
  });

  window.addEventListener('resize', () => requestRender());

  // phones: the tabs stick just under the pinned poster, whatever its height
  const stage = $('.studio__stage');
  new ResizeObserver(() => document.documentElement.style.setProperty('--stage-h', `${stage.offsetHeight}px`)).observe(stage);
  const studio = $('.studio');
  form.addEventListener('focusin', (e) => {
    if ((e.target as HTMLElement).matches('textarea, input[type="text"]')) studio.classList.add('is-typing');
  });
  form.addEventListener('focusout', () => studio.classList.remove('is-typing'));
  try {
    if (localStorage.getItem('parar-pujo:tip-seen')) $('[data-tip]').hidden = true;
    localStorage.setItem('parar-pujo:tip-seen', '1');
  } catch {
    // fine — the tip just shows again
  }

  // ---------------- go ----------------
  paintThumbs();
  buildSlots();
  showTab('design');
  void Promise.all([loadFonts(), loadCommunity(), ...layers.filter((l): l is TextLayer => l.kind === 'text').map((l) => ensureFont(fontById(l.font)))]).then(() =>
    requestRender(true),
  );
}
