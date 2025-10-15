import { useRef, useCallback } from 'react';

export const useBinauralBeats = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const oscillatorsRef = useRef<{ left: OscillatorNode; right: OscillatorNode } | null>(null);

    const stop = useCallback(() => {
        if (audioContextRef.current && gainNodeRef.current && oscillatorsRef.current) {
            const now = audioContextRef.current.currentTime;
            gainNodeRef.current.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            oscillatorsRef.current.left.stop(now + 0.5);
            oscillatorsRef.current.right.stop(now + 0.5);
            oscillatorsRef.current = null;
        }
    }, []);

    const play = useCallback((baseFrequency: number, beatFrequency: number) => {
        // Stop any existing sound
        stop();

        // Initialize AudioContext on user interaction
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const context = audioContextRef.current;
        const now = context.currentTime;
        
        // Create nodes
        const gainNode = context.createGain();
        const leftOscillator = context.createOscillator();
        const rightOscillator = context.createOscillator();
        const leftPanner = context.createStereoPanner();
        const rightPanner = context.createStereoPanner();

        // Configure oscillators
        leftOscillator.type = 'sine';
        leftOscillator.frequency.setValueAtTime(baseFrequency, now);
        rightOscillator.type = 'sine';
        rightOscillator.frequency.setValueAtTime(baseFrequency + beatFrequency, now);

        // Configure panners
        leftPanner.pan.setValueAtTime(-1, now); // Pan hard left
        rightPanner.pan.setValueAtTime(1, now);  // Pan hard right

        // Configure gain (volume)
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 1.0); // Fade in over 1 second

        // Connect audio graph
        leftOscillator.connect(leftPanner).connect(gainNode);
        rightOscillator.connect(rightPanner).connect(gainNode);
        gainNode.connect(context.destination);

        // Start oscillators
        leftOscillator.start(now);
        rightOscillator.start(now);
        
        // Store references
        gainNodeRef.current = gainNode;
        oscillatorsRef.current = { left: leftOscillator, right: rightOscillator };

    }, [stop]);

    const updateFrequencies = useCallback((newBaseFrequency: number, newBeatFrequency: number) => {
        if (!audioContextRef.current || !oscillatorsRef.current || !gainNodeRef.current) {
            // Not playing, so nothing to update.
            return;
        }
        const context = audioContextRef.current;
        const now = context.currentTime;
        const rampTime = 0.05; // Short ramp for smooth, responsive changes

        oscillatorsRef.current.left.frequency.linearRampToValueAtTime(newBaseFrequency, now + rampTime);
        oscillatorsRef.current.right.frequency.linearRampToValueAtTime(newBaseFrequency + newBeatFrequency, now + rampTime);
    }, []);

    return { play, stop, updateFrequencies };
};
