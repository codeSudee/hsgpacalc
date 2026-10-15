export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'How do I calculate my high school GPA?',
    answer:
      'Convert each course grade to grade points (A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0), multiply by the course credits, add everything up, and divide by total credits. For example, an A in a 1-credit class and a B in another 1-credit class gives (4.0 + 3.0) / 2 = 3.5. Our free high school GPA calculator on this page does the math for you, including plus/minus grades and credit hours.',
  },
  {
    question: "What's the difference between weighted and unweighted GPA?",
    answer:
      'An unweighted GPA uses the standard 4.0 scale, so an A is worth 4.0 in every class, whatever its difficulty. A weighted GPA adds bonus points for harder courses such as Honors, AP, IB, and Dual Enrollment, so it can reach 5.0 or higher. Use a weighted GPA calculator to see how rigor boosts your average, and the unweighted number to see your raw performance. Many schools report both on your transcript.',
  },
  {
    question: 'How many points does an AP or Honors class add to my GPA?',
    answer:
      'Most schools add 0.5 points for Honors classes and 1.0 point for AP, IB, and Dual Enrollment classes. That makes an A in Honors worth 4.5 and an A in AP worth 5.0. Policies vary, though. Some districts use +0.25 or +0.75, or weight only certain courses. Check your school handbook, then set the weight for each class in the calculator to match.',
  },
  {
    question: 'What is a good high school GPA?',
    answer:
      'On the unweighted 4.0 scale, a 3.0 is a solid B average, 3.5 or higher is considered strong, and 3.7 or above is competitive for selective colleges. The national average is roughly 3.0 to 3.4. What counts as good also depends on your goals and course rigor: a 3.6 with many AP classes can look better than a 4.0 with easier ones.',
  },
  {
    question: 'Can my GPA be higher than 4.0?',
    answer:
      'Yes, but only on a weighted scale. Unweighted GPAs top out at 4.0. With weighted GPA, AP, IB, Honors, and Dual Enrollment classes earn extra points, so a student with straight A\'s in advanced courses can reach 4.5, 5.0, or even higher at schools with extra weighting. Colleges usually see your weighted GPA alongside school context, or recalculate it on their own scale.',
  },
  {
    question: 'Do freshman year grades count toward my GPA?',
    answer:
      'In most schools, yes. Your cumulative high school GPA includes grades from 9th grade onward, and colleges generally review all four years, with freshman grades included. Some schools exclude certain middle-school courses taken for high school credit, so check your policy. The good news is that an upward trend in later years is noticed, and it can offset a weaker start.',
  },
  {
    question: 'Does a Pass/Fail class affect my GPA?',
    answer:
      'Usually not. Most schools do not assign grade points to Pass/Fail courses, so a Pass earns credit without changing your GPA. A Fail, however, may count as an F at some schools, which lowers your GPA. Policies differ, so ask your counselor. If you are unsure, leave the course out of the calculator unless your school counts it.',
  },
  {
    question: 'How do I raise my GPA next semester?',
    answer:
      'Focus on the highest-credit classes first, since they move your GPA most. Go to office hours, turn in every assignment, and retake or replace grades if your school allows it. Use the GPA calculator to set a target and see which grades you need. Remember that raising a cumulative GPA takes time, because each new semester is averaged with all past ones.',
  },
  {
    question: 'What GPA scale do colleges look at?',
    answer:
      'Most colleges look at your unweighted 4.0 GPA, your weighted GPA, or both. Many recalculate GPA using only core academic courses (English, math, science, social studies, and language) on their own scale. They also consider your school profile and course rigor. So report the GPA on your transcript, and use an unweighted and weighted GPA calculator to understand both versions.',
  },
  {
    question: "Why doesn't my GPA match my school transcript?",
    answer:
      'Schools differ in how they calculate GPA. Common reasons for a mismatch include different weights for Honors and AP courses, plus/minus grades counted differently (an A- may be 3.7 or 4.0), excluded classes such as PE or Pass/Fail, and rounding rules. Your school may also compute GPA once a year. Compare your inputs against the school grading policy, and adjust the calculator settings to match.',
  },
];

export function faqSchema(items: Faq[] = faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: `<p>${f.answer}</p>` },
    })),
  };
}
