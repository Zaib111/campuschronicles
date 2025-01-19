import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import './index.css'
import { Link } from 'react-router-dom'
import App from './App';


const LoginPage = () => {
    const navigate = useNavigate();
    const { isSignedIn } = useUser();

    useEffect(() => {
        if (isSignedIn) {
        navigate('/app');
        }
    }, [isSignedIn, navigate]);
    return (
        <div className="bg-[url('/bgImage.jpg')] ] bg-cover w-screen h-screen">
          <header className="text-center">
            <div className="flex flex-col items-center justify-center pt-8">
              <h1 className="text-7xl font-bold font-lora text-black pt-4">Campus Chronicles</h1>
              <img 
                src="public/cc-logo.png" 
                alt="Campus Chronicles Logo" 
                className="w-21 h-21s smt-10 animate-flip mt-8"
              />
            </div>
            <SignedOut>
              <SignInButton>
              <button className="mt-8 py-6 px-9 mb-4 font-lora text-3xl bg-black rounded-xl hover:bg-white text-white hover:text-black ease-in-out duration-500 transition-colors">
                  Login
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </header>
        </div>
    );
  };

export default LoginPage