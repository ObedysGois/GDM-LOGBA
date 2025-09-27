import React, { useState, useEffect } from 'react';

const RealtimeDurationCounter = ({ startTime }) => {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) return;

    const calculateDuration = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();

      if (diff < 0) {
        setDuration('00:00:00');
        return;
      }

      const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
      
      setDuration(`${hours}:${minutes}:${seconds}`);
    };

    const intervalId = setInterval(calculateDuration, 1000);

    return () => clearInterval(intervalId);
  }, [startTime]);

  return <>{duration}</>;
};

export default RealtimeDurationCounter;