import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Carregar tema do localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Detectar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    // Aplicar tema ao documento
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      bg: '#0D0D0D',
      bgSecondary: '#121212',
      primary: '#00FF7F',
      secondary: '#FF7B00',
      text: '#FFFFFF',
      textSecondary: '#BBBBBB',
      border: '#333333',
      card: '#1A1A1A',
      success: '#00FF7F',
      warning: '#FF7B00',
      error: '#FF4444',
      info: '#00BFFF'
    } : {
      bg: '#FAFAF5',
      bgSecondary: '#F5F5DC',
      primary: '#1B8C56',
      secondary: '#F68C1F',
      text: '#333333',
      textSecondary: '#666666',
      border: '#E5E5E5',
      card: '#FFFFFF',
      success: '#1B8C56',
      warning: '#F68C1F',
      error: '#DC2626',
      info: '#3B82F6'
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};