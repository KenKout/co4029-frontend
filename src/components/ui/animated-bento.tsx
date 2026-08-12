import { useState, useEffect } from "react";

export function AnimatedBentoRow({
  children,
  defaultFlex = [2, 1],
}: {
  children: [React.ReactNode, React.ReactNode];
  defaultFlex?: [number, number];
}) {
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
      className="flex flex-col sm:flex-row gap-4 w-full h-auto sm:h-[260px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex h-[260px] sm:h-auto sm:basis-0 min-h-0 transition-[flex-grow] duration-[800ms] ease-out"
        style={{ flexGrow: flexValues[0] }}
      >
        <div className="w-full h-full hover-entity">{children[0]}</div>
      </div>
      <div
        className="flex h-[260px] sm:h-auto sm:basis-0 min-h-0 transition-[flex-grow] duration-[800ms] ease-out"
        style={{ flexGrow: flexValues[1] }}
      >
        <div className="w-full h-full hover-entity">{children[1]}</div>
      </div>
    </div>
  );
}
