import React, { useState, useEffect, useRef } from 'react';
import { VisualExplanationScene } from '../../types';
import Button from '../common/Button';
import { PlayIcon } from '../icons/PlayIcon';
import { PauseIcon } from '../icons/PauseIcon';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { SpeakerXMarkIcon } from '../icons/SpeakerXMarkIcon';
import { ArrowsPointingOutIcon } from '../icons/ArrowsPointingOutIcon';

interface VisualPlayerProps {
    scenes: VisualExplanationScene[];
    language: string; // e.g., 'en-IN', 'en-US'
    jumpToScene?: number;
    onSceneChange?: (sceneIndex: number) => void;
}

const VisualPlayer: React.FC<VisualPlayerProps> = ({ scenes, language, jumpToScene, onSceneChange }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [imageOpacity, setImageOpacity] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    
    const playerRef = useRef<HTMLDivElement>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const sceneDurations = useRef<number[]>([]);
    const totalDuration = useRef<number>(0);
    const voices = useRef<SpeechSynthesisVoice[]>([]);
    const playerStateRef = useRef({ isPlaying: false, currentSceneIndex: 0 });

    useEffect(() => {
        playerStateRef.current.isPlaying = isPlaying;
        playerStateRef.current.currentSceneIndex = currentSceneIndex;
        if(onSceneChange) onSceneChange(currentSceneIndex);
    }, [isPlaying, currentSceneIndex, onSceneChange]);
    
    useEffect(() => {
        if (jumpToScene !== undefined && jumpToScene !== currentSceneIndex) {
            setImageOpacity(0);
            setTimeout(() => {
                setCurrentSceneIndex(jumpToScene);
                setIsPlaying(true); // Auto-play when jumping
                setImageOpacity(1);
            }, 300);
        }
    }, [jumpToScene]);


    useEffect(() => {
        const getVoices = () => {
            const allVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
            
            // Prioritize requested language, then high-quality voices
            const sortedVoices = allVoices.sort((a, b) => {
                const aIsRequested = a.lang === language;
                const bIsRequested = b.lang === language;
                if (aIsRequested && !bIsRequested) return -1;
                if (!aIsRequested && bIsRequested) return 1;

                const aIsGoogle = a.name.includes('Google');
                const bIsGoogle = b.name.includes('Google');
                if (aIsGoogle && !bIsGoogle) return -1;
                if (!aIsGoogle && bIsGoogle) return 1;

                return a.name.localeCompare(b.name);
            });
            voices.current = sortedVoices;
        };
        getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = getVoices;
        }

        // Robust cleanup for speech synthesis
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [language]);

     useEffect(() => {
        // Recalculate durations whenever scenes prop changes
        sceneDurations.current = scenes.map(s => s.narration.length * 70); 
        totalDuration.current = sceneDurations.current.reduce((sum, dur) => sum + dur, 0);
    }, [scenes]);

    const playScene = (sceneIndex: number, timeOffset = 0) => {
        if (sceneIndex >= scenes.length || !('speechSynthesis' in window)) {
            setIsPlaying(false);
            return;
        }
        
        window.speechSynthesis.cancel();
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        
        const scene = scenes[sceneIndex];
        const utterance = new SpeechSynthesisUtterance(scene.narration);
        
        utterance.voice = voices.current[0] || null;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = isMuted ? 0 : volume;
        utteranceRef.current = utterance;

        const getElapsedDuration = () => {
            return sceneDurations.current.slice(0, sceneIndex).reduce((sum, dur) => sum + dur, 0);
        };

        utterance.onstart = () => {
             const sceneStartTime = Date.now() - timeOffset;
             progressIntervalRef.current = window.setInterval(() => {
                const timeInScene = Date.now() - sceneStartTime;
                const overallElapsedTime = getElapsedDuration() + timeInScene;
                setProgress(Math.min(100, (overallElapsedTime / totalDuration.current) * 100));
            }, 100);
        };

        utterance.onend = () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            
            if (playerStateRef.current.isPlaying && playerStateRef.current.currentSceneIndex < scenes.length - 1) {
                setImageOpacity(0);
                setTimeout(() => {
                    setCurrentSceneIndex(playerStateRef.current.currentSceneIndex + 1);
                    setImageOpacity(1);
                }, 400); // Cross-fade duration
            } else {
                setIsPlaying(false);
                setProgress(100);
            }
        };
        
        utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
            console.error(`Speech synthesis error: ${e.error}`, e);
            setIsPlaying(false);
        };
        
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (isPlaying) {
            playScene(currentSceneIndex);
        } else {
            window.speechSynthesis.cancel();
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying) {
             playScene(currentSceneIndex);
        }
    }, [currentSceneIndex]);

    const handlePlayPause = () => {
        if (progress >= 100) {
            setCurrentSceneIndex(0);
            setProgress(0);
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        if(utteranceRef.current) utteranceRef.current.volume = newVolume;
    };
    
    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        setVolume(newMutedState ? 0 : 0.75);
         if(utteranceRef.current) utteranceRef.current.volume = newMutedState ? 0 : 0.75;
    };
    
    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!totalDuration.current) return;
        const bar = e.currentTarget;
        const clickPosition = e.clientX - bar.getBoundingClientRect().left;
        const clickRatio = clickPosition / bar.clientWidth;
        const targetTime = clickRatio * totalDuration.current;

        let cumulativeDuration = 0;
        for (let i = 0; i < scenes.length; i++) {
            cumulativeDuration += sceneDurations.current[i];
            if (targetTime <= cumulativeDuration) {
                const timeIntoScene = sceneDurations.current[i] - (cumulativeDuration - targetTime);
                setCurrentSceneIndex(i);
                if (!isPlaying) setIsPlaying(true);
                else playScene(i, timeIntoScene);
                break;
            }
        }
    };

    const handleFullscreen = () => {
        if (!playerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            playerRef.current.requestFullscreen();
        }
    };

    const currentScene = scenes[currentSceneIndex];

    return (
        <div ref={playerRef} className="w-full max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden bg-black border-4 border-slate-700">
            <div className="relative w-full aspect-video bg-gray-900 overflow-hidden group">
                {currentScene && (
                    <img
                        key={currentSceneIndex}
                        src={`data:image/jpeg;base64,${currentScene.imageBytes}`}
                        alt={`Visual for: ${currentScene.narration}`}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ken-burns-effect"
                        style={{ opacity: imageOpacity }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity opacity-100 group-hover:opacity-100">
                     <div className="absolute bottom-14 left-0 right-0 p-4">
                        <p className="text-white text-center text-sm md:text-lg font-semibold" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8)'}}>
                            {currentScene?.narration}
                        </p>
                    </div>
                    {/* Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/30 backdrop-blur-sm">
                        <div className="w-full bg-slate-500/50 rounded-full h-1.5 cursor-pointer" onClick={handleProgressBarClick}>
                            <div
                                className="bg-gradient-to-r from-violet-500 to-pink-500 h-1.5 rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-white">
                             <div className="flex items-center gap-2">
                                <button onClick={handlePlayPause} className="text-white hover:text-violet-300">
                                    {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                </button>
                                 <button onClick={handleToggleMute} className="text-white hover:text-violet-300">
                                    {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-6 h-6"/> : <SpeakerWaveIcon className="w-6 h-6"/>}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 accent-violet-500"
                                />
                            </div>
                            <button onClick={handleFullscreen} className="text-white hover:text-violet-300">
                                <ArrowsPointingOutIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualPlayer;
