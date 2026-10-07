import { useRef } from "react";
import { Images } from "lucide-react";

type Props = { onPick: (file: File) => void; accept?: string; className?: string; label?: string };

/** Opens the device media picker for an existing photo or video. */
const MediaPicker = ({ onPick, accept = "image/*,video/*", className, label = "Open gallery" }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" aria-label={label} onClick={() => ref.current?.click()} className={className}>
        <Images className="h-6 w-6" />
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </>
  );
};

export default MediaPicker;
