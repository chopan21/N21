import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SearchResult } from "../../shared/types.ts";
import { cachedJson } from "../lib/api.ts";

export const areaPath = (postcode: string) => `/area/${postcode.replace(/\s+/g, "").toUpperCase()}`;

interface Props {
  autoFocus?: boolean;
  size?: "large" | "compact";
}

export function SearchBox({ autoFocus, size = "large" }: Props) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const latest = useRef("");

  useEffect(() => {
    const q = query.trim();
    latest.current = q;
    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const timer = setTimeout(() => {
      cachedJson<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`).then(
        ({ results }) => {
          if (latest.current !== q) return;
          setResults(results);
          setActive(results.length ? 0 : -1);
          setStatus(results.length ? "idle" : "empty");
        },
        () => latest.current === q && setStatus("error"),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(areaPath(r.postcode), { state: { label: r.kind === "place" ? r.label : undefined } });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pick = results[active] ?? results[0];
    if (pick) choose(pick);
    else if (query.trim().length >= 2) setOpen(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!results.length) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + delta + results.length) % results.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <form className={`search search--${size}`} onSubmit={onSubmit} role="search">
      <div className="search__field">
        <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder={size === "large" ? "Enter a postcode or place, e.g. LS6 2AB or Headingley" : "Search a postcode or place"}
          aria-label="Search by postcode or place name"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="btn btn--primary">
          Explore
        </button>
      </div>

      {showList && (
        <ul className="search__results" id={listId} role="listbox">
          {status === "loading" && <li className="search__hint">Searching…</li>}
          {status === "empty" && <li className="search__hint">No UK postcodes or places match “{query.trim()}”.</li>}
          {status === "error" && <li className="search__hint">Search is unavailable right now. Try again shortly.</li>}
          {status === "idle" &&
            results.map((r, i) => (
              <li
                key={r.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className={`search__badge search__badge--${r.kind}`}>{r.kind === "place" ? "Place" : "Postcode"}</span>
                <span className="search__label">{r.label}</span>
                <span className="search__detail">{r.kind === "place" ? `${r.detail} · ${r.postcode}` : r.detail}</span>
              </li>
            ))}
        </ul>
      )}
    </form>
  );
}
