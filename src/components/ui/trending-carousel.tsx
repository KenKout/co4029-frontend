import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Course {
  title: string;
  instructor: string;
  tag: string;
  tagColor: string;
  rating: string;
  students: string;
  thumbFrom: string;
  thumbTo: string;
  overlayFrom: string;
  overlayTo: string;
}

interface TrendingCarouselProps {
  courses: Course[];
}

export function TrendingCarousel({ courses }: TrendingCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(1);

  // Auto-swipe functionality: go to next slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % courses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, courses.length]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % courses.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + courses.length) % courses.length);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[450px] flex items-center justify-center overflow-hidden [perspective:1000px]">
      <div className="absolute w-full h-full flex items-center justify-center">
        {courses.map((course, i) => {
          // Calculate relative position based on active index
          let offset = i - activeIndex;
          if (offset < -1) offset += courses.length;
          if (offset > 1) offset -= courses.length;

          // CSS properties based on offset
          let transform = "translateX(0) scale(1) translateZ(0) rotateY(0)";
          let zIndex = 20;
          let opacity = 1;

          if (offset === -1) {
            transform = "translateX(-60%) scale(0.85) translateZ(-100px) rotateY(15deg)";
            zIndex = 10;
            opacity = 0.7;
          } else if (offset === 1) {
            transform = "translateX(60%) scale(0.85) translateZ(-100px) rotateY(-15deg)";
            zIndex = 10;
            opacity = 0.7;
          } else if (offset !== 0) {
            // hidden cards
            transform = "translateX(0) scale(0.5) translateZ(-300px)";
            zIndex = 0;
            opacity = 0;
          }

          const isActive = offset === 0;

          return (
            <div
              key={i}
              className="absolute w-full max-w-[340px] md:max-w-[380px] bg-m3-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer"
              style={{
                transform,
                zIndex,
                opacity,
                pointerEvents: opacity === 0 ? "none" : "auto",
              }}
              onClick={() => {
                if (!isActive) setActiveIndex(i);
              }}
            >
              <div className="relative h-56 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${course.thumbFrom} ${course.thumbTo}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className={`absolute inset-0 bg-gradient-to-t ${course.overlayFrom} ${course.overlayTo}`} />
                <div className="absolute top-4 left-4">
                  <Badge className={`${course.tagColor} border-0 text-xs font-medium px-2.5 py-1`}>{course.tag}</Badge>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h3 className="font-headline font-semibold text-m3-on-surface text-lg leading-snug line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-m3-on-surface-variant font-medium">{course.instructor}</p>

                <div className={`flex items-center gap-4 text-sm transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-md font-semibold">
                    <span className="text-yellow-500 text-base">★</span>
                    {course.rating}
                  </span>
                  <span className="text-m3-on-surface-variant font-medium bg-m3-surface-container px-2 py-1 rounded-md">
                    {course.students} students
                  </span>
                </div>
              </div>

              {/* Progress bar that matches the 5s auto-swipe interval */}
              {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-m3-surface-variant overflow-hidden">
                  <div
                    className="h-full bg-m3-primary w-full"
                    style={{ animation: 'progress-fill 5000ms linear forwards' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-2 md:left-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 dark:bg-m3-surface-container-high/80 backdrop-blur-md shadow-glass flex items-center justify-center z-30 hover:bg-white dark:hover:bg-m3-surface-container-highest transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-m3-on-surface" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 md:right-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 dark:bg-m3-surface-container-high/80 backdrop-blur-md shadow-glass flex items-center justify-center z-30 hover:bg-white dark:hover:bg-m3-surface-container-highest transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-m3-on-surface" />
      </button>
    </div>
  );
}
