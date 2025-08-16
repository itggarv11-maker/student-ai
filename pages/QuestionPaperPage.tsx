

import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QuestionPaper, GradedPaper } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { CameraIcon } from '../components/icons/CameraIcon';
import { useContent } from '../contexts/ContentContext';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';


const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
  
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


const QuestionPaperPage: React.FC = () => {
    const { extractedText, subject } = useContent();
    const navigate = useNavigate();

    const [step, setStep] = useState<'settings' | 'generated' | 'grading' | 'results'>('settings');

    // Paper Settings State
    const [numQuestions, setNumQuestions] = useState(10);
    const [questionTypes, setQuestionTypes] = useState('A mix of MCQs and short answer questions');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [totalMarks, setTotalMarks] = useState(50);
    
    // Generated Content State
    const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);
    const [gradedPaper, setGradedPaper] = useState<GradedPaper | null>(null);
    const [answerSheetFiles, setAnswerSheetFiles] = useState<File[]>([]);
    const [answerSheetPreviews, setAnswerSheetPreviews] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    
    const paperRef = useRef<HTMLDivElement>(null);
    
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

    // If no content has been provided in the app, guide the user to the dashboard.
    if (!extractedText) {
        return (
            <div className="text-center">
                <Card variant="light" className="max-w-xl mx-auto">
                    <h1 className="text-2xl font-bold text-slate-800">No Content Found</h1>
                    <p className="mt-2 text-slate-600">
                        To generate a question paper, you first need to provide some study material on the main dashboard.
                    </p>
                    <div className="mt-6">
                        <Button onClick={() => navigate('/app')}>
                            Go to Dashboard to Add Content
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const handleGeneratePaper = async () => {
        if (extractedText.trim().length < 200) {
            setError("The provided content is too short (at least 200 characters required). Please provide more content from the dashboard.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Generating your question paper... This may take a moment.");
        try {
            const paper = await geminiService.generateQuestionPaper(extractedText, numQuestions, questionTypes, difficulty, totalMarks, subject);
            setQuestionPaper(paper);
            setStep('generated');
        } catch (e) {
            handleApiError(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadPdf = () => {
        if (!paperRef.current) return;
        setLoadingMessage("Preparing PDF...");
        setIsLoading(true);
        html2canvas(paperRef.current, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasHeight / canvasWidth;
            
            const imgWidth = pdfWidth - 20; // Page width with 10mm margins on each side
            const imgHeight = imgWidth * ratio;
            let heightLeft = imgHeight;
            let position = 10; // Top margin

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20); // Subtract page height with top/bottom margins

            while (heightLeft > 0) {
              position = -heightLeft + 10;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
              heightLeft -= (pdfHeight - 20);
            }
            
            pdf.save('question-paper.pdf');
            setIsLoading(false);
        }).catch(() => {
            setIsLoading(false);
            setError("Failed to generate PDF.");
        });
    };
    
    const handleAnswerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setAnswerSheetFiles(prev => [...prev, ...files]);
            const newPreviews = await Promise.all(files.map(fileToDataUrl));
            setAnswerSheetPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeAnswerImage = (indexToRemove: number) => {
        setAnswerSheetFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setAnswerSheetPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleGradePaper = async () => {
        if (answerSheetFiles.length === 0) {
            setError("Please upload at least one image of your answer sheet.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Grading your paper... This can take a few minutes.");

        try {
            const imageParts = await Promise.all(
                answerSheetFiles.map(async (file) => {
                    const base64Data = await fileToBase64(file);
                    return { inlineData: { mimeType: file.type, data: base64Data } };
                })
            );

            const paperTextForGrading = `
                Title: ${questionPaper!.title}
                Total Marks: ${questionPaper!.totalMarks}
                Instructions: ${questionPaper!.instructions}
                Questions and Model Answers:
                ${questionPaper!.questions.map((q, i) => `
                    Q${i + 1}: ${q.question} (Marks: ${q.marks})
                    Model Answer: ${q.answer}
                `).join('\n')}
            `;

            const result = await geminiService.gradeAnswerSheet(paperTextForGrading, imageParts);
            setGradedPaper(result);
            setStep('results');

        } catch (e) {
            handleApiError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const renderSettings = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Create Your Question Paper</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-700">Number of Questions</label>
                    <input type="number" id="numQuestions" value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md" />
                </div>
                <div>
                    <label htmlFor="totalMarks" className="block text-sm font-medium text-slate-700">Total Marks</label>
                    <input type="number" id="totalMarks" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md" />
                </div>
                <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700">Difficulty</label>
                    <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md">
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="questionTypes" className="block text-sm font-medium text-slate-700">Question Types (describe)</label>
                    <input type="text" id="questionTypes" value={questionTypes} onChange={(e) => setQuestionTypes(e.target.value)} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md" />
                </div>
                <div className="text-center pt-4">
                    <Button onClick={handleGeneratePaper} size="lg">Generate Paper</Button>
                </div>
            </div>
        </Card>
    );

    const renderGeneratedPaper = () => (
        <div className="space-y-6">
            <div className="text-center">
                 <Button onClick={handleDownloadPdf} variant="secondary">
                    <DownloadIcon className="w-5 h-5" /> Download as PDF
                </Button>
            </div>
            <div ref={paperRef} className="p-8 bg-white text-black rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-center">{questionPaper?.title}</h2>
                <div className="flex justify-between my-2 text-sm font-medium">
                    <span>Subject: {subject}</span>
                    <span>Total Marks: {questionPaper?.totalMarks}</span>
                </div>
                <p className="text-xs italic my-4">{questionPaper?.instructions}</p>
                <hr className="my-4"/>
                <div className="space-y-6">
                    {questionPaper?.questions.map((q, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-start">
                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                <span className="font-bold text-sm whitespace-nowrap ml-4">[{q.marks} Marks]</span>
                            </div>
                            {q.questionType === 'mcq' && q.options && (
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 pl-4 text-sm">
                                    {q.options.map((opt, i) => <span key={i}>{String.fromCharCode(97 + i)}) {opt}</span>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-center">
                <Button onClick={() => setStep('grading')} size="lg">
                    Proceed to Grade Answer Sheet <ArrowRightIcon className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
    
    const renderGrading = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-4">Grade Answer Sheet</h2>
            <p className="text-center text-slate-600 mb-6">Upload photos of your handwritten answer sheet.</p>
            
            <div className="space-y-4">
                <div className="w-full p-4 border-2 bg-slate-100/50 rounded-lg flex flex-col items-center justify-center border-dashed border-slate-300">
                    <CameraIcon className="w-10 h-10 text-slate-500 mb-2"/>
                    <input id="answer-upload" type="file" onChange={handleAnswerFileChange} accept="image/*" multiple className="hidden" />
                    <label htmlFor="answer-upload" className="text-violet-600 font-semibold cursor-pointer hover:underline">
                        Add Photo(s) of Your Answers
                    </label>
                    <p className="text-xs text-slate-500 mt-1">You can upload multiple images.</p>
                     {answerSheetFiles.length > 0 && <p className="text-sm text-slate-600 mt-2 font-semibold">{answerSheetFiles.length} image(s) selected.</p>}
                </div>
    
                {answerSheetPreviews.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-slate-700 mb-2">Uploaded Images:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {answerSheetPreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                    <img src={preview} alt={`Answer sheet ${index + 1}`} className="rounded-lg object-cover w-full h-32 border border-slate-300" />
                                    <button onClick={() => removeAnswerImage(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0 h-6 w-6 flex items-center justify-center leading-none opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
    
            <div className="text-center pt-6">
                <Button onClick={handleGradePaper} size="lg" disabled={answerSheetFiles.length === 0}>
                    Grade My Paper
                </Button>
            </div>
        </Card>
    );
    
    const renderResults = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-800">Grading Complete!</h2>
            </div>
            <Card variant="light">
                <div className="text-center space-y-2">
                    <p className="text-slate-600">You scored</p>
                    <p className="text-6xl font-extrabold text-violet-700">{gradedPaper?.totalMarksAwarded}
                        <span className="text-3xl font-bold text-slate-500"> / {questionPaper?.totalMarks}</span>
                    </p>
                    <p className="text-slate-700 font-semibold mt-4">Overall Feedback:</p>
                    <p className="text-slate-600 max-w-2xl mx-auto">{gradedPaper?.overallFeedback}</p>
                </div>
            </Card>
    
            <Card variant="light">
                <h3 className="text-xl font-bold text-center text-slate-800 mb-4">Detailed Breakdown</h3>
                <div className="space-y-4">
                    {questionPaper?.questions.map((q, index) => {
                        const gradedQ = gradedPaper?.gradedQuestions.find(gq => gq.questionNumber === index + 1);
                        if (!gradedQ) return null;
    
                        const isGoodScore = (q.marks > 0) && (gradedQ.marksAwarded / q.marks >= 0.7);
    
                        return (
                            <div key={index} className="p-4 bg-white/60 rounded-lg border-2 border-slate-300">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-semibold text-slate-800">{index + 1}. {q.question}</p>
                                    <span className={`font-bold text-lg ${isGoodScore ? 'text-green-600' : 'text-red-600'}`}>
                                        {gradedQ.marksAwarded} / {q.marks}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-100 p-3 rounded-md border border-slate-200 text-sm">
                                    <p className="font-semibold text-slate-600">Your Transcribed Answer:</p>
                                    <p className="italic text-slate-800">"{gradedQ.studentAnswerTranscription}"</p>
                                </div>
    
                                <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100 mt-2 text-sm space-y-2">
                                    <p className="font-semibold text-indigo-800">Feedback:</p>
                                    <div className="flex gap-2">
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-green-700">What you did right:</strong>
                                            <p className="text-slate-700">{gradedQ.feedback.whatWasCorrect}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-red-700">What went wrong:</strong>
                                            <p className="text-slate-700">{gradedQ.feedback.whatWasIncorrect}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <LightBulbIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-amber-700">How to improve:</strong>
                                            <p className="text-slate-700">{gradedQ.feedback.suggestionForImprovement}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
    
            <div className="text-center">
                <Button onClick={() => {setQuestionPaper(null); setGradedPaper(null); setAnswerSheetFiles([]); setAnswerSheetPreviews([]); setStep('settings');}} variant="outline">
                    Create Another Paper
                </Button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Spinner className="w-12 h-12" colorClass="bg-violet-600" />
                    <p className="text-slate-600 font-semibold">{loadingMessage}</p>
                </div>
            );
        }

        if (error) {
            return (
                <Card variant="light" className="max-w-lg mx-auto text-center">
                    <h2 className="text-xl font-bold text-red-600">An Error Occurred</h2>
                    <p className="text-slate-600 mt-2">{error}</p>
                    <Button onClick={() => { setError(null); setStep('settings'); }} className="mt-4">
                        Try Again
                    </Button>
                </Card>
            );
        }

        switch (step) {
            case 'settings':
                return renderSettings();
            case 'generated':
                return renderGeneratedPaper();
            case 'grading':
                return renderGrading();
            case 'results':
                return renderResults();
            default:
                return renderSettings();
        }
    };

    return (
        <div className="space-y-8">
            {renderContent()}
        </div>
    );
};

export default QuestionPaperPage;