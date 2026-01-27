from datetime import datetime, time

earliest_date = datetime(2025, 1, 20).date()
print(f"Original: {earliest_date}, type: {type(earliest_date)}")

if isinstance(earliest_date, datetime.date) and not isinstance(earliest_date, datetime):
    earliest_date = datetime.combine(earliest_date, time(0, 0, 0))
    print(f"Converted: {earliest_date}, type: {type(earliest_date)}")

print("Test passed!")