"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoomNotificationBadge() {
  return () => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
      const timer = setInterval(() => {
        setIsVisible(prev => !prev);
      }, 2000);

      return () => clearInterval(timer);
    }, []);

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
          />
        )}
      </AnimatePresence>
    );
  };
}