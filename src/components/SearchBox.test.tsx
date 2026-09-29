// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "./SearchBox.tsx";

function CurrentPath() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

function renderSearch() {
  return render(
    <MemoryRouter>
      <SearchBox />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

const results = [
  { id: "place:a", label: "Headingley", detail: "Suburban Area · Leeds", kind: "place", postcode: "LS6 3BP" },
  { id: "place:b", label: "Far Headingley", detail: "Suburban Area · Leeds", kind: "place", postcode: "LS6 4BJ" },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const q = new URL(url, "http://x").searchParams.get("q");
      const body = q?.toLowerCase().startsWith("head") ? { results } : { results: [] };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function type(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe("SearchBox", () => {
  it("shows suggestions and navigates to the chosen area", async () => {
    renderSearch();
    await type("Heading");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Headingley");
    expect(options[0]).toHaveTextContent("LS6 3BP");

    fireEvent.mouseDown(options[1]);
    expect(screen.getByTestId("path")).toHaveTextContent("/area/LS64BJ");
  });

  it("supports keyboard selection", async () => {
    renderSearch();
    await type("Heading");
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByTestId("path")).toHaveTextContent("/area/LS64BJ");
  });

  it("tells the user when nothing matches", async () => {
    renderSearch();
    await type("zzzz");
    expect(screen.getByText(/No UK postcodes or places match/)).toBeInTheDocument();
  });

  it("debounces requests while typing", async () => {
    renderSearch();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "He" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Hea" } });
    await type("Head");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
