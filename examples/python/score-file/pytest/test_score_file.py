import pytest
from score_file import read_scores, write_ranking


# tmp_path is a real, empty folder for each test
def test_reads_scores_from_a_csv_file(tmp_path):
    scores = tmp_path / "scores.csv"
    scores.write_text("name,score\nAna,7\nRui,9\n")
    assert read_scores(scores) == {"Ana": 7, "Rui": 9}


def test_writes_the_ranking_best_first(tmp_path):
    ranking = tmp_path / "ranking.txt"
    write_ranking({"Ana": 7, "Rui": 9}, ranking)
    assert ranking.read_text() == "1. Rui 9\n2. Ana 7\n"


def test_refuses_a_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        read_scores(tmp_path / "nothing.csv")
