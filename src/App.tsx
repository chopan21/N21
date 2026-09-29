import { useEffect } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useShortlist } from "./lib/shortlist.ts";
import { AboutPage } from "./pages/AboutPage.tsx";
import { AreaPage } from "./pages/AreaPage.tsx";
import { ComparePage } from "./pages/ComparePage.tsx";
import { HomePage } from "./pages/HomePage.tsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container page">
      <div className="card empty-state">
        <h1>Page not found</h1>
        <p>
          <Link to="/">Go back to search</Link>
        </p>
      </div>
    </div>
  );
}

export function App() {
  const shortlist = useShortlist();

  return (
    <>
      <ScrollToTop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="container topbar__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              N21
            </span>
            <span className="brand__name">Neighbourhood Explorer</span>
          </Link>
          <nav className="topbar__nav" aria-label="Main">
            <NavLink to="/" end>
              Search
            </NavLink>
            <NavLink to="/compare">
              Shortlist
              {shortlist.items.length > 0 && <span className="badge">{shortlist.items.length}</span>}
            </NavLink>
            <NavLink to="/about">About the data</NavLink>
          </nav>
        </div>
      </header>

      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/area/:postcode" element={<AreaPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Built on open data from HM Land Registry, data.police.uk, the Environment Agency, ONS, Ordnance Survey,
            OpenStreetMap and Open-Meteo. <Link to="/about">Sources &amp; licences</Link>.
          </p>
          <p className="muted">For information only. Not financial, legal or surveying advice.</p>
        </div>
      </footer>
    </>
  );
}
