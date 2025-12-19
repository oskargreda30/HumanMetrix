import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@shared/currencies";
import { Globe } from "lucide-react";

export default function CurrencySelector() {
  const { currency, setCurrency, availableCurrencies, isLoading } = useCurrency();

  if (isLoading) {
    return (
      <div className="w-24 h-9 bg-muted/20 animate-pulse rounded-md" />
    );
  }

  // Currency selector only changes display currency, NOT the country code for PPP
  // PPP pricing is determined solely by automatic geolocation detection
  return (
    <Select value={currency.code} onValueChange={(code) => setCurrency(code)}>
      <SelectTrigger 
        className="w-auto min-w-[100px] bg-transparent border-cyan-400/30 text-white hover:border-cyan-400/50"
        data-testid="select-currency"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.map((code) => {
          const curr = CURRENCIES[code];
          if (!curr) return null;
          return (
            <SelectItem 
              key={code} 
              value={code}
              data-testid={`select-currency-${code}`}
            >
              <span className="font-mono">{curr.symbol}</span>
              <span className="ml-2">{curr.code}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
