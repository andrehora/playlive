import csv


def read_scores(path):
    with open(path, newline="") as file:
        return {row["name"]: int(row["score"]) for row in csv.DictReader(file)}


def write_ranking(scores, path):
    ranked = sorted(scores.items(), key=lambda pair: pair[1], reverse=True)
    with open(path, "w") as file:
        for place, (name, score) in enumerate(ranked, start=1):
            file.write(f"{place}. {name} {score}\n")
