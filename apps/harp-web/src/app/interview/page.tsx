import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import InterviewerVideo from './components/InterviewerVideo';
import LiveTranscription from './components/LiveTranscription';
import UserCamera from './components/UserCamera';

export default function InterviewPage() {
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <Navbar />

      {/* Main Content */}
      <div
        className="flex flex-1 overflow-hidden"
      >
        {/* Left Section - IDE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditor />
          <Terminal />
        </div>

        {/* Right Section - Video & Captions */}
        <div className="w-96 flex flex-col overflow-hidden">
          <InterviewerVideo />
          <LiveTranscription />
          <UserCamera />
        </div>
      </div>
    </div>
  );
}