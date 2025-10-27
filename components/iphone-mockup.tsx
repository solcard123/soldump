"use client"

export function IPhoneMockup() {
  return (
    <div className="relative animate-float">
      {/* iPhone Frame */}
      <div className="relative w-[280px] h-[570px] bg-foreground rounded-[3rem] p-3 shadow-2xl animate-glow">
        {/* Screen */}
        <div className="w-full h-full bg-[#1f1c1f] rounded-[2.5rem] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-foreground rounded-b-3xl z-10" />

          {/* Video Container */}
          <div className="w-full h-full">
            <video
              src="/1.mp4"
              className="w-full h-full"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>

        {/* Side Buttons */}
        <div className="absolute -left-1 top-24 w-1 h-8 bg-foreground rounded-l" />
        <div className="absolute -left-1 top-36 w-1 h-12 bg-foreground rounded-l" />
        <div className="absolute -right-1 top-32 w-1 h-16 bg-foreground rounded-r" />
      </div>
    </div>
  )
}
