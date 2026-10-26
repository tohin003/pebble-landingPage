"""Ticket prices and takings for the open day, in pounds."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

PRICES: dict[str, Decimal] = {
    "wheel taster": Decimal("12.50"),
    "glazing demo": Decimal("0.00"),
    "hand-building table": Decimal("6.00"),
    "paint a bisque mug": Decimal("9.00"),
    "firing your piece": Decimal("3.00"),
}

PENNY = Decimal("0.01")


def price_of(item: str) -> Decimal:
    try:
        return PRICES[item.strip().lower()]
    except KeyError:
        raise KeyError(f"no price for {item!r}") from None


def ticket_total(count: int, price: Decimal | str) -> Decimal:
    if count < 0:
        raise ValueError("a ticket count can't be negative")
    return (Decimal(count) * Decimal(price)).quantize(PENNY, rounding=ROUND_HALF_UP)


def takings(sold: dict[str, int]) -> Decimal:
    """Total takings for tickets sold, by item."""
    return sum((ticket_total(n, price_of(item)) for item, n in sold.items()), Decimal("0.00"))


def format_pounds(amount: Decimal) -> str:
    return f"£{amount.quantize(PENNY, rounding=ROUND_HALF_UP):,.2f}"
