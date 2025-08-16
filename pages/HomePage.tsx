
import React from 'react';
import { Link } from 'https://esm.sh/react-router-dom';
import Button from '../components/common/Button';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { BrainCircuitIcon } from '../components/icons/BrainCircuitIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { RocketLaunchIcon } from '../components/icons/RocketLaunchIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { CursorArrowRaysIcon } from '../components/icons/CursorArrowRaysIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { useAuth } from '../contexts/AuthContext';
import { VideoCameraIcon } from '../components/icons/VideoCameraIcon';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { GavelIcon } from '../components/icons/GavelIcon';
import { QuestIcon } from '../components/icons/QuestIcon';
import { ChatBubbleIcon } from '../components/icons/ChatBubbleIcon';
import { StuBroMascotIcon } from '../components/icons/StuBroMascotIcon';
import AnimatedStat from '../components/app/AnimatedStat';


const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="space-y-24 md:space-y-36">
      {/* Hero Section */}
      <section className="relative text-center md:text-left pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute h-64 w-64 bg-gradient-to-r from-orange-200 to-rose-200 rounded-full -top-16 -left-16 filter blur-3xl opacity-50 animate-[move-blob-1_20s_infinite_alternate]"></div>
           <div className="absolute h-72 w-72 bg-gradient-to-r from-indigo-200 to-blue-200 rounded-full -bottom-24 -right-16 filter blur-3xl opacity-50 animate-[move-blob-2_25s_infinite_alternate-reverse]"></div>
        </div>
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-6">
                 <h1 className="text-5xl md:text-7xl font-extrabold text-gray-800">
                    Your Friendly AI <span className="text-indigo-600">Study Buddy</span>.
                </h1>
                <p className="mt-4 text-xl md:text-2xl text-gray-600 font-medium max-w-3xl">
                    Welcome to StuBro AI, your personal AI tutor that makes learning fun, fast, and unforgettable.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-6">
                    <Link to={currentUser ? "/app" : "/signup"}>
                    <Button size="lg" variant="primary" className="text-lg !font-bold w-full sm:w-auto">
                        {currentUser ? "Go to Dashboard" : "Get Started for Free"}
                    </Button>
                    </Link>
                     <Button size="lg" variant="secondary" className="text-lg !font-bold w-full sm:w-auto">
                        See Features
                    </Button>
                </div>
            </div>
             <div className="flex items-center justify-center">
                 <StuBroMascotIcon className="w-64 h-64 md:w-96 md:h-96" />
            </div>
        </div>
      </section>

      <StatsSection />
      <WhoIsThisForSection />

      <section>
         <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Get Answers in 3 Simple Steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <HowItWorksStep
                icon={<UploadIcon className="h-10 w-10 text-indigo-500" />}
                step="Step 1" title="Provide Content"
                description="Paste text, upload a file (PDF, DOCX), share a YouTube link, or just pick a topic to explore."
            />
            <HowItWorksStep
                icon={<CursorArrowRaysIcon className="h-10 w-10 text-orange-500" />}
                step="Step 2" title="Choose Your Tool"
                description="Select from 20+ AI tools: from quizzes and summaries to a photo-based doubt solver and an AI lab report writer."
            />
             <HowItWorksStep
                icon={<SparklesIcon className="h-10 w-10 text-rose-500" />}
                step="Step 3" title="Get Instant Results"
                description="Receive tailor-made study materials, solutions, and creative content in seconds, ready to help you master any topic."
            />
        </div>
       </section>
       
       <FeatureGrid />

      <section>
         <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Loved by Students Everywhere</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-gray-700">
            <TestimonialCard quote="StuBro AI has been a game-changer for my exam prep. The quiz feature is amazing, and the summaries save me so much time." author="Anjali S., Class 10" />
            <TestimonialCard quote="I used to get stuck on difficult physics concepts. Now, I just ask the AI chat until I understand. It's like having a tutor 24/7." author="Rohan M., Class 12" />
            <TestimonialCard quote="The Mind Map generator is genius! It helped me connect all the dots for my history exam. Highly recommended for all students." author="Priya K., Class 9" />
        </div>
      </section>

      <FAQSection />
      
      <section className="relative bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-12 text-center text-white overflow-hidden">
         <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full"></div>
         <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full"></div>
         <div className="relative z-10">
            <h2 className="text-4xl font-bold">Ready to Ace Your Exams?</h2>
            <p className="mt-4 text-lg max-w-xl mx-auto text-indigo-100">Join thousands of students who are learning smarter with their personal AI tutor.</p>
            <Link to={currentUser ? "/app" : "/signup"} className="mt-8 inline-block">
                <Button size="lg" variant="secondary" className="!bg-white !text-indigo-700 !font-bold hover:!bg-gray-100">
                    {currentUser ? "Open Dashboard" : "Sign Up Now - It's Free!"}
                </Button>
            </Link>
         </div>
      </section>
    </div>
  );
};

const HowItWorksStep = ({ icon, step, title, description }: { icon: React.ReactNode, step: string, title: string, description: string }) => (
    <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-lg">
        <div className="mx-auto bg-indigo-100 rounded-full h-20 w-20 flex items-center justify-center mb-4 border-2 border-indigo-200">{icon}</div>
        <p className="font-bold text-indigo-600">{step}</p>
        <h3 className="text-xl font-semibold text-gray-800 mt-1">{title}</h3>
        <p className="text-gray-500 mt-2 text-sm">{description}</p>
    </div>
);

const TestimonialCard = ({ quote, author }: { quote: string, author: string }) => (
    <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-gray-200/80 shadow-lg">
        <p className="italic">"{quote}"</p>
        <div className="mt-4 font-semibold text-gray-800">- {author}</div>
    </div>
);

const StatsSection = () => (
    <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatedStat value={10000} label="Questions Answered" continuousIncrement />
            <AnimatedStat value={4000} label="Hours of Study Saved" delay={200} continuousIncrement />
            <AnimatedStat value={98} label="Student Satisfaction" delay={400} />
        </div>
    </section>
);

const WhoIsThisForSection = () => (
  <section>
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Made for Every Indian Learner</h2>
      <p className="mt-2 text-gray-600">Whatever your goal, StuBro is here to help you achieve it.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
      <ForCard icon={<AcademicCapIcon className="h-10 w-10 text-indigo-500" />} title="School Students (6-12)" description="Ace your exams with instant doubt clearing, quizzes, and summaries for subjects like Physics, Math, History, and more." />
      <ForCard icon={<RocketLaunchIcon className="h-10 w-10 text-orange-500" />} title="Exam Aspirants (JEE, NEET)" description="Build a strong foundation for competitive exams by mastering core concepts and practicing with targeted question papers." />
      <ForCard icon={<LightBulbIcon className="h-10 w-10 text-rose-500" />} title="Curious Minds & Lifelong Learners" description="Explore any topic you're passionate about. Just provide a link or text, and dive deep with our AI-powered learning tools." />
    </div>
  </section>
);

const ForCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-lg">
    <div className="p-8">
      <div className="mx-auto bg-gray-100 rounded-full h-20 w-20 flex items-center justify-center mb-4 border-2 border-gray-200">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mt-1">{title}</h3>
      <p className="text-gray-500 mt-2 text-sm">{description}</p>
    </div>
  </div>
);

const FeatureGrid = () => {
    const features = [
        { icon: <ChatBubbleIcon className="h-10 w-10 text-indigo-500" />, title: "AI Chat Tutor", description: "Get instant, clear answers to any question about your study material." },
        { icon: <LightBulbIcon className="h-10 w-10 text-indigo-500" />, title: "Custom Quizzes", description: "Generate MCQs and written questions to test your knowledge and get AI feedback." },
        { icon: <BrainCircuitIcon className="h-10 w-10 text-indigo-500" />, title: "Mind Maps", description: "Visualize complex topics with interactive, AI-generated mind maps." },
        { icon: <VideoCameraIcon className="h-10 w-10 text-indigo-500" />, title: "Visual Explanations", description: "Turn any text into a narrated video with images to explain concepts visually." },
        { icon: <GavelIcon className="h-10 w-10 text-indigo-500" />, title: "Live Debates", description: "Sharpen your arguments by debating against a formidable AI opponent." },
        { icon: <QuestIcon className="h-10 w-10 text-indigo-500" />, title: "Chapter Conquest", description: "Master your chapters by playing a fun, 2D adventure game based on your notes." },
        { icon: <CalendarIcon className="h-10 w-10 text-indigo-500" />, title: "Study Planner", description: "Get a personalized, day-by-day plan to achieve any study goal." },
        { icon: <RocketLaunchIcon className="h-10 w-10 text-indigo-500" />, title: "Career Guidance", description: "Discover the perfect career path based on your interests and strengths." },
    ];

    return (
         <section id="features">
             <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800">A Powerful Toolkit for Every Subject</h2>
                <p className="mt-2 text-gray-600">From quick revisions to deep understanding, we've got you covered.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <div key={index} className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-gray-200/80 shadow-lg text-center">
                        <div className="mx-auto bg-indigo-100 rounded-full h-16 w-16 flex items-center justify-center mb-4 border-2 border-indigo-200">{feature.icon}</div>
                        <h3 className="text-lg font-semibold text-gray-800">{feature.title}</h3>
                        <p className="text-gray-500 mt-2 text-xs">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

const FAQSection = () => {
  const faqs = [
    { q: "Is StuBro AI free to use?", a: "Yes! StuBro AI offers a generous free plan with 100 tokens upon signup, enough to try all core features. For unlimited usage, you can upgrade to our Premium plan." },
    { q: "What kind of files can I upload?", a: "You can upload PDF, DOCX, and TXT files, as well as images (for the Doubt Solver) and audio files (for the Audio Summarizer). You can also paste text or use a YouTube link." },
    { q: "Is my data safe?", a: "Absolutely. We prioritize your privacy. The content you upload is only used to provide the AI service for your session and is not stored permanently. Please review our Privacy Policy for details." },
    { q: "Which subjects and classes are supported?", a: "StuBro AI is designed for students from Class 6 to 12 across all major subjects like Physics, Chemistry, Math, Biology, History, English, and Computer Science. The AI is versatile and can handle content from various curricula." }
  ];

  return (
    <section>
        <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-gray-800">Frequently Asked Questions</h2></div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} name="faq" className="faq-accordion bg-white/70 backdrop-blur-md p-4 rounded-xl border border-gray-200/80 shadow-lg">
              <summary className="font-semibold text-lg text-gray-800">
                {faq.q}
                <span className="faq-icon text-indigo-500 text-2xl font-bold">+</span>
              </summary>
              <div className="pt-2 mt-2 border-t border-gray-200/80 text-gray-600">{faq.a}</div>
            </details>
          ))}
        </div>
    </section>
  );
};

export default HomePage;