// src/app/page.tsx
import { Providers } from "@/components/Providers";
import YieldArbitrageDashboard from "@/components/YieldArbitrageDashboard";

export default function Home() {
  return (
    <Providers>
      <div className="flex justify-center">
        <YieldArbitrageDashboard />
      </div>
    </Providers>
  );
}