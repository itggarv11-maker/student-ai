

import React, { useState, useRef } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { MindMapNode, ClassLevel } from '../types';
import * as geminiService from '../services/geminiService';
import { CLASS_LEVELS } from '../constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { BrainCircuitIcon } from '../components/icons/BrainCircuitIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import MindMap from '../components/app/MindMap';

interface MindMapRef {
    download: () => void;
}

const MindMapPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [classLevel, setClassLevel] = useState<ClassLevel>('Class 9');
    const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const mindMapRef = useRef<MindMapRef>(null);

    const handleApiError = (err: unknown) => {
        if (err instanceof Error) {
            if (err.message.includes("Insufficient tokens")) {
                setError(
                    <span>
                        You're out of tokens! Please <Link to="/premium" className="font-bold underline text-indigo-600">upgrade to Premium</Link> for unlimited access.
                    </span>
                );
            } else {
                setError(err.message);
            }
        } else {
            setError("An unknown error occurred.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic) {
            setError("Please enter a topic to generate a mind map.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setMindMapData(null);
        try {
            const result = await geminiService.generateMindMap(topic, classLevel);
            setMindMapData(result);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        mindMapRef.current?.download();
    };
    
    const handleDownloadFinish = (err?: Error) => {
        if (err) {
            console.error("Failed to download mind map:", err);
            setError("Sorry, there was an error creating the download.");
        }
        setIsDownloading(false);
    };

    const renderForm = () => (
        <Card className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <BrainCircuitIcon className="w-16 h-16 mx-auto text-indigo-500" />
                <h1 className="text-3xl font-bold text-gray-800 mt-4">Interactive Mind Map Generator</h1>
                <p className="mt-2 text-gray-600">Visualize any topic to understand it better. Click nodes to expand and collapse.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700">What topic do you want to map?</label>
                    <input
                        type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required
                        placeholder="e.g., 'The French Revolution', 'Photosynthesis', 'Newton's Laws of Motion'"
                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    />
                </div>
                 <div>
                    <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700">Select your class level</label>
                    <select
                        id="classLevel" value={classLevel} onChange={e => setClassLevel(e.target.value as ClassLevel)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    >
                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : 'Generate Mind Map'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderMindMap = () => (
        <div className="space-y-6">
            <div className="text-center">
                 <h1 className="text-3xl font-bold text-gray-800">Mind Map for "{mindMapData?.term}"</h1>
                 <div className="mt-4 flex items-center justify-center gap-4">
                    <Button onClick={() => { setMindMapData(null); setIsLoading(false); }} variant="outline">
                        Create New Map
                    </Button>
                    <Button onClick={handleDownload} variant="secondary" disabled={isDownloading}>
                        {isDownloading ? <Spinner /> : <><DownloadIcon className="w-5 h-5"/> Download Full Map</>}
                    </Button>
                 </div>
            </div>
            {mindMapData && 
                <MindMap 
                    ref={mindMapRef} 
                    data={mindMapData} 
                    onDownloadStart={() => setIsDownloading(true)}
                    onDownloadFinish={handleDownloadFinish}
                />
            }
        </div>
    );

    const displayContent = () => {
        if (isLoading && !mindMapData) {
            return (
                 <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Spinner className="w-12 h-12" colorClass="bg-indigo-600" />
                    <p className="text-gray-600">Generating your mind map...</p>
                </div>
            );
        }
        if (mindMapData) {
            if (isLoading) setIsLoading(false);
            return renderMindMap();
        }
        return renderForm();
    }

    return <div>{displayContent()}</div>;
};

export default MindMapPage;