import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import * as geminiService from '../services/geminiService';
import { useContent } from '../contexts/ContentContext';
import { VisualExplanationScene, ClassLevel, Subject } from '../types';
import { CLASS_LEVELS, SUBJECTS } from '../constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import VisualPlayer from '../components/app/VisualPlayer';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { VideoCameraIcon } from '../components/icons/VideoCameraIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';

type PageState = 'setup' | 'generating' | 'playing' | 'error';
type TopicStatus = 'pending' | 'generating' | 'complete' | 'error';
type Language = 'en-IN' | 'en-US' | 'en-GB' | 'hi';

interface Topic {
    title: string;
    content: string;
    scenes: VisualExplanationScene[] | null;
    status: TopicStatus;
    errorMessage?: string;
}

const VisualExplanationPage: React.FC = () => {
    const { extractedText: globalExtractedText, classLevel: globalClassLevel, subject: globalSubject, hasSessionStarted } = useContent();
    const navigate = useNavigate();

    // Core State
    const [pageState, setPageState] = useState<PageState>('setup');
    const [generationMessage, setGenerationMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    
    // Setup State (for when no global content is present)
    const [customTopic, setCustomTopic] = useState('');
    const [classLevel, setClassLevel] = useState<ClassLevel>(globalClassLevel || 'Class 10');
    const [subject, setSubject] = useState<Subject | null>(globalSubject);
    const [language, setLanguage] = useState<Language>('en-IN');

    // Content State
    const [summaryVideoScenes, setSummaryVideoScenes] = useState<VisualExplanationScene[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [jumpToScene, setJumpToScene] = useState<number | undefined>(undefined);
    const [currentPlayingTopicIndex, setCurrentPlayingTopicIndex] = useState(-1); // -1 for summary
    
    // Download state
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [showPermissionGuide, setShowPermissionGuide] = useState(false);

    const handleApiError = (err: unknown) => {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message.includes("Insufficient tokens")
            ? <span>You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link> for unlimited access.</span>
            : message);
        setPageState('error');
    };

    // Auto-start generation if content is already loaded
    useEffect(() => {
        if (hasSessionStarted && globalExtractedText && pageState === 'setup') {
            handleStartGeneration(globalExtractedText);
        }
    }, [hasSessionStarted, globalExtractedText, pageState]);

    const handleStartGeneration = async (textToProcess: string) => {
        if (!textToProcess) {
            handleApiError(new Error("No content available to generate video."));
            return;
        }

        setPageState('generating');
        setError(null);

        try {
            // Step 1: Generate the main summary video
            setGenerationMessage('Generating summary video... This can take a minute or two.');
            const summaryScenes = await geminiService.generateFullChapterSummaryVideo(textToProcess, language, classLevel);
            
            if (summaryScenes.length === 0) {
                 handleApiError(new Error("Could not generate a summary video. The source text might be too short or unsuitable."));
                 return;
            }

            setSummaryVideoScenes(summaryScenes);
            setPageState('playing'); // Show player immediately

            // Step 2 (in background): Break down content into topics for on-demand generation
            const topicData = await geminiService.breakdownTextIntoTopics(textToProcess);
            setTopics(topicData.map(t => ({ ...t, scenes: null, status: 'pending' })));

        } catch (err) {
            handleApiError(err);
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPageState('generating');
        setGenerationMessage('Fetching content for your topic...');
        try {
            const fetchedContent = await geminiService.fetchChapterContent(classLevel, subject!, customTopic, '');
            handleStartGeneration(fetchedContent);
        } catch (err) {
            handleApiError(err);
        }
    };

    const handleGenerateTopicVideo = async (index: number) => {
        setTopics(prev => prev.map((t, i) => i === index ? { ...t, status: 'generating' } : t));
        try {
            const newScenes = await geminiService.generateScenesForTopic(topics[index].content, language, classLevel);
            setTopics(prev => prev.map((t, i) => i === index ? { ...t, status: 'complete', scenes: newScenes } : t));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setTopics(prev => prev.map((t, i) => i === index ? { ...t, status: 'error', errorMessage } : t));
        }
    };
    
    const { playerScenes, sceneStartIndices } = useMemo(() => {
        let currentSceneIndex = summaryVideoScenes.length;
        const startIndices = topics.map(topic => {
            if (topic.status === 'complete' && topic.scenes) {
                const startIndex = currentSceneIndex;
                currentSceneIndex += topic.scenes.length;
                return startIndex;
            }
            return -1; // -1 indicates not generated yet
        });

        const allTopicScenes = topics.flatMap(t => t.scenes || []);
        
        return { 
            playerScenes: [...summaryVideoScenes, ...allTopicScenes],
            sceneStartIndices: startIndices
        };
    }, [summaryVideoScenes, topics]);


    const handleTopicSelect = (index: number) => {
        const sceneIndex = sceneStartIndices[index];
        if (sceneIndex !== -1) {
            setJumpToScene(undefined); // Reset jump state
            setTimeout(() => setJumpToScene(sceneIndex), 50); // Trigger jump
        }
    };

    const handleSceneChange = (sceneIndex: number) => {
        if (sceneIndex < summaryVideoScenes.length) {
            setCurrentPlayingTopicIndex(-1); // Summary is playing
            return;
        }
        
        for (let i = sceneStartIndices.length - 1; i >= 0; i--) {
            if (sceneStartIndices[i] !== -1 && sceneIndex >= sceneStartIndices[i]) {
                setCurrentPlayingTopicIndex(i);
                return;
            }
        }
    };
    
    const downloadVideo = async (withAudio: boolean) => {
        setShowDownloadOptions(false);
        if (withAudio) {
            setShowPermissionGuide(true);
            return;
        }
        
        const scenesToDownload = playerScenes;
        if (scenesToDownload.length === 0) {
            setError("No scenes to download.");
            return;
        }
        setIsDownloading(true);
        setDownloadProgress(0);
        setError(null);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas context.");

            const stream = canvas.captureStream(25);
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'StuBro-AI-Explanation-NoAudio.webm';
                a.click();
                URL.revokeObjectURL(url);
                setIsDownloading(false);
            };

            recorder.start();

            const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            for (let i = 0; i < scenesToDownload.length; i++) {
                const scene = scenesToDownload[i];
                setDownloadProgress(((i + 1) / scenesToDownload.length) * 100);
                
                const img = await loadImage(`data:image/jpeg;base64,${scene.imageBytes}`);
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const imgAspectRatio = img.width / img.height;
                const canvasAspectRatio = canvas.width / canvas.height;
                let drawWidth, drawHeight, dx, dy;
                if (imgAspectRatio > canvasAspectRatio) {
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / imgAspectRatio;
                    dx = 0;
                    dy = (canvas.height - drawHeight) / 2;
                } else {
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * imgAspectRatio;
                    dy = 0;
                    dx = (canvas.width - drawWidth) / 2;
                }
                ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = 'bold 32px Poppins';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText("StuBro AI", canvas.width - 20, canvas.height - 20);

                const duration = Math.max(2000, Math.min(8000, scene.narration.length * 70));
                await new Promise(resolve => setTimeout(resolve, duration));
            }
            
            recorder.stop();
        } catch (e) {
            handleApiError(e);
            setIsDownloading(false);
        }
    };
    
    const handleProceedWithAudioDownload = async () => {
        setShowPermissionGuide(false);
        const scenesToDownload = playerScenes;
        if (scenesToDownload.length === 0) return;

        let userMediaStream: MediaStream | null = null;
        try {
            userMediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
        } catch (err) {
            console.error("Permission denied for screen capture:", err);
            setError("Permission denied. You can still download the video-only version.");
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);

        const audioTrack = userMediaStream.getAudioTracks()[0];
        if (!audioTrack) {
            setError("No audio track was captured. Please ensure you select 'Share tab audio' in the permission prompt.");
            userMediaStream.getTracks().forEach(track => track.stop());
            setIsDownloading(false);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not create canvas.");
            setIsDownloading(false);
            return;
        }

        const canvasStream = canvas.captureStream(25);
        const videoTrack = canvasStream.getVideoTracks()[0];
        const combinedStream = new MediaStream([videoTrack, audioTrack]);
        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'StuBro-AI-Explanation.webm';
            a.click();
            URL.revokeObjectURL(url);
            setIsDownloading(false);
            userMediaStream?.getTracks().forEach(track => track.stop());
        };

        recorder.start();

        const music = new Audio('https://storage.googleapis.com/maker-studio-sounds/Lofi/Lofi-1.mp3');
        music.loop = true;
        music.volume = 0.1; // Very low background volume
        music.play();

        for (let i = 0; i < scenesToDownload.length; i++) {
            const scene = scenesToDownload[i];
            setDownloadProgress(((i + 1) / scenesToDownload.length) * 100);

            const img = await new Promise<HTMLImageElement>((resolve) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.src = `data:image/jpeg;base64,${scene.imageBytes}`;
            });
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'bold 32px Poppins';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText("StuBro AI", canvas.width - 20, canvas.height - 20);

            await new Promise<void>(resolve => {
                const utterance = new SpeechSynthesisUtterance(scene.narration);
                utterance.lang = language;
                utterance.onend = () => resolve();
                utterance.onerror = () => {
                    console.error("Speech synthesis failed during recording.");
                    resolve();
                };
                speechSynthesis.speak(utterance);
            });
        }
        
        music.pause();
        recorder.stop();
    };

    const renderSetup = () => (
        <Card variant="light" className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <VideoCameraIcon className="w-16 h-16 mx-auto text-violet-600" />
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Visual Explanation</h1>
                <p className="mt-2 text-slate-600">Generate a narrated video for any topic.</p>
                <p className="text-sm mt-2 text-slate-500">Since no content was loaded from the dashboard, please enter a topic below.</p>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="customTopic" className="block text-sm font-medium text-slate-700">Topic</label>
                    <input type="text" id="customTopic" value={customTopic} onChange={e => setCustomTopic(e.target.value)} required placeholder="e.g., 'Newton's Laws of Motion'" className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md"/>
                </div>
                <div>
                     <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
                     <select id="subject" value={subject || ''} onChange={(e) => setSubject(e.target.value as Subject)} required className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md">
                         <option value="" disabled>-- Select a Subject --</option>
                         {SUBJECTS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                     </select>
                 </div>
                 <div>
                    <label htmlFor="classLevel" className="block text-sm font-medium text-slate-700">Class Level</label>
                    <select id="classLevel" value={classLevel} onChange={e => setClassLevel(e.target.value as ClassLevel)} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md">
                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="language" className="block text-sm font-medium text-slate-700">Narration Language</label>
                    <select id="language" value={language} onChange={e => setLanguage(e.target.value as Language)} className="mt-1 block w-full p-2 bg-white/60 border border-slate-400 rounded-md">
                        <option value="en-IN">English (India)</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="hi">Hinglish</option>
                    </select>
                </div>
                <div className="text-center pt-4">
                    <Button type="submit" size="lg">Generate Video</Button>
                </div>
            </form>
        </Card>
    );
    
    const TopicStatusIndicator: React.FC<{status: TopicStatus}> = ({status}) => {
        switch(status) {
            case 'generating': return <Spinner className="w-5 h-5" />;
            case 'complete': return <PlayIcon className="w-5 h-5 text-green-600" />;
            case 'error': return <XCircleIcon className="w-5 h-5 text-red-500" />;
            default: return <VideoCameraIcon className="w-5 h-5 text-slate-500" />;
        }
    };
    
    const renderDownloadOptions = () => (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card variant="light" className="max-w-md w-full">
                <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Download Options</h3>
                <div className="space-y-4">
                    <Button onClick={() => downloadVideo(true)} className="w-full">
                        Download with Narration & Music
                    </Button>
                    <Button onClick={() => downloadVideo(false)} variant="secondary" className="w-full">
                        Download Video Only
                    </Button>
                </div>
                 <div className="text-center mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowDownloadOptions(false)}>Cancel</Button>
                </div>
            </Card>
        </div>
    );
    
    const renderPermissionGuide = () => (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card variant="light" className="max-w-lg w-full text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Screen Share for Audio</h3>
                <p className="text-slate-600 mb-4">To record audio, please select the <strong className="text-violet-600">"Browser Tab"</strong> option in the upcoming permission pop-up, choose this current tab, and make sure to check the <strong className="text-violet-600">"Share tab audio"</strong> box.</p>
                <img src="https://i.imgur.com/GZpC56S.png" alt="Example of screen share prompt for tab audio" className="rounded-md border border-slate-300 my-4" />
                <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => setShowPermissionGuide(false)}>Cancel</Button>
                    <Button onClick={handleProceedWithAudioDownload}>Understood, Proceed</Button>
                </div>
            </Card>
        </div>
    );
    
    const renderPlayerAndPlaylist = () => (
         <div className="space-y-8">
            {showDownloadOptions && renderDownloadOptions()}
            {showPermissionGuide && renderPermissionGuide()}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {playerScenes.length > 0 ? (
                        <VisualPlayer
                            scenes={playerScenes}
                            language={language}
                            jumpToScene={jumpToScene}
                            onSceneChange={handleSceneChange}
                        />
                    ) : (
                        <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <p>No scenes available to play.</p>
                        </div>
                    )}
                    
                     {isDownloading ? (
                        <div className="w-full bg-slate-200 rounded-full h-4 my-2">
                            <div 
                                className="bg-gradient-to-r from-violet-500 to-pink-500 h-4 rounded-full text-center text-white text-xs font-bold transition-all duration-300" 
                                style={{ width: `${downloadProgress}%` }}>
                                {Math.round(downloadProgress)}%
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Button onClick={() => setShowDownloadOptions(true)} disabled={playerScenes.length === 0}>
                                <DownloadIcon className="w-5 h-5"/> Download Video
                            </Button>
                        </div>
                    )}
                </div>
                <Card variant="light" className="h-full">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Video Playlist</h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {/* Summary Video Item */}
                        <button
                            onClick={() => { setJumpToScene(undefined); setTimeout(() => setJumpToScene(0), 50); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${currentPlayingTopicIndex === -1 ? 'bg-violet-100 border-violet-300' : 'bg-white/50 border-slate-300'} hover:bg-slate-200/50`}
                        >
                            <PlayIcon className="w-5 h-5 text-violet-600" />
                            <p className="font-semibold text-slate-700 flex-grow">Chapter Summary</p>
                        </button>
                        
                        {/* Individual Topic Items */}
                        {topics.map((topic, index) => (
                             <div key={index} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${currentPlayingTopicIndex === index ? 'bg-violet-100 border-violet-300' : 'bg-white/50 border-slate-300'}`}>
                                <TopicStatusIndicator status={topic.status} />
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-700 text-sm">{topic.title}</p>
                                    {topic.status === 'error' && <p className="text-xs text-red-600">{topic.errorMessage}</p>}
                                </div>
                                {topic.status === 'pending' && <Button size="sm" onClick={() => handleGenerateTopicVideo(index)}>Generate</Button>}
                                {topic.status === 'complete' && <Button size="sm" variant="ghost" onClick={() => handleTopicSelect(index)}>Play</Button>}
                                {topic.status === 'error' && <Button size="sm" variant="outline" onClick={() => handleGenerateTopicVideo(index)}>Retry</Button>}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );

    if (pageState === 'setup') {
        return renderSetup();
    }
    
     if (pageState === 'generating') {
         return (
             <Card variant="light" className="max-w-md mx-auto text-center">
                <Spinner className="w-16 h-16" colorClass="bg-violet-600" />
                <h2 className="text-2xl font-bold text-slate-800 mt-6">Please Wait</h2>
                <p className="text-slate-600 mt-2">{generationMessage}</p>
            </Card>
        );
    }
    
    if (pageState === 'error') {
        return (
             <Card variant="light" className="max-w-lg mx-auto text-center">
                <h2 className="text-xl font-bold text-red-600">An Error Occurred</h2>
                <p className="text-slate-600 mt-2">{error}</p>
                <Button onClick={() => {setPageState('setup'); setError(null);}} className="mt-4">Try Again</Button>
            </Card>
        );
    }

    return renderPlayerAndPlaylist();
};

export default VisualExplanationPage;
