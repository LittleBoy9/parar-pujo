// "ঠাকুর দেখা পাসপোর্ট" — which pandals this visitor has ticked off.
// Lives only in this browser; that's fine, it's a personal keepsake.

const KEY = 'parar-pujo:visited:v1';
export const CHANGE_EVENT = 'passport:change';

export type Visits = Record<string, string>; // slug → ISO date seen

export function getVisits(): Visits {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Visits;
  } catch {
    return {};
  }
}

function save(visits: Visits) {
  try {
    localStorage.setItem(KEY, JSON.stringify(visits));
  } catch {
    // private mode / storage blocked — the stamp still shows for this page view
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: visits }));
}

export function toggleVisit(slug: string): boolean {
  const visits = getVisits();
  const seen = !visits[slug];
  if (seen) visits[slug] = new Date().toISOString();
  else delete visits[slug];
  save(visits);
  return seen;
}

/** Wire up every [data-visit="<slug>"] button on the page. */
export function bindVisitButtons(root: ParentNode = document) {
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-visit]');
  const paint = (visits: Visits) => {
    buttons.forEach((b) => {
      const seen = Boolean(visits[b.dataset.visit!]);
      b.setAttribute('aria-pressed', String(seen));
    });
  };
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const seen = toggleVisit(b.dataset.visit!);
      if (seen) {
        b.classList.remove('just-stamped');
        void b.offsetWidth; // restart the stamp animation
        b.classList.add('just-stamped');
        navigator.vibrate?.(30);
      }
    }),
  );
  window.addEventListener(CHANGE_EVENT, (e) => paint((e as CustomEvent<Visits>).detail));
  paint(getVisits());
}
