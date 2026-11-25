"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_NETWORK, networkInfo, type NetworkInfo, type ZcashNetwork } from "@/lib/network";

const NetworkContext = createContext<ZcashNetwork>(DEFAULT_NETWORK);

/** Provided once in the root layout with the network the server read for this request. */
export function NetworkProvider({ network, children }: { network: ZcashNetwork; children: ReactNode }) {
  return <NetworkContext.Provider value={network}>{children}</NetworkContext.Provider>;
}

/** The active network in client components. */
export function useNetwork(): NetworkInfo {
  return networkInfo(useContext(NetworkContext));
}
