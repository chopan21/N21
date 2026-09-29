import type { ReactNode } from "react";
import type { ApiState } from "../lib/api.ts";

interface Props<T> {
  id: string;
  title: string;
  icon: string;
  source: ReactNode;
  state: ApiState<T> & { retry: () => void };
  children: (data: T) => ReactNode;
  className?: string;
}

export function Section<T>({ id, title, icon, source, state, children, className }: Props<T>) {
  return (
    <section className={`card section ${className ?? ""}`} id={id} aria-labelledby={`${id}-title`}>
      <header className="section__header">
        <h2 id={`${id}-title`}>
          <span className="section__icon" aria-hidden="true">
            {icon}
          </span>
          {title}
        </h2>
      </header>
      <div className="section__body" aria-busy={state.status === "loading"}>
        {state.status === "loading" && <Skeleton />}
        {state.status === "error" && (
          <div className="notice notice--error" role="alert">
            <p>{state.error.message}</p>
            <button className="btn btn--ghost" onClick={state.retry}>
              Try again
            </button>
          </div>
        )}
        {state.status === "success" && children(state.data)}
      </div>
      <footer className="section__source">Source: {source}</footer>
    </section>
  );
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton__line" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
