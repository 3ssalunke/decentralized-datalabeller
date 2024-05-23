"use client";

import { ChangeEventHandler, useState } from "react";
import { API_BASE_URL, AWS_CLOUDFRONT_DIST_URL } from "../config";

export default function UploadImage({
  onImageAdded,
  image,
}: {
  onImageAdded?: (image: string) => void;
  image?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    setUploading(true);

    try {
      const file = e.target?.files?.[0];
      if (file && onImageAdded) {
        const response = await fetch(`${API_BASE_URL}/v1/user/presignedurl`, {
          method: "GET",
          headers: {
            Authorization: localStorage.getItem("decentDLB__auth__jwt") || "",
          },
        });

        if (!response.ok) {
          throw new Error("response was not ok for presignedurl api call");
        }
        const responseData = await response.json();

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
      alert(
        "something went wrong while creating presigned url or uploading image to s3"
      );
    }
  };

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="w-40 h-40" alt="uploaded-images" src={image} />;
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
