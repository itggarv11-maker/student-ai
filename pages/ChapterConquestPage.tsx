import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'https://esm.sh/react-router-dom';
import { GameLevel, PlayerPosition, Interaction } from '../types';
import * as geminiService from '../services/geminiService';
import { useContent } from '../contexts/ContentContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

type GameState = 'generating' | 'playing' | 'interaction' | 'feedback' | 'completed' | 'error';

// Game constants
const TILE_SIZE = 40; // Size of each tile in pixels
const PLAYER_SIZE_RATIO = 0.7; // Player size relative to tile size

const ChapterConquestPage: React.FC = () => {
    const { extractedText } = useContent();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState<GameState>('generating');
    const [level, setLevel] = useState<GameLevel | null>(null);
    const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({ x: 0, y: 0 });
    const [score, setScore] = useState(0);

    const [activeInteraction, setActiveInteraction] = useState<Interaction | null>(null);
    const [interactionAnswer, setInteractionAnswer] = useState('');
    const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
    const [completedInteractions, setCompletedInteractions] = useState<Set<number>>(new Set());
    
    const [error, setError] = useState<React.ReactNode | null>(null);
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameContainerRef = useRef<HTMLDivElement>(null);


    // Fetch and set up the game level
    useEffect(() => {
        if (!extractedText) {
            setGameState('error');
            setError(
                <span>No study content found. Please <Link to="/app" className="font-bold underline text-violet-600">go to the dashboard</Link> and provide some content first.</span>
            );
            return;
        }
        
        const setupGame = async () => {
            setGameState('generating');
            try {
                const gameLevel = await geminiService.generateGameLevel(extractedText);
                setLevel(gameLevel);
                // Center the player visually within the tile
                setPlayerPosition({ 
                    x: gameLevel.player_start.x * TILE_SIZE + TILE_SIZE * (1 - PLAYER_SIZE_RATIO) / 2, 
                    y: gameLevel.player_start.y * TILE_SIZE + TILE_SIZE * (1 - PLAYER_SIZE_RATIO) / 2
                });
                setGameState('playing');
                 // Focus the game container so it can receive keydown events
                if (gameContainerRef.current) {
                    gameContainerRef.current.focus();
                }

            } catch (err) {
                 if (err instanceof Error) {
                    setError(err.message.includes("Insufficient tokens")
                        ? <span>You're out of tokens! Please <Link to="/premium" className="font-bold underline text-violet-600">upgrade to Premium</Link>.</span>
                        : `AI failed to build your game. The content might be too short or complex. Error: ${err.message}`);
                } else {
                    setError("An unknown error occurred while building your game.");
                }
                setGameState('error');
            }
        };
        setupGame();
    }, [extractedText]);

    const handleInteractionSubmit = () => {
        if (!activeInteraction) return;
        const isCorrect = interactionAnswer.toLowerCase().trim() === activeInteraction.correct_answer.toLowerCase().trim();
        setFeedback({
            correct: isCorrect,
            message: isCorrect ? activeInteraction.success_message : activeInteraction.failure_message,
        });
        if (isCorrect) {
            setScore(s => s + 10);
            setCompletedInteractions(prev => new Set(prev).add(activeInteraction.id));
        }
        setGameState('feedback');
    };

    const closeFeedback = () => {
        setFeedback(null);
        setInteractionAnswer('');
        setActiveInteraction(null);
        setGameState('playing');
        if (gameContainerRef.current) gameContainerRef.current.focus();
    };

    const checkForInteraction = useCallback(() => {
        if (!level || gameState !== 'playing') return;

        const playerCenterX = playerPosition.x + (TILE_SIZE * PLAYER_SIZE_RATIO) / 2;
        const playerCenterY = playerPosition.y + (TILE_SIZE * PLAYER_SIZE_RATIO) / 2;
        const playerGridX = Math.floor(playerCenterX / TILE_SIZE);
        const playerGridY = Math.floor(playerCenterY / TILE_SIZE);
        
        const interaction = level.interactions.find(i => 
            i.position.x === playerGridX && 
            i.position.y === playerGridY && 
            !completedInteractions.has(i.id)
        );
        
        if (interaction) {
            setActiveInteraction(interaction);
            setGameState('interaction');
        }
    }, [level, playerPosition, completedInteractions, gameState]);


    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)) {
             e.preventDefault();
        }

        if(gameState === 'playing') {
            keysPressed.current[key] = true;

            if(key === 'e') {
                checkForInteraction();
            }
        }
    }, [gameState, checkForInteraction]);
    
    const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        keysPressed.current[e.key.toLowerCase()] = false;
    }, []);

    // The main game loop for player movement
    useEffect(() => {
        let animationFrameId: number;

        const gameLoop = () => {
            if (gameState === 'playing') {
                setPlayerPosition(prevPos => {
                    if (!level) return prevPos;

                    let newX = prevPos.x;
                    let newY = prevPos.y;
                    const speed = 2.5;

                    if (keysPressed.current['w'] || keysPressed.current['arrowup']) newY -= speed;
                    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) newY += speed;
                    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) newX -= speed;
                    if (keysPressed.current['d'] || keysPressed.current['arrowright']) newX += speed;

                    // Collision detection
                    const playerSize = TILE_SIZE * PLAYER_SIZE_RATIO;
                    const checkCollision = (x: number, y: number) => {
                        const gridX = Math.floor(x / TILE_SIZE);
                        const gridY = Math.floor(y / TILE_SIZE);
                        if (!level.grid[gridY] || !level.grid[gridY][gridX] || level.grid[gridY][gridX].type === 'wall') {
                            return true; // Collision
                        }
                        if (level.grid[gridY][gridX].type === 'exit') {
                             setGameState('completed');
                        }
                        return false;
                    };
                    
                    // Check horizontal movement
                    if (newX !== prevPos.x) {
                        const nextX1 = (newX < prevPos.x) ? newX : newX + playerSize;
                        const nextX2 = (newX < prevPos.x) ? newX : newX + playerSize;
                        if (checkCollision(nextX1, prevPos.y) || checkCollision(nextX2, prevPos.y + playerSize -1)) {
                            newX = prevPos.x;
                        }
                    }
                    // Check vertical movement
                     if (newY !== prevPos.y) {
                        const nextY1 = (newY < prevPos.y) ? newY : newY + playerSize;
                        const nextY2 = (newY < prevPos.y) ? newY : newY + playerSize;
                         if (checkCollision(newX, nextY1) || checkCollision(newX + playerSize - 1, nextY2)) {
                            newY = prevPos.y;
                        }
                    }

                    return { x: newX, y: newY };
                });
            }
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, level]);


    if (gameState === 'generating') {
        return (
            <Card variant="light" className="max-w-md mx-auto text-center">
                <Spinner className="w-16 h-16" colorClass="bg-violet-600" />
                <h2 className="text-2xl font-bold text-slate-800 mt-6">AI Level Designer is Building Your Game...</h2>
                <p className="text-slate-600 mt-2">Get ready for an adventure!</p>
            </Card>
        );
    }
    
    if (gameState === 'error' || !level) {
         return (
            <Card variant="light" className="max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold text-red-700">Failed to Build Game</h1>
                <p className="mt-2 text-slate-600">{error || "An unknown error occurred."}</p>
                <div className="mt-6">
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </Card>
        );
    }
    
     if (gameState === 'completed') {
        return (
            <Card variant="light" className="max-w-2xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-slate-800 mt-4">Conquest Complete!</h1>
                <p className="text-lg text-slate-600 mt-2">You have successfully completed '{level.title}'!</p>
                <p className="text-4xl font-bold text-violet-700 my-4">Final Score: {score}</p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button onClick={() => navigate('/app')} variant="outline">Back to Dashboard</Button>
                    <Button onClick={() => window.location.reload()}>Play a New Game</Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="w-full mx-auto space-y-4">
             <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800">{level.title}</h1>
                <p className="text-slate-600"><strong>Goal:</strong> {level.goal} | <strong>Score:</strong> {score}</p>
                <p className="text-sm text-slate-500 font-semibold p-2 bg-slate-200/50 rounded-md inline-block">Use <kbd className="font-sans border rounded px-1.5 py-0.5 bg-white shadow-sm">WASD</kbd> or <kbd className="font-sans border rounded px-1.5 py-0.5 bg-white shadow-sm">Arrow Keys</kbd> to move. Press <kbd className="font-sans border rounded px-1.5 py-0.5 bg-white shadow-sm">E</kbd> on objects to interact.</p>
            </div>
            <div
                ref={gameContainerRef}
                className="relative bg-gray-800 mx-auto overflow-hidden border-4 border-slate-700 rounded-lg shadow-2xl focus:outline-none focus:ring-4 focus:ring-violet-500"
                style={{ width: level.grid[0].length * TILE_SIZE, height: level.grid.length * TILE_SIZE }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                tabIndex={0}
            >
                {level.grid.map((row, y) => (
                    row.map((tile, x) => {
                        let tileStyle = 'bg-gray-700'; // floor
                        if (tile.type === 'wall') tileStyle = 'bg-gray-900';
                        if (tile.type === 'exit') tileStyle = 'bg-green-600 animate-pulse';
                        if (tile.type === 'interaction') {
                           const interaction = level.interactions.find(i => i.position.x === x && i.position.y === y);
                           tileStyle = interaction && completedInteractions.has(interaction.id) 
                               ? 'bg-purple-800' // completed
                               : 'bg-purple-500 animate-pulse'; // available
                        }
                        return <div key={`${x}-${y}`} className={`absolute ${tileStyle}`} style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} />;
                    })
                ))}
                <div className="absolute bg-blue-400 rounded-md border-2 border-blue-200 transition-all duration-75" style={{ left: playerPosition.x, top: playerPosition.y, width: TILE_SIZE * PLAYER_SIZE_RATIO, height: TILE_SIZE * PLAYER_SIZE_RATIO }} />
            </div>

            {(gameState === 'interaction' || gameState === 'feedback') && activeInteraction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card variant="light" className="max-w-lg w-full">
                        {feedback ? (
                            <div className="text-center">
                                <h2 className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>{feedback.correct ? 'Success!' : 'Try Again!'}</h2>
                                <p className="text-slate-600 mt-2">{feedback.message}</p>
                                <Button onClick={closeFeedback} className="mt-4">Continue</Button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleInteractionSubmit(); }}>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">{activeInteraction.prompt}</h2>
                                <input
                                    type="text"
                                    value={interactionAnswer}
                                    onChange={e => setInteractionAnswer(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-md text-slate-800"
                                    autoFocus
                                />
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={closeFeedback}>Cancel</Button>
                                    <Button type="submit">Submit</Button>
                                </div>
                            </form>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ChapterConquestPage;
