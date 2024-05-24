"use client";

import { API_BASE_URL } from "@/config";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect } from "react";

export default function Navbar() {
  const { publicKey, signMessage } = useWallet();

  const signAndSend = useCallback(async () => {
    if (!publicKey) {
      return;
    }

    try {
      const message = new TextEncoder().encode(
        "sign into decentDLB" + new Date().toString()
      );
      const signature = await signMessage?.(message);

      const data = JSON.stringify({
        message: Array.from(message),
        signature: Array.from(signature!),
        publicKey: publicKey.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/v1/user/signin`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: data,
      });

      const responseData = await response.json();
      const token = responseData.token;

      localStorage.setItem("decentDLB__auth__jwt", token);
    } catch (error) {
      console.error(error);
      alert("something went wrong while signing in. please try again.");
    }
  }, [publicKey, signMessage]);

  useEffect(() => {
    signAndSend();
  }, [publicKey, signAndSend]);

  return (
    <div className="w-full h-16 border-blue-50 border-b-2">
      <div className="flex justify-between items-center p-2">
        <h2 className="font-bold text-2xl">decentDLB</h2>
        <div>
          {publicKey ? (
            <WalletDisconnectButton>Disconnect Wallet</WalletDisconnectButton>
          ) : (
            <WalletMultiButton>Connect Wallet</WalletMultiButton>
          )}
        </div>
      </div>
    </div>
  );
}
