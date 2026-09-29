import { useMemo, useState } from "react";
import type { AreaProfile, PriceReport, PropertyType } from "../../shared/types.ts";
import type { ApiState } from "../lib/api.ts";
import { formatDate, formatPrice, formatPriceShort, PROPERTY_TYPE_LABELS } from "../lib/format.ts";
import { BarList, Columns } from "../components/Charts.tsx";
import { Section } from "../components/Section.tsx";
import { Stat } from "../components/Stat.tsx";

const PAGE = 10;

interface Props {
  area: AreaProfile;
  state: ApiState<PriceReport> & { retry: () => void };
}

export function PricesSection({ area, state }: Props) {
  return (
    <Section
      id="prices"
      title="Sold house prices"
      icon="💷"
      state={state}
      className="section--wide"
      source={
        <a href="https://www.gov.uk/government/collections/price-paid-data" target="_blank" rel="noreferrer">
          HM Land Registry Price Paid Data
        </a>
      }
    >
      {(data) => <PricesBody data={data} area={area} />}
    </Section>
  );
}

function PricesBody({ data, area }: { data: PriceReport; area: AreaProfile }) {
  const [type, setType] = useState<PropertyType | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const { stats } = data;

  const sales = useMemo(
    () => (type === "all" ? data.sales : data.sales.filter((s) => s.propertyType === type)),
    [data.sales, type],
  );

  if (stats.count === 0) {
    const covered = area.country === "England" || area.country === "Wales";
    return (
      <p className="empty">
        {covered
          ? `No standard residential sales have been registered in or around ${area.postcode} since ${data.sinceYear}.`
          : `HM Land Registry only publishes sold prices for England and Wales. For ${area.country}, try Registers of Scotland or Land & Property Services NI.`}
      </p>
    );
  }

  const latestYear = stats.byYear.at(-1)?.year;

  return (
    <>
      <div className="stats">
        <Stat label="Median sold price" value={formatPrice(stats.median)} />
        <Stat label="Sales recorded" value={String(stats.count)} hint={`since ${data.sinceYear}`} />
        <Stat label="Price range" value={`${formatPriceShort(stats.min)} – ${formatPriceShort(stats.max)}`} />
      </div>

      <div className="split">
        <div>
          <h3>Median price by year</h3>
          <Columns
            ariaLabel="Median sold price by year"
            items={stats.byYear.map((y) => ({
              key: String(y.year),
              label: String(y.year),
              value: y.median,
              display: formatPriceShort(y.median),
              highlight: y.year === latestYear,
            }))}
          />
        </div>
        <div>
          <h3>Median price by property type</h3>
          <BarList
            items={stats.byType.map((t) => ({
              key: t.type,
              label: `${PROPERTY_TYPE_LABELS[t.type]} (${t.count})`,
              value: t.median,
              display: formatPriceShort(t.median),
            }))}
          />
        </div>
      </div>

      <div className="table-head">
        <h3>Recent sales nearby</h3>
        <label className="select">
          <span className="visually-hidden">Filter by property type</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as PropertyType | "all");
              setShown(PAGE);
            }}
          >
            <option value="all">All property types</option>
            {stats.byType.map((t) => (
              <option key={t.type} value={t.type}>
                {PROPERTY_TYPE_LABELS[t.type]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Address</th>
              <th scope="col">Type</th>
              <th scope="col" className="num">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, shown).map((s, i) => (
              <tr key={`${s.date}-${s.address}-${i}`}>
                <td className="nowrap">{formatDate(s.date)}</td>
                <td>
                  {s.address}
                  <span className="muted"> · {s.postcode}</span>
                  {s.newBuild && <span className="tag">New build</span>}
                </td>
                <td>
                  {PROPERTY_TYPE_LABELS[s.propertyType]}
                  {s.tenure !== "unknown" && <span className="muted"> · {s.tenure}</span>}
                </td>
                <td className="num">{formatPrice(s.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sales.length > shown && (
        <button className="btn btn--ghost btn--block" onClick={() => setShown((n) => n + PAGE * 2)}>
          Show more sales ({sales.length - shown} more)
        </button>
      )}
      <p className="footnote">
        Covers {data.postcodesSearched.length} postcodes closest to {area.postcode}. Excludes repossessions and
        other non-market transfers.
      </p>
    </>
  );
}