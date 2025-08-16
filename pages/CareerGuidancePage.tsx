

import React, { useState } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { CareerInfo, CareerPath, CareerStep } from '../types';
import * as geminiService from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { RocketLaunchIcon } from '../components/icons/RocketLaunchIcon';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';

const CareerGuidancePage: React.FC = () => {
    const [interests, setInterests] = useState('');
    const [strengths, setStrengths] = useState('');
    const [ambitions, setAmbitions] = useState('');
    const [financialCondition, setFinancialCondition] = useState('');
    const [otherRequest, setOtherRequest] = useState('');

    const [careerInfo, setCareerInfo] = useState<CareerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    
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
        if (!interests.trim() && !strengths.trim() && !ambitions.trim()) {
            setError("Please fill out at least one of the fields: Interests, Strengths, or Ambitions.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setCareerInfo(null);
        try {
            const result = await geminiService.generateCareerGuidance(interests, strengths, ambitions, financialCondition, otherRequest);
            setCareerInfo(result);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const renderForm = () => (
        <Card className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <RocketLaunchIcon className="w-16 h-16 mx-auto text-indigo-500" />
                <h1 className="text-3xl font-bold text-gray-800 mt-4">AI Career Guidance</h1>
                <p className="mt-2 text-gray-600">Discover your perfect career path. Tell us about yourself!</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="interests" className="block text-sm font-medium text-gray-700">What are your interests? (e.g., playing chess, coding, painting, physics)</label>
                    <input type="text" id="interests" value={interests} onChange={e => setInterests(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                </div>
                <div>
                    <label htmlFor="strengths" className="block text-sm font-medium text-gray-700">What are you good at? (e.g., problem-solving, communication, creativity)</label>
                    <input type="text" id="strengths" value={strengths} onChange={e => setStrengths(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                </div>
                <div>
                    <label htmlFor="ambitions" className="block text-sm font-medium text-gray-700">What do you want to become? (e.g., IIT Engineer, Doctor, IAS Officer, Designer)</label>
                    <input type="text" id="ambitions" value={ambitions} onChange={e => setAmbitions(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                </div>
                <div>
                    <label htmlFor="financial" className="block text-sm font-medium text-gray-700">What is your family's financial condition? (Optional)</label>
                     <select id="financial" value={financialCondition} onChange={e => setFinancialCondition(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900">
                        <option value="">-- Select --</option>
                        <option value="Low-income">Low-income</option>
                        <option value="Middle-class">Middle-class</option>
                        <option value="High-income">High-income</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="other" className="block text-sm font-medium text-gray-700">Any other specific requests or information? (Optional)</label>
                    <textarea id="other" value={otherRequest} onChange={e => setOtherRequest(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                </div>

                {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : 'Get My Career Plan'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderResults = () => (
        <div className="space-y-8">
            <div className="text-center">
                 <p className="text-lg text-gray-700">{careerInfo?.introduction}</p>
            </div>
            <div className="space-y-12">
                {careerInfo?.careerPaths.map((path, index) => <CareerPathCard key={index} path={path} />)}
            </div>
             <div className="text-center mt-12">
                <Button onClick={() => setCareerInfo(null)} variant="outline">
                    Start Over
                </Button>
            </div>
        </div>
    );

    const CareerPathCard: React.FC<{ path: CareerPath }> = ({ path }) => (
        <Card className="!p-8">
            <h2 className="text-3xl font-bold text-indigo-600 mb-2">{path.careerName}</h2>
            <p className="text-gray-600 mb-6">{path.description}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><BookOpenIcon className="w-5 h-5"/> Subjects to Focus On</h3>
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(path.subjectsToFocus) && path.subjectsToFocus.map(subject => <span key={subject} className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{subject}</span>)}
                    </div>
                </div>
                 <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><AcademicCapIcon className="w-5 h-5"/> Top Colleges</h3>
                    <div className="flex flex-wrap gap-2">
                       {path.topColleges && Array.isArray(path.topColleges) && path.topColleges.map(college => <span key={college} className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{college}</span>)}
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Your Roadmap</h3>
                <div className="space-y-4">
                    {Array.isArray(path.roadmap) && path.roadmap.map((step, idx) => <RoadmapStep key={idx} step={step} />)}
                </div>
            </div>
             <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800">Potential Growth</h3>
                <p className="text-sm text-green-700">{path.potentialGrowth}</p>
            </div>
        </Card>
    );

    const RoadmapStep: React.FC<{ step: CareerStep }> = ({ step }) => (
        <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold mt-1 shadow">
                <ArrowRightIcon className="w-5 h-5"/>
            </div>
            <div>
                <h4 className="font-bold text-gray-800">{step.stage}</h4>
                <p className="text-gray-600 text-sm">{step.focus}</p>
                {step.examsToPrepare && Array.isArray(step.examsToPrepare) && step.examsToPrepare.length > 0 && (
                    <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-500">Exams to Prepare:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                             {step.examsToPrepare.map(exam => <span key={exam} className="bg-rose-100 text-rose-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{exam}</span>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );


    return (
        <div>
            {isLoading ? (
                 <div className="flex justify-center items-center py-10"><Spinner className="w-12 h-12" colorClass="bg-indigo-600" /></div>
            ) : !careerInfo ? renderForm() : renderResults()}
        </div>
    );
};

export default CareerGuidancePage;