# studio-bookings

Open-day bookings for Clay & Current: four wheel tasters of twelve places, two glazing demos, and the booking page in
`site/`.

- `studio_bookings/slots.py`: places, bookings and cancellations
- `studio_bookings/pricing.py`: prices and takings
- `studio_bookings/schedule.py`: the day's programme
- `studio_bookings/site.py`: the sessions list on the booking page

Run the tests:

```
python -m pytest -q
```

Open `site/index.html` in a browser to see the booking page.
