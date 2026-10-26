from studio_bookings.schedule import Session, overlaps, sessions, within_opening_hours


def test_programme_is_in_time_order():
    starts = [s.starts for s in sessions()]
    assert starts == sorted(starts)


def test_wheel_tasters_never_overlap():
    tasters = sessions("Wheel taster")
    assert len(tasters) == 4
    assert not any(overlaps(a, b) for i, a in enumerate(tasters) for b in tasters[i + 1:])


def test_glazing_demos_end_on_the_half_hour():
    assert [(s.starts, s.ends) for s in sessions("Glazing demo")] == [("11:15", "11:45"), ("14:15", "14:45")]


def test_everything_fits_between_ten_and_four():
    assert all(within_opening_hours(s) for s in sessions())
    assert not within_opening_hours(Session("Late taster", "15:30", 45))
