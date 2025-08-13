import Image from "next/image"

export default function LoadingSpinner() {
  return (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      style={{
        backgroundColor: '#000000'
      }}
    >
      <div className="animate-spin">
        <Image
          src="/smile.png"
          alt="Loading..."
          width={80}
          height={80}
          priority
        />
      </div>
    </div>
  )
}
