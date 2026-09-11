export function AnimatedBentoRow({
  children,
  defaultFlex = [2, 1],
}: {
  children: [React.ReactNode, React.ReactNode];
  defaultFlex?: [number, number];
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full h-auto sm:h-[260px]">
      <div
        className="flex h-[260px] sm:h-auto sm:basis-0 min-h-0"
        style={{ flexGrow: defaultFlex[0] }}
      >
        <div className="w-full h-full hover-entity">{children[0]}</div>
      </div>
      <div
        className="flex h-[260px] sm:h-auto sm:basis-0 min-h-0"
        style={{ flexGrow: defaultFlex[1] }}
      >
        <div className="w-full h-full hover-entity">{children[1]}</div>
      </div>
    </div>
  );
}
