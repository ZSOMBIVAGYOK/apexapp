import React, { useState, useEffect, useRef } from "react";
import { BottomSheet, Button, Badge } from "@shared/ui";
import { Play, Pause, RotateCcw, Plus, Bell, Timer } from "lucide-react";
import { formatDurationMmSs, getBlockTitle } from "@shared/lib/blocks";
import { TrainingBlock } from "@shared/types/training";

export interface RestTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSeconds?: number;
  initialSeconds?: number;
  block?: TrainingBlock;
  blockTitle?: string;
  restBetweenRoundsSeconds?: number;
  restAfterBlockSeconds?: number;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  isOpen,
  onClose,
  defaultSeconds = 60,
  initialSeconds: initSecProp,
  block,
  blockTitle: titleProp,
  restBetweenRoundsSeconds: rbrProp,
  restAfterBlockSeconds: rabProp
}) => {
  const blockTitle = titleProp || (block ? getBlockTitle(block) : undefined);
  const restBetweenRoundsSeconds = rbrProp ?? block?.restBetweenRoundsSeconds;
  const restAfterBlockSeconds = rabProp ?? block?.restAfterBlockSeconds;
  const effectiveDefaultSec = initSecProp ?? defaultSeconds;
  const initialSeconds = effectiveDefaultSec > 0 ? effectiveDefaultSec : 60;
  const [targetSeconds, setTargetSeconds] = useState<number>(initialSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize target when modal opens or defaultSeconds changes
  useEffect(() => {
    if (isOpen) {
      const s = defaultSeconds > 0 ? defaultSeconds : 60;
      setTargetSeconds(s);
      setSecondsRemaining(s);
      setIsRunning(true);
      setHasFinished(false);
    } else {
      setIsRunning(false);
    }
  }, [isOpen, defaultSeconds]);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            setHasFinished(true);
            playChime();
            triggerVibration();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining]);

  // Web Audio chime (pleasant 880Hz -> 1320Hz ascending tone)
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3); // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const triggerVibration = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {
        // Ignored if browser prevents vibration
      }
    }
  };

  const handleStartPause = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(targetSeconds);
      setHasFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(targetSeconds);
    setHasFinished(false);
  };

  const handleAdd30s = () => {
    setSecondsRemaining((prev) => prev + 30);
    setTargetSeconds((prev) => prev + 30);
    setHasFinished(false);
  };

  const handleSelectPreset = (sec: number) => {
    setTargetSeconds(sec);
    setSecondsRemaining(sec);
    setHasFinished(false);
    setIsRunning(true);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={blockTitle ? `Pihenő időzítő • ${blockTitle}` : "Pihenő időzítő"}
    >
      <div className="space-y-6 pb-6 text-center">
        {/* Visual Countdown Ring / Display */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div
            className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-300 relative shadow-inner ${
              hasFinished
                ? "border-emerald-500 bg-emerald-500/10 shadow-emerald-500/20"
                : isRunning
                ? "border-brand-primary bg-brand-primary/5 shadow-brand-primary/20 animate-pulse"
                : "border-border-hairline bg-bg-surface"
            }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-1 flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Hátralévő pihenő
            </div>
            <div className="text-48 font-mono font-bold tracking-tight text-text-primary">
              {formatDurationMmSs(secondsRemaining) || "0:00"}
            </div>
            <div className="text-[11px] text-text-tertiary mt-1">
              {hasFinished ? "Kész! Mehet a következő kör!" : `Cél: ${formatDurationMmSs(targetSeconds)}`}
            </div>
          </div>

          {hasFinished && (
            <div className="mt-4 animate-bounce">
              <Badge variant="ready" size="md">
                <Bell className="w-3.5 h-3.5 mr-1" />
                Pihenőidő lejárt!
              </Badge>
            </div>
          )}
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Újra
          </Button>

          <Button
            type="button"
            variant={hasFinished ? "primary" : isRunning ? "secondary" : "primary"}
            size="lg"
            className="px-8 font-semibold min-w-32"
            onClick={handleStartPause}
            leftIcon={isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          >
            {hasFinished ? "Újrakezdés" : isRunning ? "Szünet" : "Indítás"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleAdd30s}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            +30s
          </Button>
        </div>

        {/* Quick Presets from Block */}
        <div className="space-y-2 pt-2 border-t border-border-hairline">
          <div className="text-xs text-text-secondary">Gyors választás a blokkból:</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {restBetweenRoundsSeconds && restBetweenRoundsSeconds > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectPreset(restBetweenRoundsSeconds)}
              >
                Körök között: {formatDurationMmSs(restBetweenRoundsSeconds)}
              </Button>
            )}

            {restAfterBlockSeconds && restAfterBlockSeconds > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectPreset(restAfterBlockSeconds)}
              >
                Blokk után: {formatDurationMmSs(restAfterBlockSeconds)}
              </Button>
            )}

            {[30, 60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSelectPreset(sec)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  targetSeconds === sec
                    ? "border-brand-primary bg-brand-primary/15 text-brand-primary font-medium"
                    : "border-border-subtle bg-bg-surface/50 text-text-secondary hover:text-text-primary"
                }`}
              >
                {formatDurationMmSs(sec)}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Bezárás
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
