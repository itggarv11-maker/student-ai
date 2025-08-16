
import React, { useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Contact Us</h1>
          <p className="mt-2 text-gray-600">Have feedback or a question? Let us know!</p>
        </div>
        <form 
          action="mailto:ITGGARV11@GMAIL.COM"
          method="POST"
          encType="text/plain"
          className="space-y-6"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text" id="name" name="Name" value={name} onChange={(e) => setName(e.target.value)} required
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email" id="email" name="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              id="message" name="Message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="text-center">
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ContactPage;