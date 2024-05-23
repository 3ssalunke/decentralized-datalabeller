"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  const { publicKey } = useWallet();

  return (
    <div className="w-full h-16 border-blue-50 border-b-2">
      <div className="flex justify-between items-center p-2">
        <h2 className="font-bold text-2xl">decentDLB</h2>
        <div>
          {publicKey ? (
            <WalletDisconnectButton>
              <button className="px-4 py-2 bg-blue-50 text-black font-semibold rounded-md">
                Disconnect Wallet
              </button>
            </WalletDisconnectButton>
          ) : (
            <WalletMultiButton>Connect Wallet</WalletMultiButton>
          )}
        </div>
      </div>
    </div>
  );
}
