"use client";

import { useRouter } from "next/navigation";
import { Uploader } from "@/components/uploader";

export function LibraryUploader() {
  const router = useRouter();
  return <Uploader accept="both" onUploaded={() => router.refresh()} />;
}
