class Gradebook:
    def __init__(self, scores):
        self.scores = scores

    def add(self, student, score):
        if score < 0 or score > 100:
            raise ValueError("Score must be between 0 and 100")
        scores = self.scores.get(student, [])
        scores.append(score)
        self.scores[student] = scores

    def average(self, student):
        scores = self.scores.get(student, [])
        if not scores:
            raise ValueError("No scores for " + student)
        total = 0
        for score in scores:
            total += score
        return total / len(scores)

    def report(self, student):
        average = self.average(student)
        # A change to try: add "best": the student's best score, to the report
        return {"student": student, "average": average, "passed": average >= 50}
