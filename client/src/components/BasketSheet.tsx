import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, X, Trash2, ShoppingCart } from "lucide-react";
import { useBasket } from "@/contexts/BasketContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BASE_FEE } from "@shared/schema";
import CheckoutModal from "@/components/CheckoutModal";

export default function BasketSheet() {
  const {
    basketItems,
    removeFromBasket,
    clearBasket,
    getTotalPricePence,
    getBasketCount,
  } = useBasket();
  
  const { formatLocalPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const itemsTotalPence = basketItems.reduce((sum, item) => sum + item.price, 0);
  const totalPence = getTotalPricePence();
  const count = getBasketCount();

  const handleGoToCheckout = () => {
    setOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            data-testid="button-basket-trigger"
            aria-label={`Shopping basket with ${count} item${count !== 1 ? 's' : ''}`}
          >
            <ShoppingBag className="h-6 w-6" />
            {count > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                data-testid="badge-basket-count"
              >
                {count}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shopping Basket
            </SheetTitle>
            <SheetDescription>
              {count === 0
                ? "Your basket is empty"
                : `${count} assessment${count > 1 ? "s" : ""} in basket`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col h-[calc(100vh-200px)]">
            {basketItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2" data-testid="text-empty-basket">
                  Your basket is empty
                </p>
                <p className="text-sm text-muted-foreground">
                  Add assessments to get started
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {basketItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 p-4 rounded-lg border bg-card"
                      data-testid={`basket-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" data-testid={`text-basket-item-name-${item.id}`}>
                          {item.name}
                        </h4>
                        <p className="text-sm font-mono text-cyan-600 dark:text-cyan-400" data-testid={`text-basket-item-price-${item.id}`}>
                          {formatLocalPrice(item.price)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromBasket(item.id)}
                        aria-label={`Remove ${item.name} from basket`}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium" data-testid="text-subtotal">
                        {formatLocalPrice(itemsTotalPence)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base computation fee</span>
                      <span className="font-medium" data-testid="text-base-fee">
                        {formatLocalPrice(BASE_FEE)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400" data-testid="text-basket-total">
                        {formatLocalPrice(totalPence)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={clearBasket}
                      className="flex-1"
                      data-testid="button-clear-basket"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      onClick={handleGoToCheckout}
                      className="flex-1"
                      data-testid="button-go-to-checkout"
                    >
                      Checkout
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        basketItems={basketItems}
      />
    </>
  );
}
