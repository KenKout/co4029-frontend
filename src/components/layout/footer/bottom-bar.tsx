/**
 * Bottom bar chrome only. The policy/help links are passed in as children and
 * live in `Footer.tsx`, where `help-policy.test.tsx` asserts on the source text
 * of that file to prove the previously-dead `href="#"` links are wired.
 */
export function FooterBottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-7xl mx-auto px-6 lg:px-8 border-t border-white/10 py-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} aBridgeAI Learning Systems. All
          rights reserved.
        </div>
        <div className="flex gap-6 text-xs font-medium text-slate-400">
          {children}
        </div>
      </div>
    </div>
  );
}
