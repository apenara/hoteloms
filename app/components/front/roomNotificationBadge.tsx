"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RoomNotificationBadgeProps {
  isVisible: boolean;
}

export default function RoomNotificationBadge({
  isVisible,
}: RoomNotificationBadgeProps) {
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setIsPulsing((prev) => !prev);
    }, 2000);

    return () => clearInterval(timer);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: isPulsing ? 1 : 0.8, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
        />
      )}
    </AnimatePresence>
  );
}
