
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { ClassLevel, Subject, ChatMessage } from '../types';
import { CLASS_LEVELS, SUBJECTS } from '../constants';
import * as geminiService from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { MicrophoneIcon } from '../components/icons/MicrophoneIcon';
import { StopIcon } from '../components/icons/StopIcon';
import { Chat } from '@google/genai';
import { ChatBubbleLeftRightIcon } from '../components/icons/ChatBubbleLeftRightIcon';

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

const GeminiLivePage: React.FC = () => {
    const [step, setStep] = useState<'setup' | 'chatting'>('setup');
    
    // Setup State
    const [topic, setTopic] = useState('');
    const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');
    
    // Chatting State
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<ChatMessage[]>([]);
    
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [isLoading, setIsLoading] = useState(false); // For initial setup
    const [error, setError] = useState<React.ReactNode | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [conversation]);
    
     const handleApiError = (err: unknown) => {
        if (err instanceof Error) {
            if (err.message.includes("Insufficient tokens")) {
                setError(
                    <span>
                        You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link> for unlimited access.
                    </span>
                );
            } else {
                setError(err.message);
            }
        } else {
            setError("An unknown error occurred.");
        }
    };


    const handleStartSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const session = geminiService.createLiveDoubtsSession(topic, classLevel);
            setChatSession(session);
            setConversation([{
                role: 'system',
                text: `Live session started for topic: "${topic}". Click the button to start recording your doubt.`
            }]);
            setStep('chatting');
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const startRecording = async () => {
        if (isThinking || isRecording) return;
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            
            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                if (audioChunksRef.current.length === 0) return;

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                
                setIsThinking(true);
                try {
                    const base64Audio = await blobToBase64(audioBlob);
                    const audioPart = { inlineData: { mimeType: audioBlob.type, data: base64Audio } };
                    const { transcription, response } = await geminiService.sendAudioForTranscriptionAndResponse(chatSession!, audioPart);

                    setConversation(prev => [
                        ...prev,
                        { role: 'user', text: transcription || "(Could not transcribe audio)" },
                        { role: 'model', text: response }
                    ]);
                } catch (err) {
                    handleApiError(err);
                } finally {
                    setIsThinking(false);
                }
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to get microphone:', err);
            setError('Microphone permission denied. Please go to your browser settings for this site and allow microphone access.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const renderSetup = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
             <div className="text-center mb-8">
                <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-violet-600" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Live Doubts Session</h1>
                <p className="mt-2 text-slate-600">Have a live voice conversation with an AI tutor to clear your doubts instantly.</p>
            </div>
            <form onSubmit={handleStartSession} className="space-y-4">
                 <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-700">What is the topic of your doubt?</label>
                    <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., 'Quadratic Equations' or 'The Mughal Empire'" className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 text-slate-900" />
                </div>
                 <div>
                    <label htmlFor="classLevel" className="block text-sm font-medium text-slate-700">Class Level</label>
                    <select id="classLevel" value={classLevel} onChange={e => setClassLevel(e.target.value as ClassLevel)} className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md shadow-sm text-slate-900">
                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                 {error && <p className="text-red-600 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading || !topic}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : 'Start Session'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderChatting = () => (
        <Card variant="light" className="max-w-3xl mx-auto">
            <div className="flex flex-col h-[70vh]">
                {/* Header */}
                <div className="text-center p-4 border-b border-slate-300">
                    <h2 className="text-xl font-bold text-slate-800">Topic: {topic}</h2>
                     <Button variant="outline" size="sm" onClick={() => setStep('setup')} className="!mt-2 !text-xs">
                        Change Topic
                    </Button>
                </div>

                {/* Conversation History */}
                <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {conversation.map((msg, index) => {
                        if (msg.role === 'system') {
                            return <p key={index} className="text-center text-xs text-slate-500 italic py-2">{msg.text}</p>
                        }
                        return (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'model' && <span className="flex-shrink-0 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">AI</span>}
                                <div className={`max-w-md p-3 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                                {msg.role === 'user' && <span className="flex-shrink-0 w-8 h-8 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">You</span>}
                            </div>
                        )
                    })}
                     {isThinking && (
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">AI</span>
                             <div className="max-w-md p-3 rounded-lg shadow-sm bg-white text-slate-800 border border-slate-200">
                                <Spinner className="w-10" colorClass="bg-violet-500" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-slate-300 text-center">
                    {error && <p className="text-red-500 font-semibold text-sm mb-2">{error}</p>}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            onClick={startRecording}
                            disabled={isRecording || isThinking}
                            variant="primary"
                            className="w-40"
                        >
                            <MicrophoneIcon className="w-5 h-5"/>
                            Start Recording
                        </Button>
                        <Button
                            onClick={stopRecording}
                            disabled={!isRecording || isThinking}
                            variant="secondary"
                            className="w-40"
                        >
                            <StopIcon className="w-5 h-5"/>
                            Stop Recording
                        </Button>
                    </div>
                    <p className="text-sm text-slate-500 mt-3 font-medium h-5">
                        {isThinking ? "Tutor is thinking..." : isRecording ? "Recording in progress..." : "Press 'Start Recording' to ask."}
                    </p>
                </div>
            </div>
        </Card>
    );

    return step === 'setup' ? renderSetup() : renderChatting();
};

export default GeminiLivePage;