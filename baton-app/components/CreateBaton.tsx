"use client";

import { useState } from "react";
import {
  batonWrite,
  commitmentOf,
  randomSecret,
  saveMeta,
  type HeirMeta,
} from "@/lib/baton";

type Props = { onCreated: () => void };

type HeirDraft = { name: string; email: string; sharePct: string };

export default function CreateBaton({ onCreated }: Props) {
  const [heirs, setHeirs] = useState<HeirDraft[]>([
    { name: "", email: "", sharePct: "100" },
  ]);
  const [demoMode, setDemoMode] = useState(true);
  const [heartbeatDays, setHeartbeatDays] = useState("90");
  const [graceDays, setGraceDays] = useState("30");
  const [guardian, setGuardian] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totalPct = heirs.reduce((s, h) => s + (parseInt(h.sharePct) || 0), 0);
  const valid =
    heirs.length > 0 &&
    heirs.every((h) => h.name.trim() && (parseInt(h.sharePct) || 0) > 0) &&
    totalPct === 100;

  function setHeir(i: number, patch: Partial<HeirDraft>) {
    setHeirs(heirs.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  }

  async function create() {
    setError("");
    setBusy(true);
    try {
      const withSecrets: HeirMeta[] = heirs.map((h) => ({
        name: h.name.trim(),
        email: h.email.trim(),
        sharePct: parseInt(h.sharePct),
        secret: randomSecret(),
      }));
      const commitments = withSecrets.map((h) => commitmentOf(h.secret));
      const shares = withSecrets.map((h) => h.sharePct * 100); // pct -> bps

      const interval = demoMode ? 120 : parseInt(heartbeatDays) * 86400;
      const grace = demoMode ? 60 : parseInt(graceDays) * 86400;
      const guardianAddr = guardian.trim() || "0x0000000000000000000000000000000000000000";

      const baton = await batonWrite();
      const tx = await baton.createEstate(interval, grace, guardianAddr, commitments, shares);
      const receipt = await tx.wait();

      let estateId = "0";
      for (const log of receipt.logs) {
        try {
          const parsed = baton.interface.parseLog(log);
          if (parsed?.name === "EstateCreated") {
            estateId = parsed.args[0].toString();
            break;
          }
        } catch {}
      }

      saveMeta({ estateId, heirs: withSecrets, demoMode });
      onCreated();
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Transaction failed");
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-2xl">Create your Baton</h2>
      <p className="mt-1 text-sm text-steel">
        Choose who receives what. You stay in full control until the very end.
      </p>

      <div className="mt-6 space-y-4">
        {heirs.map((h, i) => (
          <div key={i} className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label className="label">Name</label>
              <input
                className="input"
                placeholder="Aisha"
                value={h.name}
                onChange={(e) => setHeir(i, { name: e.target.value })}
              />
            </div>
            <div className="col-span-5">
              <label className="label">Email (for your records)</label>
              <input
                className="input"
                placeholder="aisha@example.com"
                value={h.email}
                onChange={(e) => setHeir(i, { email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Share %</label>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                value={h.sharePct}
                onChange={(e) => setHeir(i, { sharePct: e.target.value })}
              />
            </div>
            <div className="col-span-1 flex items-end">
              {heirs.length > 1 && (
                <button
                  className="btn-ghost h-[50px] w-full px-0"
                  onClick={() => setHeirs(heirs.filter((_, j) => j !== i))}
                  aria-label="Remove beneficiary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <button
            className="btn-ghost"
            onClick={() => setHeirs([...heirs, { name: "", email: "", sharePct: "" }])}
            disabled={heirs.length >= 3}
          >
            + Add beneficiary
          </button>
          <p className={`text-sm font-semibold ${totalPct === 100 ? "text-brass" : "text-red-400"}`}>
            Total: {totalPct}%
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-steel/20 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Demo Mode</p>
            <p className="text-xs text-steel">2 minute heartbeat, 1 minute grace. For the video.</p>
          </div>
          <button
            className={`h-8 w-14 rounded-full transition ${demoMode ? "bg-brass" : "bg-steelDark"}`}
            onClick={() => setDemoMode(!demoMode)}
            aria-label="Toggle demo mode"
          >
            <span
              className={`block h-6 w-6 rounded-full bg-ink transition ${demoMode ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>

        {!demoMode && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Heartbeat every (days)</label>
              <input
                className="input"
                type="number"
                value={heartbeatDays}
                onChange={(e) => setHeartbeatDays(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Grace period (days)</label>
              <input
                className="input"
                type="number"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="label">Guardian address (optional)</label>
          <input
            className="input"
            placeholder="0x… a trusted person who must confirm before claims open"
            value={guardian}
            onChange={(e) => setGuardian(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button className="btn-brass mt-6 w-full" onClick={create} disabled={!valid || busy}>
        {busy ? "Creating onchain…" : "Create Baton"}
      </button>
    </div>
  );
}
