import React, { useState, useEffect } from 'react';
import { ArrowLeft, History, Trash2 } from 'lucide-react';

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: string;
}

interface SimpleCalculatorProps {
  initialValue?: string;
}

const SimpleCalculator: React.FC<SimpleCalculatorProps> = ({ initialValue = '0' }) => {
  const [display, setDisplay] = useState(initialValue);
  const [expression, setExpression] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>(() => {
    const saved = localStorage.getItem('calculatorHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setDisplay(initialValue);
      setExpression('');
      setHasCalculated(false);
    }
  }, [initialValue]);

  useEffect(() => {
    localStorage.setItem('calculatorHistory', JSON.stringify(history));
  }, [history]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validInput = /^[0-9+\-*/().%\s]*$/;
    
    if (validInput.test(value) || value === '') {
      setDisplay(value);
      setHasCalculated(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEqualsClick();
    }
  };

  const handleOperatorClick = (operator: string) => {
    if (hasCalculated) {
      setExpression(display + ' ' + operator + ' ');
      setHasCalculated(false);
    } else {
      setDisplay(display + operator);
    }
  };

  const handleClearClick = () => {
    setDisplay('0');
    setExpression('');
    setHasCalculated(false);
  };

  const handleBackspaceClick = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleEqualsClick = () => {
    try {
      const fullExpression = display;
      // Using Function constructor to safely evaluate the expression
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + fullExpression.replace(/×/g, '*').replace(/÷/g, '/'))();
      const resultString = String(result);
      
      setExpression(fullExpression + ' = ');
      setDisplay(resultString);
      setHasCalculated(true);

      // Add to history
      const newHistoryEntry: CalculationHistory = {
        expression: fullExpression,
        result: resultString,
        timestamp: new Date().toLocaleString()
      };
      setHistory(prev => [newHistoryEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    } catch (error) {
      setDisplay('Error');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear calculator history?')) {
      setHistory([]);
      localStorage.removeItem('calculatorHistory');
    }
  };

  const useHistoryResult = (result: string) => {
    setDisplay(result);
    setExpression('');
    setHasCalculated(false);
    setShowHistory(false);
  };

  return (
    <div className="bg-gray-100 rounded-lg p-3">
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <div className="text-gray-600 text-xs h-4 overflow-x-auto whitespace-nowrap flex-1 mr-2">
            {expression}
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-100 transition-colors flex-shrink-0"
            title="Toggle History"
          >
            <History size={14} />
          </button>
        </div>
        <input
          type="text"
          value={display}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-white p-2 text-right text-base font-bold rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="0"
        />
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-2 bg-white rounded-lg p-2 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">History</span>
            <button
              onClick={clearHistory}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
              title="Clear History"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {history.map((entry, index) => (
              <div
                key={index}
                className="text-xs p-1 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => useHistoryResult(entry.result)}
              >
                <div className="text-gray-600 break-all">{entry.expression} = {entry.result}</div>
                <div className="text-xs text-gray-400">{entry.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1">
        <button 
          onClick={handleClearClick}
          className="bg-red-500 text-white p-2 rounded font-medium hover:bg-red-600 active:bg-red-700 transition-colors text-sm"
        >
          C
        </button>
        <button 
          onClick={handleBackspaceClick}
          className="bg-gray-200 p-2 rounded font-medium hover:bg-gray-300 active:bg-gray-400 transition-colors flex items-center justify-center text-sm"
        >
          <ArrowLeft size={14} />
        </button>
        <button 
          onClick={() => handleOperatorClick('%')}
          className="bg-gray-200 p-2 rounded font-medium hover:bg-gray-300 active:bg-gray-400 transition-colors text-sm"
        >
          %
        </button>
        <button 
          onClick={() => handleOperatorClick('/')}
          className="bg-indigo-500 text-white p-2 rounded font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors text-sm"
        >
          ÷
        </button>
        <button 
          onClick={() => handleOperatorClick('*')}
          className="bg-indigo-500 text-white p-2 rounded font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors text-sm"
        >
          ×
        </button>
        <button 
          onClick={() => handleOperatorClick('-')}
          className="bg-indigo-500 text-white p-2 rounded font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors text-sm"
        >
          -
        </button>
        <button 
          onClick={() => handleOperatorClick('+')}
          className="bg-indigo-500 text-white p-2 rounded font-medium hover:bg-indigo-600 active:bg-indigo-700 transition-colors text-sm"
        >
          +
        </button>
        <button 
          onClick={handleEqualsClick}
          className="bg-indigo-600 text-white p-2 rounded font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-sm"
        >
          =
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Type your calculation or use the buttons
      </div>
    </div>
  );
};

export default SimpleCalculator;