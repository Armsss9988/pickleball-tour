'use client';

import { useEffect, useState } from 'react';

export interface ControlRoomSectionLink {
  id: string;
  label: string;
}

interface ControlRoomScrollspyProps {
  sections: ControlRoomSectionLink[];
}

export function ControlRoomScrollspy({ sections }: ControlRoomScrollspyProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:top-6 md:mx-0 md:rounded-xl md:border md:bg-slate-900/70 md:p-3">
      <div className="flex min-w-max gap-2 md:min-w-0 md:flex-col">
        {sections.map((section) => {
          const isActive = activeId === section.id;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
