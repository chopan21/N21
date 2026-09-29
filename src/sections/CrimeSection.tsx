import type { AreaProfile, CrimeReport } from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { formatMonth, formatNumber } from "../lib/format.ts";
import { BarList, Columns } from "../components/Charts.tsx";
import { Section } from "../components/Section.tsx";
import { Stat } from "../components/Stat.tsx";

interface Props {
  area: AreaProfile;
  state: ApiState<CrimeReport> & { retry: () => void };
}

export function CrimeSection({ area, state }: Props) {
  return (
    <Section
      id="crime"
      title="Crime & safety"
      icon="🚓"
      state={state}
      source={
        <a href="https://data.police.uk/" target="_blank" rel="noreferrer">
          data.police.uk
        </a>
      }
    >
      {(data) => <CrimeBody data={data} area={area} />}
    </Section>
  );
}

function CrimeBody({ data, area }: { data: CrimeReport; area: AreaProfile }) {
  if (area.country === "Scotland") {
    return (
      <p className="empty">
        Police Scotland doesn't publish street-level crime to police.uk. See the Scottish Government's recorded crime
        statistics instead.
      </p>
    );
  }

  const average = data.trend.length
    ? Math.round(data.trend.reduce((sum, m) => sum + m.total, 0) / data.trend.length)
    : null;

  return (
    <>
      <div className="stats">
        <Stat label={`Crimes in ${formatMonth(data.month)}`} value={formatNumber(data.total)} hint="within 1 mile" />
        <Stat label="Monthly average" value={formatNumber(average)} hint={`last ${data.trend.length} months`} />
      </div>
      {data.trend.length > 1 && (
        <>
          <h3>Monthly trend</h3>
          <Columns
            ariaLabel="Crimes per month"
            items={data.trend.map((m) => ({
              key: m.month,
              label: formatMonth(m.month, "short"),
              value: m.total,
              display: formatNumber(m.total),
              highlight: m.month === data.month,
            }))}
          />
        </>
      )}
      {data.byCategory.length > 0 ? (
        <>
          <h3>By type, {formatMonth(data.month)}</h3>
          <BarList
            items={data.byCategory.map((c) => ({
              key: c.category,
              label: c.label,
              value: c.count,
              color: "var(--danger)",
            }))}
          />
        </>
      ) : (
        <p className="empty">No crimes were reported within a mile in {formatMonth(data.month)}.</p>
      )}
      <p className="footnote">
        Counts cover a one-mile radius, so busy town centres nearby push totals up. Police data is published about
        two months in arrears.
      </p>
    </>
  );
}
