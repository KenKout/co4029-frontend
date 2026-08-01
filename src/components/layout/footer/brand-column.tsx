import { GithubIcon, LinkedinIcon, TwitterIcon } from "./social-icons";

export function FooterBrandColumn() {
  return (
    <div className="lg:col-span-4 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tighter text-white font-headline">
          aBridgeAI
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
        Personalizing education through the synergy of artificial intelligence
        and human curiosity. Next-generation learning infrastructure.
      </p>
      <div className="flex gap-4 pt-2">
        {[GithubIcon, TwitterIcon, LinkedinIcon].map((Icon, i) => (
          <a
            key={i}
            href="#"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 transition-all"
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  );
}
