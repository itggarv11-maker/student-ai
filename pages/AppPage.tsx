import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { Subject, QuizQuestion, ChatMessage, ClassLevel, Flashcard, MindMapNode, QuizDifficulty } from '../types';
import { SUBJECTS, CLASS_LEVELS } from '../constants';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import Card from '../components/common/Card';
import { Chat } from '@google/genai';
import QuizComponent from '../components/app/QuizComponent';
import { UploadIcon } from '../components/icons/UploadIcon';
import { YouTubeIcon } from '../components/icons/YouTubeIcon';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { ChatBubbleIcon } from '../components/icons/ChatBubbleIcon';
import { DocumentTextIcon } from '../components/icons/DocumentTextIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { RectangleStackIcon } from '../components/icons/RectangleStackIcon';
import FlashcardComponent from '../components/app/FlashcardComponent';
import MindMap from '../components/app/MindMap';
import { BrainCircuitIcon } from '../components/icons/BrainCircuitIcon';
import { DocumentDuplicateIcon } from '../components/icons/DocumentDuplicateIcon';
import { useContent } from '../contexts/ContentContext';
import { ChatBubbleLeftRightIcon } from '../components/icons/ChatBubbleLeftRightIcon';
import { VideoCameraIcon } from '../components/icons/VideoCameraIcon';
import { GavelIcon } from '../components/icons/GavelIcon';
import { QuestIcon } from '../components/icons/QuestIcon';


// Required for pdf.js to work
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


type ActiveTool = 'chat' | 'quiz' | 'summary' | 'flashcards' | 'mindmap' | 'none';
type ContentSource = 'paste' | 'file' | 'youtube' | 'search';
type QuestionTypeFilter = 'mcq' | 'written' | 'both';

const AppPage: React.FC = () => {
    const navigate = useNavigate();
    // Global Content State
    const { 
        extractedText,
        subject, setSubject, 
        classLevel, setClassLevel, 
        resetContent, 
        searchStatus, startBackgroundSearch, setPostSearchAction,
        hasSessionStarted, startSessionWithContent
    } = useContent();
    
    // Local Page State for content input
    const [contentSource, setContentSource] = useState<ContentSource>('paste');
    const [pastedText, setPastedText] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [chapterInfo, setChapterInfo] = useState('');
    const [chapterDetails, setChapterDetails] = useState('');
    const [localSourceText, setLocalSourceText] = useState('');
    
    // Core App State
    const [activeTool, setActiveTool] = useState<ActiveTool>('none');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState('Processing...');
    const [error, setError] = useState<React.ReactNode | null>(null);

    // AI Content State
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
    const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [userMessage, setUserMessage] = useState('');

    // Quiz Settings
    const [showQuizSettings, setShowQuizSettings] = useState(false);
    const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);
    const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('Medium');
    const [quizQuestionType, setQuizQuestionType] = useState<QuestionTypeFilter>('both');
    
    // Sample Topic State
    const [isSampleLoading, setIsSampleLoading] = useState<string | null>(null);


    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
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

    const handleSourceChange = (newSource: ContentSource) => {
        setContentSource(newSource);
        setError(null);
        setLocalSourceText('');
        setFileName('');
        setChapterInfo('');
        setChapterDetails('');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setLocalSourceText(''); 
        setIsLoading(true);
        setFileName(file.name);
        setLoadingMessage('Reading file...');

        try {
            let text = '';
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ');
                }
            } else if (file.type.includes('wordprocessingml')) { 
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else { 
                text = await file.text();
            }
            setLocalSourceText(text);
        } catch (err) {
            setError('Failed to process file. It might be corrupted or in an unsupported format.');
            setFileName('');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleYoutubeFetch = async () => {
        if(!youtubeUrl) {
            setError("Please enter a YouTube URL.");
            return;
        }
        setError(null);
        setLocalSourceText('');
        setIsLoading(true);
        setLoadingMessage('Analyzing video content...');

        try {
            const text = await geminiService.fetchYouTubeTranscript(youtubeUrl);
            setLocalSourceText(text);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChapterSearch = async () => {
        if (!chapterInfo || !subject) {
            setError("Please select a subject and enter a chapter name.");
            return;
        }
        setError(null);
        const searchFn = () => geminiService.fetchChapterContent(classLevel, subject!, chapterInfo, chapterDetails);
        startBackgroundSearch(searchFn);
    };

    const handleStartSession = () => {
        let currentText = '';
        if (contentSource === 'paste') currentText = pastedText;
        else currentText = localSourceText;

        if (!subject || currentText.trim().length < 100) {
            setError("Please select a subject and provide sufficient content (at least 100 characters).");
            return;
        }
        
        setError(null);
        startSessionWithContent(currentText);
    };

    const handleSkip = () => {
        startSessionWithContent(''); // Skip with empty content
    };

    const handleSampleTopic = async (topic: string) => {
        setIsSampleLoading(topic);
        setError(null);
        try {
            const { content, subject, classLevel } = await geminiService.fetchSampleTopicContent(topic);
            setSubject(subject);
            setClassLevel(classLevel);
            startSessionWithContent(content);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsSampleLoading(null);
        }
    };

    const handleToolSelection = async (tool: ActiveTool, path?: string) => {
        const isContentDependent = ['chat', 'quiz', 'summary', 'flashcards', 'mindmap', 'question-paper', 'visual-explanation', 'live-debate', 'chapter-conquest'].includes(tool) || (path && ['/question-paper', '/visual-explanation', '/live-debate', '/chapter-conquest'].includes(path));

        if (searchStatus === 'searching' && isContentDependent) {
            setPostSearchAction({ tool: path || `/app`, navigate });
            // This is a more subtle way to inform the user
            const toolFriendlyName = path?.split('/').pop()?.replace('-', ' ') || tool;
            alert(`Chapter search is running! We'll open the ${toolFriendlyName} tool for you as soon as it's finished. Feel free to explore other non-content tools.`);
            return;
        }
        
        if (isContentDependent && !extractedText) {
            setError("Please provide content first to use this tool. Go back to add content.");
            return;
        }

        if (path) {
            navigate(path);
            return;
        }
        
        setActiveTool(tool);
        setError(null);
        
        if (tool === 'quiz') {
            setShowQuizSettings(true);
            return;
        }
        
        setIsLoading(true);

        try {
            switch(tool) {
                case 'chat':
                    if (!chatSession) {
                        setLoadingMessage('Initializing AI session...');
                        const session = geminiService.createChatSession(subject!, classLevel, extractedText);
                        setChatSession(session);
                        setChatHistory([{ role: 'model', text: `Hi there! I'm ready to help you with ${subject} for ${classLevel}. Ask me anything about your notes.` }]);
                    }
                    break;
                case 'summary':
                    if (!summary) {
                        setLoadingMessage('Creating your summary...');
                        const generatedSummary = await geminiService.generateSummary(subject!, classLevel, extractedText);
                        setSummary(generatedSummary);
                    }
                    break;
                case 'flashcards':
                    if (!flashcards) {
                        setLoadingMessage('Generating flashcards...');
                        const generatedFlashcards = await geminiService.generateFlashcards(extractedText);
                        setFlashcards(generatedFlashcards);
                    }
                    break;
                case 'mindmap':
                    if (!mindMapData) {
                        setLoadingMessage('Generating mind map...');
                        const data = await geminiService.generateMindMapFromText(extractedText, classLevel);
                        setMindMapData(data);
                    }
                    break;
            }
        } catch (e) {
            handleApiError(e)
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateQuiz = async () => {
        if (!subject) return;
        setShowQuizSettings(false);
        setIsLoading(true);
        setLoadingMessage('Generating your quiz...');
        setError(null);
        try {
            const generatedQuiz = await geminiService.generateQuiz(subject, classLevel, extractedText, quizQuestionCount, quizDifficulty, quizQuestionType);
            setQuiz(generatedQuiz);
        } catch (e) {
            handleApiError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userMessage.trim() || !chatSession || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: userMessage };
        setChatHistory(prev => [...prev, newUserMessage]);
        setUserMessage('');
        setIsLoading(true);
        setError(null);
        
        try {
            const stream = await geminiService.sendMessageStream(chatSession, userMessage);
            let modelResponse = '';
            setChatHistory(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].text = modelResponse;
                    return newHistory;
                });
            }
        } catch (e) {
            handleApiError(e);
            setChatHistory(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBackToTools = () => {
        setActiveTool('none');
        setQuiz(null); // Also reset quiz if going back
        setError(null);
    };

    const renderContentInput = () => {
        const sampleTopics = ["Photosynthesis", "Newton's Laws of Motion", "The Mughal Empire", "Structure of an Atom"];
        
        return (
            <Card variant="light" className="!p-4 md:!p-8">
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800">Let's Get Started</h2>
                        <p className="text-gray-600">First, tell us what you're studying.</p>
                    </div>
                     {/* Step 1: Class & Subject */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-lg font-semibold text-slate-700 block mb-3">1. Select Your Class</label>
                            <select
                                value={classLevel}
                                onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
                                className="w-full p-3 bg-white/60 border border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-900"
                            >
                                {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-lg font-semibold text-slate-700 block mb-3">2. Select a Subject</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {SUBJECTS.map(({ name, icon: Icon }) => (
                                    <button
                                        key={name}
                                        onClick={() => setSubject(name)}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-sm interactive-3d ${subject === name ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/20' : 'bg-white/50 text-slate-700 hover:bg-white/80 border-slate-300 hover:border-violet-400'}`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Content */}
                    <div>
                        <label className="text-lg font-semibold text-slate-700 block mb-3">3. Provide Your Content</label>
                        <div className="flex space-x-1 rounded-t-lg bg-slate-100 p-1 w-full md:w-auto">
                            {(['paste', 'file', 'youtube', 'search'] as ContentSource[]).map(source => (
                                <button
                                    key={source}
                                    onClick={() => handleSourceChange(source)}
                                    className={`flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${contentSource === source ? 'bg-white text-violet-600 shadow' : 'text-slate-600 hover:bg-slate-200/50'}`}
                                >
                                    {source === 'paste' && <ClipboardIcon className="w-5 h-5" />}
                                    {source === 'file' && <UploadIcon className="w-5 h-5" />}
                                    {source === 'youtube' && <YouTubeIcon className="w-5 h-5" />}
                                    {source === 'search' && <SearchIcon className="w-5 h-5" />}
                                    <span className="capitalize">{source}</span>
                                </button>
                            ))}
                        </div>
                        <div className="bg-white/60 p-4 rounded-b-lg border-x border-b border-slate-300">
                            {contentSource === 'paste' &&
                                <textarea
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder="Paste your notes, a chapter, or any text here..."
                                    className="w-full h-40 p-3 bg-white/80 border border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-900 placeholder:text-slate-500"
                                />
                            }
                            {contentSource === 'file' &&
                                <div className="w-full h-40 p-3 border-2 bg-slate-200/50 rounded-lg flex flex-col items-center justify-center border-dashed border-slate-400">
                                    <UploadIcon className="w-10 h-10 text-slate-500 mb-2"/>
                                    <input id="file-upload" type="file" onChange={handleFileChange} accept=".pdf,.txt,.docx" className="hidden"/>
                                    <label htmlFor="file-upload" className="text-violet-600 font-semibold cursor-pointer hover:underline">
                                        {fileName || "Choose a PDF, DOCX, or TXT file"}
                                    </label>
                                    <p className="text-xs text-slate-500 mt-1">{fileName ? `(File ready to be processed)` : `(Your file will be processed in the browser)`}</p>
                                </div>
                            }
                            {contentSource === 'youtube' &&
                                <div className="w-full h-40 p-3 rounded-lg flex flex-col justify-center gap-3">
                                    <input
                                        type="url"
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full p-2 bg-white/80 border border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-900 placeholder:text-slate-500"
                                    />
                                    <Button onClick={handleYoutubeFetch} disabled={isLoading} variant="secondary">
                                        {isLoading && loadingMessage.includes('Analyzing') ? <Spinner /> : 'Analyze Video'}
                                    </Button>
                                    {localSourceText && !isLoading && <p className="text-sm text-green-600 text-center font-semibold">Video content loaded successfully!</p>}
                                </div>
                            }
                            {contentSource === 'search' &&
                                <div className="w-full h-40 p-3 rounded-lg flex flex-col justify-center gap-3">
                                    <input
                                        type="text"
                                        value={chapterInfo}
                                        onChange={e => setChapterInfo(e.target.value)}
                                        placeholder="Chapter name or number (e.g., 'Cell' or 'Ch 1')"
                                        className="w-full p-2 bg-white/80 border border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-900 placeholder:text-slate-500"
                                    />
                                    <input
                                        type="text"
                                        value={chapterDetails}
                                        onChange={e => setChapterDetails(e.target.value)}
                                        placeholder="Optional details (e.g., NCERT, CBSE, author)"
                                         className="w-full p-2 bg-white/80 border border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-900 placeholder:text-slate-500"
                                    />
                                     <Button onClick={handleChapterSearch} disabled={searchStatus === 'searching' || !chapterInfo || !subject} variant="secondary">
                                         {searchStatus === 'searching' ? <Spinner /> : 'Find Chapter Content'}
                                     </Button>
                                </div>
                            }
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-center font-medium py-2">{error}</p>}
                    
                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-slate-300"></div>
                        <span className="flex-shrink mx-4 text-slate-500 font-semibold">OR</span>
                        <div className="flex-grow border-t border-slate-300"></div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 block mb-3 text-center">4. Try a Sample Topic</h3>
                        <p className="text-center text-slate-600 -mt-2 mb-4">No notes handy? No problem. Try one of these!</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {sampleTopics.map(topic => (
                                <Button 
                                    key={topic} 
                                    variant="secondary"
                                    onClick={() => handleSampleTopic(topic)}
                                    disabled={!!isSampleLoading}
                                    className="!bg-slate-600 hover:!bg-slate-500"
                                >
                                    {isSampleLoading === topic ? <Spinner /> : topic}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center pt-4 flex items-center justify-center gap-4">
                         <Button onClick={handleSkip} variant="outline">Skip For Now</Button>
                        <Button onClick={handleStartSession} disabled={isLoading || searchStatus === 'searching' || !!isSampleLoading || !subject || (contentSource !== 'search' && !pastedText && !localSourceText)} size="lg">
                            {isLoading ? <><Spinner/> {loadingMessage}</> : 'Go to Dashboard'}
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    const renderDashboard = () => {
        const toolName = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
        
        let headerMessage;
        if (activeTool !== 'none') {
            headerMessage = quiz ? `Showing Quiz Results` : `Now using the ${toolName} tool.`;
        } else if (searchStatus === 'success') {
            headerMessage = "Chapter search complete! Choose a tool.";
        } else if (searchStatus === 'searching') {
            headerMessage = "Chapter search in progress. You can select a tool to launch when it's done.";
        } else if (extractedText) {
             headerMessage = "Your content is ready. Choose a tool to start learning.";
        } else {
            headerMessage = "Choose a tool that doesn't require pre-loaded content.";
        }
        
        return (
            <div>
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800">AI Toolkit</h1>
                    <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                        {headerMessage}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <Button onClick={resetContent} variant="ghost" size="sm">
                            &larr; Start a New Session
                        </Button>
                        {activeTool !== 'none' && (
                            <Button onClick={handleGoBackToTools} variant="ghost" size="sm">
                                &larr; Back to All Tools
                            </Button>
                        )}
                    </div>
                </div>
                
                {activeTool === 'none' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ToolCard icon={<QuestIcon className="w-10 h-10"/>} title="Chapter Conquest" description="Play a 2D adventure game to master your chapter. Use WASD to move and 'E' to interact!" onClick={() => handleToolSelection('none', '/chapter-conquest')} />
                        <ToolCard icon={<GavelIcon className="w-10 h-10"/>} title="Live Debate Arena" description="Defend your knowledge in a real-time debate with an AI challenger." onClick={() => handleToolSelection('none', '/live-debate')} />
                        <ToolCard icon={<ChatBubbleIcon className="w-10 h-10"/>} title="AI Chat" description="Ask questions and get instant answers about your notes." onClick={() => handleToolSelection('chat')} />
                        <ToolCard icon={<LightBulbIcon className="w-10 h-10"/>} title="Generate Quiz" description="Test your knowledge with custom quizzes." onClick={() => handleToolSelection('quiz')} />
                        <ToolCard icon={<DocumentTextIcon className="w-10 h-10"/>} title="Summarize" description="Get key points and summaries from long texts." onClick={() => handleToolSelection('summary')} />
                        <ToolCard icon={<RectangleStackIcon className="w-10 h-10"/>} title="Flashcards" description="Create flippable cards for quick revision." onClick={() => handleToolSelection('flashcards')} />
                        <ToolCard icon={<BrainCircuitIcon className="w-10 h-10"/>} title="Mind Map" description="Visualize the core concepts from your text." onClick={() => handleToolSelection('none', '/mind-map')} />
                        <ToolCard icon={<ChatBubbleLeftRightIcon className="w-10 h-10"/>} title="Talk to Teacher" description="Have a live voice conversation with your AI tutor." onClick={() => handleToolSelection('none', '/gemini-live')} />
                        <ToolCard icon={<DocumentDuplicateIcon className="w-10 h-10"/>} title="Question Paper" description="Create custom exam papers from your notes." onClick={() => handleToolSelection('none', '/question-paper')} />
                        <ToolCard icon={<VideoCameraIcon className="w-10 h-10"/>} title="Visual Explanation" description="Generate a narrated video summary of your content." onClick={() => handleToolSelection('none', '/visual-explanation')} />
                    </div>
                )}
                
                <div className="mt-8">
                     {error && <p className="text-red-500 text-center font-medium mb-4">{error}</p>}
                     {renderToolUI()}
                </div>
            </div>
        );
    }
    
    const ToolCard = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
        <Card onClick={onClick} className="text-center !p-8 cursor-pointer bg-slate-800/10 hover:!bg-slate-800/20 !border-slate-800/10">
            <div className="mx-auto text-violet-600 bg-white rounded-full h-20 w-20 flex items-center justify-center border-2 border-slate-200">
                {icon}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-800">{title}</h3>
            <p className="mt-2 text-slate-600 text-sm">{description}</p>
        </Card>
    );

    const renderQuizSettings = () => (
         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card variant="light" className="max-w-md w-full">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-4 text-slate-800">Customize Your Quiz</h3>
                </div>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="question-count" className="block text-sm font-medium text-slate-700 mb-1">Number of Questions (Max 15)</label>
                        <input
                            type="number"
                            id="question-count"
                            value={quizQuestionCount}
                            onChange={(e) => setQuizQuestionCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))}
                            min="1"
                            max="15"
                            className="mt-1 block w-full px-3 py-2 bg-white/80 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Question Types</label>
                        <div className="flex rounded-md shadow-sm" role="group">
                            {(['mcq', 'written', 'both'] as QuestionTypeFilter[]).map((type, idx) => (
                                <button
                                key={type}
                                type="button"
                                onClick={() => setQuizQuestionType(type)}
                                className={`py-2 px-4 w-full text-sm font-medium transition-colors border border-slate-300
                                ${idx === 0 ? 'rounded-l-lg' : ''}
                                ${idx === 2 ? 'rounded-r-lg' : ''}
                                ${quizQuestionType === type ? 'bg-violet-600 text-white border-violet-600' : 'bg-white/70 text-slate-900 hover:bg-slate-100'}`}
                                >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                        <Button variant="outline" onClick={() => { setShowQuizSettings(false); setActiveTool('none');}}>Cancel</Button>
                        <Button onClick={handleGenerateQuiz}>Generate Quiz</Button>
                    </div>
                </div>
            </Card>
         </div>
    );

    const renderToolUI = () => {
        if (showQuizSettings) return renderQuizSettings();

        if (isLoading) {
            return <div className="flex flex-col justify-center items-center py-10 gap-4"><Spinner className="w-12 h-12" colorClass="bg-violet-600" /><p className="text-gray-600">{loadingMessage}</p></div>
        }
        
        switch(activeTool) {
            case 'chat':
                return (
                    <Card variant="light">
                        <div className="flex flex-col h-[60vh] bg-white/50 rounded-lg border border-slate-300">
                            <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                                {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'model' && <span className="flex-shrink-0 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">AI</span>}
                                    <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                        <p className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}/>
                                    </div>
                                    {msg.role === 'user' && <span className="flex-shrink-0 w-8 h-8 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold text-sm">You</span>}
                                </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-300 bg-slate-100/50 rounded-b-lg flex gap-2">
                                <input
                                type="text"
                                value={userMessage}
                                onChange={(e) => setUserMessage(e.target.value)}
                                placeholder="Ask a question about your notes..."
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500 text-slate-900"
                                />
                                <Button type="submit" disabled={isLoading || !userMessage.trim()}>Send</Button>
                            </form>
                        </div>
                    </Card>
                );
            case 'quiz':
                 return quiz ? <QuizComponent questions={quiz} sourceText={extractedText} subject={subject!} /> : null;
            case 'summary':
                return summary && (
                    <Card variant="light">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Summary of Your Notes</h3>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }}></div>
                    </Card>
                );
            case 'flashcards':
                return flashcards && <FlashcardComponent flashcards={flashcards} />;
            case 'mindmap':
                return mindMapData && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-slate-800">Mind Map of Your Content</h3>
                            <p className="text-gray-600">Interact with the nodes to explore the concepts.</p>
                        </div>
                        <MindMap data={mindMapData} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            {!hasSessionStarted ? renderContentInput() : renderDashboard()}
        </div>
    );
};

export default AppPage;
