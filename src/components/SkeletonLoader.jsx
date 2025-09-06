import React, { useState, useEffect } from 'react';

const SkeletonLoader = ({ type = 'default' }) => {
  // Use the same sizing logic as LandingPage
  const [sizes, setSizes] = useState({ imageSize: 140, textSize: 22 });

  useEffect(() => {
    if (type === 'landing') {
      const updateSizes = () => {
        const width = window.innerWidth;
        const imageSize = Math.max(120, Math.min(200, width / 10));
        const textSize = Math.max(18, Math.min(35, width / 57));
        setSizes({ imageSize, textSize });
      };

      updateSizes();
      window.addEventListener("resize", updateSizes);
      return () => window.removeEventListener("resize", updateSizes);
    }
  }, [type]);

  if (type === 'landing') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-black">
        {/* "Who's watching?" title skeleton with exact dynamic sizing */}
        <div 
          className="bg-gray-800 rounded-md mb-10 animate-pulse"
          style={{ 
            height: `${sizes.textSize * 2}px`,
            width: `${sizes.textSize * 12}px` // Approximate width based on text
          }}
        ></div>

        {/* Grid of user selection cards with exact layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-10">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex flex-col items-center group animate-pulse">
              {/* Profile image skeleton with exact dynamic sizing */}
              <div 
                className="bg-gray-800 rounded-lg border-4 border-transparent mb-2 object-contain"
                style={{ 
                  width: `${sizes.imageSize}px`,
                  height: `${sizes.imageSize}px`
                }}
              ></div>
              
              {/* User type label skeleton with exact text sizing */}
              <div 
                className="bg-gray-700 rounded-md"
                style={{ 
                  height: `${sizes.textSize * 0.7}px`,
                  width: `${sizes.textSize * 4}px` // Approximate width for labels
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'section') {
    return (
      <div className="bg-black">
        {/* Audio Control Skeleton */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-800 p-3 rounded-full w-12 h-12 animate-pulse"></div>
        </div>

        <div className="max-w-[2000px] mx-auto">
          {/* Multiple sections matching your layout */}
          {[1, 2, 3, 4].map((sectionIndex) => (
            <div key={sectionIndex} className="mb-16">
              {/* Section Title Skeleton */}
              <div className="px-8 mb-6">
                <div className="h-8 bg-gray-800 rounded-md w-64 animate-pulse"></div>
              </div>
              
              {/* Horizontal Scrolling Cards Container */}
              <div className="flex flex-nowrap overflow-x-auto overflow-y-hidden pb-4 pl-4 gap-3">
                {[...Array(6)].map((_, cardIndex) => (
                  <div 
                    key={cardIndex} 
                    className="relative flex-shrink-0 w-[220px] sm:w-[260px] md:w-[280px] lg:w-[300px] animate-pulse"
                  >
                    {/* Card Image (aspect-video) */}
                    <div className="aspect-video rounded overflow-hidden bg-gray-800 relative">
                      {/* Gradient overlay skeleton */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent p-2 sm:p-4 flex flex-col justify-end">
                        {/* Card Title Skeleton */}
                        <div className="h-6 bg-gray-700 rounded-md w-3/4 mb-2"></div>
                        
                        {/* Card Description Skeleton */}
                        <div className="h-4 bg-gray-700 rounded-md w-full mb-4"></div>
                        
                        {/* Button Skeleton */}
                        <div className="h-8 bg-gray-600 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'hero') {
    return (
      <div className="relative w-screen overflow-x-hidden overflow-y-hidden aspect-[16/9] bg-gray-800 animate-pulse">
        {/* Background Image Skeleton */}
        <div className="absolute inset-0 w-full h-full bg-gray-700"></div>
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 100%)",
          }}
        />
        
        {/* Content Skeleton */}
        <div className="relative z-10 h-full flex flex-col justify-center items-start px-4 md:px-16">
          {/* Heading Skeleton */}
          <div className="h-12 bg-gray-600 rounded-md w-96 mb-2"></div>
          
          {/* Description Skeleton */}
          <div className="h-4 bg-gray-600 rounded-md w-80 mb-4"></div>
          
          {/* Buttons Skeleton */}
          <div className="flex flex-wrap gap-2">
            <div className="h-12 bg-gray-500 rounded w-32"></div>
            <div className="h-12 bg-gray-600 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  // Default page skeleton with header + hero + sections
  return (
    <div className="bg-black min-h-screen">
      {/* Header Skeleton */}
      <div className="h-16 bg-gray-900 animate-pulse"></div>
      
      {/* Hero Section Skeleton */}
      <SkeletonLoader type="hero" />
      
      {/* Content Section Skeleton */}
      <SkeletonLoader type="section" />
    </div>
  );
};

export default SkeletonLoader;
