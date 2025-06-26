import React, { useState, useEffect } from 'react';
import { IndianRupee, Trash2, Save, Clock, Calculator, DollarSign, Download, FileText, Printer } from 'lucide-react';
import { UserProfile } from '../lib/auth';
import { exportService } from '../lib/exportService';
import PremiumFeatureGate from './PremiumFeatureGate';

interface HistoryEntry {
  id: string;
  date: string;
  totalAmount: number;
  totalCount: number;
  denominationCounts: Record<number, number>;
  note?: string;
  currency: 'INR' | 'USD';
}

interface CalculatorHistory {
  expression: string;
  result: string;
  timestamp: string;
}

interface HistoryTabProps {
  hideAmounts: boolean;
  selectedCurrency: 'INR' | 'USD';
  userProfile: UserProfile | null;
  onUpgradeClick: () => void;
}

type HistoryType = 'money' | 'calculator';

const HistoryTab: React.FC<HistoryTabProps> = ({ hideAmounts, selectedCurrency, userProfile, onUpgradeClick }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [calculatorHistory, setCalculatorHistory] = useState<CalculatorHistory[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [note, setNote] = useState('');
  const [activeHistoryType, setActiveHistoryType] = useState<HistoryType>('money');

  // Load histories from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`countNoteHistory_${selectedCurrency}`);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedCalcHistory = localStorage.getItem('calculatorHistory');
    if (savedCalcHistory) {
      setCalculatorHistory(JSON.parse(savedCalcHistory));
    }
  }, [selectedCurrency]);

  const formatAmount = (amount: number) => {
    if (hideAmounts) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: selectedCurrency === 'USD' ? 2 : 0,
    }).format(amount);
  };

  // Save current counts to history
  const saveCurrentToHistory = () => {
    const currentCounts = localStorage.getItem(`denominationCounts_${selectedCurrency}`);
    if (!currentCounts) return;
    
    const counts = JSON.parse(currentCounts);
    
    const totalAmount = Object.entries(counts).reduce(
      (sum, [denomination, count]) => sum + (Number(denomination) * Number(count)), 
      0
    );
    
    const totalCount = Object.values(counts).reduce(
      (sum, count) => sum + Number(count), 
      0
    );
    
    const savedHistory = localStorage.getItem(`countNoteHistory_${selectedCurrency}`) || '[]';
    const history = JSON.parse(savedHistory);
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      totalAmount,
      totalCount,
      denominationCounts: counts,
      currency: selectedCurrency,
      note: note.trim() || undefined
    };
    
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem(`countNoteHistory_${selectedCurrency}`, JSON.stringify(updatedHistory));
    
    setNote('');
  };

  // Delete history entry
  const deleteHistoryEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this history entry?')) {
      const updatedHistory = history.filter(entry => entry.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem(`countNoteHistory_${selectedCurrency}`, JSON.stringify(updatedHistory));
      
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
    }
  };

  // Clear calculator history
  const clearCalculatorHistory = () => {
    if (window.confirm('Are you sure you want to clear all calculator history?')) {
      setCalculatorHistory([]);
      localStorage.removeItem('calculatorHistory');
    }
  };

  // Clear all history
  const clearAllHistory = () => {
    if (activeHistoryType === 'money') {
      if (window.confirm('Are you sure you want to clear all money counting history? This cannot be undone.')) {
        setHistory([]);
        setSelectedEntry(null);
        localStorage.removeItem(`countNoteHistory_${selectedCurrency}`);
      }
    } else {
      clearCalculatorHistory();
    }
  };

  // Load history entry to current counter
  const loadHistoryEntry = (entry: HistoryEntry) => {
    if (window.confirm('This will replace your current counts. Continue?')) {
      localStorage.setItem(`denominationCounts_${selectedCurrency}`, JSON.stringify(entry.denominationCounts));
      window.location.reload(); // Reload to update the counter
    }
  };

  // View details of a history entry
  const viewHistoryDetails = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
  };

  // Export functions
  const handleExportPDF = () => {
    if (history.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToPDF(history, `Note Counter History - ${selectedCurrency}`);
  };

  const handleExportExcel = () => {
    if (history.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToExcel(history, `Note Counter History - ${selectedCurrency}`);
  };

  const handlePrint = () => {
    if (history.length === 0) {
      alert('No data to print. Please save some counting sessions first.');
      return;
    }
    exportService.printData(history, `Note Counter History - ${selectedCurrency}`);
  };

  // Format denomination for display
  const formatDenomination = (value: number, count: number) => {
    const type = value <= 2 ? 'coin' : 'note';
    const CurrencyIcon = selectedCurrency === 'INR' ? IndianRupee : DollarSign;
    return (
      <div key={value} className="flex justify-between py-1 border-b border-gray-200">
        <div className="flex items-center">
          <CurrencyIcon size={14} className="mr-1" />
          <span className="font-medium">{value}</span> {type}
        </div>
        <div>× {count}</div>
      </div>
    );
  };

  const CurrencyIcon = selectedCurrency === 'INR' ? IndianRupee : DollarSign;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Left Column - History List */}
      <div className="xl:col-span-2">
        <div className="bg-white rounded-lg shadow-md p-4 h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
            <div className="flex flex-wrap gap-2">
              <button
                className={`py-2 px-4 rounded-md font-medium text-sm ${
                  activeHistoryType === 'money'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveHistoryType('money')}
              >
                <div className="flex items-center">
                  <CurrencyIcon className="mr-2" size={16} />
                  Money History
                </div>
              </button>
              <button
                className={`py-2 px-4 rounded-md font-medium text-sm ${
                  activeHistoryType === 'calculator'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveHistoryType('calculator')}
              >
                <div className="flex items-center">
                  <Calculator className="mr-2" size={16} />
                  Calculator History
                </div>
              </button>
            </div>
            {((activeHistoryType === 'money' && history.length > 0) ||
              (activeHistoryType === 'calculator' && calculatorHistory.length > 0)) && (
              <button 
                onClick={clearAllHistory}
                className="text-red-500 hover:text-red-700 text-sm flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Clear All
              </button>
            )}
          </div>

          {activeHistoryType === 'money' && (
            <>
              <div className="mb-4 space-y-3">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note (optional)"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={saveCurrentToHistory}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center whitespace-nowrap"
                  >
                    <Save size={16} className="mr-2" />
                    Save Current
                  </button>
                </div>
                
                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                  <PremiumFeatureGate
                    userProfile={userProfile}
                    onUpgradeClick={onUpgradeClick}
                    featureName="PDF Export"
                  >
                    <button
                      onClick={handleExportPDF}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors flex items-center text-sm"
                    >
                      <FileText size={14} className="mr-1" />
                      PDF
                    </button>
                  </PremiumFeatureGate>

                  <PremiumFeatureGate
                    userProfile={userProfile}
                    onUpgradeClick={onUpgradeClick}
                    featureName="Excel Export"
                  >
                    <button
                      onClick={handleExportExcel}
                      className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors flex items-center text-sm"
                    >
                      <Download size={14} className="mr-1" />
                      Excel
                    </button>
                  </PremiumFeatureGate>

                  <PremiumFeatureGate
                    userProfile={userProfile}
                    onUpgradeClick={onUpgradeClick}
                    featureName="Print Reports"
                  >
                    <button
                      onClick={handlePrint}
                      className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 transition-colors flex items-center text-sm"
                    >
                      <Printer size={14} className="mr-1" />
                      Print
                    </button>
                  </PremiumFeatureGate>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock size={48} className="mx-auto mb-2 opacity-30" />
                  <p>No money counting history entries yet</p>
                  <p className="text-sm mt-2">Save your current count to see it here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {history.map((entry) => (
                    <div 
                      key={entry.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedEntry?.id === entry.id 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => viewHistoryDetails(entry)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="font-medium text-sm">{entry.date}</div>
                          {entry.note && (
                            <div className="text-gray-600 text-sm mt-1 truncate">{entry.note}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-indigo-600 flex items-center justify-end text-sm">
                            <CurrencyIcon size={14} className="mr-1" />
                            {formatAmount(entry.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {entry.totalCount} items
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeHistoryType === 'calculator' && (
            <>
              {calculatorHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calculator size={48} className="mx-auto mb-2 opacity-30" />
                  <p>No calculator history yet</p>
                  <p className="text-sm mt-2">Use the calculator to see your calculations here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {calculatorHistory.map((entry, index) => (
                    <div 
                      key={index}
                      className="border rounded-lg p-3 transition-colors border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-600 text-sm break-all">
                            {entry.expression} = <span className="text-indigo-600">{entry.result}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Right Column - Selected Entry Details */}
      <div className="xl:col-span-1">
        <div className="bg-white rounded-lg shadow-md p-4 h-full">
          {activeHistoryType === 'money' && selectedEntry ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Entry Details</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Date & Time</div>
                  <div className="font-medium text-sm break-all">{selectedEntry.date}</div>
                </div>
                
                {selectedEntry.note && (
                  <div>
                    <div className="text-sm text-gray-600">Note</div>
                    <div className="font-medium text-sm break-words">{selectedEntry.note}</div>
                  </div>
                )}
                
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Count</div>
                  <div className="text-xl font-bold text-indigo-600">
                    {selectedEntry.totalCount}
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-xl font-bold text-indigo-600 flex items-center break-all">
                    <CurrencyIcon className="mr-1 flex-shrink-0" size={18} />
                    {formatAmount(selectedEntry.totalAmount)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-2">Denomination Breakdown</div>
                  <div className="max-h-[200px] overflow-y-auto pr-1">
                    {Object.entries(selectedEntry.denominationCounts)
                      .filter(([_, count]) => Number(count) > 0)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([denom, count]) => formatDenomination(Number(denom), Number(count)))
                    }
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 pt-2">
                  <button 
                    onClick={() => loadHistoryEntry(selectedEntry)}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Load to Counter
                  </button>
                  <button 
                    onClick={() => deleteHistoryEntry(selectedEntry.id)}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
              <div className="mb-4">
                <Clock size={48} className="opacity-30" />
              </div>
              <p className="text-center text-sm">
                {activeHistoryType === 'money' 
                  ? 'Select a money counting entry to view details'
                  : 'Calculator history details appear in the main panel'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;