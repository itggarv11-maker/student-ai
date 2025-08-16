

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { ClassLevel, VivaQuestion } from '../types';
import { CLASS_LEVELS } from '../constants';
import * as geminiService from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { MicrophoneIcon } from '../components/icons/MicrophoneIcon';
import { StopIcon } from '../components/icons/StopIcon';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

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

const VivaPage: React.FC = () => {
    const [step, setStep] = useState<'setup' | 'in_progress' | 'evaluating' | 'results'>('setup');
    
    // Setup State
    const [topic, setTopic] = useState('');
    const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');
    const [numQuestions, setNumQuestions] = useState(5);

    // Viva State
    const [questions, setQuestions] = useState<VivaQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Answer State
    const [answerMode, setAnswerMode] = useState<'speak' | 'type'>('speak');
    const [typedAnswer, setTypedAnswer] = useState('');
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    
    // Recording & Loading State
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [evaluatingMessage, setEvaluatingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const handleApiError = (err: unknown, customMessage?: string) => {
        if (err instanceof Error) {
            if (err.message.includes("Insufficient tokens")) {
                setError(
                    <span>
                        You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link> for unlimited access.
                    </span>
                );
            } else {
                setError(customMessage || err.message);
            }
        } else {
            setError(customMessage || "An unknown error occurred.");
        }
    };

    const handleStartSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const generatedQuestions = await geminiService.generateVivaQuestions(topic, classLevel, numQuestions);
            const questionStates: VivaQuestion[] = generatedQuestions.map(q => ({
                questionText: q,
                isAnswered: false
            }));
            setQuestions(questionStates);
            setStep('in_progress');
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForNextQuestion = () => {
        setTypedAnswer('');
        setRecordedAudioBlob(null);
        setError(null);
    };
    
    const startRecording = async () => {
        setRecordedAudioBlob(null); // Clear previous recording
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setRecordedAudioBlob(audioBlob);
                audioChunksRef.current = [];
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            setError('Microphone permission denied. Please go to your browser settings and allow microphone access.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };
    
    const handleAnswerSubmission = () => {
        const currentQ = questions[currentQuestionIndex];
        let answeredQuestion: VivaQuestion;

        if (answerMode === 'speak') {
            if (!recordedAudioBlob) {
                setError("Please record your answer first.");
                return;
            }
            answeredQuestion = {
                ...currentQ,
                isAnswered: true,
                answerAudioBlob: recordedAudioBlob,
                answerPlaybackUrl: URL.createObjectURL(recordedAudioBlob),
            };
        } else { // type mode
            if (!typedAnswer.trim()) {
                setError("Please type your answer.");
                return;
            }
            answeredQuestion = {
                ...currentQ,
                isAnswered: true,
                answerText: typedAnswer,
            };
        }
        
        const updatedQuestions = [...questions];
        updatedQuestions[currentQuestionIndex] = answeredQuestion;
        setQuestions(updatedQuestions);

        // Move to next question or evaluation
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            resetForNextQuestion();
        } else {
            // Last question answered, now wait for user to click evaluate
        }
    };

    const handleStartEvaluation = async () => {
        setStep('evaluating');
        setError(null);
        const evaluatedQs: VivaQuestion[] = [];

        for (let i = 0; i < questions.length; i++) {
            setEvaluatingMessage(`Evaluating question ${i + 1} of ${questions.length}...`);
            const q = questions[i];
            
            if (!q.isAnswered) {
                // If a question wasn't answered, fill in placeholder evaluation
                evaluatedQs.push({
                    ...q,
                    marksAwarded: 0,
                    feedback: "No answer was submitted for this question.",
                    transcription: "Not applicable."
                });
                continue;
            }

            try {
                let result: { transcription: string, feedback: string, marksAwarded: number };
                if (q.answerAudioBlob) {
                    const base64Audio = await blobToBase64(q.answerAudioBlob);
                    const audioPart = { inlineData: { mimeType: q.answerAudioBlob.type, data: base64Audio } };
                    result = await geminiService.evaluateVivaAudioAnswer(q.questionText, audioPart);
                } else { // Typed answer
                    result = await geminiService.evaluateVivaTextAnswer(q.questionText, q.answerText!);
                }
                
                evaluatedQs.push({
                    ...q,
                    transcription: result.transcription,
                    feedback: result.feedback,
                    marksAwarded: result.marksAwarded,
                });

            } catch(err) {
                 handleApiError(err, `An error occurred while evaluating question ${i+1}. Please try again.`);
                setStep('in_progress'); // Go back to let them try again
                return;
            }
        }
        setQuestions(evaluatedQs);
        setStep('results');
    };

    const renderSetup = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
             <div className="text-center mb-8">
                <AcademicCapIcon className="w-16 h-16 mx-auto text-violet-600" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Viva Preparation</h1>
                <p className="mt-2 text-slate-600">Simulate a real oral exam with your AI Examiner.</p>
            </div>
            <form onSubmit={handleStartSession} className="space-y-4">
                 <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-700">What is the viva topic?</label>
                    <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., 'Thermodynamics'" className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 text-slate-900" />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-700">Number of Questions</label>
                        <input type="number" id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(Math.min(10, Math.max(1, parseInt(e.target.value))))} min="1" max="10" className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="classLevel" className="block text-sm font-medium text-slate-700">Class Level</label>
                        <select id="classLevel" value={classLevel} onChange={e => setClassLevel(e.target.value as ClassLevel)} className="mt-1 block w-full px-3 py-2 bg-white/60 border border-slate-400 rounded-md shadow-sm text-slate-900">
                            {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                 </div>
                 {error && <p className="text-red-600 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading || !topic}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : 'Start Viva'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderInProgress = () => {
        const currentQ = questions[currentQuestionIndex];
        const isLastQuestion = currentQuestionIndex === questions.length - 1;

        return (
            <Card variant="light" className="max-w-3xl mx-auto">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-base font-medium text-violet-700">Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span className="text-sm font-medium text-violet-700">{topic}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-xl font-semibold text-slate-800">{currentQ.questionText}</p>
                </div>

                <div className="mt-6">
                     {!currentQ.isAnswered ? (
                        <>
                            <div className="flex border-b border-slate-300 mb-4">
                                <button onClick={() => setAnswerMode('speak')} className={`px-4 py-2 text-sm font-medium transition-colors ${answerMode === 'speak' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-slate-500 hover:text-slate-800'}`}>Speak</button>
                                <button onClick={() => setAnswerMode('type')} className={`px-4 py-2 text-sm font-medium transition-colors ${answerMode === 'type' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-slate-500 hover:text-slate-800'}`}>Type</button>
                            </div>
                            {answerMode === 'speak' ? (
                                <div className="text-center space-y-4">
                                    <button onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full transition-all flex items-center justify-center mx-auto shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-violet-600 hover:bg-violet-500'}`}>
                                        {isRecording ? <StopIcon className="w-8 h-8 text-white"/> : <MicrophoneIcon className="w-10 h-10 text-white" />}
                                    </button>
                                    <p className="text-sm text-slate-500 h-5">{isRecording ? "Recording..." : (recordedAudioBlob ? "Recording finished. You can listen below." : "Click to Record")}</p>
                                    {recordedAudioBlob && !isRecording && (
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <audio src={URL.createObjectURL(recordedAudioBlob)} controls className="w-full h-10"/>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <textarea value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} placeholder="Type your answer here..." rows={4} className="w-full p-2 border border-slate-300 rounded-lg"/>
                            )}
                        </>
                    ) : (
                         <div className="p-4 bg-green-100/70 border border-green-300 rounded-lg text-center">
                           <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto"/>
                            <p className="font-semibold text-green-800 mt-2">Answer Submitted!</p>
                            {currentQ.answerPlaybackUrl && <audio src={currentQ.answerPlaybackUrl} controls className="w-full h-10 mt-2"/>}
                            {currentQ.answerText && <p className="text-sm text-slate-700 mt-2 italic">"{currentQ.answerText}"</p>}
                        </div>
                    )}

                    {error && <p className="text-red-500 text-center font-semibold mt-2">{error}</p>}
                    <div className="text-center mt-6">
                        {currentQ.isAnswered ? (
                            isLastQuestion ? (
                                <Button onClick={handleStartEvaluation} size="lg">Finish & Evaluate Viva</Button>
                            ) : (
                                <Button onClick={handleAnswerSubmission} variant="secondary">Next Question <ArrowRightIcon className="w-5 h-5"/></Button>
                            )
                        ) : (
                             <Button onClick={handleAnswerSubmission} disabled={(answerMode === 'type' && !typedAnswer) || (answerMode === 'speak' && !recordedAudioBlob)}>
                                {isLastQuestion ? "Submit Final Answer" : "Submit & Next"}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        );
    };
    
    const renderEvaluating = () => (
        <Card variant="light" className="max-w-md mx-auto text-center">
            <Spinner className="w-16 h-16" colorClass="bg-violet-600"/>
            <h2 className="text-2xl font-bold text-slate-800 mt-6">Evaluating...</h2>
            <p className="text-slate-600 mt-2">{evaluatingMessage}</p>
        </Card>
    );

    const renderResults = () => {
        const totalMarksAwarded = questions.reduce((sum, q) => sum + (q.marksAwarded || 0), 0);
        const totalPossibleMarks = questions.length * 10;
        return (
            <Card variant="light" className="max-w-4xl mx-auto">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800">Viva Report</h1>
                    <p className="mt-2 text-slate-600">Topic: "{topic}"</p>
                    <p className="text-4xl font-bold text-violet-700 mt-4">{totalMarksAwarded} / {totalPossibleMarks}</p>
                </div>
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto p-2">
                    {questions.map((q, index) => (
                        <div key={index} className="p-4 bg-white/60 rounded-lg border border-slate-300">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-slate-800 mb-2">{index + 1}. {q.questionText}</p>
                                <span className="font-bold text-lg text-violet-600">{q.marksAwarded || 0}/10</span>
                            </div>
                            <div className="bg-slate-100 p-3 rounded-md border border-slate-200 text-sm mb-2">
                                <p className="font-semibold text-slate-600">Your Answer (Transcribed):</p>
                                <p className="italic text-slate-800">"{q.transcription || q.answerText || 'Not answered'}"</p>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-md border border-indigo-200 text-sm">
                                <p className="font-semibold text-indigo-700">Feedback:</p>
                                <p className="text-indigo-800">{q.feedback}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-6">
                    <Button onClick={() => { setStep('setup'); setQuestions([]); setCurrentQuestionIndex(0); resetForNextQuestion(); }}>
                        Start a New Viva
                    </Button>
                </div>
            </Card>
        );
    }


    switch(step) {
        case 'setup': return renderSetup();
        case 'in_progress': return renderInProgress();
        case 'evaluating': return renderEvaluating();
        case 'results': return renderResults();
        default: return renderSetup();
    }
};

export default VivaPage;