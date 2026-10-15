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

export const faqsEs: Faq[] = [
  {
    question: '¿Cómo calculo mi GPA de high school?',
    answer:
      'Convierte la nota de cada clase en puntos (A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0), multiplica por los créditos de la clase, suma todo y divide entre el total de créditos. Por ejemplo, una A en una clase de 1 crédito y una B en otra de 1 crédito dan (4.0 + 3.0) / 2 = 3.5. Nuestra calculadora de GPA de high school gratis en esta página hace las cuentas por ti, incluidas las notas con más/menos y los créditos.',
  },
  {
    question: '¿Cuál es la diferencia entre GPA ponderado y no ponderado?',
    answer:
      'El GPA no ponderado usa la escala estándar de 4.0, así que una A vale 4.0 en todas las clases, sin importar su dificultad. El GPA ponderado agrega puntos extra por clases más difíciles, como Honores, AP, IB e Inscripción Dual, y por eso puede llegar a 5.0 o más. Usa una calculadora de GPA ponderado para ver cómo la dificultad sube tu promedio, y el no ponderado para ver tu rendimiento real. Muchas escuelas muestran ambos en tu transcripción.',
  },
  {
    question: '¿Cuántos puntos suma una clase AP o de Honores a mi GPA?',
    answer:
      'La mayoría de las escuelas suman 0.5 puntos por las clases de Honores y 1.0 punto por las de AP, IB e Inscripción Dual. Así, una A en Honores vale 4.5 y una A en AP vale 5.0. Las políticas varían: algunos distritos usan +0.25 o +0.75, o solo ponderan ciertas clases. Revisa el manual de tu escuela y ajusta el peso de cada clase en la calculadora para que coincida.',
  },
  {
    question: '¿Qué es un buen GPA de high school?',
    answer:
      'En la escala no ponderada de 4.0, un 3.0 es un promedio sólido de B, un 3.5 o más se considera fuerte y un 3.7 o más es competitivo para universidades selectivas. El promedio nacional ronda entre 3.0 y 3.4. Lo que se considera bueno también depende de tus metas y de la dificultad de tus clases: un 3.6 con muchas clases AP puede verse mejor que un 4.0 con clases más fáciles.',
  },
  {
    question: '¿Mi GPA puede ser mayor que 4.0?',
    answer:
      'Sí, pero solo en una escala ponderada. Los GPA no ponderados llegan como máximo a 4.0. Con el GPA ponderado, las clases AP, IB, Honores e Inscripción Dual dan puntos extra, así que un estudiante con puras A en clases avanzadas puede llegar a 4.5, 5.0 o más en escuelas con mayor ponderación. Las universidades suelen ver tu GPA ponderado junto con el contexto de tu escuela, o lo recalculan con su propia escala.',
  },
  {
    question: '¿Cuentan las notas de primer año (9.º grado) en mi GPA?',
    answer:
      'En la mayoría de las escuelas, sí. Tu GPA acumulado de high school incluye las notas desde 9.º grado, y las universidades normalmente revisan los cuatro años, incluido el primero. Algunas escuelas excluyen ciertas clases de middle school tomadas por crédito de high school, así que revisa tu política. La buena noticia es que una tendencia al alza en los años siguientes se nota y puede compensar un comienzo más flojo.',
  },
  {
    question: '¿Una clase de aprobado/reprobado (Pass/Fail) afecta mi GPA?',
    answer:
      'Normalmente no. La mayoría de las escuelas no asignan puntos a las clases Pass/Fail, así que un Pass da crédito sin cambiar tu GPA. Un Fail, en cambio, puede contar como F en algunas escuelas y bajar tu GPA. Las políticas cambian, así que pregunta a tu consejero. Si no estás seguro, deja la clase fuera de la calculadora a menos que tu escuela la cuente.',
  },
  {
    question: '¿Cómo subo mi GPA el próximo semestre?',
    answer:
      'Enfócate primero en las clases con más créditos, porque son las que más mueven tu GPA. Ve a las horas de consulta, entrega todas las tareas y repite o reemplaza notas si tu escuela lo permite. Usa la calculadora de GPA para fijar una meta y ver qué notas necesitas. Recuerda que subir un GPA acumulado toma tiempo, porque cada semestre nuevo se promedia con todos los anteriores.',
  },
  {
    question: '¿Qué escala de GPA miran las universidades?',
    answer:
      'La mayoría de las universidades miran tu GPA no ponderado de 4.0, tu GPA ponderado o ambos. Muchas recalculan el GPA usando solo las clases académicas principales (inglés, matemáticas, ciencias, estudios sociales e idiomas) con su propia escala. También consideran el perfil de tu escuela y la dificultad de tus clases. Por eso, reporta el GPA que aparece en tu transcripción y usa una calculadora de GPA ponderado y no ponderado para entender ambas versiones.',
  },
  {
    question: '¿Por qué mi GPA no coincide con mi transcripción?',
    answer:
      'Las escuelas calculan el GPA de formas distintas. Las razones más comunes de la diferencia son pesos distintos para las clases de Honores y AP, notas con más/menos contadas de otra manera (una A- puede valer 3.7 o 4.0), clases excluidas como Educación Física o Pass/Fail, y reglas de redondeo. Tu escuela también puede calcular el GPA una vez al año. Compara tus datos con la política de calificaciones de tu escuela y ajusta la configuración de la calculadora para que coincida.',
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
