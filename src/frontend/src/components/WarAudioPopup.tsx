import { useEffect, useRef, useState } from "react";

interface Props {
  onClose: () => void;
}

export function WarAudioPopup({ onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const drumIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sfxIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeRef = useRef(volume);
  const sfxRef = useRef(sfxEnabled);

  useEffect(() => {
    volumeRef.current = volume;
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        volume,
        audioCtxRef.current!.currentTime,
        0.05,
      );
    }
  }, [volume]);

  useEffect(() => {
    sfxRef.current = sfxEnabled;
  }, [sfxEnabled]);

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = volumeRef.current;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function playKick(ctx: AudioContext, dest: AudioNode, when: number) {
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * 0.3), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.04));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.2);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.8, when);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.25);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, when);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    src.connect(noiseGain);
    noiseGain.connect(dest);
    src.start(when);
    src.stop(when + 0.3);
  }

  function playSnare(ctx: AudioContext, dest: AudioNode, when: number) {
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * 0.2), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.025));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + 0.2);
  }

  function playHihat(ctx: AudioContext, dest: AudioNode, when: number) {
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * 0.08), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + 0.08);
  }

  function playExplosionSfx(ctx: AudioContext, dest: AudioNode) {
    const when = ctx.currentTime;
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * 0.6), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.12));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, when);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.55);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + 0.6);
  }

  function playGunfireSfx(ctx: AudioContext, dest: AudioNode) {
    const when = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(320, when);
    osc.frequency.exponentialRampToValueAtTime(80, when + 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.07);
  }

  function startLoop() {
    const ctx = getAudioCtx();
    const dest = masterGainRef.current!;
    // war drum beat: kick on 1,3 snare on 2,4 at ~120bpm
    const bpm = 120;
    const beatMs = (60 / bpm) * 1000;
    let beat = 0;
    drumIntervalRef.current = setInterval(() => {
      const when = ctx.currentTime;
      const b = beat % 4;
      if (b === 0 || b === 2) playKick(ctx, dest, when);
      if (b === 1 || b === 3) playSnare(ctx, dest, when);
      playHihat(ctx, dest, when);
      playHihat(ctx, dest, when + beatMs / 2 / 1000);
      beat++;
    }, beatMs);

    sfxIntervalRef.current = setInterval(
      () => {
        if (!sfxRef.current) return;
        const c = getAudioCtx();
        const d = masterGainRef.current!;
        if (Math.random() < 0.5) playExplosionSfx(c, d);
        else playGunfireSfx(c, d);
      },
      2000 + Math.random() * 3000,
    );
  }

  function stopLoop() {
    if (drumIntervalRef.current) clearInterval(drumIntervalRef.current);
    if (sfxIntervalRef.current) clearInterval(sfxIntervalRef.current);
    drumIntervalRef.current = null;
    sfxIntervalRef.current = null;
  }

  function togglePlay() {
    if (isPlaying) {
      stopLoop();
      setIsPlaying(false);
    } else {
      startLoop();
      setIsPlaying(true);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drumIntervalRef.current) clearInterval(drumIntervalRef.current);
      if (sfxIntervalRef.current) clearInterval(sfxIntervalRef.current);
      drumIntervalRef.current = null;
      sfxIntervalRef.current = null;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 220,
        right: 16,
        zIndex: 60,
        background: "rgba(10,4,2,0.97)",
        border: "2px solid rgba(255,80,40,0.6)",
        borderRadius: 12,
        padding: "12px 14px",
        minWidth: 200,
        boxShadow: "0 0 24px rgba(255,60,20,0.35), 0 4px 16px rgba(0,0,0,0.7)",
        color: "#fff",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: 13, color: "#ff8844" }}>
          ⚔️ War Audio
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#ff6644",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "0 2px",
          }}
          type="button"
          data-ocid="war_audio.close_button"
        >
          ✕
        </button>
      </div>

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        type="button"
        data-ocid="war_audio.toggle"
        style={{
          width: "100%",
          padding: "7px 0",
          borderRadius: 8,
          border: `1px solid ${isPlaying ? "rgba(255,100,50,0.7)" : "rgba(200,100,50,0.4)"}`,
          background: isPlaying ? "rgba(200,60,20,0.45)" : "rgba(80,30,10,0.4)",
          color: isPlaying ? "#ffaa66" : "#cc7744",
          fontWeight: "bold",
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 10,
          transition: "all 0.15s",
        }}
      >
        {isPlaying ? "⏸ Pause War Drums" : "▶ Play War Drums"}
      </button>

      {/* Volume slider */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#cc9966", marginBottom: 4 }}>
          🔊 Volume
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          data-ocid="war_audio.input"
          style={{ width: "100%", accentColor: "#ff6633" }}
        />
      </div>

      {/* SFX toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 11, color: "#cc9966" }}>
          💥 SFX (Explosions)
        </span>
        <button
          onClick={() => setSfxEnabled((v) => !v)}
          type="button"
          data-ocid="war_audio.toggle"
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            border: `1px solid ${sfxEnabled ? "rgba(255,150,50,0.6)" : "rgba(100,60,30,0.4)"}`,
            background: sfxEnabled
              ? "rgba(200,80,20,0.4)"
              : "rgba(40,20,10,0.4)",
            color: sfxEnabled ? "#ffaa55" : "#886644",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {sfxEnabled ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
