'use client';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-8">
          <div className="h-12 bg-gray-200 rounded animate-pulse mx-auto w-3/4 mb-6"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse mx-auto w-2/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse mx-auto w-2/3 mb-12"></div>
          <div className="flex gap-4 justify-center">
            <div className="h-12 bg-gray-200 rounded animate-pulse w-32"></div>
            <div className="h-12 bg-gray-200 rounded animate-pulse w-32"></div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20 border-t">
        <div className="h-10 bg-gray-200 rounded animate-pulse mb-12 w-1/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
