"use client";

import UploadImage from "@/components/UploadImage";
import { useRouter } from "next/navigation";
import { MouseEventHandler, useState } from "react";
import { API_BASE_URL, PARENT_WALLET_ADDRESS } from "../../config";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

export default function Home() {
  const router = useRouter();
  const [images, setImages] = useState<string[] | []>([]);
  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const inputFieldValidation = () => {
    if (!title) {
      alert("please add title");
      return false;
    }

    if (images.length < 2) {
      alert("please add atleast two images");
      return false;
    }

    return true;
  };

  const makePayment: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    if (!inputFieldValidation()) return;

    setLoading(true);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: new PublicKey(PARENT_WALLET_ADDRESS),
          lamports: 100000000,
        })
      );

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, {
        minContextSlot,
      });

      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      setSignature(signature);
    } catch (error) {
      console.error(error);
      alert("something went wrong while making payment. please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    if (!inputFieldValidation()) return;
    if (!signature) {
      alert("please make payment first to submit the task");
      return;
    }

    setLoading(true);

    let responseData;

    try {
      const data = {
        title,
        signature,
        options: images.map((img) => ({
          imageUrl: img,
        })),
      };
      const response = await fetch(`${API_BASE_URL}/v1/user/task`, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
          "Content-type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error();
      }
      responseData = await response.json();
    } catch (error) {
      console.error(error);
      alert("submit task failed. Please retry");
      return;
    } finally {
      setLoading(false);
    }

    router.push(`/task/${responseData.id}`);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mx-auto my-7">
        <h1 className="text-center font-bold text-2xl my-5">
          Welcome to decentDLB
        </h1>
        <h5 className="text-center my-2">
          Your one stop destination to get your data labelled
        </h5>
      </div>
      <div className="w-2/3 my-5 flex flex-col gap-8">
        <h3 className="font-semibold">Create a Task</h3>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="title">Task Details</label>
            <input
              name="title"
              type="text"
              className="rounded-sm outline-none text-black py-1 px-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="image">Add Images</label>
            <div className="flex gap-2 flex-wrap">
              {images.length > 0 &&
                images.map((img, i) => <UploadImage key={i} image={img} />)}
              <UploadImage
                onImageAdded={(imageUrl: string) => {
                  setImages((i) => [...i, imageUrl]);
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <button
              className="px-3 py-1 bg-white rounded-md text-black font-medium"
              onClick={signature ? handleSubmitTask : makePayment}
              type="button"
            >
              {loading
                ? "Processing..."
                : signature
                ? "Submit Task"
                : "Pay 0.1 Sol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
