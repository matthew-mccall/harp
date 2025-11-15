import Link from 'next/link';

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <div className="text-center border-2 border-white rounded-lg p-12">
        <h1 className="text-4xl font-bold mb-4 text-white">Virtual Interview Tester</h1>
        <p className="text-gray-300 mb-8">Practice your technical interviews with AI</p>
        <Link 
          href="/interview" 
          className="px-6 py-3 bg-black text-white border-2 border-white rounded hover:bg-white hover:text-black transition-colors"
        >
          Start Interview
        </Link>
      </div>
    </div>
  );
}
