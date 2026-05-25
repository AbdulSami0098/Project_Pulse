import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  projectName?: string;
  onRequestAnalysis: () => void;
}

export const Header = ({ projectName = 'Overview', onRequestAnalysis }: HeaderProps) => (
  <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
    <h1 className="text-white font-semibold text-lg">{projectName}</h1>

    <div className="flex items-center gap-3">
      <button
        onClick={onRequestAnalysis}
        className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Run Analysis
      </button>
    </div>
  </header>
);
