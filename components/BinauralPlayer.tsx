
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Track } from '../types';
import { BINAURAL_PRESETS } from '../constants';
import { getInspirationWord } from '../services/geminiService';
import { useBinauralBeats } from '../hooks/useBinauralBeats';

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const MIN_OCTAVE_OFFSET = -2; // Can go down 2 octaves
const MAX_OCTAVE_OFFSET = 2;  // Can go up 2 octaves
const ROTATION_SENSITIVITY = 4; // It takes 4 full 360-degree rotations for one full yoyo cycle (low->high->low)

const BinauralPlayer: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isTuning, setIsTuning] = useState(false);
    const [inspirationText, setInspirationText] = useState<string>('');
    const [inspirationOpacity, setInspirationOpacity] = useState(0);
    const [dragHandle, setDragHandle] = useState<{ angle: number } | null>(null);

    const { play, stop, updateFrequencies } = useBinauralBeats();

    const controlRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const startAngleRef = useRef(0);
    const accumulatedAngleRef = useRef(0);
    const dragStartFrequenciesRef = useRef({ base: 0, beat: 0 });

    // Initial track generation
    useEffect(() => {
        const generateInitialTrack = () => {
            const initialPresetIndex = Math.floor(Math.random() * BINAURAL_PRESETS.length);
            const preset = BINAURAL_PRESETS[initialPresetIndex];
            const inspiration = getInspirationWord();
            
            const newTrack: Track = {
                baseFrequency: preset.base,
                beatFrequency: preset.beat,
                inspiration,
            };
            setCurrentTrack(newTrack);
        };
        generateInitialTrack();
    }, []);

    // Inspiration text effect
    useEffect(() => {
        if (!currentTrack?.inspiration) return;

        setInspirationText(currentTrack.inspiration);
        setInspirationOpacity(1);

        const timer = setTimeout(() => {
            setInspirationOpacity(0);
        }, 3500);

        return () => clearTimeout(timer);
    }, [currentTrack?.inspiration]);

    const togglePlayPause = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentTrack) return;
        
        if (isPlaying) {
            stop();
        } else {
            play(currentTrack.baseFrequency, currentTrack.beatFrequency);
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, currentTrack, play, stop]);

    const getAngle = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!controlRef.current) return 0;
        const rect = controlRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
        return angle;
    }, []);

    const calculateFrequencies = useCallback((totalAngle: number) => {
        // "Yoyo" effect: One full cycle (low -> high -> low) happens over ROTATION_SENSITIVITY full rotations
        const cycleAngleRadians = (totalAngle / (360 * ROTATION_SENSITIVITY)) * 2 * Math.PI;
        const sinValue = Math.sin(cycleAngleRadians); // Value from -1 to 1

        // Map the sine value to the octave offset range
        const octaveRange = MAX_OCTAVE_OFFSET - MIN_OCTAVE_OFFSET;
        const octaveMidpoint = (MAX_OCTAVE_OFFSET + MIN_OCTAVE_OFFSET) / 2;
        const octaveOffset = octaveMidpoint + (sinValue * (octaveRange / 2));
        
        // The frequency multiplier is 2^octaveOffset
        const multiplier = Math.pow(2, octaveOffset);

        const { base, beat } = dragStartFrequenciesRef.current;
        return {
            baseFrequency: base * multiplier,
            beatFrequency: beat * multiplier,
        };
    }, []);
    
    const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isPlaying || !currentTrack) return; // Can only tune when sound is playing
        isDraggingRef.current = true;
        setIsTuning(true);
        const currentAngle = getAngle(e);
        startAngleRef.current = currentAngle;
        accumulatedAngleRef.current = 0;
        dragStartFrequenciesRef.current = { base: currentTrack.baseFrequency, beat: currentTrack.beatFrequency };
        setDragHandle({ angle: currentAngle });
    }, [getAngle, isPlaying, currentTrack]);
    
    const handleMouseUp = useCallback(() => {
        if (!isDraggingRef.current) return;
        
        isDraggingRef.current = false;
        setIsTuning(false);
        setDragHandle(null);

        const { baseFrequency, beatFrequency } = calculateFrequencies(accumulatedAngleRef.current);
        
        // Snap to the final frequency smoothly
        updateFrequencies(baseFrequency, beatFrequency);

        // Generate new inspiration and update state
        const inspiration = getInspirationWord();
        setCurrentTrack({
            baseFrequency,
            beatFrequency,
            inspiration,
        });
        
        accumulatedAngleRef.current = 0;
    }, [updateFrequencies, calculateFrequencies]);

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;
        
        const currentAngle = getAngle(e);
        setDragHandle({ angle: currentAngle });

        let delta = currentAngle - startAngleRef.current;
        if (delta > 180) delta -= 360; // Handle wrap-around
        if (delta < -180) delta += 360;

        accumulatedAngleRef.current += delta;
        startAngleRef.current = currentAngle;
        
        const { baseFrequency, beatFrequency } = calculateFrequencies(accumulatedAngleRef.current);
        updateFrequencies(baseFrequency, beatFrequency);
    }, [getAngle, updateFrequencies, calculateFrequencies]);

    useEffect(() => {
        const moveHandler = (e: MouseEvent | TouchEvent) => handleMouseMove(e);
        const upHandler = () => handleMouseUp();
        
        window.addEventListener('mousemove', moveHandler, { passive: true });
        window.addEventListener('touchmove', moveHandler, { passive: true });
        window.addEventListener('mouseup', upHandler);
        window.addEventListener('touchend', upHandler);

        return () => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            window.removeEventListener('touchend', upHandler);
        };
    }, [handleMouseMove, handleMouseUp]);

    let currentOctaveOffset = 0;
    if (isTuning) {
        const cycleAngleRadians = (accumulatedAngleRef.current / (360 * ROTATION_SENSITIVITY)) * 2 * Math.PI;
        const sinValue = Math.sin(cycleAngleRadians);
        const octaveRange = MAX_OCTAVE_OFFSET - MIN_OCTAVE_OFFSET;
        const octaveMidpoint = (MAX_OCTAVE_OFFSET + MIN_OCTAVE_OFFSET) / 2;
        currentOctaveOffset = octaveMidpoint + (sinValue * (octaveRange / 2));
    }

    return (
        <div className="relative flex flex-col items-center justify-center space-y-8">
            {/* Inspiration Text */}
            <div 
                className="absolute -top-24 text-center w-full pointer-events-none"
                style={{ opacity: inspirationOpacity, transition: 'opacity 1s ease-in-out' }}
            >
                <h1 
                    className="text-3xl md:text-4xl text-black font-serif tracking-wider"
                    aria-live="polite"
                >
                    {inspirationText}
                </h1>
            </div>

            {/* Main Control Knob */}
            <div 
                ref={controlRef}
                className={`
                    relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-black 
                    flex items-center justify-center transition-colors duration-300
                    select-none
                    ${isPlaying && !isTuning ? 'cursor-grab' : ''}
                    ${isTuning ? 'cursor-grabbing' : ''}
                `}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                aria-label="Binaural Beats Controller"
                role="slider"
                aria-valuemin={MIN_OCTAVE_OFFSET}
                aria-valuemax={MAX_OCTAVE_OFFSET}
                aria-valuenow={currentOctaveOffset}
            >
                {/* Play/Pause Button */}
                <button 
                    onClick={togglePlayPause} 
                    className="
                        z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-black
                        flex items-center justify-center text-amber-50
                        border-2 border-amber-50
                        hover:bg-neutral-800 active:bg-neutral-900
                        transition-colors
                    "
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-8 h-8 md:w-10 md:h-10" /> : <PlayIcon className="w-8 h-8 md:w-10 md:h-10" />}
                </button>

                {/* Drag Handle */}
                {dragHandle && isPlaying && (
                     <div 
                        className="absolute w-full h-full pointer-events-none"
                        style={{ transform: `rotate(${dragHandle.angle}deg)`}}
                     >
                        <div className="absolute top-1/2 -mt-2 -mr-2 right-0 w-4 h-4 rounded-full bg-amber-50 shadow-lg"></div>
                     </div>
                )}

                {/* Tuning Ring */}
                <div 
                    className={`
                        absolute w-full h-full rounded-full border-4 pointer-events-none
                        transition-opacity duration-300
                        ${isTuning ? 'opacity-100 border-amber-300' : 'opacity-0 border-transparent'}
                    `}
                    style={{ 
                        transform: `scale(${1 + Math.abs(currentOctaveOffset) / 5})`,
                        transition: 'transform 0.05s linear, opacity 0.3s'
                    }}
                ></div>

            </div>
            
            {/* Helper Text */}
            <div className={`text-center transition-opacity duration-500 ${isPlaying ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
                 <p className="text-neutral-600 text-sm">Click and drag to tune the sound.</p>
            </div>
        </div>
    );
};

export default BinauralPlayer;
