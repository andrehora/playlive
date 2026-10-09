class ConsoleLog:
    def write(self, line):
        print(line)


class DoorLock:
    def __init__(self, code, log):
        self.code = code
        self.log = log

    def unlock(self, code):
        if code == self.code:
            self.log.write("Unlocked")
        else:
            self.log.write("Wrong code")
