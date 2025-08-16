
import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';

type GameState = 'lobby' | 'waiting' | 'playing';

const GroupQuizPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [gameCode, setGameCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateGame = () => {
    setIsCreating(true);
    // Simulate API call
    setTimeout(() => {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setCreatedCode(newCode);
      setGameState('waiting');
      setIsCreating(false);
    }, 1500);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.length < 6) {
      setError('Game code must be 6 characters long.');
      return;
    }
    setError('');
    // For now, any 6-char code works for the UI demo
    setCreatedCode(gameCode);
    setGameState('waiting');
  };

  const renderLobby = () => (
    <Card variant="light" className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <UsersIcon className="w-16 h-16 mx-auto text-violet-600 mb-4" />
        <h1 className="text-3xl font-bold text-slate-800">Group Quiz</h1>
        <p className="mt-2 text-slate-600">Challenge your friends in a real-time quiz battle!</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Join Game */}
        <div className="p-6 bg-white/40 rounded-lg border border-slate-300">
          <h2 className="text-xl font-semibold text-center text-slate-700 mb-4">Join a Game</h2>
          <form onSubmit={handleJoinGame} className="space-y-4">
            <input
              type="text"
              placeholder="ENTER CODE"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full text-center tracking-[0.3em] font-bold text-xl p-3 bg-white/60 border-2 border-slate-400 rounded-lg focus:ring-violet-500 focus:border-violet-500 transition text-slate-800 placeholder-slate-500"
            />
            {error && <p className="text-red-600 text-xs text-center font-semibold">{error}</p>}
            <Button type="submit" className="w-full">
              Join Game <ArrowRightIcon className="w-5 h-5" />
            </Button>
          </form>
        </div>
        {/* Create Game */}
        <div className="p-6 bg-white/40 rounded-lg border border-slate-300 flex flex-col items-center justify-center">
           <h2 className="text-xl font-semibold text-center text-slate-700 mb-4">Create a New Game</h2>
           <p className="text-slate-600 text-center text-sm mb-4">Generate a code and invite your friends to join.</p>
           <Button onClick={handleCreateGame} variant="secondary" disabled={isCreating}>
            {isCreating ? <Spinner /> : 'Create Game'}
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderWaitingRoom = () => (
    <Card variant="light" className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-slate-800">Waiting for Players...</h2>
      <p className="text-slate-600 mt-2">Share this code with your friends!</p>
      <div className="my-8 p-4 bg-white/50 border-2 border-dashed border-slate-400 rounded-lg">
        <p className="text-5xl font-extrabold tracking-widest text-violet-600">{createdCode}</p>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold text-slate-700">Players Joined (1/8)</h3>
        <div className="mt-2 p-3 bg-white/50 rounded-lg text-left border border-slate-300">
          <p className="text-slate-800 font-medium">You</p>
          {/* In a real app, list of players would appear here */}
        </div>
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => setGameState('lobby')}>Leave Game</Button>
        <Button variant="primary" onClick={() => alert("Starting game... (Feature in development)")}>Start Game</Button>
      </div>
      <p className="text-xs text-slate-500 mt-6">*Note: Live quiz functionality is in development. This is a UI demonstration.</p>
    </Card>
  );

  return (
    <div>
        {gameState === 'lobby' && renderLobby()}
        {gameState === 'waiting' && renderWaitingRoom()}
    </div>
  );
};

export default GroupQuizPage;