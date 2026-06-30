import { useState, useEffect } from "react";

export function AnimatedBentoRow({ children, defaultFlex = [2, 1] }: { children: [React.ReactNode, React.ReactNode], defaultFlex?: [number, number] }) {
  const [flexValues, setFlexValues] = useState(defaultFlex);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      const ratios = [
        [2, 1],
        [1.5, 1],
        [1, 1.5],
        [1, 2],
        [1.2, 1.2],
        [1.8, 1.2],
      ];
      const randomRatio = ratios[Math.floor(Math.random() * ratios.length)];
      setFlexValues(randomRatio as [number, number]);
    }, 2000); // Change width every 2s
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div
      className="flex flex-col sm:flex-row gap-4 h-auto sm:h-[260px] w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="transition-[flex] duration-[800ms] ease-out min-h-[260px] sm:min-h-0 flex"
        style={{ flex: flexValues[0] }}
      >
        <div className="w-full h-full hover-entity">{children[0]}</div>
      </div>
      <div
        className="transition-[flex] duration-[800ms] ease-out min-h-[260px] sm:min-h-0 flex"
        style={{ flex: flexValues[1] }}
      >
        <div className="w-full h-full hover-entity">{children[1]}</div>
      </div>
    </div>
  );
}
