

import React, { useState } from 'react';
import { Link, useNavigate } from 'https://esm.sh/react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { useAuth } from '../contexts/AuthContext';

const PremiumPage: React.FC = () => {
  const { currentUser, activateSecretAccess } = useAuth();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const SECRET_KEY = "GARV";

  const handlePromoActivation = () => {
    setPromoError('');
    const code = promoCode.trim();

    if (code.toUpperCase() === SECRET_KEY) {
        activateSecretAccess();
        alert('SECRET ACTIVATED: Unlimited access granted! ✨');
        navigate('/app');
    } else if (/\S+@\S+\.\S+/.test(code)) {
        window.location.href = `mailto:itggarv11@gmail.com?subject=Inquiry for Custom StuBro AI Plan&body=Hello,%0D%0A%0D%0AI would like to inquire about a custom/institutional plan for StuBro AI.%0D%0A%0D%0AEmail: ${code}%0D%0A%0D%0AThank you.`;
    } else {
        setPromoError('Invalid code or email address.');
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center">
        <SparklesIcon className="w-16 h-16 mx-auto text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mt-4">Unlock Your Full Potential</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the plan that's right for you and supercharge your studies with the power of AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <Card className="flex flex-col">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700">Free</h2>
            <p className="text-4xl font-bold text-gray-800 mt-2">
              ₹0<span className="text-lg font-medium text-gray-500">/month</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Get started for free</p>
          </div>
          <div className="my-6 border-t border-gray-200"></div>
          <ul className="space-y-3 text-gray-600 flex-grow">
            <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span><span className="font-bold">100</span> initial tokens on signup</span></li>
            <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Access to all AI tools</span></li>
            <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Standard access</span></li>
          </ul>
           <div className="mt-8">
             <Link to="/signup"><Button variant="outline" className="w-full">Sign Up for Free</Button></Link>
          </div>
        </Card>

        <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-orange-500 rounded-2xl blur opacity-75"></div>
            <Card className="relative flex flex-col h-full !border-indigo-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-indigo-600">Premium</h2>
                <p className="text-4xl font-bold text-gray-800 mt-2">Contact Us</p>
                <p className="text-sm text-gray-500 mt-1">For unlimited access</p>
              </div>
              <div className="my-6 border-t border-gray-200"></div>
              <ul className="space-y-3 text-gray-600 flex-grow">
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span className="font-bold text-gray-800">Unlimited Tokens & Usage</span></li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Access to all AI tools</span></li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Priority support</span></li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Early access to new features</span></li>
              </ul>
               <div className="mt-8">
                <a href="mailto:itggarv11@gmail.com"><Button variant="primary" className="w-full text-base">Contact to Buy</Button></a>
              </div>
            </Card>
        </div>
        
        <Card className="flex flex-col border-2 border-amber-300/80">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-amber-600">Institutional Plan</h2>
                <p className="text-lg font-medium text-gray-600 mt-1">For schools & organizations</p>
            </div>
            <div className="my-6 border-t border-gray-200"></div>
            <ul className="space-y-3 text-gray-600 flex-grow">
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span className="font-bold text-gray-800">Unlimited Access for All Users</span></li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>All premium features included</span></li>
                <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-indigo-500" /><span>Dedicated support & onboarding</span></li>
            </ul>
            <div className="mt-8">
                <div className="space-y-2">
                    <label htmlFor="promo-code" className="text-sm font-medium text-gray-700">Enter your official email to inquire, or enter a promo code:</label>
                    <input id="promo-code" type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="email@school.org or promo code"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-gray-900" />
                    <Button onClick={handlePromoActivation} variant="secondary" className="w-full">Submit</Button>
                    {promoError && <p className="text-red-600 text-center text-sm mt-1">{promoError}</p>}
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;