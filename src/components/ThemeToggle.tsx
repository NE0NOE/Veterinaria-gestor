import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    // This should ideally not happen if ThemeProvider is set up correctly
    return null; 
  }

  const { theme, toggleTheme } = context;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggle;
