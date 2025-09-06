import React, { Suspense, lazy, useEffect } from "react";
import Header from "./Header";
import Hero from "./Hero";
import shaurya from "../assets/images/shaurya.jpg";
import SkeletonLoader from "./SkeletonLoader";

// Lazy load the section component
const RecruiterSection = lazy(() => import("./sections/RecruiterSection"));

function Recruiter() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleResumeClick = () => {
    window.open("https://drive.google.com/file/d/1HDc_UGIK7wdf4d3xHPgfwh64ffH3ktg6/view?usp=sharing", "_blank");
  };

  const handleMoreInfoClick = () => {
    window.open("https://www.linkedin.com/in/astro-dude/", "_blank");
  };

  return (
    <div className="relative w-full min-h-screen">
      <Header />
      <Hero
        backgroundImage={shaurya}
        heading="Hiring? Let's Make It Easy!"
        description="You're looking for top talent, and—surprise—it's me. Check out my projects, skills, and why I'm the perfect fit."
        primaryButtonText="Download Resume"
        secondaryButtonText="LinkedIn"
        onPrimaryButtonClick={handleResumeClick}
        onSecondaryButtonClick={handleMoreInfoClick}
      />
      <Suspense fallback={<SkeletonLoader type="section" />}>
        <RecruiterSection />
      </Suspense>
    </div>
  );
}

export default Recruiter;