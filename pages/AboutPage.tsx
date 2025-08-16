
import React from 'react';
import Card from '../components/common/Card';
import { AcademicCapIcon } from '../components/icons/AcademicCapIcon';
import { HeartIcon } from '../components/icons/HeartIcon';
import { StuBroMascotIcon } from '../components/icons/StuBroMascotIcon';

const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">About StuBro AI</h1>
        <p className="mt-2 text-lg text-gray-600">Your Personal AI Study Partner</p>
      </div>

      <Card className="!p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <StuBroMascotIcon className="w-40 h-40 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Our Mission</h2>
            <p className="mt-4 text-gray-600">
              At StuBro AI, our mission is to make high-quality, personalized education accessible to every student in India. We believe that learning should be engaging, intuitive, and, most importantly, effective. Traditional study methods can be time-consuming and one-size-fits-all. We're here to change that.
            </p>
            <p className="mt-4 text-gray-600">
              We leverage the power of cutting-edge AI to create tools that adapt to your unique learning style. Whether it's summarizing a dense chapter, creating a last-minute quiz, visualizing concepts with mind maps, or getting personalized career advice, StuBro AI is designed to be the smartest and most supportive study buddy you've ever had.
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="!p-8">
         <h2 className="text-2xl font-bold text-gray-800 text-center">Developed with Passion</h2>
         <p className="mt-4 text-gray-600 text-center max-w-2xl mx-auto">
            StuBro AI is a project born out of a passion for technology and education. It was proudly developed by <span className="font-bold text-indigo-600">Garv</span>, with the goal of building a tool that he wished he had during his own school days. You can contact him at his email: <a href="mailto:itggarv11@gmail.com" className="font-semibold text-indigo-600 hover:underline">itggarv11@gmail.com</a>.
         </p>
         <div className="mt-4 text-gray-600 flex items-center justify-center gap-2 font-semibold">
            Made in India with <HeartIcon className="w-5 h-5 text-red-500" />
         </div>
      </Card>

    </div>
  );
};

export default AboutPage;