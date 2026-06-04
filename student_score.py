# student_score.py
# This program asks the user to enter student scores and calculates the average score.

scores_text = input("Please enter student scores, separated by commas: ")

# Split the input text into separate score strings
score_list = scores_text.split(",")

# Convert each score from text into a number
scores = []
for score in score_list:
    scores.append(float(score.strip()))

# Calculate the average score
average_score = sum(scores) / len(scores)

print("The average score is:", average_score)
