import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { QuizQuestion, WrittenFeedback, QuizHistoryItem, Subject } from '../../types';
import * as geminiService from '../../services/geminiService';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { LightBulbIcon } from '../icons/LightBulbIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { PencilSquareIcon } from '../icons/PencilSquareIcon';
import { CameraIcon } from '../icons/CameraIcon';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { StopIcon } from '../icons/StopIcon';

interface QuizComponentProps {
    questions: QuizQuestion[];
    sourceText: string;
    subject: Subject;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('File could not be read as a data URL.'));
            }
        };
        reader.onerror = (error) => reject(error);
    });
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Blob could not be read as a data URL.'));
            }
        };
        reader.onerror = error => reject(error);
    });
}

const QuizComponent: React.FC<QuizComponentProps> = ({ questions, sourceText, subject }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [writtenAnswer, setWrittenAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [answeredQuestions, setAnsweredQuestions] = useState<QuizQuestion[]>([]);
    
    // State for subjective answer methods
    const [answerMethod, setAnswerMethod] = useState<'type' | 'upload' | 'speak'>('type');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    // State for speaking answers
    const [isRecording, setIsRecording] = useState(false);
    const [spokenAnswerBlob, setSpokenAnswerBlob] = useState<Blob | null>(null);
    
    const [error, setError] = useState<React.ReactNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const currentQuestion = questions[currentQuestionIndex];
    const isMCQ = currentQuestion.type === 'mcq';
    
    useEffect(() => {
        // Cleanup speech synthesis on component unmount
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        if (isFinished) {
            const mcqCorrect = answeredQuestions.filter(q => q.type === 'mcq' && q.isCorrect).length;
            const writtenScore = answeredQuestions
                .filter(q => q.type === 'written' && q.feedback)
                .reduce((sum, q) => sum + q.feedback!.marksAwarded, 0);
            const totalScore = mcqCorrect + writtenScore;

            const mcqTotal = questions.filter(q => q.type === 'mcq').length;
            const writtenTotal = questions
                .filter(q => q.type === 'written')
                .reduce((sum) => sum + 5, 0);
            const totalPossible = mcqTotal + writtenTotal;

            const history: QuizHistoryItem[] = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            const newHistoryItem: QuizHistoryItem = {
                date: new Date().toLocaleDateString(),
                subject: subject,
                score: `${totalScore}/${totalPossible}`,
                level: `Class ${questions.length}`
            };
            history.unshift(newHistoryItem);
            localStorage.setItem('quizHistory', JSON.stringify(history.slice(0, 20)));
        }
    }, [isFinished, answeredQuestions, questions, subject]);

    const handleSpeak = (textToSpeak: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = "en-US";
            utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
                console.error(`Speech synthesis error: ${e.error}`, e);
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Sorry, your browser doesn't support text-to-speech.");
        }
    };
    
    const startRecording = async () => {
        setSpokenAnswerBlob(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            
            recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    setSpokenAnswerBlob(audioBlob);
                    audioChunksRef.current = [];
                }
            };
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            setError('Microphone permission denied. Please allow microphone access in your browser settings.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };
    
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


    const handleCheckAnswer = async () => {
        let updatedQuestion: QuizQuestion;
        setError(null);

        if (isMCQ) {
            if (!selectedOption) return;
            const isAnswerCorrect = selectedOption === currentQuestion.correctAnswer;
            updatedQuestion = { ...currentQuestion, userAnswer: selectedOption, isCorrect: isAnswerCorrect };
            setAnsweredQuestions(prev => [...prev, updatedQuestion]);
            setShowResult(true);
        } else { // Written question
            setIsLoading(true);
            try {
                if (answerMethod === 'upload') {
                    if (imageFiles.length === 0) throw new Error("Please upload at least one image of your answer.");
                    const imageParts = await Promise.all(imageFiles.map(async (file) => ({ inlineData: { mimeType: file.type, data: (await fileToDataUrl(file)).split(',')[1] } })));
                    const evalFeedback = await geminiService.evaluateWrittenAnswerFromImages(sourceText, currentQuestion.question, imageParts);
                    updatedQuestion = { ...currentQuestion, userAnswerImages: imagePreviews, feedback: evalFeedback };
                } else if (answerMethod === 'speak') {
                    if (!spokenAnswerBlob) throw new Error("Please record your answer first.");
                    const base64Audio = await blobToDataUrl(spokenAnswerBlob).then(url => url.split(',')[1]);
                    const audioPart = { inlineData: { mimeType: spokenAnswerBlob.type, data: base64Audio }};
                    const { transcription, feedback } = await geminiService.evaluateSpokenAnswerForQuiz(sourceText, currentQuestion.question, audioPart);
                    updatedQuestion = { ...currentQuestion, userSpokenAnswerBlob: spokenAnswerBlob, feedback, transcription };
                } else { // 'type' method
                    if (!writtenAnswer.trim()) throw new Error("Please type your answer.");
                    const evalFeedback = await geminiService.evaluateWrittenAnswer(sourceText, currentQuestion.question, writtenAnswer);
                    updatedQuestion = { ...currentQuestion, userAnswer: writtenAnswer, feedback: evalFeedback };
                }
                setAnsweredQuestions(prev => [...prev, updatedQuestion]);
            } catch (err) {
                handleApiError(err);
                const errorFeedback: WrittenFeedback = { whatIsCorrect: 'Could not get feedback.', whatIsMissing: '', whatIsIncorrect: '', marksAwarded: 0, totalMarks: 5 };
                updatedQuestion = { ...currentQuestion, userAnswer: 'N/A', feedback: errorFeedback };
                setAnsweredQuestions(prev => [...prev, updatedQuestion]);
            } finally {
                setIsLoading(false);
                setShowResult(true);
            }
        }
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        setImageFiles(prev => [...prev, ...newFiles]);

        try {
            const newPreviews = await Promise.all(newFiles.map(fileToDataUrl));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        } catch(err) {
            setError("Could not load image preview.");
        }
    };
    
    const removeImage = (indexToRemove: number) => {
        setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            resetStateForNextQuestion();
        } else {
            setIsFinished(true);
        }
    };
    
    const resetStateForNextQuestion = () => {
        setSelectedOption(null);
        setWrittenAnswer('');
        setShowResult(false);
        setIsLoading(false);
        setAnswerMethod('type');
        setImageFiles([]);
        setImagePreviews([]);
        setSpokenAnswerBlob(null);
        setIsRecording(false);
        setError(null);
    }
    
    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        resetStateForNextQuestion();
        setAnsweredQuestions([]);
        setIsFinished(false);
    }

    if (isFinished) {
        const mcqCorrect = answeredQuestions.filter(q => q.type === 'mcq' && q.isCorrect).length;
        const mcqTotal = questions.filter(q => q.type === 'mcq').length;
        const writtenScore = answeredQuestions.filter(q => q.type === 'written' && q.feedback).reduce((sum, q) => sum + q.feedback!.marksAwarded, 0);
        const writtenTotal = questions.filter(q => q.type === 'written').reduce((sum) => sum + 5, 0);
        const totalScore = mcqCorrect + writtenScore;
        const totalPossible = mcqTotal + writtenTotal;
    
        return (
            <Card variant="light" className="text-left !p-4 md:!p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-violet-700">Quiz Complete!</h2>
                    <p className="mt-2 text-slate-600">
                        You scored <span className="font-bold text-slate-800 text-xl">{totalScore} out of {totalPossible}</span>.
                    </p>
                    <p className="text-sm text-slate-500">Review your answers below. Your results are saved in your profile.</p>
                </div>
                
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto p-2 -mr-2">
                    {questions.map((q, index) => {
                        const answeredQ = answeredQuestions[index];
                        if (!answeredQ) return null;

                        const isCorrectMCQ = q.type === 'mcq' && answeredQ.isCorrect === true;
                        
                        let borderColor = 'border-slate-300';
                        if (q.type === 'mcq') {
                            borderColor = isCorrectMCQ ? 'border-green-400' : 'border-red-400';
                        } else {
                            borderColor = 'border-indigo-400';
                        }

                        return (
                            <Card variant="light" key={index} className={`!shadow-md !p-4 border-2 !bg-white/60 ${borderColor}`}>
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-slate-800">{index + 1}. {q.question}</p>
                                    {q.type === 'written' && answeredQ.feedback && (
                                        <p className="font-bold text-lg text-violet-600 whitespace-nowrap ml-4">
                                            {answeredQ.feedback.marksAwarded}/{answeredQ.feedback.totalMarks}
                                        </p>
                                    )}
                                </div>
                                {q.type === 'mcq' && (
                                    <div className="mt-2 text-sm space-y-1">
                                        <p className={`p-2 rounded-md ${isCorrectMCQ ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            Your answer: <span className="font-bold">{answeredQ.userAnswer}</span>
                                            {isCorrectMCQ ? 
                                                <CheckCircleIcon className="inline w-4 h-4 ml-2 text-green-600" /> :
                                                <XCircleIcon className="inline w-4 h-4 ml-2 text-red-600" />
                                            }
                                        </p>
                                        {!isCorrectMCQ && <p className="p-2 rounded-md bg-green-100 text-green-800">Correct answer: <span className="font-bold">{q.correctAnswer}</span></p>}
                                    </div>
                                )}
                                 {q.type === 'written' && (
                                    <div className="mt-2 text-sm space-y-2">
                                        <div>
                                            <p className="font-bold text-slate-700">Your answer:</p>
                                            {Array.isArray(answeredQ.userAnswerImages) && answeredQ.userAnswerImages.length > 0 ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                                    {answeredQ.userAnswerImages.map((imgSrc, i) => (
                                                        <img key={i} src={imgSrc} alt={`Your answer ${i+1}`} className="rounded-md border border-slate-300" />
                                                    ))}
                                                </div>
                                            ) : answeredQ.transcription ? (
                                                <p className="text-sm p-2 bg-slate-100 rounded border border-slate-200 italic">"{answeredQ.transcription}"</p>
                                            ) : (
                                                <p className="text-sm p-2 bg-slate-100 rounded border border-slate-200">{answeredQ.userAnswer}</p>
                                            )}
                                        </div>
                                        {answeredQ.feedback &&
                                            <div className="p-2 bg-slate-100/50 rounded mt-2">
                                                <p className="flex gap-2 text-green-700"><CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /> <strong>What's Correct:</strong> {answeredQ.feedback.whatIsCorrect}</p>
                                                <p className="flex gap-2 text-amber-700"><XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /> <strong>What's Missing:</strong> {answeredQ.feedback.whatIsMissing}</p>
                                                <p className="flex gap-2 text-red-700"><XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /> <strong>What's Incorrect:</strong> {answeredQ.feedback.whatIsIncorrect}</p>
                                            </div>
                                        }
                                    </div>
                                )}
                                <div className="mt-2 text-xs p-2 bg-indigo-100/80 rounded border border-indigo-200/50 text-indigo-800">
                                    <strong>Explanation:</strong> {q.explanation}
                                </div>
                            </Card>
                        )
                    })}
                </div>
    
                <div className="mt-6 text-center">
                    <Button onClick={resetQuiz}>Take Quiz Again</Button>
                </div>
            </Card>
        );
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-violet-700">Progress</span>
                    <span className="text-sm font-medium text-violet-700">{currentQuestionIndex + 1} of {questions.length}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <Card variant="light" className="!shadow-none border border-slate-300 !bg-white/60">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-lg mb-4 text-slate-800">{currentQuestionIndex + 1}. {currentQuestion.question}</p>
                    <button onClick={() => handleSpeak(currentQuestion.question)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"><SpeakerWaveIcon className="w-5 h-5"/></button>
                </div>
                
                {/* Answer Area */}
                <div className="space-y-3">
                    {isMCQ && currentQuestion.options?.map((option, j) => (
                        <button
                            key={j}
                            onClick={() => setSelectedOption(option)}
                            disabled={showResult}
                            className={`w-full p-3 rounded-lg text-left border-2 transition-all text-slate-800 ${
                                selectedOption === option ? 'border-violet-500 bg-violet-100/50 ring-2 ring-violet-500/50' : 'border-slate-300 bg-slate-100/50 hover:bg-slate-200/50'
                            } ${showResult && option === currentQuestion.correctAnswer ? '!bg-green-100/80 !border-green-500/80' : ''} ${showResult && selectedOption === option && option !== currentQuestion.correctAnswer ? '!bg-red-100/80 !border-red-500/80' : ''}`}
                        >
                            {option}
                        </button>
                    ))}
                    {!isMCQ && (
                        <div>
                            <div className="flex border-b border-slate-300 mb-4">
                                {(['type', 'upload', 'speak'] as const).map(method => (
                                     <button key={method} onClick={() => setAnswerMethod(method)} className={`px-4 py-2 text-sm font-medium transition-colors ${answerMethod === method ? 'border-b-2 border-violet-500 text-violet-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </button>
                                ))}
                            </div>
                            {answerMethod === 'type' && (
                                <textarea
                                    value={writtenAnswer}
                                    onChange={(e) => setWrittenAnswer(e.target.value)}
                                    disabled={showResult}
                                    placeholder="Type your answer here..."
                                    rows={5}
                                    className="w-full p-3 border-2 bg-white/80 border-slate-300 text-slate-900 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition"
                                />
                            )}
                            {answerMethod === 'upload' && (
                                <div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <img src={preview} alt={`Answer preview ${index + 1}`} className="rounded-lg object-cover w-full h-32 border border-slate-300" />
                                                <button onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0 h-6 w-6 flex items-center justify-center leading-none opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full p-4 border-2 bg-slate-100/50 rounded-lg flex flex-col items-center justify-center border-dashed border-slate-300">
                                        <CameraIcon className="w-10 h-10 text-slate-500 mb-2"/>
                                        <input id="image-upload" type="file" onChange={handleImageUpload} accept="image/*" multiple className="hidden" disabled={showResult}/>
                                        <label htmlFor="image-upload" className="text-violet-600 font-semibold cursor-pointer hover:underline">
                                            Add Photo(s)
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1">You can upload multiple images for your answer.</p>
                                    </div>
                                </div>
                            )}
                             {answerMethod === 'speak' && (
                                <div className="text-center space-y-4">
                                    <button onClick={isRecording ? stopRecording : startRecording} disabled={showResult} className={`w-20 h-20 rounded-full transition-all flex items-center justify-center mx-auto shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-violet-600 hover:bg-violet-500'}`}>
                                        {isRecording ? <StopIcon className="w-8 h-8 text-white"/> : <MicrophoneIcon className="w-10 h-10 text-white" />}
                                    </button>
                                    <p className="text-sm text-slate-500 h-5">{isRecording ? "Recording..." : "Click to Record"}</p>
                                    {spokenAnswerBlob && !isRecording && (
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <audio src={URL.createObjectURL(spokenAnswerBlob)} controls className="w-full h-10"/>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="text-red-500 text-center font-medium bg-red-100 p-3 rounded-lg py-2 mt-4">{error}</p>}
                
                {/* Action/Feedback Area */}
                <div className="mt-4">
                    {!showResult ? (
                        <div className="text-right">
                            <Button 
                                onClick={handleCheckAnswer} 
                                variant="primary" 
                                disabled={isLoading || 
                                    (isMCQ && !selectedOption) || 
                                    (!isMCQ && answerMethod === 'type' && !writtenAnswer.trim()) || 
                                    (!isMCQ && answerMethod === 'upload' && imageFiles.length === 0) ||
                                    (!isMCQ && answerMethod === 'speak' && !spokenAnswerBlob)
                                }
                            >
                                {isLoading ? <Spinner colorClass="bg-white" /> : 'Check Answer'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Explanation Card */}
                            <Card variant="light" className="bg-indigo-100/70 border-indigo-200/80 border">
                                <h4 className="font-bold text-indigo-800 flex items-center gap-2"><LightBulbIcon className="w-5 h-5"/> Explanation</h4>
                                <p className="mt-2 text-sm text-indigo-700">{currentQuestion.explanation}</p>
                            </Card>

                            {/* Written Feedback Card */}
                            {!isMCQ && answeredQuestions[currentQuestionIndex]?.feedback && (
                                <Card variant="light" className="bg-white/70 border-slate-300 border">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-bold text-slate-700 flex items-center gap-2"><PencilSquareIcon className="w-5 h-5"/> Teacher's Feedback</h4>
                                      <p className="font-bold text-lg text-violet-600">{answeredQuestions[currentQuestionIndex].feedback!.marksAwarded}/{answeredQuestions[currentQuestionIndex].feedback!.totalMarks}</p>
                                    </div>
                                    {answeredQuestions[currentQuestionIndex]?.transcription && (
                                        <div className="mt-2 text-sm p-2 bg-slate-100 rounded border border-slate-200 italic">"{answeredQuestions[currentQuestionIndex].transcription}"</div>
                                    )}
                                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                                       <div className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> <p><strong>What's Correct:</strong> {answeredQuestions[currentQuestionIndex].feedback!.whatIsCorrect}</p></div>
                                       <div className="flex gap-2"><XCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" /> <p><strong>What's Missing:</strong> {answeredQuestions[currentQuestionIndex].feedback!.whatIsMissing}</p></div>
                                       <div className="flex gap-2"><XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> <p><strong>What's Incorrect:</strong> {answeredQuestions[currentQuestionIndex].feedback!.whatIsIncorrect}</p></div>
                                    </div>
                                </Card>
                            )}

                            <div className="text-right">
                                <Button onClick={handleNextQuestion}>
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default QuizComponent;
