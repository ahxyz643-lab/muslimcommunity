import { useEffect, useMemo } from "react";

type Props = { file: File; className?: string; controls?: boolean };

export const isVideoFile = (f: File) => f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name);

/** Renders a local preview of a captured or picked file. */
const MediaPreview = ({ file, className = "", controls = true }: Props) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return isVideoFile(file) ? (
    <video src={url} className={`bg-black object-contain ${className}`} controls={controls} autoPlay loop muted={!controls} playsInline />
  ) : (
    <img src={url} alt="Selected media preview" className={`bg-black object-contain ${className}`} />
  );
};

export default MediaPreview;
