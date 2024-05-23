"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";

async function getTaskDetails(taskId: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/user/task?taskId=${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
        },
      }
    );
    if (!response.ok) {
      throw new Error();
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    alert("fetch task failed. Please retry");
    return null;
  }
}

export default function Task({
  params: { taskId },
}: {
  params: { taskId: string };
}) {
  const [result, setResult] = useState<{
    [key: string]: {
      count: number;
      option: { imageUrl: string; optionId: string };
    };
  }>({});
  const [taskDetails, setTaskDetails] = useState<{
    options: {
      id: string;
      option_id: number;
      image_url: string;
      task_id: number;
    };
    title: string;
  }>();

  useEffect(() => {
    getTaskDetails(taskId).then((data) => {
      setResult(data.result);
      setTaskDetails(data.task);
    });
  }, [taskId]);

  return (
    <div className="w-full flex flex-col items-center gap-5">
      <div className="mx-auto my-7">
        <h2 className="text-white font-semibold text-xl">Top voted option</h2>
      </div>
      <div className="w-3/4 flex gap-10 flex-wrap">
        {Object.keys(result).length > 0 &&
          Object.keys(result).map((taskId) => (
            <div key={result[taskId].option.optionId}>
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="w-40 h-40"
                  alt="uploaded-images"
                  src={result[taskId].option.imageUrl}
                />
              }
              <h5 className="text-center">{result[taskId].count}</h5>
            </div>
          ))}
      </div>
    </div>
  );
}
