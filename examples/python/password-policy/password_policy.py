class PasswordPolicy:
    def __init__(self, min_length=8):
        self.min_length = min_length

    def problems(self, password):
        found = []
        if len(password) < self.min_length:
            found.append("too short")
        if not self._has_digit(password):
            found.append("no digit")
        if password.lower() == password:
            found.append("no capital")
        return found

    def is_valid(self, password):
        return len(self.problems(password)) == 0

    # Private: the leading _ says it is not for callers
    # A change to try: inline _has_digit into problems, and remove it
    def _has_digit(self, password):
        return any(c.isdigit() for c in password)
