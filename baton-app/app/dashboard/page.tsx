"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BatonMark from "@/components/BatonMark";
import CreateBaton from "@/components/CreateBaton";
import Dashboard from "@/components/Dashboard";
import { getMagic, getSigner, loadMeta, type BatonMeta } from "@/lib/baton";

export default function DashboardPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [meta, setMeta] = useState<BatonMeta | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => setMeta(loadMeta()), []);

  useEffect(() => {
    (async () => {
      try {
        const magic = await getMagic();
        if (!(await magic.user.isLoggedIn())) {
          router.replace("/");
          return;
        }
        const info = await magic.user.getInfo();
        let addr = info.publicAddress || "";
        if (!addr) {
          const signer = await getSigner();
          addr = await signer.getAddress();
        }
        setAddress(addr);
        setMeta(loadMeta());
        setReady(true);
      } catch (e) {
        console.error(e);
        router.replace("/");
      }
    })();
  }, [router]);

  async function logout() {
    const magic = await getMagic();
    await magic.user.logout();
    router.replace("/");
  }

  if (!ready)
    return (
      <main className="flex min-h-screen items-center justify-center text-steel">
        Loading…
      </main>
    );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BatonMark size={34} />
            <h1 className="font-display text-3xl tracking-tight">BATON</h1>
          </div>
          <button
            className="text-sm text-steel transition hover:text-brass"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
        <div className="hairline mt-5" />
      </header>
      {meta ? (
        <Dashboard meta={meta} address={address} onReset={reload} />
      ) : (
        <CreateBaton onCreated={reload} />
      )}
    </main>
  );
}
