import Image from "next/image"

export default function LoadingSpinner() {
  return (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      style={{
        backgroundColor: '#000000'
      }}
    >
      <div className="text-center">
        {/* Smile image above the spinner */}
        <div className="mb-6">
          <Image
            src="/Smile.png"
            alt="YouthHub"
            width={80}
            height={80}
            priority
          />
        </div>
        
        {/* CSS-based loading spinner */}
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          <span className="ml-3 text-yellow-400 text-lg font-medium">Loading...</span>
        </div>
      </div>
    </div>
  )
}
