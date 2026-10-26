from decimal import Decimal

import pytest

from studio_bookings.pricing import format_pounds, price_of, takings, ticket_total


def test_forty_eight_wheel_tasters():
    assert ticket_total(48, "12.50") == Decimal("600.00")


def test_no_tickets_is_nothing():
    assert ticket_total(0, price_of("wheel taster")) == Decimal("0.00")


def test_negative_count_is_refused():
    with pytest.raises(ValueError):
        ticket_total(-1, "12.50")


def test_takings_add_up_by_item():
    sold = {"Wheel taster": 48, "Paint a bisque mug": 10, "Glazing demo": 30}
    assert takings(sold) == Decimal("690.00")


def test_pounds_are_shown_with_pence():
    assert format_pounds(Decimal("600")) == "£600.00"
    assert format_pounds(Decimal("1250.5")) == "£1,250.50"
