import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FooterNewsletterColumn() {
  return (
    <div className="lg:col-span-4">
      <h4 className="font-semibold text-white mb-6 tracking-wide text-sm uppercase">
        Stay Updated
      </h4>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-1">
        <div className="flex bg-[#0f172a] rounded-xl overflow-hidden p-1">
          <Input
            className="flex-1 bg-transparent border-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-4 placeholder:text-slate-600"
            placeholder="Enter email address"
            type="email"
          />
          <Button className="px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-medium border-0 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]">
            Subscribe
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        By subscribing, you agree to our Terms of Service and Privacy Policy. We
        respect your privacy.
      </p>
    </div>
  );
}
