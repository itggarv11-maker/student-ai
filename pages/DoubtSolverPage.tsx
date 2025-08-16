import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import * as geminiService from '../services/geminiService';
import { CameraIcon } from '../components/icons/CameraIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';

const DoubtSolverPage: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleApiError = (err: unknown) => {
        if (err instanceof Error) {
            setError(err.message.includes("Insufficient tokens")
                ? <span>You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link>.</span>
                : err.message);
        } else {
            setError("An unknown error occurred.");
        }
    };
    
    const cleanupCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    }, []);

    useEffect(() => {
        return () => cleanupCamera();
    }, [cleanupCamera]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("Image size should not exceed 4MB.");
                return;
            }
            setError(null);
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        cleanupCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOpen(true);
            setError(null);
            setImageFile(null);
            setImagePreview(null);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please ensure you've granted permission in your browser settings.");
        }
    };

    const takePicture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                    setImageFile(file);
                    setImagePreview(canvas.toDataURL('image/jpeg'));
                    cleanupCamera();
                }
            }, 'image/jpeg');
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageFile) {
            setError("Please upload or take a picture of your doubt.");
            return;
        }
        if (!question.trim()) {
            setError("Please ask a question about the image.");
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setAnswer('');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const imagePart = { inlineData: { mimeType: imageFile.type, data: base64Data } };
                
                try {
                    const result = await geminiService.solveDoubtFromImage(imagePart, question);
                    setAnswer(result);
                } catch (apiErr) {
                    handleApiError(apiErr);
                } finally {
                    setIsLoading(false);
                }
            };
        } catch (err) {
            handleApiError(err);
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setImageFile(null);
        setImagePreview(null);
        setQuestion('');
        setAnswer('');
        setError(null);
        cleanupCamera();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card variant="light" className="text-center">
                <CameraIcon className="w-16 h-16 mx-auto text-violet-600" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Snap & Solve Doubts</h1>
                <p className="mt-2 text-slate-600">Stuck on a problem? Take a picture, ask your question, and get an instant AI explanation.</p>
            </Card>

            {!answer && (
                 <Card variant="light">
                    {!imagePreview && !isCameraOpen && (
                         <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-8">
                            <Button size="lg" onClick={() => document.getElementById('file-upload')?.click()}>
                                <UploadIcon className="w-6 h-6" /> Upload a Photo
                            </Button>
                             <input type="file" id="file-upload" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <span className="font-semibold text-slate-600">OR</span>
                             <Button size="lg" variant="secondary" onClick={startCamera}>
                                <CameraIcon className="w-6 h-6" /> Use Camera
                            </Button>
                        </div>
                    )}
                    
                    {isCameraOpen && (
                        <div className="space-y-4">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-slate-800"></video>
                            <div className="flex justify-center gap-4">
                                <Button onClick={takePicture}>Take Picture</Button>
                                <Button variant="outline" onClick={cleanupCamera}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {imagePreview && !isCameraOpen && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <img src={imagePreview} alt="Doubt preview" className="w-full max-h-[50vh] object-contain rounded-lg border-2 border-slate-300"/>
                                <button type="button" onClick={handleReset} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                                    <XCircleIcon className="w-6 h-6"/>
                                </button>
                            </div>
                             <div>
                                <label htmlFor="question" className="block text-sm font-medium text-slate-700 mb-1">What's your question about this image?</label>
                                <textarea id="question" value={question} onChange={e => setQuestion(e.target.value)} required rows={2}
                                    placeholder="e.g., How do I solve question 7? or Explain the process shown in the diagram."
                                    className="w-full p-2 bg-white/80 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 text-slate-900"
                                />
                            </div>
                            <div className="text-center">
                                <Button type="submit" size="lg" disabled={isLoading}>
                                    {isLoading ? <Spinner colorClass="bg-white"/> : <> <SparklesIcon className="w-5 h-5"/> Solve My Doubt </>}
                                </Button>
                            </div>
                        </form>
                    )}
                     {error && <p className="text-red-600 text-center font-semibold mt-4">{error}</p>}
                </Card>
            )}

            {isLoading && !answer && (
                <Card variant="light" className="text-center">
                     <Spinner className="w-12 h-12" colorClass="bg-violet-600"/>
                     <p className="mt-4 text-slate-600">AI is analyzing your doubt...</p>
                </Card>
            )}

            {answer && (
                <Card variant="light">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Here's the Solution:</h2>
                    <div className="p-4 bg-white/60 rounded-lg border border-slate-300 prose max-w-none" dangerouslySetInnerHTML={{ __html: answer.replace(/\n/g, '<br />') }}></div>
                    <div className="text-center mt-6">
                        <Button onClick={handleReset} variant="outline">Ask Another Doubt</Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DoubtSolverPage;
