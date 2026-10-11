import type { ReactNode } from 'react';

/** Tiny, SAFE renderer for admin-written pages: "## heading", "- list item" and paragraphs. No HTML is ever interpreted. */
function render(src: string): ReactNode[] {
  const out: ReactNode[] = []; let para: string[] = []; let list: string[] = []; let n = 0;
  const flush = () => {
    if (para.length) out.push(<p key={n++} className="mt-4 leading-relaxed text-muted">{para.join(' ')}</p>);
    if (list.length) out.push(<ul key={n++} className="mt-4 list-disc space-y-1.5 pl-5 text-muted">{list.map((l, i) => <li key={i}>{l}</li>)}</ul>);
    para = []; list = [];
  };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('## ')) { flush(); out.push(<h2 key={n++} className="mt-10 text-2xl font-medium tracking-tight">{line.slice(3)}</h2>); }
    else if (line.startsWith('- ')) { if (para.length) flush(); list.push(line.slice(2)); }
    else { if (list.length) flush(); para.push(line); }
  }
  flush();
  return out;
}

export function Prose({ en, ne }: { en: string; ne?: string | null }) {
  return (
    <div className="max-w-2xl">
      <div data-l="en">{render(en)}</div>
      {ne && <div data-l="ne" lang="ne" className="font-ne">{render(ne)}</div>}
    </div>
  );
}
