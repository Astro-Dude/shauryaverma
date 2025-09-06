import React, { Suspense, lazy, useEffect } from "react";
import Header from "./Header";
import Hero from "./Hero";
import shaurya from "../assets/images/shaurya2.jpeg";
import SkeletonLoader from "./SkeletonLoader";

// Lazy load the section component
const LostKidSection = lazy(() => import("./sections/LostKidSection"));

function LostKid() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleApplyClick = () => {
    window.open("https://vector-nine.vercel.app/", "_blank");
  };

  const handleMoreInfoClick = () => {
    window.open("https://chat.whatsapp.com/H9eTkTOCxa2LQimCk90XXc", "_blank");
  };

  return (
    <div className="relative w-full min-h-screen">
      <Header />
      <Hero
        backgroundImage={shaurya}
        heading="Don't know what to do next?"
        description="I've been there. Prepare for SST or just want to chill? Whatever it is I have got you covered."
        primaryButtonText="Level Up"
        secondaryButtonText="Join chaos"
        onPrimaryButtonClick={handleApplyClick}
        onSecondaryButtonClick={handleMoreInfoClick}
      />
      <Suspense fallback={<SkeletonLoader type="section" />}>
        <LostKidSection />
      </Suspense>
    </div>
  );
}

export default LostKid;