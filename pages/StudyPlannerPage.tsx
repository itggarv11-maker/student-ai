

import React, { useState, useRef } from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import { StudyPlan, StudyDay } from '../types';
import * as geminiService from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const StudyPlannerPage: React.FC = () => {
    const [goal, setGoal] = useState('');
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const planRef = useRef<HTMLDivElement>(null);
    
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
        if (!goal) {
            setError("Please enter your study goal.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setStudyPlan(null);
        try {
            const result = await geminiService.generateStudyPlan(goal);
            setStudyPlan(result);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!planRef.current) return;
        setIsLoading(true);
        html2canvas(planRef.current, { scale: 2, backgroundColor: '#F9FAFB' }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasHeight / canvasWidth;
            
            const imgWidth = pdfWidth - 20; 
            const imgHeight = imgWidth * ratio;
            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);

            while (heightLeft > 0) {
              position = -heightLeft + 10;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
              heightLeft -= (pdfHeight - 20);
            }
            
            pdf.save('study-plan.pdf');
            setIsLoading(false);
        });
    };

    const renderForm = () => (
        <Card className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <CalendarIcon className="w-16 h-16 mx-auto text-indigo-500" />
                <h1 className="text-3xl font-bold text-gray-800 mt-4">Smart Study Planner</h1>
                <p className="mt-2 text-gray-600">Tell me your goal, and I'll create a plan to achieve it.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="goal" className="block text-sm font-medium text-gray-700">What is your study goal?</label>
                    <textarea
                        id="goal" value={goal} onChange={e => setGoal(e.target.value)} required rows={3}
                        placeholder="e.g., 'Revise Physics and Chemistry for my half-yearly exams in 15 days' or 'Complete the History syllabus in one month'"
                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    />
                </div>
                {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
                <div className="text-center pt-2">
                    <Button type="submit" size="lg" disabled={isLoading}>
                        {isLoading ? <Spinner colorClass="bg-white" /> : 'Generate My Plan'}
                    </Button>
                </div>
            </form>
        </Card>
    );

    const renderPlan = () => (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">{studyPlan?.title}</h1>
                 <div className="mt-4 flex items-center justify-center gap-4">
                    <Button onClick={handleDownload} disabled={isLoading} variant="secondary">
                        {isLoading ? <Spinner /> : <><DownloadIcon className="w-5 h-5" /> Download PDF</>}
                    </Button>
                    <Button onClick={() => setStudyPlan(null)} variant="outline">
                        Create New Plan
                    </Button>
                </div>
            </div>
            <div ref={planRef} className="p-4 md:p-8 bg-white text-gray-800 rounded-lg shadow-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studyPlan?.plan && Array.isArray(studyPlan.plan) && studyPlan.plan.map((day, index) => <DayCard key={index} day={day} />)}
                </div>
            </div>
        </div>
    );
    
    const DayCard: React.FC<{ day: StudyDay }> = ({ day }) => (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col h-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
            <div className="flex justify-between items-baseline">
                <h3 className="font-bold text-lg text-indigo-600">Day {day.day}</h3>
                {day.timeSlot && <p className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{day.timeSlot}</p>}
            </div>
            <p className="font-semibold text-gray-700 mt-2">{day.topic}</p>
            <p className="text-sm text-gray-600 mt-1 flex-grow">{day.goal}</p>
        </div>
    );

    return (
        <div>
            {!studyPlan ? renderForm() : renderPlan()}
        </div>
    );
};

export default StudyPlannerPage;