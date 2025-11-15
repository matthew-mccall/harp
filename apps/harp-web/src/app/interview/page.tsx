import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import InterviewerVideo from './components/InterviewerVideo';
import LiveTranscription from './components/LiveTranscription';
import UserCamera from './components/UserCamera';

export default function InterviewPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Main Content */}
      <div
        className="flex gap-4 p-4 max-w-[1800px] mx-auto"
        style={{ height: 'calc(100vh - 73px)' }}
      >
        {/* Left Section - IDE */}
        <div className="flex-1 flex flex-col gap-4">
          <CodeEditor />
          <Terminal />
        </div>

        {/* Right Section - Video & Captions */}
        <div className="w-96 flex flex-col gap-4">
          <InterviewerVideo />
          <LiveTranscription />
          <UserCamera />
        </div>
      </div>
    </div>
  );
}