

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import { QuizHistoryItem } from '../types';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { CheckBadgeIcon } from '../components/icons/CheckBadgeIcon';

const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [level, setLevel] = useState(1);
  const [levelName, setLevelName] = useState('Novice Learner');

  useEffect(() => {
    const storedHistory: QuizHistoryItem[] = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    setHistory(storedHistory);

    const quizzesTaken = storedHistory.length;
    const calculatedLevel = 1 + Math.floor(quizzesTaken / 5);
    setLevel(calculatedLevel);

    const levelNames = ['Novice Learner', 'Curious Student', 'Skilled Scholar', 'Prodigy', 'Wise Master'];
    setLevelName(levelNames[Math.min(calculatedLevel - 1, levelNames.length - 1)]);

  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Your Profile</h1>
        <p className="mt-2 text-gray-600">Track your progress and review your quiz history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Stats</h2>
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
                <AcademicCapIcon className="w-14 h-14 text-white"/>
            </div>
            <p className="text-lg font-semibold text-gray-800 break-all">{currentUser?.email}</p>
            <div className="mt-4 bg-indigo-100 text-indigo-700 font-bold py-1 px-4 rounded-full border border-indigo-200">
              Level {level}: {levelName}
            </div>
             <p className="text-sm text-gray-500 mt-2">{history.length} quizzes taken</p>
          </div>
        </Card>

        <Card className="md:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quiz History</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.length > 0 ? (
                    history.map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50/50 rounded-lg flex items-center justify-between gap-4 border border-gray-200">
                            <div className="flex items-center gap-4">
                               <div className="flex-shrink-0 bg-gray-200 p-2 rounded-lg">
                                  <CalendarDaysIcon className="w-6 h-6 text-gray-500"/>
                               </div>
                               <div>
                                   <p className="font-semibold text-gray-700">{item.subject} Quiz</p>
                                   <p className="text-sm text-gray-500">{item.date}</p>
                               </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-indigo-600">{item.score}</p>
                                <p className="text-xs text-gray-500">Score</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <CheckBadgeIcon className="w-16 h-16 mx-auto text-gray-400"/>
                        <p className="mt-4 text-gray-600">You haven't taken any quizzes yet.</p>
                        <p className="text-sm text-gray-500">Your results will appear here once you complete a quiz.</p>
                    </div>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;