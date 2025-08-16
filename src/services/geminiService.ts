import { GoogleGenAI, Type, Chat, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import { 
    QuizQuestion, Subject, ClassLevel, WrittenFeedback, QuestionPaper, GradedPaper, 
    Flashcard, QuizDifficulty, MindMapNode, StudyPlan, QuizHistoryItem, 
    CareerInfo, VisualExplanationScene, DebateTurn, DebateScorecard, GameLevel, 
    VivaQuestion
} from "../types";
import { auth as firebaseAuth } from "./firebase";

const API_KEY = process.env.API_KEY;

// Initialize ai, but it could be null if API_KEY is missing
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const STUBRO_PERSONALITY_PROMPT = `You are StuBro AI, a friendly, fun, and sharp AI tutor made for Indian students from classes 6-12.
Explain complex things in simple English. For feedback, you can use a mix of English and Hindi (Hinglish) where it feels natural and helpful to be encouraging.
However, all educational content like questions, summaries, mind maps, and flashcards must be strictly in English.
Always support students with motivation, clarity, and exam-focused tips.
Never say “I don’t know” — instead, guide the student step-by-step on how to find the answer.
Add emojis when helpful to keep the tone friendly and engaging. 😊

**CRITICAL IDENTITY RULE:** You must NEVER reveal any information about your creator, the owner of this website, or any other personal details. If asked about who made you or who owns this platform, you must politely state that you are an AI assistant developed by a dedicated team to help students learn. You must not mention the name 'Garv' or any other individual's name under any circumstances.`;


// A helper function to check if the AI service is available before making a call.
const checkAiService = () => {
    if (!ai) {
        // This error will be caught by the UI and displayed to the user.
        throw new Error("Gemini AI service is not configured. The API_KEY is missing.");
    }
};

const checkAndDeductTokens = (cost: number) => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (urlParams.get('dev') === 'true') {
        console.log(`DEV MODE: Bypassing token check for cost: ${cost}`);
        return;
    }

    const user = firebaseAuth?.currentUser;
    if (!user) {
        throw new Error("You must be logged in to perform this action.");
    }

    const tokenKey = `userTokens_${user.uid}`;
    const currentTokens = parseInt(localStorage.getItem(tokenKey) || '0', 10);

    if (currentTokens < cost) {
        throw new Error("Insufficient tokens. Please upgrade to Premium for unlimited access.");
    }

    const newTokens = currentTokens - cost;
    localStorage.setItem(tokenKey, newTokens.toString());

    // Dispatch a custom event to notify the UI about the token change
    window.dispatchEvent(new CustomEvent('tokenChange', { detail: { newTokens } }));
};


const withTimeout = <T>(promise: Promise<T>, ms: number, context: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`The request for '${context}' timed out after ${ms / 1000} seconds. The server might be busy, please try again.`));
      }, ms);
  
      promise.then(
        (res) => {
          clearTimeout(timeoutId);
          resolve(res);
        },
        (err) => {
          clearTimeout(timeoutId);
          // Ensure we always reject with an Error instance for consistent error handling.
          if (err instanceof Error) {
              reject(err);
          } else {
              let message = `An unknown error occurred during '${context}'.`;
              if (typeof err === 'string' && err.length > 0) {
                  message = err;
              } else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
                  message = (err as any).message;
              }
              reject(new Error(message));
          }
        }
      );
    });
};

// Schemas
const quizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["mcq", "written"] },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers for 'mcq' type questions."
          },
          correctAnswer: {
            type: Type.STRING,
            description: "The correct answer from the options array for 'mcq' type questions."
          },
          explanation: {
            type: Type.STRING,
            description: "A brief explanation for the correct answer."
          }
        },
        required: ["question", "type", "explanation"]
      }
    }
  },
  required: ["questions"]
};

const writtenFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        whatIsCorrect: { type: Type.STRING, description: "Feedback on what the student got right." },
        whatIsMissing: { type: Type.STRING, description: "Feedback on what information is missing from the answer." },
        whatIsIncorrect: { type: Type.STRING, description: "Feedback on what was incorrect in the answer." },
        marksAwarded: { type: Type.NUMBER, description: "Marks awarded out of 5." },
        totalMarks: { type: Type.NUMBER, description: "Total marks for the question, which is always 5." },
    },
    required: ["whatIsCorrect", "whatIsMissing", "whatIsIncorrect", "marksAwarded", "totalMarks"]
};

const flashcardsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            term: { type: Type.STRING, description: "The key term or concept." },
            definition: { type: Type.STRING, description: "A clear and concise definition of the term." },
            tip: { type: Type.STRING, description: "An optional mnemonic or tip to remember the concept." },
        },
        required: ["term", "definition"]
    }
};

const mindMapSchema = {
    type: Type.OBJECT,
    properties: {
        term: { type: Type.STRING },
        explanation: { type: Type.STRING },
        children: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        items: {
                             type: Type.OBJECT,
                             properties: {
                                term: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                children: { type: Type.ARRAY, items: {type: Type.OBJECT, properties: {term: {type: Type.STRING}, explanation: {type: Type.STRING}}}}
                             }
                        }
                    }
                }
            }
        }
    },
    required: ["term", "explanation"]
};

const questionPaperSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        totalMarks: { type: Type.NUMBER },
        instructions: { type: Type.STRING },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    questionType: { type: Type.STRING, enum: ['mcq', 'short_answer', 'long_answer'] },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                    marks: { type: Type.NUMBER },
                },
                required: ['question', 'questionType', 'answer', 'marks']
            }
        }
    },
    required: ['title', 'totalMarks', 'instructions', 'questions']
};

const gradedPaperSchema = {
    type: Type.OBJECT,
    properties: {
        totalMarksAwarded: { type: Type.NUMBER },
        overallFeedback: { type: Type.STRING },
        gradedQuestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.NUMBER },
                    marksAwarded: { type: Type.NUMBER },
                    studentAnswerTranscription: { type: Type.STRING },
                    feedback: {
                        type: Type.OBJECT,
                        properties: {
                            whatWasCorrect: { type: Type.STRING },
                            whatWasIncorrect: { type: Type.STRING },
                            suggestionForImprovement: { type: Type.STRING },
                        },
                        required: ['whatWasCorrect', 'whatWasIncorrect', 'suggestionForImprovement']
                    }
                },
                required: ['questionNumber', 'marksAwarded', 'studentAnswerTranscription', 'feedback']
            }
        }
    },
    required: ['totalMarksAwarded', 'overallFeedback', 'gradedQuestions']
};

const careerInfoSchema = {
    type: Type.OBJECT,
    properties: {
        introduction: { type: Type.STRING },
        careerPaths: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    careerName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    subjectsToFocus: { type: Type.ARRAY, items: { type: Type.STRING } },
                    roadmap: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                stage: { type: Type.STRING },
                                focus: { type: Type.STRING },
                                examsToPrepare: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ['stage', 'focus']
                        }
                    },
                    topColleges: { type: Type.ARRAY, items: { type: Type.STRING } },
                    potentialGrowth: { type: Type.STRING },
                },
                required: ['careerName', 'description', 'subjectsToFocus', 'roadmap', 'potentialGrowth']
            }
        }
    },
    required: ['introduction', 'careerPaths']
};

const studyPlanSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        plan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.NUMBER },
                    topic: { type: Type.STRING },
                    goal: { type: Type.STRING },
                    timeSlot: { type: Type.STRING }
                },
                required: ['day', 'topic', 'goal']
            }
        }
    },
    required: ['title', 'plan']
};

const vivaEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        transcription: { type: Type.STRING, description: "The transcribed text from the audio. For typed answers, just repeat the user's answer." },
        feedback: { type: Type.STRING, description: "Constructive feedback on the answer's correctness and clarity." },
        marksAwarded: { type: Type.NUMBER, description: "Marks awarded out of 10." },
    },
    required: ["transcription", "feedback", "marksAwarded"]
};

const visualExplanationSchema = {
    type: Type.ARRAY,
    description: "An array of 2-4 scenes.",
    items: {
        type: Type.OBJECT,
        properties: {
            narration: { type: Type.STRING, description: "A single, concise sentence of narration for this scene." },
            image_prompt: { type: Type.STRING, description: "A detailed, vivid prompt for an image generator to create an image for this scene. Style: 'Digital illustration, vibrant, educational, clear subject'." },
        },
        required: ["narration", "image_prompt"]
    }
};

const summaryVideoSchema = {
    type: Type.ARRAY,
    description: "An array of 5-7 scenes for a full summary video.",
    items: {
        type: Type.OBJECT,
        properties: {
            narration: { type: Type.STRING, description: "A single, concise sentence of narration for this summary scene." },
            image_prompt: { type: Type.STRING, description: "A detailed, vivid prompt for an image generator to create an image for this summary scene. Style: 'Digital illustration, vibrant, educational, clear subject'." },
        },
        required: ["narration", "image_prompt"]
    }
};

const topicsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A short, clear title for the topic." },
            content: { type: Type.STRING, description: "The full text content for this topic." },
        },
        required: ["title", "content"],
    }
};

const debateScorecardSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.NUMBER, description: "An overall score for the user's performance out of 100." },
        argumentStrength: { type: Type.NUMBER, description: "A score for the user's argument strength out of 100." },
        rebuttalEffectiveness: { type: Type.NUMBER, description: "A score for the user's rebuttal effectiveness out of 100." },
        clarity: { type: Type.NUMBER, description: "A score for clarity and articulation out of 100." },
        strongestArgument: { type: Type.STRING, description: "Identify and quote the user's strongest argument." },
        improvementSuggestion: { type: Type.STRING, description: "A specific suggestion for how the user can improve." },
        concludingRemarks: { type: Type.STRING, description: "A final concluding remark on the debate." },
    },
    required: ["overallScore", "argumentStrength", "rebuttalEffectiveness", "clarity", "strongestArgument", "improvementSuggestion", "concludingRemarks"]
};

const gameLevelSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        theme: { type: Type.STRING },
        goal: { type: Type.STRING },
        player_start: {
            type: Type.OBJECT,
            properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
            required: ['x', 'y']
        },
        grid: {
            type: Type.ARRAY,
            description: "A 2D array (15x20) representing the game map.",
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['floor', 'wall', 'interaction', 'exit'] }
                    },
                    required: ['type']
                }
            }
        },
        interactions: {
            type: Type.ARRAY,
            description: "A list of interactive objects on the map.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.NUMBER, description: "A unique ID for this interaction." },
                    position: {
                        type: Type.OBJECT,
                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                        required: ['x', 'y']
                    },
                    prompt: { type: Type.STRING, description: "The challenge/question presented to the player." },
                    correct_answer: { type: Type.STRING, description: "The correct answer to the prompt." },
                    success_message: { type: Type.STRING, description: "Message shown on correct answer." },
                    failure_message: { type: Type.STRING, description: "Message shown on incorrect answer." }
                },
                required: ['id', 'position', 'prompt', 'correct_answer', 'success_message', 'failure_message']
            }
        }
    },
    required: ['title', 'theme', 'goal', 'player_start', 'grid', 'interactions']
};


export const fetchYouTubeTranscript = async (url: string): Promise<string> => {
    checkAiService();
    checkAndDeductTokens(10);
    const prompt = `Please fetch the full transcript of the YouTube video at this URL: ${url}. If a transcript is available, return only the text content. If you cannot find a transcript, return the text "Could not fetch transcript."`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{googleSearch: {}}] }
    }), 60000, "YouTube Transcript Fetch");

    const text = response.text;
    if (text.includes("Could not fetch transcript")) {
        throw new Error("Could not fetch a transcript for this video. It may be disabled or the video is too new.");
    }
    return text;
};

export const fetchChapterContent = async (classLevel: ClassLevel, subject: Subject, chapterInfo: string, chapterDetails: string): Promise<string> => {
    checkAiService();
    checkAndDeductTokens(8);
    const prompt = `You are an expert content retriever. Your goal is to find and provide a comprehensive, well-structured, and detailed explanation of a specific academic chapter suitable for a student.

**Instructions:**
1.  **Analyze the Request:** Carefully read the student's request for class, subject, and chapter information.
2.  **Perform a Deep Search:** Use your knowledge and search capabilities to find the most accurate and thorough content for the requested chapter. Prioritize core concepts, key definitions, important principles, and relevant examples.
3.  **Structure the Content:** Format the output in a clean, readable manner. Use headings for main topics and sub-headings where necessary. Use bullet points for lists and bold text for key terms.
4.  **Return Only Content:** Your final output should be ONLY the educational text for the chapter. Do not include any conversational text, introductions, or summaries like "Here is the content for...".

**Student's Request:**
- Class: ${classLevel}
- Subject: ${subject}
- Chapter Information: ${chapterInfo}
- Additional Details: ${chapterDetails || 'Any board/publisher'}
`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{googleSearch: {}}] }
    }), 120000, "Chapter Content Fetch");

    return response.text;
};

export const createChatSession = (subject: Subject, classLevel: ClassLevel, extractedText: string): Chat => {
    checkAiService();
    const systemInstruction = `${STUBRO_PERSONALITY_PROMPT}

The user is in ${classLevel} studying ${subject}. They have provided the following notes. Base all your answers on these notes unless the user asks for more general information.
---
NOTES:
${extractedText.substring(0, 8000)}
---`;

    return ai!.chats.create({
        model: "gemini-2.5-flash",
        config: {
            systemInstruction
        }
    });
};

export const sendMessageStream = async (chat: Chat, message: string) => {
    checkAiService();
    checkAndDeductTokens(1);
    return chat.sendMessageStream({ message });
};

export const generateQuiz = async (subject: Subject, classLevel: ClassLevel, sourceText: string, numQuestions: number, difficulty: QuizDifficulty, questionType: string): Promise<QuizQuestion[]> => {
    checkAiService();
    checkAndDeductTokens(Number(numQuestions) * 1.5);
    const prompt = `Based on the following text about ${subject} for ${classLevel}, generate a quiz with ${numQuestions} questions.
    The difficulty should be ${difficulty}.
    Question types should be: ${questionType}.
    For MCQs, provide 4 options.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
        },
    }), 120000, 'Quiz Generation');
    
    const result = JSON.parse(response.text);
    return result.questions;
};

export const generateSummary = async (subject: Subject, classLevel: ClassLevel, sourceText: string): Promise<string> => {
    checkAiService();
    checkAndDeductTokens(5);
    const prompt = `${STUBRO_PERSONALITY_PROMPT}\n\nPlease create a concise, well-structured summary of the following text on ${subject} for a ${classLevel} student. Use headings, bullet points, and bold text to make it easy to read.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    }), 60000, 'Summary Generation');
    return response.text;
};

export const generateFlashcards = async (sourceText: string): Promise<Flashcard[]> => {
    checkAiService();
    checkAndDeductTokens(10);
    const prompt = `Based on the following text, create a set of flashcards with terms, definitions, and an optional learning tip.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: flashcardsSchema,
        },
    }), 60000, 'Flashcard Generation');

    const result = JSON.parse(response.text);
    return result;
};

export const evaluateWrittenAnswer = async (sourceText: string, question: string, answer: string): Promise<WrittenFeedback> => {
    checkAiService();
    checkAndDeductTokens(3);
    const prompt = `Based on the source text, evaluate the student's written answer to the question.
    QUESTION: ${question}
    STUDENT'S ANSWER: ${answer}
    ---SOURCE TEXT---
    ${sourceText}
    ---END SOURCE TEXT---
    Grade the answer out of 5.`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: writtenFeedbackSchema
        }
    }), 60000, 'Written Answer Evaluation');
    
    return JSON.parse(response.text);
};

export const evaluateWrittenAnswerFromImages = async (sourceText: string, question: string, imageParts: { inlineData: { mimeType: string; data: string; } }[]): Promise<WrittenFeedback> => {
    checkAiService();
    checkAndDeductTokens(4);
    const textPart = { text: `The student was asked this question: "${question}" based on the provided study material. They have submitted the attached image(s) as their answer. Please evaluate it and provide feedback. Grade it out of 5.` };
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: writtenFeedbackSchema
        }
    }), 120000, 'Image Answer Evaluation');

    return JSON.parse(response.text);
};

export const evaluateSpokenAnswerForQuiz = async (sourceText: string, question: string, audioPart: { inlineData: { mimeType: string; data: string; } }): Promise<{ transcription: string; feedback: WrittenFeedback; }> => {
    checkAiService();
    checkAndDeductTokens(4);
    const textPart = { text: `A student was asked this question during a quiz: "${question}". They responded with the attached audio. First, transcribe their answer. Then, evaluate the transcribed answer for correctness and provide feedback based on the study material. Grade it out of 5.` };
    const schema = {
        type: Type.OBJECT,
        properties: {
            transcription: { type: Type.STRING },
            feedback: writtenFeedbackSchema
        },
        required: ['transcription', 'feedback']
    };
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [textPart, audioPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    }), 120000, 'Spoken Answer Evaluation');

    return JSON.parse(response.text);
};

export const generateQuestionPaper = async (sourceText: string, numQuestions: number, questionTypes: string, difficulty: string, totalMarks: number, subject: Subject | null): Promise<QuestionPaper> => {
    checkAiService();
    checkAndDeductTokens(20);
    const prompt = `Create a question paper for a student.
    - Subject: ${subject || 'General'}
    - Source Material: Use the provided text.
    - Number of Questions: ${numQuestions}
    - Question Types: ${questionTypes}
    - Difficulty: ${difficulty}
    - Total Marks: ${totalMarks}
    - Instructions: Include standard exam instructions.
    - For each question, provide the model answer.
    ---SOURCE TEXT---
    ${sourceText}
    ---END SOURCE TEXT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: questionPaperSchema,
        },
    }), 180000, 'Question Paper Generation');
    
    return JSON.parse(response.text);
};

export const gradeAnswerSheet = async (paperText: string, imageParts: { inlineData: { mimeType: string; data: string; } }[]): Promise<GradedPaper> => {
    checkAiService();
    checkAndDeductTokens(30);
    const prompt = `You are an AI examiner. You have been given a question paper with model answers, and a student's handwritten answer sheet as images. Your task is to:
    1. Transcribe the student's answer for each question.
    2. Compare the transcribed answer to the model answer.
    3. Award marks for each question based on correctness.
    4. Provide specific feedback for each question: what was correct, what was incorrect, and suggestions for improvement.
    5. Calculate the total marks awarded and provide overall feedback on the student's performance.

    ---QUESTION PAPER & MODEL ANSWERS---
    ${paperText}
    ---END QUESTION PAPER---

    The student's answer sheet is attached as images. Please provide the graded result in the specified JSON format.`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }, ...imageParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: gradedPaperSchema
        }
    }), 300000, 'Answer Sheet Grading');

    return JSON.parse(response.text);
};

export const generateCareerGuidance = async (interests: string, strengths: string, ambitions: string, financial: string, other: string): Promise<CareerInfo> => {
    checkAiService();
    checkAndDeductTokens(20);
    const prompt = `You are an expert career counselor for Indian students. Based on the following profile, provide comprehensive career guidance.
    - Interests: ${interests}
    - Strengths: ${strengths}
    - Ambitions: ${ambitions}
    - Family Financial Condition: ${financial || 'Not specified'}
    - Other info: ${other || 'None'}

    Please provide a detailed introduction and at least 2-3 diverse career paths. For each path, include a description, subjects to focus on, a step-by-step roadmap (from class 9-10 to after 12), top colleges in India, and potential for growth.`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: careerInfoSchema
        }
    }), 120000, 'Career Guidance');
    
    return JSON.parse(response.text);
};

export const generateStudyPlan = async (goal: string): Promise<StudyPlan> => {
    checkAiService();
    checkAndDeductTokens(15);
    const prompt = `Create a detailed, day-by-day study plan for a student with the following goal: "${goal}".
    The plan should be realistic, including specific topics for each day, clear goals, and suggested time slots (e.g., Morning, Afternoon).
    Break down the goal into manageable daily tasks. The title of the plan should reflect the student's goal.`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: studyPlanSchema
        }
    }), 60000, 'Study Plan Generation');
    
    return JSON.parse(response.text);
};

export const generateMindMap = async (topic: string, classLevel: ClassLevel): Promise<MindMapNode> => {
    checkAiService();
    checkAndDeductTokens(15);
    const prompt = `Generate a hierarchical mind map for the topic "${topic}" suitable for a ${classLevel} student.
    The main node should be the topic itself. It should have several key sub-topics as children. Each of these sub-topics can have further children, going up to 3-4 levels deep.
    For each node (term), provide a brief, one-sentence explanation.`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: mindMapSchema,
        },
    }), 120000, 'Mind Map Generation');
    
    return JSON.parse(response.text);
};

export const generateMindMapFromText = async (sourceText: string, classLevel: ClassLevel): Promise<MindMapNode> => {
    checkAiService();
    checkAndDeductTokens(15);
    const prompt = `Generate a hierarchical mind map from the provided text, suitable for a ${classLevel} student.
    Identify the main topic from the text to be the root node. Then, identify key sub-topics as children. Each of these sub-topics can have further children, going up to 3-4 levels deep.
    For each node (term), provide a brief, one-sentence explanation based on the text.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: mindMapSchema,
        },
    }), 120000, 'Mind Map Generation from Text');
    
    return JSON.parse(response.text);
};

export const generateVivaQuestions = async (topic: string, classLevel: ClassLevel, numQuestions: number): Promise<string[]> => {
    checkAiService();
    checkAndDeductTokens(numQuestions);
    const prompt = `You are an examiner preparing for a viva (oral exam).
    Topic: ${topic}
    Class Level: ${classLevel}
    Generate ${numQuestions} insightful viva questions on this topic. The questions should test conceptual understanding.
    Return the questions as a simple JSON array of strings.`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    }), 60000, 'Viva Questions Generation');
    
    return JSON.parse(response.text);
};

export const evaluateVivaAudioAnswer = async (question: string, audioPart: { inlineData: { mimeType: string; data: string; } }): Promise<{ transcription: string, feedback: string, marksAwarded: number }> => {
    checkAiService();
    checkAndDeductTokens(4);
    const prompt = `A student was asked this question in a viva: "${question}". Their spoken answer is in the attached audio file.
    1. Transcribe the audio.
    2. Provide constructive feedback on their answer's correctness and clarity.
    3. Award marks out of 10.`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }, audioPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: vivaEvaluationSchema
        }
    }), 120000, 'Viva Audio Evaluation');
    
    return JSON.parse(response.text);
};

export const evaluateVivaTextAnswer = async (question: string, answer: string): Promise<{ transcription: string, feedback: string, marksAwarded: number }> => {
    checkAiService();
    checkAndDeductTokens(3);
    const prompt = `A student was asked this question in a viva: "${question}". They typed this answer: "${answer}".
    1. For transcription, just repeat the user's typed answer.
    2. Provide constructive feedback on their answer's correctness and clarity.
    3. Award marks out of 10.`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: vivaEvaluationSchema
        }
    }), 60000, 'Viva Text Evaluation');

    return JSON.parse(response.text);
};

export const createLiveDoubtsSession = (topic: string, classLevel: ClassLevel): Chat => {
    checkAiService();
    const systemInstruction = `${STUBRO_PERSONALITY_PROMPT}\n\nYou are in a live voice-to-voice doubt clearing session. The student is from ${classLevel} and wants to discuss the topic: "${topic}". Keep your answers conversational, clear, and concise, as if you are speaking to them. Wait for their question, then respond.`;
    return ai!.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction }
    });
};

export const sendAudioForTranscriptionAndResponse = async (chat: Chat, audioPart: { inlineData: { mimeType: string; data: string; } }): Promise<{ transcription: string, response: string }> => {
    checkAiService();
    checkAndDeductTokens(2);
    const prompt = `The user has spoken their doubt, which is in the attached audio file. First, transcribe their doubt. Then, provide a spoken-style answer to their transcribed doubt. Respond in JSON with "transcription" and "response" fields.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            transcription: { type: Type.STRING },
            response: { type: Type.STRING }
        },
        required: ['transcription', 'response']
    };
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            role: 'user',
            parts: [{text: prompt}, audioPart]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }), 120000, "Audio transcription and response");
    
    const result = JSON.parse(response.text);
    return result;
};

export const generateDebateTopics = async (sourceText: string): Promise<string[]> => {
    checkAiService();
    checkAndDeductTokens(5);
    const prompt = `Based on the following text, generate 3-4 interesting and debatable topics or motions. The topics should be controversial or have clear opposing viewpoints. Return a simple JSON array of strings.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    }), 60000, 'Debate Topic Generation');
    
    return JSON.parse(response.text);
};

export const startDebateSession = (topic: string): Chat => {
    checkAiService();
    const systemInstruction = `You are "Critico," a sharp, logical, and formidable AI debate opponent. Your goal is to challenge the user and win the debate.
    - The debate topic is: "${topic}".
    - You must argue from a logical, evidence-based perspective.
    - Always wait for the user's argument before presenting your rebuttal.
    - Be respectful but firm. Point out logical fallacies in the user's arguments.
    - Your first message will be your opening statement on the topic.`;

    return ai!.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction }
    });
};

export const sendDebateArgument = async (chat: Chat, argument: string): Promise<string> => {
    checkAiService();
    checkAndDeductTokens(2);
    const response = await chat.sendMessage({ message: argument });
    return response.text;
};

export const getDebateResponseToAudio = async (chat: Chat, audioPart: { inlineData: { mimeType: string; data: string; } }): Promise<{ transcription: string; rebuttal: string; }> => {
    checkAiService();
    checkAndDeductTokens(3);
    const prompt = `The user has spoken their argument in the attached audio. First, transcribe it. Then, acting as Critico, provide a strong rebuttal. Respond in JSON with "transcription" and "rebuttal" fields.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            transcription: { type: Type.STRING },
            rebuttal: { type: Type.STRING }
        },
        required: ['transcription', 'rebuttal']
    };

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{text: prompt}, audioPart] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    }), 120000, 'Debate Audio Response');
    
    return JSON.parse(response.text);
};

export const evaluateDebate = async (history: DebateTurn[]): Promise<DebateScorecard> => {
    checkAiService();
    checkAndDeductTokens(10);
    const transcript = history.map(turn => `${turn.speaker === 'user' ? 'User' : 'Critico'}: ${turn.text}`).join('\n');
    const prompt = `You are an impartial debate judge. Evaluate the user's performance in the following debate transcript. Do not evaluate Critico.
    Provide a scorecard based on the user's argument strength, rebuttal effectiveness, and clarity. Also identify their strongest argument and offer a suggestion for improvement.
    ---TRANSCRIPT---
    ${transcript}
    ---END TRANSCRIPT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: debateScorecardSchema
        }
    }), 120000, 'Debate Evaluation');

    return JSON.parse(response.text);
};

export const breakdownTextIntoTopics = async (sourceText: string): Promise<{ title: string; content: string }[]> => {
    checkAiService();
    checkAndDeductTokens(8);
    const prompt = `Break down the following source text into logical, distinct topics suitable for a visual explanation. Each topic should have a short, clear title and the full content related to that title. Aim for 4-8 topics.
    ---TEXT---
    ${sourceText}
    ---END TEXT---`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: topicsSchema }
    }), 120000, 'Topic Breakdown');
    
    return JSON.parse(response.text);
};

export const generateScenesForTopic = async (topicContent: string, language: string, classLevel: ClassLevel): Promise<VisualExplanationScene[]> => {
    checkAiService();
    checkAndDeductTokens(5); // cost per topic
    const prompt = `Based on the following content for a single topic, generate an array of 2-4 scenes for a visual explanation for a ${classLevel} student.
    Each scene must have:
    1. A single, concise sentence of narration in ${language === 'hi' ? 'Hinglish (Hindi written in English script)' : 'simple English'}.
    2. A detailed, vivid prompt for an image generator to create an educational and clear image for the scene. The image style should be 'Digital illustration, vibrant, educational, clear subject'.
    
    ---TOPIC CONTENT---
    ${topicContent}
    ---END TOPIC CONTENT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: visualExplanationSchema }
    }), 120000, `Scene Generation`);
    
    const sceneBlueprints = JSON.parse(response.text);

    const generatedScenes = await Promise.allSettled(
        sceneBlueprints.map(async (blueprint: { narration: string, image_prompt: string }) => {
            const imageResponse: GenerateImagesResponse = await withTimeout(ai!.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: blueprint.image_prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
            }), 60000, 'Image Generation');
            
            if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
                throw new Error('Image generation failed for a scene.');
            }
            
            return {
                narration: blueprint.narration,
                imageBytes: imageResponse.generatedImages[0].image.imageBytes,
            };
        })
    );

    const successfulScenes = generatedScenes
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<VisualExplanationScene>).value);
    
    if(successfulScenes.length === 0 && generatedScenes.length > 0) {
        const firstError = generatedScenes.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw new Error(firstError?.reason?.message || "All image generations for the topic failed.");
    }
    
    return successfulScenes;
};

export const generateFullChapterSummaryVideo = async (sourceText: string, language: string, classLevel: ClassLevel): Promise<VisualExplanationScene[]> => {
    checkAiService();
    checkAndDeductTokens(15);
    const prompt = `Based on the full chapter text, create a comprehensive summary video with 5-7 scenes for a ${classLevel} student.
    Each scene needs:
    1. A single, concise sentence of narration in ${language === 'hi' ? 'Hinglish (Hindi written in English script)' : 'simple English'}.
    2. A detailed, vivid prompt for an image generator. Style: 'Digital illustration, vibrant, educational, clear subject'.

    ---FULL TEXT---
    ${sourceText}
    ---END FULL TEXT---`;
    
    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: summaryVideoSchema }
    }), 180000, `Summary Video Generation`);
    
    const sceneBlueprints = JSON.parse(response.text);

    const successfulScenes: VisualExplanationScene[] = [];
    for (const blueprint of sceneBlueprints) {
        try {
            const imageResponse: GenerateImagesResponse = await withTimeout(ai!.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: blueprint.image_prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
            }), 60000, 'Summary Image Generation');
             if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                 successfulScenes.push({
                     narration: blueprint.narration,
                     imageBytes: imageResponse.generatedImages[0].image.imageBytes,
                 });
             }
        } catch (imgErr) {
            console.error("Skipping a failed image generation for summary video:", imgErr);
        }
    }
    
    return successfulScenes;
};

export const generateGameLevel = async (sourceText: string): Promise<GameLevel> => {
    checkAiService();
    checkAndDeductTokens(25);
    const prompt = `You are an educational game designer. Based on the provided chapter text, create a complete level for a 2D grid-based game called "Chapter Conquest".
    
    **Instructions:**
    1.  **Grid:** The grid must be 15 rows tall and 20 columns wide. Design a simple maze-like map using 'wall' and 'floor' tiles. Ensure there's a clear path from the start to the exit.
    2.  **Player Start:** Place the player ('player_start') on a 'floor' tile near one edge of the map.
    3.  **Exit:** Place an 'exit' tile on a 'floor' tile near the opposite edge.
    4.  **Interactions:** Create 4-6 'interaction' tiles. These are challenges or questions based on the text.
        -   Place them strategically on 'floor' tiles.
        -   For each interaction:
            -   Create a short, engaging \`prompt\` (question/challenge).
            -   Provide a simple, one or two-word \`correct_answer\`.
            -   Write a \`success_message\` and a \`failure_message\`.
    5.  **Theme:** The \`title\`, \`theme\`, and \`goal\` should be creative and based on the chapter's content.
    
    **CRITICAL:** The JSON output must be perfectly structured according to the schema. The grid must be exactly 15x20.
    
    ---CHAPTER TEXT---
    ${sourceText}
    ---END CHAPTER TEXT---`;

    const response: GenerateContentResponse = await withTimeout(ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: gameLevelSchema,
        },
    }), 180000, 'Game Level Generation');

    return JSON.parse(response.text);
};