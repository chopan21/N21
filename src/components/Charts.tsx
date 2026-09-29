interface BarListItem {
  key: string;
  label: string;
  value: number;
  display?: string;
  color?: string;
}

export function BarList({ items, max }: { items: BarListItem[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((item) => (
        <li key={item.key}>
          <span className="barlist__label">{item.label}</span>
          <span className="barlist__track">
            <span
              className="barlist__bar"
              style={{ width: `${(item.value / top) * 100}%`, background: item.color }}
            />
          </span>
          <span className="barlist__value">{item.display ?? item.value}</span>
        </li>
      ))}
    </ul>
  );
}

interface ColumnItem {
  key: string;
  label: string;
  value: number;
  display: string;
  highlight?: boolean;
}

export function Columns({ items, ariaLabel }: { items: ColumnItem[]; ariaLabel: string }) {
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="columns" role="img" aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.key} className={`columns__col ${item.highlight ? "is-highlight" : ""}`}>
          <span className="columns__value">{item.display}</span>
          <span className="columns__bar" style={{ height: `${Math.max(4, (item.value / top) * 100)}%` }} />
          <span className="columns__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** A 1–10 scale where 1 is the most deprived tenth of neighbourhoods. */
export function DecileScale({ decile }: { decile: number }) {
  return (
    <div className="decile" role="img" aria-label={`Decile ${decile} of 10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`decile__cell ${i + 1 === decile ? "is-current" : ""}`} data-decile={i + 1}>
          {i + 1}
        </span>
      ))}
      <div className="decile__legend">
        <span>Most deprived</span>
        <span>Least deprived</span>
      </div>
    </div>
  );
}
