import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings, Upload, Music, Pause, Play, RotateCcw } from "lucide-react";
import sampleImg from "@/assets/Sample.jpg";
import sampleAudio from "@/assets/Sample.mp3";

export const Route = createFileRoute("/")({
  component: Index,
});

type SpeedKey = "1" | "2" | "3";

const DEFAULT_DURATIONS: Record<SpeedKey, number> = { "1": 10, "2": 10, "3": 10 };
const ROT_SECS: Record<SpeedKey, number> = { "1": 6, "2": 3, "3": 1.5 };
const LABELS: Record<SpeedKey, string> = {
  "1": "Speed 1 (Slow ~0.3x)",
  "2": "Speed 2 (Normal ~0.7x)",
  "3": "Speed 3 (Fast ~1.2x)",
};
const PASSWORD = "stall";

function Index() {
  const [imgUrl, setImgUrl] = useState<string | null>(sampleImg);
  const [audioUrl, setAudioUrl] = useState<string | null>(sampleAudio);
  const [speed, setSpeed] = useState<SpeedKey>("2");
  const [durations, setDurations] = useState<Record<SpeedKey, number>>(() => {
    if (typeof window === "undefined") return DEFAULT_DURATIONS;
    try {
      const s = localStorage.getItem("rot-playtime");
      return s ? { ...DEFAULT_DURATIONS, ...JSON.parse(s) } : DEFAULT_DURATIONS;
    } catch {
      return DEFAULT_DURATIONS;
    }
  });
  const [title, setTitle] = useState<string>(() => {
    if (typeof window === "undefined") return "Rotating Image";
    return localStorage.getItem("rot-title") || "Rotating Image";
  });
  const [rememberAudio, setRememberAudio] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("rot-remember-audio") !== "0";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem("rot-playtime", JSON.stringify(durations)); } catch {}
  }, [durations]);
  useEffect(() => {
    try { localStorage.setItem("rot-title", title); } catch {}
  }, [title]);
  useEffect(() => {
    try { localStorage.setItem("rot-remember-audio", rememberAudio ? "1" : "0"); } catch {}
  }, [rememberAudio]);

  // sync audio with playing state
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (playing) {
      if (!rememberAudio) a.currentTime = 0;
      a.play().catch(() => {});
    } else {
      a.pause();
      if (!rememberAudio) a.currentTime = 0;
    }
  }, [playing, audioUrl, rememberAudio]);

  // auto-pause after duration
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (playing) {
      timeoutRef.current = setTimeout(() => setPlaying(false), durations[speed] * 1000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [playing, speed, durations, resetKey]);

  const onImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImgUrl(URL.createObjectURL(f));
      setPlaying(false);
      setResetKey((k) => k + 1);
    }
  };
  const onAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAudioUrl(URL.createObjectURL(f));
  };

  const handleReset = () => {
    setPlaying(false);
    setResetKey((k) => k + 1);
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
  };

  const togglePlay = () => {
    if (!imgUrl) return;
    setPlaying((p) => !p);
  };

  const submitPwd = () => {
    if (pwd === PASSWORD) {
      setUnlocked(true);
      setShowPwd(false);
      setPwd("");
      setPwdErr(false);
    } else {
      setPwdErr(true);
    }
  };

  const closeSettings = () => {
    setShowSettings(false);
    setUnlocked(false);
    setShowPwd(false);
    setPwd("");
    setPwdErr(false);
  };

  const rotSec = ROT_SECS[speed];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <style>{`
        @keyframes spin360 { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        .spin-img { animation: spin360 var(--dur, 3s) linear infinite; }
        .spin-paused { animation: none !important; transform: rotate(0deg); }
      `}</style>

      <header className="p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-wide">{title}</h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        {imgUrl ? (
          <div
            className="relative rounded-full overflow-hidden border border-white/10 cursor-pointer select-none"
            style={{ width: "min(70vw, 70vh)", height: "min(70vw, 70vh)" }}
            onClick={togglePlay}
          >
            <img
              key={resetKey}
              src={imgUrl}
              alt="rotating"
              className={`w-full h-full object-cover ${playing ? "spin-img" : "spin-paused"}`}
              style={{ ["--dur" as any]: `${rotSec}s` }}
              draggable={false}
            />
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-3 border border-dashed border-white/30 rounded-full w-72 h-72 justify-center hover:bg-white/5 transition">
            <Upload className="w-8 h-8" />
            <span className="text-sm text-white/70">Click to import image</span>
            <input type="file" accept="image/*" className="hidden" onChange={onImg} />
          </label>
        )}
      </main>

      {audioUrl && <audio ref={audioRef} src={audioUrl} loop />}

      <footer className="p-6 flex flex-col gap-4">
        <div className="flex justify-center gap-3">
          {(["1", "2", "3"] as SpeedKey[]).map((k) => (
            <button
              key={k}
              onClick={() => { setSpeed(k); setPlaying(true); }}
              className={`px-5 py-2 rounded-full border text-sm transition ${
                speed === k
                  ? "bg-white text-black border-white"
                  : "border-white/30 hover:border-white/70"
              }`}
            >
              Speed {k}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>

          <div className="flex items-center gap-2">
            {imgUrl && (
              <button
                onClick={togglePlay}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? "Pause" : "Play"}
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </footer>

      {showSettings && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeSettings}
        >
          <div
            className="bg-neutral-900 border border-white/15 rounded-xl p-6 w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => { if (!unlocked) setShowPwd(true); }}
          >
            <h2 className="text-lg font-semibold mb-4">Settings</h2>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/70">Program title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black border border-white/20 rounded px-2 py-1.5 text-white"
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Remember MP3 progress</span>
                <input
                  type="checkbox"
                  checked={rememberAudio}
                  onChange={(e) => setRememberAudio(e.target.checked)}
                  className="w-4 h-4 accent-white"
                />
              </label>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <span className="text-xs uppercase tracking-wide text-white/50">Media</span>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {imgUrl ? "Change image" : "Import image"}
                  <input type="file" accept="image/*" className="hidden" onChange={onImg} />
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm cursor-pointer">
                  <Music className="w-4 h-4" />
                  {audioUrl ? "Change MP3" : "Import MP3"}
                  <input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={onAudio} />
                </label>
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">
                    Playback length (seconds)
                  </span>
                  {!unlocked && <span className="text-xs text-white/40">Locked</span>}
                </div>
                <div className="flex flex-col gap-2">
                  {(["1", "2", "3"] as SpeedKey[]).map((k) => (
                    <label key={k} className="flex items-center justify-between gap-3 text-sm">
                      <span className={unlocked ? "" : "text-white/40"}>{LABELS[k]}</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        disabled={!unlocked}
                        value={durations[k]}
                        onChange={(e) =>
                          setDurations((d) => ({
                            ...d,
                            [k]: Math.max(1, parseFloat(e.target.value) || 1),
                          }))
                        }
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="w-24 bg-black border border-white/20 rounded px-2 py-1 text-white disabled:opacity-40"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {unlocked && (
                <button
                  onClick={() => setDurations(DEFAULT_DURATIONS)}
                  className="px-3 py-2 text-sm border border-white/20 rounded hover:bg-white/10"
                >
                  Reset durations
                </button>
              )}
              <button
                onClick={closeSettings}
                className="px-3 py-2 text-sm bg-white text-black rounded"
              >
                Done
              </button>
            </div>

            {showPwd && (
              <div
                className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full max-w-xs flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Enter password</h3>
                  <input
                    type="password"
                    autoFocus
                    value={pwd}
                    onChange={(e) => { setPwd(e.target.value); setPwdErr(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") submitPwd(); }}
                    className="bg-black border border-white/20 rounded px-2 py-1.5 text-white"
                  />
                  {pwdErr && <span className="text-xs text-red-400">Incorrect password</span>}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowPwd(false); setPwd(""); setPwdErr(false); }}
                      className="px-3 py-1.5 text-sm border border-white/20 rounded hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitPwd}
                      className="px-3 py-1.5 text-sm bg-white text-black rounded"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
