"use client";

import UploadImage from "@/components/UploadImage";
import { useRouter } from "next/navigation";
import { MouseEventHandler, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [images, setImages] = useState<string[] | []>([]);
  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState("usertxnsignature");

  const handleSubmitTask: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    if (!title) {
      alert("please add title");
      return;
    }

    if (images.length < 2) {
      alert("please add atleast two images");
      return;
    }

    if (!signature) {
      alert("please make payment first to submit the task");
      return;
    }

    let responseData;

    try {
      const data = {
        title,
        signature,
        options: images.map((img) => ({
          imageUrl: img,
        })),
      };
      const response = await fetch("http://localhost:3000/api/v1/user/task", {
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
              onClick={handleSubmitTask}
            >
              Submit Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}