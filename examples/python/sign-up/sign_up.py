class SignUp:
    def __init__(self, users):
        self.users = users

    def register(self, email):
        if self.users.exists(email):
            raise ValueError("Email already registered")
        # A bug to try: move this line above the if
        self.users.save(email)
        return "Welcome, " + email
