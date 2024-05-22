"use client";

import { MouseEvent, MouseEventHandler, useEffect, useState } from "react";
import { API_BASE_URL } from "../../../common/config";

interface Option {
  id: number;
  image_url: string;
  option_id: number;
  task_id: number;
}

interface Task {
  id: number;
  title: string;
  payment: number;
  options: Option[];
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/v1/worker/nextTask`, {
      method: "GET",
      headers: {
        Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCurrentTask(data?.task);
      })
      .catch((error) => {
        console.error(error);
        alert("Getting next task failed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setLoading]);

  const handleSubmission: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      alert("please select a option");
      return;
    }

    if (!currentTask) {
      alert("there is no task");
      return;
    }

    const payload = {
      taskId: currentTask.id,
      selection: selectedOption.id,
    };

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/v1/worker/submission`, {
        method: "POST",
        headers: {
          Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
          "Content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error();
      }
      const data = await response.json();
      if (data.nextTask) {
        setCurrentTask(data.nextTask);
      } else {
        setCurrentTask(null);
      }
      setSelectedOption(null);
    } catch (error) {
      console.error(error);
      alert("something went wrong while sending submission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center my-7">
        <h4 className="text-xl">Loading...</h4>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="w-full flex flex-col items-center my-7">
        <h4 className="text-xl">There is no task for you to complete</h4>
      </div>
    );
  }

  return (
    <div className="w-full my-7 flex flex-col items-center gap-8">
      <h2 className="font-bold text-xl">Title</h2>
      <div className="w-3/4 flex gap-10 flex-wrap">
        {currentTask?.options?.map((opt) => (
          <div
            key={opt.id}
            className={`p-2 cursor-pointer ${
              selectedOption?.id === opt.id ? "border-2 border-blue-50" : ""
            }`}
            onClick={() => setSelectedOption(opt)}
          >
            {
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="w-40 h-40"
                alt="uploaded-images"
                src={opt.image_url}
              />
            }
          </div>
        ))}
      </div>
      <div className="text-center">
        <button
          className="px-3 py-1 bg-white rounded-md text-black font-medium"
          onClick={handleSubmission}
        >
          {!submitting ? "Submit" : "Submitting..."}
        </button>
      </div>
    </div>
  );
}
