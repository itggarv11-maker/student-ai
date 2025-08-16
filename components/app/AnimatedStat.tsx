import React, { useState, useEffect, useRef } from 'react';

const AnimatedStat = ({ value, label, delay = 0, continuousIncrement = false, duration = 2800 }: { value: number; label: string; delay?: number; continuousIncrement?: boolean; duration?: number }) => {
    const [count, setCount] = useState(0);
    const [isInitialAnimationDone, setIsInitialAnimationDone] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let timer: number;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        let start = 0;
                        const end = value;
                        if (start === end) return;
                        const frameRate = 60;
                        const totalFrames = duration / (1000 / frameRate);
                        const increment = end / totalFrames;

                        timer = window.setInterval(() => {
                            start += increment;
                            if (start >= end) {
                                setCount(end);
                                clearInterval(timer);
                                setIsInitialAnimationDone(true);
                            } else {
                                setCount(Math.ceil(start));
                            }
                        }, 1000 / frameRate);
                        observer.disconnect();
                    }, delay);
                }
            }, { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => {
            observer.disconnect();
            if (timer) clearInterval(timer);
        };
    }, [value, delay, duration]);

    useEffect(() => {
        let interval: number;
        if (isInitialAnimationDone && continuousIncrement) {
            interval = window.setInterval(() => {
                const increment = Math.floor(Math.random() * 2) + 1;
                setCount(prevCount => prevCount + increment);
            }, Math.floor(Math.random() * 1001) + 2000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isInitialAnimationDone, continuousIncrement]);
    
    const formattedCount = new Intl.NumberFormat('en-IN').format(count);

    return (
        <div ref={ref} className="text-center bg-white p-6 rounded-xl border border-gray-200/80 shadow-md">
            <p className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-orange-500">{formattedCount}{label.includes('Satisfaction') ? '%' : '+'}</p>
            <p className="text-gray-500 font-medium mt-1">{label}</p>
        </div>
    );
};

export default AnimatedStat;
