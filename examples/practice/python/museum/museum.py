def entry_fee(age, student=False):
    fee = 12
    if age < 12:
        fee = 6
    if student:
        fee = fee / 2
    return fee
