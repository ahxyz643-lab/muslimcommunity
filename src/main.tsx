import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startOfflineEngine } from "@/lib/offline/queue";
import { registerServiceWorker } from "@/lib/pwa/registerSW";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";

startOfflineEngine();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
