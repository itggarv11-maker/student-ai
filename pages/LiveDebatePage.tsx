import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { Chat } from '@google/genai';
import * as geminiService from '../services/geminiService';
import { DebateTurn, DebateScorecard } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { GavelIcon } from '../components/icons/GavelIcon';
import { MicrophoneIcon } from '../components/icons/MicrophoneIcon';
import { PaperAirplaneIcon } from '../components/icons/PaperAirplaneIcon';
import { useContent } from '../contexts/ContentContext';
import { StopIcon } from '../components/icons/StopIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to convert blob to base64.'));
        }
    };
    reader.onerror = (error) => reject(error);
});

const LiveDebatePage: React.FC = () => {
    const [step, setStep] = useState<'setup' | 'debating' | 'evaluating' | 'results'>('setup');
    const [topic, setTopic] = useState('');
    
    const { extractedText } = useContent();
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

    const [debateHistory, setDebateHistory] = useState<DebateTurn[]>([]);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(true);
    const [scorecard, setScorecard] = useState<DebateScorecard | null>(null);
    
    // --- TTS Overhaul State ---
    const [readAloud, setReadAloud] = useState(true);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    const [isSpeaking, setIsSpeaking] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [debateHistory]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // --- TTS Voice Loading Effect ---
    useEffect(() => {
        const getVoices = () => {
            const allVoices = window.speechSynthesis.getVoices()
                .filter(v => v.lang.startsWith('en'))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            const preferredVoiceNames = [
                'Google UK English Female',
                'Microsoft Zira - English (United States)',
                'Samantha', // Apple
                'Google US English',
                'Tessa', // Nuance
            ];

            const sortedVoices = allVoices.sort((a, b) => {
                const aIndex = preferredVoiceNames.indexOf(a.name);
                const bIndex = preferredVoiceNames.indexOf(b.name);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
            
            setVoices(sortedVoices);

            if (sortedVoices.length > 0) {
                // Set a high-quality default if available, otherwise the first in the sorted list
                setSelectedVoiceURI(sortedVoices[0].voiceURI);
            }
        };

        getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = getVoices;
        }
    }, []);

    useEffect(() => {
        if (extractedText && step === 'setup') {
            const getTopics = async () => {
                setIsGeneratingTopics(true);
                setError(null);
                try {
                    const topics = await geminiService.generateDebateTopics(extractedText);
                    setSuggestedTopics(topics);
                } catch(err) {
                    console.error("Could not fetch debate topics", err);
                } finally {
                    setIsGeneratingTopics(false);
                }
            };
            getTopics();
        }
    }, [extractedText, step]);

    const speakText = (text: string) => {
        if (!readAloud || !('speechSynthesis' in window)) return;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.rate = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
            console.error(`Speech synthesis error: ${e.error}`, e);
            setIsSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    };

    const handlePlayPauseSpeech = () => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            setIsSpeaking(false);
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsSpeaking(true);
        }
    };

    const handleStartDebate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Waking up your opponent...');
        try {
            const session = geminiService.startDebateSession(topic);
            setChatSession(session);
            
            // The opening statement is now part of the initial system prompt, so the first message is from the user.
            // However, to kick it off, we can send a "Begin" message.
            const openingStatement = await geminiService.sendDebateArgument(session, "Begin the debate with your opening statement.");
            
            setDebateHistory([{ speaker: 'critico', text: openingStatement }]);
            speakText(openingStatement);
            setStep('debating');
            setIsAiThinking(false);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendTextArgument = async (argument: string) => {
        if (!argument.trim() || isAiThinking) return;

        window.speechSynthesis.cancel();
        const newHistory: DebateTurn[] = [...debateHistory, { speaker: 'user', text: argument }];
        setDebateHistory(newHistory);
        setUserInput('');
        setIsAiThinking(true);
        setError(null);

        try {
            const aiResponse = await geminiService.sendDebateArgument(chatSession!, argument);
            setDebateHistory([...newHistory, { speaker: 'critico', text: aiResponse }]);
            speakText(aiResponse);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsAiThinking(false);
        }
    };
    
    const handleSendAudioArgument = async () => {
        if (!recordedAudioBlob || isAiThinking) return;
        
        window.speechSynthesis.cancel();
        setIsAiThinking(true);
        const audioBlobToSend = recordedAudioBlob;
        setRecordedAudioBlob(null);
        
        try {
            const base64Audio = await blobToBase64(audioBlobToSend);
            const audioPart = { inlineData: { mimeType: audioBlobToSend.type, data: base64Audio } };
            
            const { transcription, rebuttal } = await geminiService.getDebateResponseToAudio(chatSession!, audioPart);

            const newHistory: DebateTurn[] = [
                ...debateHistory,
                { speaker: 'user', text: transcription },
                { speaker: 'critico', text: rebuttal },
            ];
            setDebateHistory(newHistory);
            speakText(rebuttal);

        } catch (err) {
            handleApiError(err);
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleSubmitArgument = () => {
        if (userInput.trim()) {
            handleSendTextArgument(userInput);
        } else if (recordedAudioBlob) {
            handleSendAudioArgument();
        }
    };

    const startRecording = async () => {
        if (isAiThinking || isRecording) return;
        setUserInput('');
        setRecordedAudioBlob(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setRecordedAudioBlob(audioBlob);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError("Microphone permission denied. Please allow microphone access in your browser settings.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const handleEvaluate = async () => {
        window.speechSynthesis.cancel();
        setStep('evaluating');
        setLoadingMessage('The judge is reviewing the transcript...');
        setError(null);
        try {
            const result = await geminiService.evaluateDebate(debateHistory);
            setScorecard(result);
            setStep('results');
            speakText(`The debate has concluded. Here is your evaluation. You scored ${result.overallScore} out of 100.`);
        } catch (err) {
            handleApiError(err);
            setStep('debating');
        }
    };
    
    const handleApiError = (err: unknown) => {
        if (err instanceof Error) {
            if (err.message.includes("Insufficient tokens")) {
                setError(<span>You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link> for unlimited access.</span>);
            } else {
                setError(err.message);
            }
        } else {
            setError("An unknown error occurred.");
        }
    };

    const renderSetup = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <GavelIcon className="w-16 h-16 mx-auto text-violet-600" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">AI Live Debate Arena</h1>
                <p className="mt-2 text-slate-600">Hone your critical thinking. Challenge an AI. Master your arguments.</p>
            </div>
            <form onSubmit={handleStartDebate} className="space-y-6">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-700">Enter the motion for the debate:</label>
                    <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., 'Was the Industrial Revolution beneficial for society?'" className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 text-slate-900"/>
                </div>
                
                {isGeneratingTopics && (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Spinner className="w-4 h-4" />
                        <span>Generating topic ideas from your content...</span>
                    </div>
                )}
                {suggestedTopics.length > 0 && !isGeneratingTopics && (
                    <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Or pick a suggested topic:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedTopics.map((t, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setTopic(t)}
                                    className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm hover:bg-violet-200 transition"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-red-600 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading || !topic}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : "Enter the Arena"}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderDebating = () => (
        <Card variant="light" className="max-w-4xl mx-auto">
            <div className="flex flex-col h-[75vh]">
                <div className="p-4 border-b border-slate-300 text-center space-y-2">
                    <h2 className="text-xl font-bold text-slate-800">Debate Topic: "{topic}"</h2>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Button onClick={handleEvaluate} variant="secondary" size="sm">End & Evaluate Debate</Button>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="readAloud" checked={readAloud} onChange={() => setReadAloud(!readAloud)} className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"/>
                            <label htmlFor="readAloud" className="text-sm font-medium text-slate-600">Read AI responses aloud</label>
                        </div>
                        {readAloud && (
                            <div className="flex items-center gap-2">
                                <select value={selectedVoiceURI} onChange={e => setSelectedVoiceURI(e.target.value)} className="text-xs p-1 bg-white border border-slate-300 rounded-md">
                                    {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
                                </select>
                                <Button onClick={handlePlayPauseSpeech} size="sm" variant="ghost" disabled={!window.speechSynthesis.speaking}>
                                    {isSpeaking ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5"/>}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div ref={chatContainerRef} className="flex-grow p-4 space-y-6 overflow-y-auto">
                    {debateHistory.map((turn, index) => (
                        <div key={index} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                            {turn.speaker === 'critico' && <span className="flex-shrink-0 w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">C</span>}
                            <div className={`max-w-xl p-3 rounded-lg shadow-md ${turn.speaker === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                <p>{turn.text}</p>
                            </div>
                            {turn.speaker === 'user' && <span className="flex-shrink-0 w-10 h-10 bg-violet-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">You</span>}
                        </div>
                    ))}
                    {isAiThinking && (
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">C</span>
                            <div className="max-w-xl p-3 rounded-lg shadow-md bg-white text-slate-800 border border-slate-200">
                                <Spinner className="w-10" colorClass="bg-slate-500" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-300 space-y-2">
                    {error && <p className="text-red-500 text-center font-semibold mb-2">{error}</p>}
                    {recordedAudioBlob && !isRecording && (
                        <div className="p-2 bg-slate-100 rounded-lg flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-700 flex-grow">Your recorded argument is ready to send.</p>
                            <audio src={URL.createObjectURL(recordedAudioBlob)} controls className="h-8"/>
                            <button onClick={() => setRecordedAudioBlob(null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => { setUserInput(e.target.value); setRecordedAudioBlob(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitArgument(); } }}
                            placeholder={isAiThinking ? "Critico is thinking..." : "Type or record your argument..."}
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500 text-slate-900"
                            disabled={isAiThinking || isRecording}
                        />
                        <Button onClick={isRecording ? stopRecording : startRecording} variant="ghost" className={isRecording ? '!text-red-500 animate-pulse' : '!text-slate-600'} disabled={isAiThinking}>
                            {isRecording ? <StopIcon className="w-6 h-6"/> : <MicrophoneIcon className="w-6 h-6"/>}
                        </Button>
                        <Button onClick={handleSubmitArgument} disabled={isAiThinking || isRecording || (!userInput.trim() && !recordedAudioBlob)}>
                            <PaperAirplaneIcon className="w-6 h-6"/>
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
    
    const renderLoading = (message: string) => (
        <Card variant="light" className="max-w-md mx-auto text-center">
            <Spinner className="w-16 h-16" colorClass="bg-violet-600"/>
            <h2 className="text-2xl font-bold text-slate-800 mt-6">{message}</h2>
        </Card>
    );

    const renderResults = () => {
        if (!scorecard) return null;
        const scoreColor = scorecard.overallScore > 75 ? 'text-green-600' : scorecard.overallScore > 50 ? 'text-amber-600' : 'text-red-600';

        return (
            <Card variant="light" className="max-w-4xl mx-auto">
                <div className="text-center border-b border-slate-300 pb-4">
                    <h1 className="text-3xl font-bold text-slate-800">Debate Evaluation</h1>
                    <p className={`text-4xl font-extrabold mt-2 ${scoreColor}`}>{scorecard.overallScore}<span className="text-2xl text-slate-500">/100</span></p>
                    <p className="font-semibold text-slate-600 mt-2">{scorecard.concludingRemarks}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 mt-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Performance Metrics</h3>
                        <div className="space-y-3">
                            <ScoreBar label="Argument Strength" score={scorecard.argumentStrength} />
                            <ScoreBar label="Rebuttal Effectiveness" score={scorecard.rebuttalEffectiveness} />
                            <ScoreBar label="Clarity & Articulation" score={scorecard.clarity} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-green-700">Your Strongest Argument:</h3>
                            <p className="text-sm p-3 bg-green-100/70 border border-green-200 rounded-md mt-2 italic">"{scorecard.strongestArgument}"</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-700">Suggestion for Improvement:</h3>
                            <p className="text-sm p-3 bg-amber-100/70 border border-amber-200 rounded-md mt-2">{scorecard.improvementSuggestion}</p>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-8">
                     <Button onClick={() => { setStep('setup'); setDebateHistory([]); setTopic(''); }} variant="outline">Start a New Debate</Button>
                </div>
            </Card>
        );
    };
    
    const ScoreBar = ({ label, score }: { label: string, score: number}) => {
        const bgColor = score > 75 ? 'bg-green-500' : score > 50 ? 'bg-amber-500' : 'bg-red-500';
        return (
            <div>
                <div className="flex justify-between text-sm font-medium text-slate-600 mb-1">
                    <span>{label}</span>
                    <span>{score}/100</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${bgColor}`} style={{ width: `${score}%` }}></div>
                </div>
            </div>
        )
    };

    switch(step) {
        case 'setup': return renderSetup();
        case 'debating': return renderDebating();
        case 'evaluating': return renderLoading(loadingMessage);
        case 'results': return renderResults();
        default: return renderSetup();
    }
};

export default LiveDebatePage;
