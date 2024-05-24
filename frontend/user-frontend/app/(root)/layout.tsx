"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";
import Navbar from "../../components/Navbar";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint =
    "https://solana-devnet.g.alchemy.com/v2/SF1L-DvXR7oA-9CCAm0WGQ2h3SqLkxWR";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wallets = useMemo(() => [], [network]);

  return (
    <main>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Navbar />
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </main>
  );
}
