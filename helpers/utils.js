const getNormalizedValues = ({
  performances = [],
  scores = [],
  criterion = [],
  employeeName = "",
}) => {
  return scores.map((scoreObj) => {
    // Cari kriteria yang sesuai dengan criterionId dari scores
    const criterionId = scoreObj.criterionId || scoreObj.CriterionId;
    const criteria = criterion.find((c) => c.id === criterionId);
    const isCost = !criteria?.isBenefit;

    let normalizedValue = 0;

    if (isCost) {
      const minValue = Math.min(
        ...performances.map((e) => {
          const scores = e?.scores || e?.Scores;
          const scoreCriteria = scores.find((s) => {
            return (s.criterionId || s.CriterionId) === criterionId;
          });
          const score = scoreCriteria?.score;
          return score;
        })
      );

      // Normalisasi nilai (avoid division by zero)
      normalizedValue = minValue === 0 ? 0 : minValue / scoreObj.score;
    } else {
      const maxValue = Math.max(
        ...performances.map((e) => {
          const scores = e?.scores || e?.Scores;
          const scoreCriteria = scores.find((s) => {
            return (s.criterionId || s.CriterionId) === criterionId;
          });
          const score = scoreCriteria?.score;
          return score;
        })
      );

      // Normalisasi nilai (avoid division by zero)
      normalizedValue = maxValue === 0 ? 0 : scoreObj.score / maxValue;
    }

    const result = {
      criterionId,
      normalizedValue,
      weight: criteria ? criteria.weight : 0, // Jika kriteria ditemukan, ambil weight
      normalizedWeight: (criteria ? criteria.weight : 0) * normalizedValue,
    };

    if (employeeName) {
      result.employeeName = employeeName;
    }

    return result;
  });
};

// Simple Additive Weighting (SAW) method
const calculatePerformanceScore = ({performances = [], criterion = []}) => {
  // Normalisasi matriks keputusan
  const normalizedMatrix = performances.map((emp) => {
    const scores = emp?.scores || [];
    const normalizedValues = getNormalizedValues({
      performances,
      scores,
      criterion,
    });
    return {employeeId: emp.employeeId, values: normalizedValues};
  });

  // Hitung skor akhir dengan perkalian nilai normalisasi dan bobot
  const scores = normalizedMatrix.map((emp) => {
    const finalScore = emp.values.reduce((acc, valueObj) => {
      return acc + valueObj.normalizedValue * valueObj.weight;
    }, 0);

    return {employeeId: emp.employeeId, finalScore};
  });

  // Sortir berdasarkan skor tertinggi
  scores.sort((a, b) => b.finalScore - a.finalScore);

  return scores;
};

const calculateNormalization = ({performances = [], criterion = []}) => {
  const normalizedMatrix = performances.map((e) => {
    const scores = e?.Scores || [];
    const employeeName = e?.Employee?.name;
    const normalizedValues = getNormalizedValues({
      performances,
      scores,
      criterion,
      employeeName,
    });
    return normalizedValues;
  });

  return normalizedMatrix;
};

const addDaysToDate = (dateProps, days) => {
  const newDate = new Date(dateProps);
  newDate.setDate(dateProps.getDate() + days || 0);
  return newDate;
};

module.exports = {
  calculatePerformanceScore,
  calculateNormalization,
  addDaysToDate,
};
