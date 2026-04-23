"use client";

import {
  columnHeading,
  sortInspectorTabKeys,
  tabIntro,
  tabTitle
} from "../../lib/dbInspectorCopy";
import { useCallback, useEffect, useState } from "react";

type Snapshot =
  | {
      driver: "postgres";
      tablePrefix?: string;
      tables: Record<string, Record<string, unknown>[]>;
    }
  | {
      driver: "sqlite";
      path: string;
      tablePrefix?: string;
      tables: Record<string, Record<string, unknown>[]>;
    }
  | { error: string; cwd?: string };

export default function DbInspectorPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/db/snapshot", { cache: "no-store" });
      const j = (await r.json()) as Snapshot;
      setData(j);
      if ("tables" in j && j.tables) {
        const sorted = sortInspectorTabKeys(Object.keys(j.tables));
        if (sorted[0]) setTab(sorted[0]);
      }
    } catch (e) {
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tables =
    data && "tables" in data && data.tables ? data.tables : null;
  const keys = tables ? sortInspectorTabKeys(Object.keys(tables)) : [];
  const rows = tables && tab ? (tables[tab] ?? []) : [];
  const columns =
    rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null
      ? Object.keys(rows[0] as object)
      : [];

  const intro = tab ? tabIntro(tab) : null;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "1.5rem 1.25rem 2rem",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        lineHeight: 1.45,
        color: "#1a1a1a"
      }}
    >
      <h1 style={{ fontSize: "1.65rem", marginBottom: "0.35rem" }}>
        What’s in the database
      </h1>
      <p style={{ color: "#444", marginBottom: "1rem", maxWidth: "52rem" }}>
        This page is a <strong>read-only snapshot</strong> of the same data the Discord
        bot uses. Use it to see teams, who joined which team, saved chat, and optional
        GitHub links—without running SQL yourself.
      </p>

      <aside
        style={{
          background: "#f0f7ff",
          border: "1px solid #c5d9f5",
          borderRadius: "10px",
          padding: "0.85rem 1rem",
          marginBottom: "1.25rem",
          fontSize: "0.95rem"
        }}
      >
        <strong>Tip:</strong> If <em>Club directory (GitHub)</em> is empty but{" "}
        <em>Team roster</em> has rows, that’s normal—roster is “who is on the team”;
        the directory is only for linking GitHub accounts when you add that flow.
      </aside>

      <button
        type="button"
        onClick={() => void load()}
        style={{
          marginBottom: "1.1rem",
          padding: "0.55rem 1.1rem",
          cursor: "pointer",
          borderRadius: "8px",
          border: "1px solid #bbb",
          background: "#fff",
          fontSize: "0.95rem"
        }}
      >
        Refresh data
      </button>

      {loading && <p>Loading…</p>}

      {!loading && data && "error" in data && (
        <pre
          style={{
            background: "#fff0f0",
            padding: "1rem",
            borderRadius: "10px",
            overflow: "auto",
            border: "1px solid #f0b4b4"
          }}
        >
          {data.error}
          {data.cwd ? `\ncwd: ${data.cwd}` : ""}
        </pre>
      )}

      {!loading && data && "driver" in data && (
        <>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.92rem", color: "#333" }}>
            <strong>Storage:</strong>{" "}
            {data.driver === "postgres" ? "Cloud database (Postgres)" : "Local file"}{" "}
            {data.driver === "sqlite" && data.path && (
              <>
                · <code style={{ fontSize: "0.85em" }}>{data.path}</code>
              </>
            )}
            {data.tablePrefix !== undefined && data.tablePrefix !== "" && (
              <>
                {" "}
                · technical table prefix: <code>{data.tablePrefix}_</code>
              </>
            )}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.75rem"
            }}
          >
            {keys.map((k) => {
              const title = tabTitle(k);
              const count = tables![k]?.length ?? 0;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "10px",
                    border: tab === k ? "2px solid #2563eb" : "1px solid #ccc",
                    background: tab === k ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    textAlign: "left",
                    maxWidth: "220px"
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    {count} row{count === 1 ? "" : "s"}
                  </div>
                </button>
              );
            })}
          </div>

          {intro && (
            <p
              style={{
                marginBottom: "0.85rem",
                padding: "0.65rem 0.85rem",
                background: "#fafafa",
                borderRadius: "8px",
                border: "1px solid #e8e8e8",
                fontSize: "0.92rem",
                color: "#333"
              }}
            >
              {intro}
            </p>
          )}

          <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "0.5rem" }}>
            Internal table name: <code>{tab}</code>
          </p>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              overflow: "auto",
              maxHeight: "65vh",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "0.88rem"
              }}
            >
              <thead>
                <tr style={{ background: "#eef2f7", position: "sticky", top: 0 }}>
                  {columns.map((c) => (
                    <th
                      key={c}
                      style={{
                        textAlign: "left",
                        padding: "0.55rem 0.65rem",
                        borderBottom: "1px solid #ccd4e0",
                        whiteSpace: "normal",
                        maxWidth: "200px",
                        fontWeight: 600
                      }}
                    >
                      <div>{columnHeading(tab, c)}</div>
                      <div
                        style={{
                          fontWeight: 400,
                          fontSize: "0.72rem",
                          color: "#666",
                          marginTop: "0.15rem"
                        }}
                      >
                        {c}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#fafafa" : "#fff" }}>
                    {columns.map((c) => (
                      <td
                        key={c}
                        style={{
                          padding: "0.45rem 0.65rem",
                          borderBottom: "1px solid #eee",
                          verticalAlign: "top",
                          maxWidth: "320px",
                          wordBreak: "break-word"
                        }}
                      >
                        {formatCell((row as Record<string, unknown>)[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "#666" }}>
        <a href="/">← Back to home</a>
      </p>
    </main>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
