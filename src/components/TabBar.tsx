import * as m from 'motion/react-m';
import { TABS, type Tab } from '../tabs';

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto grid max-w-120 grid-cols-4">
        {TABS.map(t => {
          const activa = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={activa ? 'page' : undefined}
              onClick={() => onChange(t.id)}
              className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-200 ${activa ? 'font-semibold text-accent' : 'text-muted'}`}
            >
              <span className="relative grid h-8 w-14 place-items-center">
                {/* la pastilla viaja a la pestaña elegida */}
                {activa && <m.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-accent-soft" />}
                <t.icon size={22} weight={activa ? 'fill' : 'regular'} className="relative" />
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
