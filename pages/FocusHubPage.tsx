
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { TargetIcon } from '../components/icons/TargetIcon';
import { TreeIcon } from '../components/icons/TreeIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';
import { ArrowPathIcon } from '../components/icons/ArrowPathIcon';

const FocusHubPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800">Focus & Productivity Hub</h1>
                <p className="mt-2 text-lg text-gray-600">Your command center for disciplined and effective studying.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <PomodoroTimer />
                    <MyWhy />
                </div>
                <div className="lg:col-span-1">
                    <FocusForest />
                </div>
            </div>
             <Card>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Focus Tips</h3>
                 <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                    <li>**Binaural Beats:** Listen to binaural beats for 15-20 minutes to help enter a deep focus state.</li>
                    <li>**10-Minute Rule:** If you feel distracted, commit to studying for just 10 more minutes. The feeling usually passes.</li>
                    <li>**Fixed Study Place:** Studying in the same location trains your brain to associate the space with focus.</li>
                </ul>
            </Card>
        </div>
    );
};

const MyWhy: React.FC = () => {
    const [why, setWhy] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const savedWhy = localStorage.getItem('stubroMyWhy');
        if (savedWhy) {
            setWhy(savedWhy);
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    }, []);
    
    useEffect(() => {
        if(isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (why.trim()) {
            localStorage.setItem('stubroMyWhy', why);
            setIsEditing(false);
        }
    };

    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <TargetIcon className="w-8 h-8 text-indigo-500" />
                <h2 className="text-2xl font-bold text-gray-800">My "Why"</h2>
            </div>
            {isEditing ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Define your core motivation. Why are you studying so hard? This will be your anchor during tough times.</p>
                    <textarea
                        ref={inputRef}
                        value={why}
                        onChange={(e) => setWhy(e.target.value)}
                        placeholder="e.g., To make my parents proud and secure a great future."
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                        rows={3}
                    />
                    <Button onClick={handleSave}>Save My Why</Button>
                </div>
            ) : (
                <div>
                    <p className="text-lg text-gray-700 font-semibold italic">"{why}"</p>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="mt-2 !text-xs">
                        Edit
                    </Button>
                </div>
            )}
        </Card>
    );
};

const PomodoroTimer: React.FC = () => {
    const SESSIONS = { STUDY: 90 * 60, SHORT_BREAK: 5 * 60, LONG_BREAK: 20 * 60 };
    const [sessionType, setSessionType] = useState<'STUDY' | 'SHORT_BREAK' | 'LONG_BREAK'>('STUDY');
    const [time, setTime] = useState(SESSIONS.STUDY);
    const [isActive, setIsActive] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0);

    useEffect(() => {
        let interval: number | undefined = undefined;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(t => t - 1);
            }, 1000);
        } else if (isActive && time === 0) {
            // Session ended
            handleSessionEnd();
        }
        return () => clearInterval(interval);
    }, [isActive, time]);
    
    const playSound = () => {
        const audio = new Audio('https://storage.googleapis.com/maker-studio-sounds/General/Notification-1.mp3');
        audio.play();
    };

    const handleSessionEnd = () => {
        playSound();
        setIsActive(false);

        if (sessionType === 'STUDY') {
             const newCount = pomodoroCount + 1;
             setPomodoroCount(newCount);
             // Dispatch event to update Focus Forest
             window.dispatchEvent(new CustomEvent('pomodoroComplete'));
             
            if (newCount % 4 === 0) {
                setSessionType('LONG_BREAK');
                setTime(SESSIONS.LONG_BREAK);
            } else {
                setSessionType('SHORT_BREAK');
                setTime(SESSIONS.SHORT_BREAK);
            }
        } else { // Break ended
            setSessionType('STUDY');
            setTime(SESSIONS.STUDY);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setSessionType('STUDY');
        setTime(SESSIONS.STUDY);
        setPomodoroCount(0);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const sessionInfo = {
        STUDY: { title: "Focus Session", color: "bg-indigo-500", message: "Time to focus! Avoid all distractions." },
        SHORT_BREAK: { title: "Short Break", color: "bg-green-500", message: "Stretch, hydrate, but avoid your phone!" },
        LONG_BREAK: { title: "Long Break", color: "bg-orange-500", message: "Well deserved! Rest your mind completely." },
    };

    return (
        <Card className={`text-white transition-colors duration-500 ${sessionInfo[sessionType].color}`}>
            <h2 className="text-2xl font-bold text-center">{sessionInfo[sessionType].title}</h2>
            <p className="text-center text-indigo-100 text-sm mb-4">{sessionInfo[sessionType].message}</p>
            <p className="text-7xl font-bold text-center my-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{formatTime(time)}</p>
            <div className="flex justify-center items-center gap-4">
                <Button onClick={toggleTimer} variant="outline" className="!bg-white/20 !border-white !text-white hover:!bg-white/30 w-32">
                    {isActive ? <><PauseIcon className="w-6 h-6"/> Pause</> : <><PlayIcon className="w-6 h-6"/> Start</>}
                </Button>
                <Button onClick={resetTimer} variant="ghost" className="hover:!bg-white/20">
                    <ArrowPathIcon className="w-6 h-6"/>
                </Button>
            </div>
             <p className="text-center text-indigo-200 text-xs mt-4">Pomodoros completed: {pomodoroCount}</p>
        </Card>
    );
};

const FocusForest: React.FC = () => {
    const [trees, setTrees] = useState(0);

    useEffect(() => {
        const savedTrees = parseInt(localStorage.getItem('focusTrees') || '0', 10);
        setTrees(savedTrees);

        const handlePomodoroComplete = () => {
            setTrees(prevTrees => {
                const newTrees = prevTrees + 1;
                localStorage.setItem('focusTrees', newTrees.toString());
                return newTrees;
            });
        };

        window.addEventListener('pomodoroComplete', handlePomodoroComplete);
        return () => window.removeEventListener('pomodoroComplete', handlePomodoroComplete);
    }, []);

    const resetForest = () => {
        if (window.confirm("Are you sure you want to reset your forest? This cannot be undone.")) {
            localStorage.setItem('focusTrees', '0');
            setTrees(0);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">My Focus Forest</h2>
            <p className="text-sm text-gray-600 text-center mb-4">A new tree grows for every 90-minute focus session you complete!</p>
            <div className="flex-grow bg-green-100/50 rounded-lg p-4 border border-green-200 min-h-[200px] flex flex-wrap items-end gap-2">
                {trees === 0 ? (
                    <p className="w-full text-center text-green-700">Your forest is empty. Complete a focus session to plant your first tree!</p>
                ) : (
                    Array.from({ length: trees }).map((_, index) => (
                        <TreeIcon key={index} className="w-10 h-10 text-green-600" style={{ transform: `scale(${1 + Math.random() * 0.2})` }} />
                    ))
                )}
            </div>
             <Button variant="ghost" size="sm" onClick={resetForest} className="mt-2 !text-xs !text-red-500 self-center">Reset Forest</Button>
        </Card>
    );
};

export default FocusHubPage;
