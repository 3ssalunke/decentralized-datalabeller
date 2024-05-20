"use client";

import { AWS_CLOUDFRONT_DIST_URL } from "@/constants";
import Image from "next/image";
import React, { useState } from "react";

export default function UploadImage({
  onImageAdded,
  image,
}: {
  onImageAdded?: (image: string) => void;
  image?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    setUploading(true);

    try {
      const file = e.target?.files?.[0];
      if (file && onImageAdded) {
        const response = await fetch(
          "http://localhost:3000/api/v1/user/presignedurl",
          {
            method: "GET",
            headers: {
              Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
            },
          }
        );

        if (!response.ok) {
          throw new Error("response was not ok for presignedurl api call");
        }
        const responseData = await response.json();
        console.log(responseData);

        const formData = new FormData();
        formData.set("bucket", responseData.fields["bucket"]);
        formData.set("X-Amz-Algorithm", responseData.fields["X-Amz-Algorithm"]);
        formData.set(
          "X-Amz-Credential",
          responseData.fields["X-Amz-Credential"]
        );
        formData.set("X-Amz-Algorithm", responseData.fields["X-Amz-Algorithm"]);
        formData.set("X-Amz-Date", responseData.fields["X-Amz-Date"]);
        formData.set("key", responseData.fields["key"]);
        formData.set("Policy", responseData.fields["Policy"]);
        formData.set("X-Amz-Signature", responseData.fields["X-Amz-Signature"]);
        formData.set("X-Amz-Algorithm", responseData.fields["X-Amz-Algorithm"]);
        formData.set("file", file);
        const presignedUrl = responseData.presignedUrl;

        await fetch(presignedUrl, {
          method: "POST",
          body: formData,
        });

        onImageAdded(
          `${AWS_CLOUDFRONT_DIST_URL}/${responseData.fields["key"]}`
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (image) {
    console.log(image);
    return <Image height={160} width={160} alt="uploaded-images" src={image} />;
  }

  return (
    <div className="w-40 h-40 rounded border border-white bg-slate-900">
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        +
        <input
          type="file"
          className="w-full h-full absolute opacity-0 top-0 left-0 cursor-pointer"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
