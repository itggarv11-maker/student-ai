
import React, { useState, useEffect } from 'react';
import { Flashcard } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';

interface FlashcardComponentProps {
  flashcards: Flashcard[];
}

type CardStatus = 'unseen' | 'known' | 'unknown';

const FlashcardComponent: React.FC<FlashcardComponentProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardStatuses, setCardStatuses] = useState<CardStatus[]>([]);

  useEffect(() => {
    setCardStatuses(new Array(flashcards.length).fill('unseen'));
  }, [flashcards]);

  if (!flashcards || flashcards.length === 0) {
    return <Card variant="light"><p>No flashcards were generated.</p></Card>;
  }
  
  const navigate = (direction: 'next' | 'prev') => {
    setIsFlipped(false);
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
      } else {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
      }
    }, 150); // allow flip back animation to start
  };

  const handleStatusUpdate = (status: 'known' | 'unknown') => {
    const newStatuses = [...cardStatuses];
    newStatuses[currentIndex] = status;
    setCardStatuses(newStatuses);
    navigate('next');
  };

  const currentCard = flashcards[currentIndex];
  const progressPercentage = ((currentIndex + 1) / flashcards.length) * 100;

  const cardBorderStyle = () => {
    switch (cardStatuses[currentIndex]) {
      case 'known': return 'border-green-500';
      case 'unknown': return 'border-red-500';
      default: return 'border-slate-300';
    }
  };

  return (
    <Card variant="light" className="max-w-2xl mx-auto text-center !p-4 md:!p-8">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Flashcards</h2>
      <p className="text-sm text-slate-600 mb-6 -mt-3">Review the key terms from your material.</p>
      
      <div className="h-64 [perspective:1000px] mb-6 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <div 
          className={`relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        >
          {/* Front of Card */}
          <div className={`absolute w-full h-full [backface-visibility:hidden] bg-white/70 rounded-lg flex items-center justify-center p-6 border-2 ${cardBorderStyle()} shadow-lg`}>
            <div>
              <p className="text-2xl font-bold text-slate-800">{currentCard.term}</p>
              {currentCard.tip && !isFlipped && (
                  <p className="text-xs text-slate-500 mt-4 italic">{currentCard.tip}</p>
              )}
            </div>
          </div>
          {/* Back of Card */}
          <div className={`absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white/90 rounded-lg flex items-center justify-center p-6 border-2 ${cardBorderStyle()}`}>
            <p className="text-lg text-slate-700">{currentCard.definition}</p>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mb-4 h-4">{isFlipped ? "Did you know this?" : "Click card to flip"}</p>

      {/* Controls */}
      {isFlipped ? (
        <div className="flex items-center justify-center gap-4">
            <Button onClick={() => handleStatusUpdate('unknown')} variant="outline" className="!border-red-500 !text-red-500 hover:!bg-red-500/20 w-32">
              <XCircleIcon className="w-5 h-5"/>
              Try Again
            </Button>
            <Button onClick={() => handleStatusUpdate('known')} variant="outline" className="!border-green-500 !text-green-500 hover:!bg-green-500/20 w-32">
               <CheckCircleIcon className="w-5 h-5"/>
              Got It!
            </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('prev')} variant="secondary">
              <ArrowLeftIcon className="w-5 h-5"/>
              Prev
          </Button>
          <span className="font-semibold text-slate-700">
            {currentIndex + 1} / {flashcards.length}
          </span>
          <Button onClick={() => navigate('next')} variant="secondary">
              Next
              <ArrowRightIcon className="w-5 h-5"/>
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5 mt-6">
        <div className="bg-gradient-to-r from-violet-500 to-pink-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
      </div>
    </Card>
  );
};

export default FlashcardComponent;