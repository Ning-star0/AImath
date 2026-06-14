import { QuestionType } from '@prisma/client';

export type AnswerJudgement = {
  isCorrect: boolean;
  normalizedStudentAnswer: string;
  normalizedCorrectAnswer: string;
  feedback: string;
};

export function normalizeAnswer(answer: string | null | undefined) {
  return (answer ?? '').replace(/\s+/g, '').trim().toUpperCase();
}

export function normalizeChoiceAnswer(answer: string | null | undefined) {
  return normalizeAnswer(answer)
    .split(/[,\uff0c]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
}

export function judgeAnswer(input: {
  questionType: QuestionType;
  correctAnswer: string;
  studentAnswer: string;
}): AnswerJudgement {
  if (input.questionType === QuestionType.MULTIPLE_CHOICE) {
    const studentChoices = normalizeChoiceAnswer(input.studentAnswer);
    const correctChoices = normalizeChoiceAnswer(input.correctAnswer);
    const isCorrect =
      studentChoices.length === correctChoices.length &&
      studentChoices.every((choice, index) => choice === correctChoices[index]);
    const normalizedCorrectAnswer = correctChoices.join(',');

    return {
      isCorrect,
      normalizedStudentAnswer: studentChoices.join(','),
      normalizedCorrectAnswer,
      feedback: isCorrect
        ? '回答正确，继续保持。'
        : `正确答案是 ${normalizedCorrectAnswer}，请注意多选题要选全。`,
    };
  }

  const normalizedStudentAnswer = normalizeAnswer(input.studentAnswer);
  const normalizedCorrectAnswer = normalizeAnswer(input.correctAnswer);
  const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;

  return {
    isCorrect,
    normalizedStudentAnswer,
    normalizedCorrectAnswer,
    feedback: isCorrect
      ? '回答正确，做得很好。'
      : `回答不正确。正确答案是 ${normalizedCorrectAnswer}。`,
  };
}
