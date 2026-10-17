// Full-screen story player: tap right/left to move, hold to pause, swipe down to close.
import { isEn, tr } from '../lib/i18n';
import { reportStory, timeAgo, type Story } from './api';

export interface StoryGroup {
  slug: string;
  nameBn: string;
  nameEn?: string | null;
  color: string;
  href: string; // where the pandal name in the viewer links to
  stories: Story[];
}

const DURATION = 5000;
const HOLD_MS = 220;

export class StoryViewer {
  private groups: StoryGroup[] = [];
  private gi = 0;
  private si = 0;
  private downAt = 0;
  private downY = 0;
  private holdTimer: number | null = null;
  private el: Record<string, HTMLElement>;
  private img: HTMLImageElement;

  constructor(
    private dialog: HTMLDialogElement,
    private opts: { onSeen: (id: string) => void },
  ) {
    const q = <T extends HTMLElement>(s: string) => dialog.querySelector<T>(s)!;
    this.el = {
      bars: q('[data-bars]'),
      dot: q('[data-v-dot]'),
      pandal: q('[data-v-pandal]'),
      meta: q('[data-v-meta]'),
      caption: q('[data-v-caption]'),
      toast: q('[data-v-toast]'),
      stage: q('[data-v-stage]'),
    };
    this.img = q<HTMLImageElement>('[data-v-img]');

    q('[data-v-close]').addEventListener('click', () => this.close());
    q('[data-v-report]').addEventListener('click', () => void this.report());
    dialog.addEventListener('close', () => this.stopHold());
    this.el.bars.addEventListener('animationend', () => this.next());
    this.img.addEventListener('load', () => dialog.classList.remove('is-paused'));
    this.img.addEventListener('error', () => dialog.open && this.next()); // expired mid-view — skip it

    const stage = this.el.stage;
    stage.addEventListener('pointerdown', (e) => {
      this.downAt = Date.now();
      this.downY = e.clientY;
      this.holdTimer = window.setTimeout(() => dialog.classList.add('is-paused'), HOLD_MS);
    });
    stage.addEventListener('pointerup', (e) => {
      const held = Date.now() - this.downAt > HOLD_MS;
      this.stopHold();
      if (e.clientY - this.downY > 80) return this.close(); // swipe down
      if (held) return; // that was a pause, not a tap
      const { left, width } = stage.getBoundingClientRect();
      if (e.clientX - left < width * 0.3) this.prev();
      else this.next();
    });
    stage.addEventListener('pointercancel', () => this.stopHold());
  }

  open(groups: StoryGroup[], gi: number) {
    this.groups = groups;
    this.gi = gi;
    this.si = 0;
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else {
      // no <dialog> support: show it as a plain full-screen layer
      this.dialog.setAttribute('open', '');
      this.dialog.classList.add('viewer--fallback');
    }
    this.show();
  }

  close() {
    if (!this.dialog.open) return;
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else {
      this.dialog.removeAttribute('open');
      this.dialog.dispatchEvent(new Event('close'));
    }
  }

  private stopHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.dialog.open && this.img.complete) this.dialog.classList.remove('is-paused');
  }

  private get group() {
    return this.groups[this.gi];
  }

  private show() {
    const g = this.group;
    const s = g.stories[this.si];
    const name = (isEn() && g.nameEn) || g.nameBn;

    // progress bars — replace each time so the CSS animation restarts cleanly
    this.el.bars.replaceChildren(
      ...g.stories.map((_, i) => {
        const bar = document.createElement('span');
        bar.className = i < this.si ? 'done' : i === this.si ? 'now' : '';
        bar.append(document.createElement('i'));
        return bar;
      }),
    );
    this.dialog.style.setProperty('--dur', `${DURATION}ms`);

    this.dialog.classList.add('is-paused'); // until the photo has loaded
    this.img.src = s.url;
    this.img.alt = s.caption ?? tr(`${name} — স্টোরি`, `${name} — story`);
    if (this.img.complete) this.dialog.classList.remove('is-paused');

    this.el.dot.style.background = g.color;
    this.el.pandal.textContent = name;
    this.el.pandal.setAttribute('href', g.href);
    this.el.meta.textContent = [timeAgo(s.postedAt), s.author].filter(Boolean).join(' · ');
    this.el.caption.textContent = s.caption ?? '';

    this.opts.onSeen(s.id);

    // warm the next photo
    const upcoming = g.stories[this.si + 1] ?? this.groups[this.gi + 1]?.stories[0];
    if (upcoming) new Image().src = upcoming.url;
  }

  private next() {
    if (this.si < this.group.stories.length - 1) this.si++;
    else if (this.gi < this.groups.length - 1) {
      this.gi++;
      this.si = 0;
    } else return this.close();
    this.show();
  }

  private prev() {
    if (this.si > 0) this.si--;
    else if (this.gi > 0) {
      this.gi--;
      this.si = this.group.stories.length - 1;
    }
    this.show();
  }

  private async report() {
    const s = this.group.stories[this.si];
    this.dialog.classList.add('is-paused');
    if (!confirm(tr('ছবিটা আপত্তিকর বা অনুমতি ছাড়া তোলা? রিপোর্ট করবেন?', 'Is this photo offensive, or taken without permission? Report it?'))) {
      this.dialog.classList.remove('is-paused');
      return;
    }
    try {
      await reportStory(s.id);
      this.toast(tr('ধন্যবাদ — আমরা দেখে নিচ্ছি', "Thanks — we'll take a look"));
    } catch (err) {
      this.toast((err as Error).message);
    }
    this.next();
  }

  private toast(text: string) {
    const t = this.el.toast;
    t.textContent = text;
    t.hidden = false;
    setTimeout(() => (t.hidden = true), 2400);
  }
}
