"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreateBaton from "@/components/CreateBaton";
import Dashboard from "@/components/Dashboard";
import { getMagic, loadMeta, type BatonMeta } from "@/lib/baton";

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
        setAddress(info.publicAddress || "");
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
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">BATON</h1>
        <button className="text-sm text-steel underline hover:text-brass" onClick={logout}>
          Sign out
        </button>
      </header>
      {meta ? (
        <Dashboard meta={meta} address={address} onReset={reload} />
      ) : (
        <CreateBaton onCreated={reload} />
      )}
    </main>
  );
}
