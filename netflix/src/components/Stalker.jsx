import React, { Suspense, lazy, useEffect } from "react";
import Header from "./Header";
import Hero from "./Hero";
import shaurya from "../assets/images/shaurya3.jpg";
import SkeletonLoader from "./SkeletonLoader";

// Lazy load the section component
const StalkerSection = lazy(() => import("./sections/StalkerSection"));

function Stalker() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleProjectsClick = () => {
    window.open("https://www.instagram.com/_shauryanium.perfrauleinide_/", "_blank");
  };

  const handleMoreInfoClick = () => {
    window.open("https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXc3d28xeDg1bDJ2dzZqb2dkMDJ3djNpZDN0NDljeGwyOGN3NWRjMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vxBUmPA1bq0RyWi4et/giphy.gif", "_blank");
  };

  return (
    <div className="relative w-full min-h-screen">
      <Header />
      <Hero
        backgroundImage={shaurya}
        heading="Caught You Snooping!"
        description="Well, since you're here, why not just look around?"
        primaryButtonText="Instagram"
        secondaryButtonText="Learn More"
        onPrimaryButtonClick={handleProjectsClick}
        onSecondaryButtonClick={handleMoreInfoClick}
      />

      <Suspense fallback={<SkeletonLoader type="section" />}>
        <StalkerSection />
      </Suspense>
      
    </div>
  );
}

export default Stalker;